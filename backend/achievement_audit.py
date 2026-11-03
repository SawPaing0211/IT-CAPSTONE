"""
READ-ONLY audit of achievement award records. Never writes, merges, deletes, re-awards or recalculates anything.

  python manage_schema.py audit-achievements                  aggregate counts only (safe to paste into a review)
  python manage_schema.py audit-achievements --detail FILE    also write per-pair detail (user and award ids) to FILE.
                                                              FILE is sensitive: keep it with the backup, not in a ticket or screenshot.

Duplicate counts do NOT establish that anyone was overpaid or underpaid XP: XP has no ledger, concurrent writers
overwrote each other, and scoring history differs. This tool therefore reports no XP figures except the aggregate
number of users whose stored level differs from 1 + xp//100 (informational; nothing is repaired).
Exit code: 0 = no duplicate pairs, 4 = duplicate pairs exist (the uniqueness upgrade is blocked).
"""
import os, sys, json, hashlib
os.environ.pop('FORGE_AUTO_SCHEMA', None)            # importing the app must stay read-only
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import app as A
from sqlalchemy import text, inspect


def _fp(rows):
    h = hashlib.sha256()
    for r in rows:
        h.update(('|'.join('' if c is None else str(c) for c in r) + '\n').encode())
    return h.hexdigest()[:16]


def audit(detail=False):
    out = {}
    with A.app.app_context():
        conn = A.db.engine.connect()
        try:
            try:
                conn.execute(text('SET SESSION TRANSACTION READ ONLY')); out['session_read_only'] = True
            except Exception:
                out['session_read_only'] = False          # e.g. sqlite; still SELECT-only
            q = lambda sql: conn.execute(text(sql)).fetchall()
            out['engine'] = A.db.engine.dialect.name
            out['unique_pair_effective'] = A.award_pair_unique_present(inspect(conn))
            rows = q('SELECT id,user_id,achievement_id,earned_at,progress FROM user_achievements ORDER BY id')
            out['total_rows'] = len(rows)
            out['fingerprint_of_all_rows'] = _fp(rows)       # prove preservation: must be identical after any non-reconciliation work
            groups = {}
            for r in rows:
                groups.setdefault((r[1], r[2]), []).append(r)
            dup = {k: v for k, v in groups.items() if len(v) > 1}
            out['distinct_pairs'] = len(groups)
            out['duplicate_pairs'] = len(dup)
            out['excess_rows'] = sum(len(v) - 1 for v in dup.values())
            out['users_with_duplicates'] = len({k[0] for k in dup})
            out['copies_histogram'] = {str(n): sum(1 for v in dup.values() if len(v) == n) for n in sorted({len(v) for v in dup.values()})}
            out['pairs_with_different_earned_at'] = sum(1 for v in dup.values() if len({x[3] for x in v}) > 1)
            out['pairs_with_different_progress'] = sum(1 for v in dup.values() if len({x[4] for x in v}) > 1)
            out['rows_with_null_earned_at'] = sum(1 for r in rows if r[3] is None)
            out['pairs_where_every_row_has_null_earned_at'] = sum(1 for v in groups.values() if all(x[3] is None for x in v))
            out['orphans'] = {
                'rows_without_user': q('SELECT COUNT(*) FROM user_achievements ua LEFT JOIN users u ON u.id=ua.user_id WHERE u.id IS NULL')[0][0],
                'rows_without_achievement': q('SELECT COUNT(*) FROM user_achievements ua LEFT JOIN achievements a ON a.id=ua.achievement_id WHERE a.id IS NULL')[0][0]}
            defs = {r[0]: (r[1], r[2]) for r in q('SELECT id, category, requirement_type FROM achievements')}
            unsupported_ids = {i for i, (c, t) in defs.items() if not A.achievement_attainable(c, t)}
            out['historical_awards_of_unsupported_definitions'] = {
                'rows': sum(1 for r in rows if r[2] in unsupported_ids),
                'pairs': sum(1 for k in groups if k[1] in unsupported_ids)}
            out['stale_level_users_informational'] = sum(1 for r in q('SELECT xp, level FROM users') if (r[1] or 0) != 1 + int(r[0] or 0) // 100)
            out['foreign_keys_pointing_at_user_achievements'] = q(
                "SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() "
                "AND REFERENCED_TABLE_NAME='user_achievements'") if out['engine'] != 'sqlite' else []
            out['foreign_keys_pointing_at_user_achievements'] = [list(x) for x in out['foreign_keys_pointing_at_user_achievements']]
            # what the reviewed design (a) would create, as counts only
            out['design_preview'] = {'canonical_entitlements_would_be': len(groups),
                                     'original_rows_retained_unchanged': len(rows),
                                     'pairs_needing_a_tie_break_on_id': sum(1 for v in dup.values() if len({x[3] for x in v}) == 1)}
            if detail:
                out['_detail'] = [{'user_id': k[0], 'achievement_id': k[1],
                                   'rows': [{'id': x[0], 'earned_at': None if x[3] is None else (x[3].isoformat() + 'Z' if hasattr(x[3], 'isoformat') else str(x[3])), 'progress': x[4]} for x in v]}
                                  for k, v in sorted(dup.items())]
        finally:
            conn.invalidate(); conn.close()           # never return a READ ONLY session to the pool
    return out


def main(argv):
    detail_path = argv[argv.index('--detail') + 1] if '--detail' in argv else None
    rep = audit(detail=bool(detail_path))
    det = rep.pop('_detail', None)
    print(json.dumps(rep, indent=2, default=str))
    if detail_path:
        with open(detail_path, 'w') as f:
            json.dump(det, f, indent=2)
        print(f'per-pair detail written to {detail_path} (sensitive: ids of real users; keep with the backup)')
    return 0 if rep['duplicate_pairs'] == 0 else 4


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
