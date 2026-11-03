"""
Explicit schema operations. The web app itself NEVER changes the schema.

  python manage_schema.py status            read-only: shows the target and what is missing
  python manage_schema.py upgrade           creates missing tables / adds missing columns / seeds defaults
                                            (shows the target, asks you to type the database name)
  python manage_schema.py upgrade --yes     same, without the prompt; refused unless the database name contains demo/test
  Exit codes: status 0 = up to date, 3 = upgrade needed; upgrade 0 = up to date afterwards, non-zero = failed

  python manage_schema.py audit-achievements            READ-ONLY, aggregate counts only: duplicate award pairs, constraint state, references.
                                                         Add `--detail FILE` to write per-row detail to FILE (sensitive; keep it with the backup).

`upgrade` also adds UNIQUE(user_id, achievement_id) to user_achievements, but ONLY when no duplicate pair exists. If
duplicates exist it changes nothing, reports the blocker and exits non-zero: it never deletes, merges or re-awards.
See docs/ACHIEVEMENT_PRESERVATION_DESIGN.md.

Run `upgrade` only after taking a backup. It only ADDS (tables, columns, default rows);
see backend/migrations/*.sql for what each addition is and how to undo it.
"""
import os, sys
os.environ.pop('FORGE_AUTO_SCHEMA', None)      # importing the app must stay read-only
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import app as A

cmd = sys.argv[1] if len(sys.argv) > 1 else 'status'
print("Target database:", A.describe_database_target())
st = A.schema_status()
print("Up to date:", st["up_to_date"])
if not st["up_to_date"]:
    print("Missing tables :", st["missing_tables"] or "none")
    print("Missing columns:", st["missing_columns"] or "none")
    print("Missing constraints:", st.get("missing_constraints") or "none")
    if st.get("missing_constraints") and "user_achievements" in st["missing_constraints"]:
        _d = A.award_pair_duplicate_summary()
        if _d["duplicate_pairs"]:
            print(f"BLOCKER: {_d['duplicate_pairs']} duplicate (user, achievement) award pair(s) "
                  f"({_d['excess_rows']} extra rows) prevent the uniqueness upgrade. `upgrade` will not touch them; "
                  "a reviewed preservation plan is required (docs/ACHIEVEMENT_PRESERVATION_DESIGN.md).")
if cmd == 'audit-achievements':
    import achievement_audit as _AU
    raise SystemExit(_AU.main(sys.argv[2:]))
if cmd == 'status':
    raise SystemExit(0 if st["up_to_date"] else 3)     # non-zero when an upgrade is needed, so scripts can tell
if cmd != 'upgrade':
    raise SystemExit("Unknown command. Use: status | upgrade [--yes]")
if st["up_to_date"]:
    print("Nothing to upgrade.")
    raise SystemExit(0)
dbname = A.describe_database_target().rsplit('/', 1)[-1]
if '--yes' in sys.argv and not any(w in dbname.lower() for w in ('demo', 'test')):
    raise SystemExit(f"--yes is only for test/demo databases ('{dbname}' is neither). Run without --yes and confirm by typing the name.")
if '--yes' not in sys.argv:
    print("\nThis WRITES to the database above. Did you take a backup?")
    if input(f"Type the database name ({dbname}) to continue: ").strip() != dbname:
        raise SystemExit("Not confirmed. Nothing was changed.")
A.apply_schema_and_seed()
after = A.schema_status()
print("Done. Re-check:", after["up_to_date"])
if not after["up_to_date"]:
    print("STILL MISSING after the upgrade:", after["missing_tables"], after["missing_columns"], after.get("missing_constraints"))
    if (after.get("missing_constraints") or {}).get("user_achievements"):
        _d = A.award_pair_duplicate_summary()
        if _d["duplicate_pairs"]:
            print(f"BLOCKER: {_d['duplicate_pairs']} duplicate award pair(s) block the uniqueness constraint; nothing was deleted or merged.")
    if (after.get("missing_constraints") or {}).get("user_achievements") and not (after["missing_tables"] or after["missing_columns"]):
        raise SystemExit("Everything else was applied (additive only). The award-uniqueness step is BLOCKED by existing duplicate rows: "
                         "nothing was deleted or merged. Follow docs/ACHIEVEMENT_PRESERVATION_DESIGN.md; the app stays at 'upgrade required' until then.")
    raise SystemExit("The upgrade did not finish. Restore from the backup you took and report this output.")
