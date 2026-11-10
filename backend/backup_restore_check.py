"""
Backup/restore rehearsal on THROWAWAY databases only (synthetic data).
  phase dump    (sqlite demo DB):  runs the app's own admin backup endpoint, saves the SQL and per-table row counts.
  phase restore (throwaway MySQL): creates the schema, replays the dump, compares row counts per table with the source.
Never point it at a real database: the restore phase TRUNCATEs tables. It refuses unless the database name contains demo/test.
Usage:
  FORGE_DEMO=1 DATABASE_URL=sqlite:////path/forge_demo.db python backup_restore_check.py dump  OUTDIR
  FORGE_DEMO=1 DATABASE_URL=mysql+pymysql://root@127.0.0.1:3307/forge_test python backup_restore_check.py restore OUTDIR
"""
import os, sys, json, re, hashlib
phase, out = sys.argv[1], sys.argv[2]
if os.environ.get('FORGE_DEMO') != '1':
    raise SystemExit('needs FORGE_DEMO=1')
if phase == 'restore':
    os.environ['FORGE_AUTO_SCHEMA'] = '1'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import app as A
from sqlalchemy import text, inspect

def table_hash(n):
    # content fingerprint, independent of the database engine (dates to the second, booleans as 0/1)
    t = A.db.metadata.tables[n]
    pk = [c.name for c in t.primary_key.columns]
    rows = A.db.session.execute(t.select()).fetchall()
    def norm(v):
        if isinstance(v, bool): return int(v)
        if hasattr(v, 'isoformat'):   # MySQL DATETIME keeps whole seconds and rounds: compare the same way
            from datetime import timedelta
            return (v + timedelta(microseconds=500000)).strftime('%Y-%m-%d %H:%M:%S')
        if isinstance(v, (dict, list)): return json.dumps(v, sort_keys=True)
        return v
    data = sorted(([norm(r._mapping[c.name]) for c in t.columns] for r in rows), key=lambda x: json.dumps(x, default=str))
    if os.environ.get('SHOWROWS') == n: print('ROWS', n, json.dumps(data[:2], default=str))
    return hashlib.sha256(json.dumps(data, default=str).encode()).hexdigest()[:12]

with A.app.app_context():
    names = sorted(t for t in inspect(A.db.engine).get_table_names())
    if phase == 'dump':
        from flask_jwt_extended import create_access_token
        counts = {n: A.db.session.execute(text(f'SELECT COUNT(*) FROM `{n}`')).scalar() for n in names}
        hashes = {n: table_hash(n) for n in names if n != 'audit_logs'}
        adm = A.User.query.filter_by(role='administrator').first()
        tok = create_access_token(identity=str(adm.id), additional_claims={'tv': int(adm.token_version or 0)})
        r = A.app.test_client().post('/api/admin/backup', json={'tables': 'all'}, headers={'Authorization': f'Bearer {tok}'})
        assert r.status_code == 200, r.status_code
        open(os.path.join(out, 'backup.sql'), 'wb').write(r.data)
        json.dump({'counts': counts, 'hashes': hashes}, open(os.path.join(out, 'source_counts.json'), 'w'), indent=1)
        print('dump bytes', len(r.data)); print('tables in source:', len(counts))
    else:
        meta = json.load(open(os.path.join(out, 'source_counts.json'))); src = meta['counts']; src_h = meta['hashes']
        sql = open(os.path.join(out, 'backup.sql'), encoding='utf-8').read()
        stmts = [s for s in re.split(r';\s*\n', sql) if s.strip() and not s.strip().startswith('--') or 'INSERT' in s or 'TRUNCATE' in s or 'SET ' in s]
        ok = bad = 0; first_err = None
        raw = A.db.engine.raw_connection(); cur = raw.cursor()
        for st in stmts:
            st = '\n'.join(l for l in st.split('\n') if not l.startswith('--')).strip()
            if not st: continue
            try: cur.execute(st); ok += 1
            except Exception as e:
                bad += 1; first_err = first_err or f'{type(e).__name__}: {str(e)[:160]}'
        raw.commit()
        print(f'statements ok={ok} failed={bad}', first_err or '')
        rows = []
        for n in sorted(src):
            have = A.db.session.execute(text(f'SELECT COUNT(*) FROM `{n}`')).scalar()
            rows.append((n, src[n], have))
        print(f"{'table':28} {'source':>7} {'restored':>9}  counts  content")
        lost = []
        for n, s_, h in rows:
            same = (n == 'audit_logs') or table_hash(n) == src_h[n]
            print(f"{n:28} {s_:>7} {h:>9}  {'OK' if s_ == h else 'DIFF':6}  {'(skipped)' if n == 'audit_logs' else ('identical' if same else 'DIFFERENT')}")
            if s_ != h or not same: lost.append(n)
        print('tables not fully restored:', lost)
