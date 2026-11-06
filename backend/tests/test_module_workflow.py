"""Module contracts in a disposable SQLite database and upload directory."""
import io
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

_scratch = tempfile.TemporaryDirectory(prefix='forge-module-check-')
if __name__ == '__main__':
    os.environ['DATABASE_URL'] = 'sqlite:///' + str(Path(_scratch.name, 'check.db')).replace('\\', '/')
    os.environ['FORGE_AUTO_SCHEMA'] = '1'
    os.environ['FORGE_ENV'] = 'development'
    os.environ['HEAD_ADMIN_USER_ID'] = ''
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app as A
from flask_jwt_extended import create_access_token


class ModuleWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.context = A.app.app_context()
        self.context.push()
        if A.db.engine.dialect.name != 'sqlite':
            self.context.pop()
            self.skipTest('Module tests require a synthetic SQLite target')
        self.uploads = patch.object(A, 'UPLOAD_ROOT', str(Path(_scratch.name, 'uploads')))
        self.uploads.start()
        self.teacher = A.User(username='module_teacher', email='teacher@module.test', role='instructor', password_hash='unused')
        self.student = A.User(username='module_student', email='student@module.test', role='student', password_hash='unused')
        self.other = A.User(username='module_other', email='other@module.test', role='student', password_hash='unused')
        self.subject = A.Subject(name='Module Test', subject_code='MTEST', year_level=1, subject_type='lab')
        A.db.session.add_all([self.teacher, self.student, self.other, self.subject]); A.db.session.flush()
        self.section = A.SubjectSection(section_no='MOD01', subject_id=self.subject.id)
        self.other_section = A.SubjectSection(section_no='MOD02', subject_id=self.subject.id)
        A.db.session.add_all([self.section, self.other_section]); A.db.session.flush()
        A.db.session.add_all([A.TeacherAssignment(instructor_id=self.teacher.id, subject_id=self.subject.id, section_id=self.section.id), A.IrregularEnrollment(student_id=self.student.id, section_id=self.section.id), A.IrregularEnrollment(student_id=self.other.id, section_id=self.other_section.id)])
        A.db.session.commit()
        self.headers = {name: {'Authorization': 'Bearer ' + create_access_token(identity=str(user.id))} for name, user in [('teacher', self.teacher), ('student', self.student), ('other', self.other)]}
        self.client = A.app.test_client()

    def tearDown(self):
        lesson_ids = [lesson.id for lesson in A.Lesson.query.filter_by(created_by=self.teacher.id).all()]
        if lesson_ids:
            A.LessonFile.query.filter(A.LessonFile.lesson_id.in_(lesson_ids)).delete(synchronize_session=False)
            A.Lesson.query.filter(A.Lesson.id.in_(lesson_ids)).delete(synchronize_session=False)
        A.IrregularEnrollment.query.filter(A.IrregularEnrollment.student_id.in_([self.student.id, self.other.id])).delete(synchronize_session=False)
        A.TeacherAssignment.query.filter_by(instructor_id=self.teacher.id).delete()
        for user in [self.teacher, self.student, self.other]: A.db.session.delete(user)
        A.db.session.delete(self.section); A.db.session.delete(self.other_section); A.db.session.delete(self.subject)
        A.db.session.commit(); A.db.session.remove()
        self.uploads.stop(); self.context.pop()

    def create(self, **overrides):
        payload = dict(title='Verification module', description='A real class-scoped description', week_number=1, subject_id=self.subject.id, section_id=self.section.id)
        payload.update(overrides)
        return self.client.post('/api/lessons', headers=self.headers['teacher'], json=payload)

    def test_draft_publish_attachment_and_class_authorization(self):
        response = self.create(); self.assertEqual(response.status_code, 201)
        lid = response.json['lesson_id']
        url = f'/api/student/lessons?section_id={self.section.id}'
        self.assertEqual(self.client.get(url, headers=self.headers['student']).json, [])
        content = b'%PDF-1.4\nmodule download fixture\n'
        uploaded = self.client.post(f'/api/lessons/{lid}/files', headers=self.headers['teacher'], data={'file': (io.BytesIO(content), 'module.pdf')})
        self.assertEqual(uploaded.status_code, 201)
        fid = uploaded.json['file_id']; file_url = f'/api/lessons/{lid}/files/{fid}/download'
        self.assertEqual(A.db.session.get(A.LessonFile, fid).file_size, len(content))
        self.assertEqual(self.client.get(file_url, headers=self.headers['student']).status_code, 403)
        self.assertEqual(self.client.put(f'/api/lessons/{lid}', headers=self.headers['teacher'], json={'is_published': True}).status_code, 200)
        self.assertEqual([item['id'] for item in self.client.get(url, headers=self.headers['student']).json], [lid])
        self.assertEqual(self.client.get(url, headers=self.headers['other']).json, [])
        self.assertEqual(self.client.get(file_url, headers=self.headers['other']).status_code, 403)
        with self.client.get(file_url, headers=self.headers['student']) as downloaded: self.assertEqual(downloaded.data, content)
        self.assertEqual(self.client.put(f'/api/lessons/{lid}', headers=self.headers['teacher'], json={'is_published': False}).status_code, 200)
        self.assertEqual(self.client.get(url, headers=self.headers['student']).json, [])

    def test_teacher_cannot_create_in_another_section_of_same_subject(self):
        payload = dict(title='No', description='Not assigned', week_number=1, subject_id=self.subject.id, section_id=self.other_section.id)
        self.assertEqual(self.client.post('/api/lessons', headers=self.headers['teacher'], json=payload).status_code, 403)
        self.assertEqual(A.Lesson.query.count(), 0)

    def test_required_fields_and_visibility_validation(self):
        for field, value in [('title', ' '), ('description', ''), ('week_number', 0), ('week_number', 19), ('week_number', 1.5), ('is_published', 'false')]:
            with self.subTest(field=field, value=value): self.assertEqual(self.create(**{field: value}).status_code, 400)

    def test_actual_upload_limit_and_unsupported_format(self):
        lid = self.create().json['lesson_id']
        path = f'/api/lessons/{lid}/files'
        self.assertEqual(self.client.post(path, headers=self.headers['teacher'], data={'file': (io.BytesIO(b'x' * (16 * 1024 * 1024 + 1)), 'large.pdf')}).status_code, 400)
        self.assertEqual(self.client.post(path, headers=self.headers['teacher'], data={'file': (io.BytesIO(b'x'), 'script.exe')}).status_code, 400)
        self.assertEqual(A.LessonFile.query.count(), 0)


if __name__ == '__main__':
    try: unittest.main()
    finally:
        with A.app.app_context(): A.db.session.remove(); A.db.engine.dispose()
        _scratch.cleanup()
