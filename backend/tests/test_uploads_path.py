# Lesson-file paths stay inside the uploads folder; upload/download/delete use that folder, not the launch directory.
import os, sys, io, tempfile
import pytest
_db = os.path.join(tempfile.mkdtemp(), 'uploads_test.db')
os.environ.setdefault('DATABASE_URL', f'sqlite:///{_db}')
os.environ.pop('FORGE_ENV', None)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import app as A
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash


def test_paths_cannot_escape_the_uploads_folder(tmp_path, monkeypatch):
    monkeypatch.setattr(A, 'UPLOAD_ROOT', str(tmp_path))
    ok = A.upload_abs_path('uploads/lessons/1/a.pdf')
    assert ok == os.path.join(str(tmp_path), 'lessons', '1', 'a.pdf')
    assert A.upload_abs_path('lessons/1/a.pdf') == ok                       # prefix is optional
    for bad in ('uploads/../../etc/passwd', '../x', '/etc/passwd', 'uploads/lessons/../../../x', ''):
        got = A.upload_abs_path(bad)
        assert got is None or got.startswith(str(tmp_path) + os.sep), bad
    assert A.upload_abs_path('uploads/../../x') is None


def test_upload_download_delete_use_the_uploads_folder(tmp_path, monkeypatch):
    monkeypatch.setattr(A, 'UPLOAD_ROOT', str(tmp_path))
    monkeypatch.chdir(tempfile.mkdtemp())                                   # launch directory must not matter
    with A.app.app_context():
        ins = A.User(username='upl_ins', email='upl_ins@example.com', role='instructor',
                     password_hash=generate_password_hash('x'), full_name='I')
        subj = A.Subject(name='UPLS', subject_code='UPLS1', year_level=1, subject_type='lab')
        A.db.session.add_all([ins, subj]); A.db.session.flush()
        lesson = A.Lesson(title='L', description='d', week_number=1, subject_id=subj.id, created_by=ins.id)
        A.db.session.add(lesson); A.db.session.commit()
        lid = lesson.id
        h = {'Authorization': f'Bearer {create_access_token(identity=str(ins.id))}'}
    c = A.app.test_client()
    r = c.post(f'/api/lessons/{lid}/files', headers=h, data={'file': (io.BytesIO(b'hello'), 'n.pdf')},
               content_type='multipart/form-data')
    assert r.status_code == 201, r.get_json()
    fid = r.get_json()['file_id']
    with A.app.app_context():
        sp = A.db.session.get(A.LessonFile, fid).storage_path
    assert sp.startswith('uploads/lessons/') and '\\' not in sp
    assert os.path.exists(os.path.join(str(tmp_path), 'lessons', str(lid), os.path.basename(sp)))
    d = c.get(f'/api/lessons/{lid}/files/{fid}/download', headers=h)
    assert d.status_code == 200 and d.data == b'hello'
    assert c.delete(f'/api/lessons/{lid}/files/{fid}', headers=h).status_code == 200
    assert not os.path.exists(os.path.join(str(tmp_path), 'lessons', str(lid), os.path.basename(sp)))
