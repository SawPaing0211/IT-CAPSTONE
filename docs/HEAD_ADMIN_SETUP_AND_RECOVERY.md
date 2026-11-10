# Head administrator: setup and recovery

Forge.dev has no built-in head administrator. `HEAD_ADMIN_USER_ID` identifies the one
existing administrator allowed to create or promote other administrators. The legacy
`HEAD_ADMIN_EMAIL` selector is used only if the ID setting is absent.

## Behaviour when it is not set (or is malformed)
- The server starts normally and prints a NOTICE; `/api/admin/policy` reports
  `head_admin_configured: false` and a diagnostic.
- Everyone can still sign in. Administrators keep every other admin function.
- Creating or promoting administrator accounts is refused (403) for everybody.
- No address is ever authorized because of its domain or because an old default existed.

## Setup (once, before final testing)
1. Decide which existing administrator is the head admin (project owner's decision; do not guess).
2. Confirm that account exists, is active, and its owner can sign in:
   `python account_inventory.py --head-admin <email> --out <new-private-plan.csv>`
   (read-only). It must report the verified ID of the configured, active administrator.
3. Set `HEAD_ADMIN_USER_ID` to that ID in the deployment's backend environment and
   restart the backend during the approved cutover. A nonempty invalid ID does not fall back to email.
4. Sign in as that account; Admin > Create User now offers the Administrator role.

## If the head admin cannot sign in (lockout / forgotten password)
- Another administrator can unlock the account (Admin > Users > Unlock) or reset its password.
  These do not grant head-admin rights to anybody else.
- If no administrator can sign in, recover from the server: a person with database access
  sets a new password hash for the verified account (hash generated with Werkzeug
  `generate_password_hash`; never type a plain password into SQL or a log).
  Do this only after verifying the account holder's identity out of band.

## Changing who the head admin is
Change `HEAD_ADMIN_USER_ID` only after verifying the replacement account is the intended
active administrator. Changing an email does not transfer authority when the ID is set.

## What this procedure does NOT do
It creates no accounts, changes no identities and edits no permissions by itself.
