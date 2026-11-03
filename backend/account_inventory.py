"""
READ-ONLY account inventory and DRY-RUN identity migration plan.
Run from the backend folder:
    python account_inventory.py --legacy-domain <old-email-domain> [--head-admin <email>] [--out plan.csv]

* Only SELECTs are executed. Nothing is written to the database.
* Passwords/hashes are never read. Output is counts plus a CSV of PROPOSED changes
  (account id, role, old identifier, proposed identifier, status) using account ids,
  not names. Review the plan before any migration is written.
* Students: proposed email = <student_id>@<STUDENT_EMAIL_DOMAIN> (default student.com).
* Staff: NO replacement is invented; each needs an address supplied by the university.
"""
import argparse, csv, os, collections
from sqlalchemy import create_engine, text
try:
    from dotenv import load_dotenv; load_dotenv()
except Exception:
    pass

ap = argparse.ArgumentParser()
ap.add_argument('--legacy-domain', required=True, help='old email domain to inventory (no @)')
ap.add_argument('--head-admin', default=os.environ.get('HEAD_ADMIN_EMAIL', ''), help='intended head-admin email')
ap.add_argument('--out', default='identity_migration_plan.csv')
a = ap.parse_args()
legacy = a.legacy_domain.strip().lstrip('@').lower()
student_domain = os.environ.get('STUDENT_EMAIL_DOMAIN', 'student.com').strip().lstrip('@').lower()
head = (a.head_admin or '').strip().lower()

url = os.environ.get('DATABASE_URL')
if not url:
    raise SystemExit("DATABASE_URL is not set (check backend/.env).")
eng = create_engine(url)
with eng.connect() as c:
    users = c.execute(text("SELECT id, username, email, role, is_active FROM users")).fetchall()
    audit_hits = c.execute(text("SELECT COUNT(*) FROM audit_logs WHERE details LIKE :p"),
                           {'p': f'%{legacy}%'}).scalar()

by_role = collections.Counter(u.role for u in users)
print("accounts by role:", dict(by_role))
leg = [u for u in users if (u.email or '').lower().endswith('@' + legacy)]
print(f"accounts with a @{legacy} email: {len(leg)} ->", dict(collections.Counter(u.role for u in leg)))
print(f"audit-log rows mentioning {legacy} (kept untouched): {audit_hits}")

taken_emails = collections.Counter((u.email or '').strip().lower() for u in users)
taken_usernames = {u.username for u in users}
rows, problems = [], 0
proposed_seen = collections.Counter()
for u in leg:
    if u.role == 'student':
        sid = (u.username or '').strip()
        new = f"{sid.lower()}@{student_domain}" if sid and not any(ch.isspace() or ch == '@' for ch in sid) else ''
        status = 'ok'
        if not new:
            status = 'BLOCKED: username is not a usable student ID'
        else:
            proposed_seen[new] += 1
            if taken_emails.get(new, 0) and new != (u.email or '').lower():
                status = 'BLOCKED: proposed identifier already used by another account'
    else:
        new, status = '', 'NEEDS VALUE: staff address must be supplied by the university'
    if status != 'ok':
        problems += 1
    rows.append([u.id, u.role, 'active' if u.is_active else 'inactive', u.email, new, status])
for r in rows:
    if r[4] and proposed_seen[r[4]] > 1 and r[5] == 'ok':
        r[5] = 'BLOCKED: two accounts would get the same identifier'; problems += 1

with open(a.out, 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f); w.writerow(['account_id', 'role', 'state', 'current_email', 'proposed_email', 'status'])
    w.writerows(rows)
print(f"plan written to {a.out}: {len(rows)} rows, {problems} need attention")
print("student rows ready:", sum(1 for r in rows if r[1] == 'student' and r[5] == 'ok'))
print("staff rows awaiting a supplied address:", sum(1 for r in rows if r[5].startswith('NEEDS VALUE')))

admins = [u for u in users if u.role == 'administrator']
print(f"\nadministrator accounts: {len(admins)} (ids: {[u.id for u in admins]})")
if not head:
    print("head admin: NOT CONFIGURED -> admin creation/promotion stays disabled. Decide which existing "
          "administrator account is the head admin, then set HEAD_ADMIN_EMAIL to its exact email.")
else:
    m = [u for u in admins if (u.email or '').strip().lower() == head]
    if len(m) == 1:
        print(f"head admin {head!r}: matches exactly one ACTIVE={bool(m[0].is_active)} administrator (id {m[0].id}).")
    elif not m:
        print(f"head admin {head!r}: NO administrator account has this email -> do not enable until fixed.")
    else:
        print(f"head admin {head!r}: matches {len(m)} accounts -> ambiguous, fix first.")
    lm = [u for u in admins if (u.email or '').lower().endswith('@' + legacy)]
    if lm and (not m or any(x.id in [y.id for y in lm] for x in m)):
        print("NOTE: the head-admin email is itself a legacy address; changing it needs a coordinated step "
              "(update the account email AND HEAD_ADMIN_EMAIL together).")
print("\nCollisions of existing emails (case-insensitive):",
      [e for e, n in taken_emails.items() if e and n > 1] or "none")
