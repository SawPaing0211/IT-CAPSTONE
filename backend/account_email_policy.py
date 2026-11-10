"""Shared account identifier policy for the API and migration preflight."""
import re as _re

ACCOUNT_EMAIL_DOMAIN = 'laconsolacion.edu'
_EMAIL_RE = _re.compile(r'^[^@\s]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$')

def normalize_email(value):
    """Trimmed, lower-cased email for comparison (None for empty)."""
    v = value.strip().lower() if isinstance(value, str) else ''
    return v or None


def normalize_student_id(value):
    """Student IDs are strings; only surrounding whitespace is removed (leading zeros kept)."""
    return str(value if value is not None else '').strip()


def valid_student_id(sid):
    """Non-empty, no whitespace, no '@' (so an ID can never look like an email)."""
    return bool(sid) and len(sid) <= 64 and not _re.search(r'[\s@\x00-\x1f\x7f]', sid)


def generated_student_email(student_id):
    """Generated sign-in identifier for a student: <student_id>@<ACCOUNT_EMAIL_DOMAIN>."""
    return f"{normalize_student_id(student_id).lower()}@{ACCOUNT_EMAIL_DOMAIN}"


def email_domain_allowed(email):
    """Accept a well-formed account address on the institution domain."""
    e = normalize_email(email)
    return bool(e and len(e) <= 100 and _EMAIL_RE.fullmatch(e)
                and not _re.search(r'[\x00-\x1f\x7f]', e)
                and e.rpartition('@')[2] == ACCOUNT_EMAIL_DOMAIN)


def account_email(username, role, supplied):
    """Validate a supplied institutional address or generate the sign-in address."""
    if supplied is not None and not isinstance(supplied, str):
        raise ValueError('Email must be text.')
    email = normalize_email(supplied)
    if email and not email_domain_allowed(email):
        raise ValueError(f'Only @{ACCOUNT_EMAIL_DOMAIN} email addresses are accepted.')
    if role == 'student':
        if not valid_student_id(username):
            raise ValueError("Student IDs cannot contain spaces, '@', or control characters.")
        expected = generated_student_email(username)
        if email and email != expected:
            raise ValueError(f'Use the generated student sign-in address: {expected}.')
        return expected
    if email:
        return email
    local = _re.sub(r'[^a-z0-9]+', '.', username.lower()).strip('.')
    if not local:
        raise ValueError(f'Enter a username with letters or digits, or supply an @{ACCOUNT_EMAIL_DOMAIN} address.')
    return f'{local}@{ACCOUNT_EMAIL_DOMAIN}'
