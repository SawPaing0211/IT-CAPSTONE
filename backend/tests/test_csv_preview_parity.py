# The admin CSV preview (frontend/src/utils/enrollmentCsv.js) must agree with the server's enrollment rules.
# The server stays authoritative; this test checks the two never disagree about which rows are unusable.
import io, json, os, re, shutil, subprocess, sys, tempfile
import pytest

_db = os.path.join(tempfile.mkdtemp(), 'csvparity_test.db')
os.environ.setdefault('DATABASE_URL', f'sqlite:///{_db}')
os.environ.pop('FORGE_ENV', None)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import app as A
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MODULE = os.path.join(ROOT, 'frontend', 'src', 'utils', 'enrollmentCsv.js')
SAMPLES = os.path.join(os.path.dirname(__file__), 'sample_csv')
pytestmark = pytest.mark.skipif(shutil.which('node') is None, reason='node is needed to run the preview rules')

HEAD = 'student_id,firstname,middlename,lastname,suffix,student_type,section_no\n'
CASES = {
    'regular_ok': HEAD + '9001,Ann,,Lee,,regular,70001\n',
    'regular_missing_section': HEAD + '9002,Ann,,Lee,,regular,\n',
    'irregular_missing_section': HEAD + '9003,Ben,,Lee,,irregular,\n',
    'irregular_two_sections': HEAD + '9004,Cy,,Lee,,irregular,70001\n9004,Cy,,Lee,,irregular,70002\n',
    'irregular_one_bad_row': HEAD + '9005,Di,,Lee,,irregular,70001\n9005,Di,,Lee,,irregular,\n',
    'regular_two_sections': HEAD + '9006,Ed,,Lee,,regular,70001\n9006,Ed,,Lee,,regular,70002\n',
    'space_in_id': HEAD + '90 07,Flo,,Lee,,regular,70001\n',
    'at_in_id': HEAD + 'a@b,Flo,,Lee,,regular,70001\n',
    'bad_type': HEAD + '9008,Gus,,Lee,,visitor,70001\n',
    'empty_id': HEAD + ',Hal,,Lee,,regular,70001\n',
    'unknown_section_server_only': HEAD + '9009,Ivy,,Lee,,regular,99999\n',
    'empty_names_new_student': HEAD + '9010,,,,,regular,70001\n',
}


def client(text):
    code = ("import {parseCSV,checkRows} from %s;" % json.dumps('file:///' + MODULE.replace('\\', '/').lstrip('/')) +
            "const t=process.argv[1];const {rows}=parseCSV(t);const r=checkRows(rows);"
            "console.log(JSON.stringify({errs:r.errs.map(e=>e.row),warns:r.warns.map(e=>e.row)}))")
    out = subprocess.run(['node', '--input-type=module', '-e', code, text], capture_output=True, text=True, timeout=60)
    assert out.returncode == 0, out.stderr
    return json.loads(out.stdout)


@pytest.fixture(scope='module')
def admin():
    with A.app.app_context():
        a = A.User(username='csvadmin', email='csvadmin@example.com', role='administrator', password_hash=generate_password_hash('x'))
        subj = A.Subject.query.filter_by(subject_code='IT115L').first()
        if not subj:
            subj = A.Subject(name='CSV Lab', subject_code='IT115L', year_level=1, subject_type='lab')
            A.db.session.add(subj)
        A.db.session.add(a); A.db.session.flush()
        for no in ('70001', '70002'):
            A.db.session.add(A.SubjectSection(section_no=no, subject_id=subj.id, is_active=True))
        A.db.session.commit()
        h = {'Authorization': f"Bearer {create_access_token(identity=str(a.id))}"}
    return h


def server(admin, text):
    A.rate_limit_store.clear()
    c = A.app.test_client()
    r = c.post('/api/admin/enrollment/bulk-upload', headers=admin, data={'file': (io.BytesIO(text.encode()), 'x.csv')},
               content_type='multipart/form-data')
    assert r.status_code in (200, 207, 400), r.get_data(as_text=True)[:200]
    b = r.get_json()
    bad_rows = set()
    for e in b.get('errors', []):
        m = re.match(r'Row (\d+)', e)
        if m: bad_rows.add(int(m.group(1)))
    return b, bad_rows


@pytest.mark.parametrize('name', sorted(CASES))
def test_client_error_rows_are_rejected_by_server(admin, name):
    text = CASES[name]
    c = client(text)
    b, server_bad = server(admin, text)
    # every row the preview calls unusable is also unusable on the server
    assert set(c['errs']) <= server_bad, (name, c, sorted(server_bad), b.get('errors'))
    # and the server rejects nothing for LAYOUT reasons that the preview let through
    extra = server_bad - set(c['errs'])
    for e in b.get('errors', []):
        m = re.match(r'Row (\d+)', e)
        if m and int(m.group(1)) in extra:
            assert re.search(r"not found|outside the supported|firstname/lastname|already belongs|conflict", e), (name, e)


def test_preview_flags_missing_sections_for_both_student_types():
    assert client(CASES['regular_missing_section'])['errs'] == [2]
    assert client(CASES['irregular_missing_section'])['errs'] == [2]
    assert client(CASES['irregular_one_bad_row'])['errs'] == [3]
    assert client(CASES['irregular_two_sections'])['errs'] == []      # one student, two rows, both fine
    assert client(CASES['regular_two_sections'])['errs'] == []


def test_unknown_section_is_left_to_the_server(admin):
    text = CASES['unknown_section_server_only']
    assert client(text)['errs'] == []
    b, bad = server(admin, text)
    assert bad == {2} and b['summary']['enrolled'] == 0


def test_server_still_authoritative_for_irregular_partial_rows(admin):
    b, bad = server(admin, CASES['irregular_one_bad_row'].replace('9005', '9105'))
    assert bad == {3}
    assert b['summary']['enrolled'] == 1       # the good row is enrolled, the bad one is skipped
    with A.app.app_context():
        u = A.User.query.filter_by(username='9105').first()
        assert A.IrregularEnrollment.query.filter_by(student_id=u.id).count() == 1


def test_all_sample_files_agree():
    for fn in sorted(os.listdir(SAMPLES)):
        if not fn.endswith('.csv') or not fn[0].isdigit():
            continue
        text = open(os.path.join(SAMPLES, fn), encoding='utf-8').read()
        c = client(text)
        # samples use class codes that do not exist here; only layout errors may be reported by the preview
        if fn.startswith('3_'):
            assert c['errs'] == [2]
