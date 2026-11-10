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

    def test_class_summaries_use_section_scope_and_published_quest_counts(self):
        A.db.session.add(A.TeacherAssignment(instructor_id=self.teacher.id, subject_id=self.subject.id, section_id=self.other_section.id))
        A.db.session.commit()
        self.assertEqual(self.create().status_code, 201)
        self.assertEqual(self.create(section_id=self.other_section.id).status_code, 201)
        self.assertEqual(self.create(section_id=self.other_section.id).status_code, 201)
        for sections, published in [([self.section.id, self.section.id], True), ([self.other_section.id], True),
                                    ([self.other_section.id], True), ([self.section.id], False)]:
            A.db.session.add(A.Problem(title='Scope check', description='Synthetic', difficulty='Easy', test_cases=[],
                                       xp_reward=1, subject_id=self.subject.id, created_by=self.teacher.id,
                                       visible_to_sections=sections, is_published=published))
        A.db.session.commit()
        try:
            response = self.client.get('/api/instructor/classes', headers=self.headers['teacher'])
            self.assertEqual(response.status_code, 200)
            self.assertEqual({item['id']: (item['problem_count'], item['lesson_count']) for item in response.json},
                             {self.section.id: (1, 1), self.other_section.id: (2, 2)})
            detail = self.client.get(f'/api/instructor/classes/{self.section.id}', headers=self.headers['teacher'])
            self.assertEqual((detail.json['problem_count'], detail.json['lesson_count']), (1, 1))
            activity = self.client.get(f'/api/instructor/classes/{self.section.id}/problems', headers=self.headers['teacher'])
            self.assertEqual(len(activity.json), 2)
        finally:
            A.Problem.query.filter_by(created_by=self.teacher.id).delete()
            A.db.session.commit()

    def test_unassigned_class_quest_list_is_denied(self):
        response = self.client.get(f'/api/instructor/classes/{self.other_section.id}/problems', headers=self.headers['teacher'])
        self.assertEqual(response.status_code, 403)

    def test_quest_save_rejects_unassigned_sections(self):
        payload = {
            'title': 'Scope check', 'description': 'Synthetic quest', 'difficulty': 'Easy',
            'xp_reward': 1, 'test_cases': [{'input': '', 'expected': '1'}],
            'subject_id': self.subject.id, 'visible_to_sections': [self.section.id, self.other_section.id],
        }
        headers = self.headers['teacher']
        try:
            self.assertEqual(self.client.post('/api/problems', headers=headers, json=payload).status_code, 403)
            self.assertEqual(A.Problem.query.filter_by(created_by=self.teacher.id).count(), 0)
            created = self.client.post('/api/problems', headers=headers,
                                       json={**payload, 'visible_to_sections': [self.section.id]})
            self.assertEqual(created.status_code, 201)
            quest = A.Problem.query.filter_by(created_by=self.teacher.id).one()
            quest_id = quest.id
            self.assertEqual(self.client.put(f'/api/problems/{quest_id}', headers=headers, json=payload).status_code, 403)
            self.assertEqual(A.db.session.get(A.Problem, quest_id).visible_to_sections, [self.section.id])
        finally:
            A.Problem.query.filter_by(created_by=self.teacher.id).delete()
            A.db.session.commit()

    def test_announcement_reads_require_class_membership(self):
        response = self.client.post('/api/announcements', headers=self.headers['teacher'],
                                    json={'class_id': self.section.id, 'title': 'Scoped update', 'content': 'Synthetic announcement'})
        self.assertEqual(response.status_code, 201)
        try:
            path = f'/api/announcements?class_id={self.section.id}'
            for role in ['teacher', 'student']:
                allowed = self.client.get(path, headers=self.headers[role])
                self.assertEqual(allowed.status_code, 200)
                self.assertEqual([item['title'] for item in allowed.json], ['Scoped update'])
                self.assertIs(allowed.json[0]['can_manage'], role == 'teacher')
            self.assertEqual(self.client.get(path, headers=self.headers['other']).status_code, 403)
            self.assertEqual(self.client.get(f'/api/announcements?class_id={self.other_section.id}',
                                             headers=self.headers['teacher']).status_code, 403)
            self.assertEqual(self.client.get('/api/announcements?class_id=invalid', headers=self.headers['student']).status_code, 400)
            edit_path = f"/api/announcements/{response.json['announcement_id']}"
            edited = self.client.put(edit_path, headers=self.headers['teacher'],
                                     json={'title': 'Revised update', 'content': 'Synthetic announcement', 'is_pinned': True})
            self.assertEqual(edited.status_code, 200)
            self.assertTrue(self.client.get(path, headers=self.headers['student']).json[0]['is_pinned'])
            A.TeacherAssignment.query.filter_by(instructor_id=self.teacher.id, section_id=self.section.id).delete()
            A.db.session.commit()
            self.assertEqual(self.client.get(path, headers=self.headers['teacher']).status_code, 403)
            self.assertEqual(self.client.put(edit_path, headers=self.headers['teacher'],
                                             json={'title': 'Blocked', 'content': 'Blocked'}).status_code, 403)
            self.assertEqual(self.client.delete(edit_path, headers=self.headers['teacher']).status_code, 403)
            self.assertEqual(self.client.get(path, headers=self.headers['student']).json[0]['title'], 'Revised update')
        finally:
            A.Announcement.query.filter_by(id=response.json['announcement_id']).delete()
            A.db.session.commit()


if __name__ == '__main__':
    try: unittest.main()
    finally:
        with A.app.app_context(): A.db.session.remove(); A.db.engine.dispose()
        _scratch.cleanup()
