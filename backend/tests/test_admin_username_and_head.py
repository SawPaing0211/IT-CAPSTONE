"""Run with unittest in a synthetic SQLite process; never uses the application DB."""
import os
import sys
import tempfile
import unittest
from pathlib import Path

if __name__ == '__main__':
    os.environ['DATABASE_URL'] = 'sqlite:///' + str(Path(tempfile.gettempdir()) / ('forge-admin-' + os.urandom(8).hex() + '.db')).replace('\\', '/')
    os.environ['FORGE_AUTO_SCHEMA'] = '1'
    os.environ['FORGE_ENV'] = 'development'
    os.environ['HEAD_ADMIN_USER_ID'] = ''
    os.environ['HEAD_ADMIN_EMAIL'] = 'head.admin@forge-test.example'
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app as A
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash
from unittest.mock import patch


class AdminAccountTests(unittest.TestCase):
    def setUp(self):
        self.context = A.app.app_context()
        self.context.push()
        self.users = {}
        for key, role in [('head', 'administrator'), ('admin', 'administrator'), ('student', 'student'), ('teacher', 'instructor')]:
            user = A.User(username='permission_' + key, email=f'{key}@example.test', role=role,
                          password_hash=generate_password_hash('Testing123!'), xp=125, level=2)
            A.db.session.add(user)
            self.users[key] = user
        A.db.session.commit()
        self.head_patch = patch.object(A, 'HEAD_ADMIN_USER_ID', self.users['head'].id)
        self.setting_patch = patch.object(A, '_head_id_setting', str(self.users['head'].id))
        self.head_patch.start()
        self.setting_patch.start()
        self.headers = {k: {'Authorization': 'Bearer ' + create_access_token(identity=str(u.id))} for k, u in self.users.items()}
        self.client = A.app.test_client()

    def tearDown(self):
        A.db.session.rollback()
        self.head_patch.stop()
        self.setting_patch.stop()
        # Test transaction cleanup is confined to the synthetic test database.
        for user in A.User.query.filter(A.User.username.like('permission_%')).all():
            A.db.session.delete(user)
        A.db.session.commit()
        A.db.session.remove()
        self.context.pop()

    def url(self, key):
        return f'/api/admin/users/{self.users[key].id}'

    def test_rename_preserves_identity_and_login(self):
        user = self.users['student']
        original = (user.id, user.email, user.password_hash, user.xp, user.level)
        r = self.client.put(self.url('student'), headers=self.headers['admin'], json={'username': 'permission_renamed'})
        self.assertEqual(r.status_code, 200, r.get_json())
        A.db.session.expire_all()
        self.assertEqual(user.username, 'permission_renamed')
        self.assertEqual((user.id, user.email, user.password_hash, user.xp, user.level), original)
        self.assertEqual(self.client.post('/api/auth/login', json={'username': 'permission_renamed', 'password': 'Testing123!'}).status_code, 200)
        self.assertEqual(self.client.post('/api/auth/login', json={'username': 'permission_student', 'password': 'Testing123!'}).status_code, 401)

    def test_invalid_username_and_collision_are_atomic(self):
        for name in ['', ' ', None, 123, 'x'*51, 'a\nb', 'has spaces', 'other@example.test']:
            with self.subTest(name=name):
                r = self.client.put(self.url('student'), headers=self.headers['admin'], json={'username': name, 'xp': 999})
                self.assertEqual(r.status_code, 400)
                self.assertEqual(self.users['student'].username, 'permission_student')
                self.assertEqual(self.users['student'].xp, 125)
        for name in ['PERMISSION_ADMIN', 'admin@example.test']:
            r = self.client.put(self.url('teacher'), headers=self.headers['admin'], json={'username': name})
            self.assertEqual(r.status_code, 409)

    def test_regular_admin_cannot_take_over_administrators(self):
        for target in ['head', 'admin']:
            for operation in ['update', 'delete', 'reset-password', 'unlock']:
                with self.subTest(target=target, operation=operation):
                    path = self.url(target)
                    if operation == 'update':
                        r = self.client.put(path, headers=self.headers['admin'], json={'username': 'permission_takeover'})
                    elif operation == 'delete':
                        r = self.client.delete(path, headers=self.headers['admin'])
                    else:
                        r = self.client.post(path + '/' + operation, headers=self.headers['admin'], json={'new_password': 'Takeover123!'})
                    self.assertEqual(r.status_code, 400 if target == 'admin' and operation == 'delete' else 403)
                    self.assertIsNotNone(A.db.session.get(A.User, self.users[target].id))

    def test_only_head_creates_and_promotes_admins(self):
        body = {'username': 'permission_created', 'email': 'created@example.test', 'password': 'Testing123!', 'role': 'administrator'}
        self.assertEqual(self.client.post('/api/admin/users', headers=self.headers['admin'], json=body).status_code, 403)
        self.assertEqual(self.client.post('/api/admin/users', headers=self.headers['head'], json=body).status_code, 201)
        self.assertEqual(self.client.put(self.url('teacher'), headers=self.headers['admin'], json={'role':'administrator'}).status_code, 403)
        self.assertEqual(self.client.put(self.url('teacher'), headers=self.headers['head'], json={'role':'administrator'}).status_code, 200)

    def test_regular_admin_creates_students_and_instructors(self):
        for role in ['student', 'instructor']:
            body = {'username': 'permission_new_' + role, 'email': '' if role == 'student' else 'new@example.test', 'password': 'Testing123!', 'role': role}
            r = self.client.post('/api/admin/users', headers=self.headers['admin'], json=body)
            self.assertEqual(r.status_code, 201, r.get_json())

    def test_identity_binding_and_ui_policy(self):
        head = self.users['head']
        head.username, head.email = 'permission_new_head', 'renamed@example.test'
        self.assertTrue(A.is_head_admin(head))
        self.assertFalse(A.is_head_admin(self.users['admin']))
        policy = self.client.get('/api/admin/policy', headers=self.headers['head']).get_json()
        self.assertTrue(policy['can_create_admins'] and policy['head_admin_account_exists'])
        listing = self.client.get('/api/admin/users', headers=self.headers['admin']).get_json()
        protected = next(u for u in listing if u['id'] == head.id)
        self.assertTrue(protected['is_head_admin'])
        self.assertFalse(protected['can_manage'] or protected['can_delete'])
        with patch.object(A, 'HEAD_ADMIN_USER_ID', None), patch.object(A, '_head_id_setting', 'invalid'):
            self.assertFalse(A.is_head_admin(head))

    def test_non_admin_is_forbidden(self):
        r = self.client.put(self.url('student'), headers=self.headers['teacher'], json={'username':'permission_other'})
        self.assertEqual(r.status_code, 403)

    def test_full_names_for_students_and_instructors_preserve_account_identity(self):
        for key, name in [('student', '  María Santos-Reyes  '), ('teacher', 'Professor José Dela Cruz')]:
            with self.subTest(role=key):
                user = self.users[key]
                original = (user.id, user.username, user.email, user.password_hash, user.xp, user.level, user.role, user.is_active)
                response = self.client.put(self.url(key), headers=self.headers['admin'], json={'full_name': name})
                self.assertEqual(response.status_code, 200, response.get_json())
                A.db.session.expire_all()
                self.assertEqual(user.full_name, name.strip())
                self.assertEqual((user.id, user.username, user.email, user.password_hash, user.xp, user.level, user.role, user.is_active), original)
                listing = self.client.get('/api/admin/users', headers=self.headers['admin']).get_json()
                self.assertEqual(next(row['full_name'] for row in listing if row['id'] == user.id), name.strip())
        self.assertEqual(self.client.put(self.url('student'), headers=self.headers['admin'], json={'full_name': ''}).status_code, 200)
        self.assertIsNone(self.users['student'].full_name)

    def test_invalid_full_name_rejects_entire_update(self):
        student = self.users['student']
        student.full_name = 'Original Name'
        A.db.session.commit()
        for name in [None, 123, ['Name'], 'x' * 201, 'First\nLast', 'First\x00Last']:
            with self.subTest(name=name):
                response = self.client.put(self.url('student'), headers=self.headers['admin'], json={'full_name': name, 'username': 'permission_rejected', 'xp': 999})
                self.assertEqual(response.status_code, 400)
                A.db.session.expire_all()
                self.assertEqual(student.full_name, 'Original Name')
                self.assertEqual(student.username, 'permission_student')
                self.assertEqual(student.xp, 125)

    def test_full_name_changes_require_admin_and_cannot_modify_admin_names(self):
        self.assertEqual(self.client.put(self.url('student'), headers=self.headers['teacher'], json={'full_name': 'Not allowed'}).status_code, 403)
        self.assertEqual(self.client.put(self.url('teacher'), headers=self.headers['student'], json={'full_name': 'Not allowed'}).status_code, 403)
        self.assertEqual(self.client.put(self.url('head'), headers=self.headers['admin'], json={'full_name': 'Not allowed'}).status_code, 403)
        self.assertEqual(self.client.put(self.url('admin'), headers=self.headers['head'], json={'full_name': 'Not allowed'}).status_code, 400)


if __name__ == '__main__':
    unittest.main()
