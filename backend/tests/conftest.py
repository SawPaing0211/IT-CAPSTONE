# Test configuration. Set before the app module is imported; the app has no
# built-in head-admin default, so tests supply a clearly fictional one.
import os
os.environ.setdefault('HEAD_ADMIN_EMAIL', 'head.admin@forge-test.example')
os.environ.setdefault('HEAD_ADMIN_USER_ID', '')
os.environ.setdefault('STUDENT_EMAIL_DOMAIN', 'student.com')
os.environ.pop('ALLOWED_EMAIL_DOMAIN', None)
# the test suite uses throwaway databases and needs the tables created
os.environ.setdefault('FORGE_AUTO_SCHEMA', '1')
