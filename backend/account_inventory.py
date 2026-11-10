"""Read-only preflight for existing Forge.Dev account email migration."""
import argparse
import csv
import os
from collections import Counter, defaultdict
from pathlib import Path

from sqlalchemy import create_engine, text

from account_email_policy import ACCOUNT_EMAIL_DOMAIN, email_domain_allowed, normalize_email


def plan_emails(users):
    """Return rows keyed by immutable user ID; preserve the stored email's local part."""
    targets = defaultdict(list)
    usernames = defaultdict(set)
    candidates = {}
    for user in users:
        old = normalize_email(user.email) or ''
        usernames[normalize_email(user.username)].add(user.id)
        proposed = ''
        if old.count('@') == 1:
            proposed = f'{old.split("@", 1)[0]}@{ACCOUNT_EMAIL_DOMAIN}'
        candidates[user.id] = proposed
        if email_domain_allowed(proposed):
            targets[proposed].append(user.id)

    rows = []
    for user in users:
        old = normalize_email(user.email)
        new = candidates[user.id]
        username = normalize_email(user.username) or ''
        if not email_domain_allowed(new):
            status = 'BLOCKED: malformed or missing email'
        elif len(targets[new]) != 1 or usernames[new] - {user.id}:
            status = 'BLOCKED: target email collides with another account'
        elif '@' in username and not email_domain_allowed(username):
            status = 'BLOCKED: legacy email-shaped username needs a verified replacement'
        else:
            status = 'unchanged' if new == old else 'ready'
        if status != 'unchanged':
            rows.append((user.id, user.role, user.email, new, status))
    return rows


def main():
    from dotenv import load_dotenv
    load_dotenv()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--legacy-domain', help='optional audit-history domain to count (no @)')
    parser.add_argument('--head-admin', default=os.environ.get('HEAD_ADMIN_EMAIL', ''),
                        help='legacy selector when HEAD_ADMIN_USER_ID is unset')
    parser.add_argument('--out', type=Path, default=Path('identity_migration_plan.csv'))
    args = parser.parse_args()
    url = os.environ.get('DATABASE_URL')
    if not url:
        parser.error('DATABASE_URL is not set.')
    engine = create_engine(url)
    with engine.connect() as connection:
        users = connection.execute(text('SELECT id, username, email, role, is_active FROM users ORDER BY id')).all()
        if args.legacy_domain:
            domain = args.legacy_domain.strip().lstrip('@').lower()
            hits = connection.execute(text('SELECT COUNT(*) FROM audit_logs WHERE details LIKE :pattern'),
                                      {'pattern': f'%@{domain}%'}).scalar()
            print(f'Audit-history matches (preserved): {hits}')

    rows = plan_emails(users)
    blocked = sum(row[-1].startswith('BLOCKED') for row in rows)
    # Preserve an existing plan. This CSV contains account identifiers.
    with args.out.open('x', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['account_id', 'role', 'current_email', 'proposed_email', 'status'])
        writer.writerows(rows)
    print(f'Accounts by role: {dict(Counter(user.role for user in users))}')
    print(f'Plan written: {len(rows)} rows; {blocked} blocked.')
    head_id = os.environ.get('HEAD_ADMIN_USER_ID', '').strip()
    active_admins = [user for user in users if user.role == 'administrator' and user.is_active]
    if head_id:
        matches = [user for user in active_admins if str(user.id) == head_id]
    else:
        legacy_head = normalize_email(args.head_admin)
        matches = [user for user in active_admins if legacy_head and normalize_email(user.email) == legacy_head]
    if len(matches) != 1:
        print('STOP: no unique active Head Admin matches the configured identity.')
        return 2
    print(f'Verified configured Head Admin account ID: {matches[0].id}.')
    if not head_id:
        print('Before cutover, pin HEAD_ADMIN_USER_ID to that verified account ID and verify authority.')
    return 2 if blocked or not head_id else 0


if __name__ == '__main__':
    raise SystemExit(main())
