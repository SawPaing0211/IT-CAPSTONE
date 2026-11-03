# Head administrator: setup and recovery

Forge.dev has no built-in head administrator. `HEAD_ADMIN_EMAIL` in `backend/.env` names
the ONE existing administrator account allowed to create or promote other administrators.

## Behaviour when it is not set (or is malformed)
- The server starts normally and prints a NOTICE; `/api/admin/policy` reports
  `head_admin_configured: false` and a diagnostic.
- Everyone can still sign in. Administrators keep every other admin function.
- Creating or promoting administrator accounts is refused (403) for everybody.
- No address is ever authorized because of its domain or because an old default existed.

## Setup (once, before final testing)
1. Decide which existing administrator is the head admin (project owner's decision; do not guess).
2. Confirm that account exists, is active, and its owner can sign in:
   `python account_inventory.py --legacy-domain <old-domain> --head-admin <email>`
   (read-only). It must report "matches exactly one ACTIVE administrator".
3. Put that exact email in `backend/.env` as `HEAD_ADMIN_EMAIL=...` (and, for Docker, in the
   repo-root `.env`). Restart the backend.
4. Sign in as that account; Admin > Create User now offers the Administrator role.

## If the head admin cannot sign in (lockout / forgotten password)
- Another administrator can unlock the account (Admin > Users > Unlock) or reset its password.
  These do not grant head-admin rights to anybody else.
- If no administrator can sign in, recover from the server: a person with database access
  sets a new password hash for the verified account (hash generated with Werkzeug
  `generate_password_hash`; never type a plain password into SQL or a log).
  Do this only after verifying the account holder's identity out of band.

## Changing who the head admin is
Change the account's email and `HEAD_ADMIN_EMAIL` together, in one maintenance step, after
the new account has been verified. Until both match, privileged admin creation stays disabled
(safe failure). Never create a new administrator account just to satisfy the setting.

## What this procedure does NOT do
It creates no accounts, changes no identities and edits no permissions by itself.
