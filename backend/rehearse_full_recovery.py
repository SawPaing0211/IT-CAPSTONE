"""
Prepare SYNTHETIC source data for a database-plus-files recovery rehearsal. Never touches real data:
it refuses unless FORGE_DEMO=1, the database name contains demo/test, and FORGE_UPLOADS_DIR is set.
It uploads a few synthetic files through the application's own upload endpoint, so rows and files
are created exactly as in real use.
Usage: FORGE_DEMO=1 DATABASE_URL=sqlite:////tmp/x/source_demo.db FORGE_UPLOADS_DIR=/tmp/x/src_uploads python rehearse_full_recovery.py
"""
import os, sys, io
if os.environ.get('FORGE_DEMO') != '1' or not os.environ.get('FORGE_UPLOADS_DIR'):
    raise SystemExit('needs FORGE_DEMO=1 and FORGE_UPLOADS_DIR')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import app as A
from flask_jwt_extended import create_access_token
from sqlalchemy.engine import make_url
if not any(w in (make_url(A.app.config['SQLALCHEMY_DATABASE_URI']).database or '').lower() for w in ('demo', 'test')):
    raise SystemExit('database name must contain demo/test')
with A.app.app_context():
    lessons = A.Lesson.query.order_by(A.Lesson.id).limit(3).all()
    assert lessons, 'the synthetic demo database has no lessons'
    # the demo seed lists a few attachments (rows) that have no file behind them: drop them from this COPY so
    # the rehearsal starts from a consistent state (backup_full.py check-files reports such rows on real systems)
    phantom = [f for f in A.LessonFile.query.all() if not (A.upload_abs_path(f.storage_path) and os.path.exists(A.upload_abs_path(f.storage_path)))]
    for f in phantom:
        A.db.session.delete(f)
    A.db.session.commit()
    print('removed', len(phantom), 'seed attachment rows that had no file')
    c = A.app.test_client()
    plan = [(lessons[0], 'week1_intro.pdf', b'%PDF-1.4 synthetic one\n' + os.urandom(2048)),
            (lessons[0], 'slides.pptx', b'PK synthetic slides ' + os.urandom(5000)),
            (lessons[-1], 'Handout – Pointers.docx', b'PK synthetic docx ' + os.urandom(777)),
            (lessons[-1], 'starter.zip', b'PK\x03\x04 synthetic zip ' + os.urandom(12000))]
    for lesson, name, data in plan:
        tok = create_access_token(identity=str(lesson.created_by),
                                  additional_claims={'tv': int(A.db.session.get(A.User, lesson.created_by).token_version or 0)})
        r = c.post(f'/api/lessons/{lesson.id}/files', headers={'Authorization': f'Bearer {tok}'},
                   data={'file': (io.BytesIO(data), name)}, content_type='multipart/form-data')
        print(lesson.id, name, r.status_code)
        assert r.status_code == 201, r.get_json()
