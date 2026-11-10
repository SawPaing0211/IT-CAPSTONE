"""
Complete backup (database + uploaded files) and recovery rehearsal. Uses only the standard library
plus the application's own code.

  create OUTDIR     read-only against the database and uploads folder. Writes
                    OUTDIR/forge_full_backup_<UTC timestamp>/{database.sql, uploads/, MANIFEST.json}
  verify BACKUP     offline: checks every checksum and that every lesson-file row has its file.
  check-files       read-only: compares the live lesson_files rows with the uploads folder.
  restore BACKUP    REHEARSAL ONLY. Replays the SQL and copies the files, then verifies counts, content
                    hashes, file checksums and a real download. Refuses unless ALL hold:
                    FORGE_DEMO=1, FORGE_DEMO_RUNNER unset or demo, FORGE_ENV != production,
                    database name contains demo/test, FORGE_UPLOADS_DIR is set explicitly and is empty.

Not in a backup, on purpose: backend/.env, docker-compose .env (SECRET_KEY, JWT_SECRET_KEY, database
passwords, API keys), TLS certificates, Docker images. The SQL does contain personal data and password
hashes: treat the whole backup as sensitive (encrypt it and store it away from the server).
"""
import os, sys, json, re, hashlib, shutil, datetime

if len(sys.argv) < 2 or sys.argv[1] not in ('create', 'verify', 'check-files', 'restore'):
    raise SystemExit(__doc__)
cmd = sys.argv[1]


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def walk_files(root):
    out = []
    for base, _dirs, names in os.walk(root):
        for n in names:
            if n.startswith('.env'):          # never carry secrets, even if one was dropped in by mistake
                continue
            full = os.path.join(base, n)
            out.append(os.path.relpath(full, root).replace(os.sep, '/'))
    return sorted(out)


# ───────────────────────── verify (no application import, no database) ─────────────────────────
def do_verify(backup):
    m = json.load(open(os.path.join(backup, 'MANIFEST.json')))
    problems = []
    sql_path = os.path.join(backup, m['sql']['name'])
    if not os.path.exists(sql_path) or sha256_file(sql_path) != m['sql']['sha256']:
        problems.append('database.sql missing or checksum differs')
    have = {}
    for f in m['files']:
        p = os.path.join(backup, 'uploads', f['path'])
        if not os.path.exists(p):
            problems.append(f"file missing from backup: {f['path']}")
        elif sha256_file(p) != f['sha256']:
            problems.append(f"file checksum differs: {f['path']}")
        have[f['path']] = True
    extra = set(walk_files(os.path.join(backup, 'uploads'))) - set(have) if os.path.isdir(os.path.join(backup, 'uploads')) else set()
    for e in sorted(extra):
        problems.append(f'file in backup not listed in manifest: {e}')
    missing_rows = [r for r in m['lesson_file_rows'] if r['upload_path'] not in have]
    for r in missing_rows:
        problems.append(f"lesson_files row {r['id']} points to a file the backup does not contain: {r['storage_path']}")
    print(f"backup: {backup}")
    print(f"tables: {len(m['tables'])}  lesson-file rows: {len(m['lesson_file_rows'])}  files: {len(m['files'])}")
    print('VERIFY OK' if not problems else 'VERIFY FAILED')
    for p in problems:
        print(' -', p)
    return not problems


if cmd == 'verify':
    raise SystemExit(0 if do_verify(sys.argv[2]) else 1)

# ───────────────────────── commands that need the application ─────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if cmd == 'restore':
    if os.environ.get('FORGE_DEMO') != '1' or os.environ.get('FORGE_ENV', '').lower() == 'production':
        raise SystemExit('restore is a rehearsal tool: needs FORGE_DEMO=1 and not FORGE_ENV=production')
    if not os.environ.get('FORGE_UPLOADS_DIR'):
        raise SystemExit('restore needs FORGE_UPLOADS_DIR pointing at an empty rehearsal folder (never the real uploads)')
    os.environ['FORGE_AUTO_SCHEMA'] = '1'
import app as A
from sqlalchemy import text, inspect
from sqlalchemy.engine import make_url

dbname = (make_url(A.app.config['SQLALCHEMY_DATABASE_URI']).database or '')


def table_hash(n):
    # content fingerprint independent of the database engine (dates to the second, booleans as 0/1)
    t = A.db.metadata.tables[n]
    rows = A.db.session.execute(t.select()).fetchall()

    def norm(v):
        if isinstance(v, bool):
            return int(v)
        if hasattr(v, 'isoformat'):
            return (v + datetime.timedelta(microseconds=500000)).strftime('%Y-%m-%d %H:%M:%S')
        if isinstance(v, (dict, list)):
            return json.dumps(v, sort_keys=True)
        return v
    data = sorted(([norm(r._mapping[c.name]) for c in t.columns] for r in rows), key=lambda x: json.dumps(x, default=str))
    return hashlib.sha256(json.dumps(data, default=str).encode()).hexdigest()[:16]


def lesson_rows():
    return [(r.id, r.lesson_id, r.storage_path, r.file_size or 0) for r in A.LessonFile.query.order_by(A.LessonFile.id).all()]


def upload_rel(storage_path):
    ap = A.upload_abs_path(storage_path)
    return os.path.relpath(ap, A.UPLOAD_ROOT).replace(os.sep, '/') if ap else None


if cmd == 'check-files':
    with A.app.app_context():
        rows = lesson_rows()
        on_disk = set(walk_files(A.UPLOAD_ROOT)) if os.path.isdir(A.UPLOAD_ROOT) else set()
        referenced, bad = set(), []
        for rid, lid, sp, size in rows:
            rel = upload_rel(sp)
            if not rel or not os.path.exists(os.path.join(A.UPLOAD_ROOT, rel)):
                bad.append(f'row {rid} (lesson {lid}): file missing: {sp}')
            else:
                referenced.add(rel)
                real = os.path.getsize(os.path.join(A.UPLOAD_ROOT, rel))
                if size and size != real:
                    bad.append(f'row {rid}: recorded size {size} but file is {real} bytes')
        orphans = sorted(on_disk - referenced)
        print(f'database: {A.describe_database_target()}   uploads folder: {A.UPLOAD_ROOT}')
        print(f'lesson-file rows: {len(rows)}   files on disk: {len(on_disk)}   rows with a problem: {len(bad)}   unreferenced files: {len(orphans)}')
        for b in bad:
            print(' -', b)
        for o in orphans:
            print(' - unreferenced file:', o)
    raise SystemExit(1 if bad else 0)

if cmd == 'create':
    out = sys.argv[2]
    st = A.schema_status()
    if not st['up_to_date']:
        raise SystemExit(f"database schema is out of date ({st}); take the backup after the explicit upgrade, or back up as-is with mysqldump")
    with A.app.app_context():
        stamp = datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
        dest = os.path.join(out, f'forge_full_backup_{stamp}')
        os.makedirs(os.path.join(dest, 'uploads'), exist_ok=False)
        tables = list(A.db.metadata.sorted_tables)
        sql = A.build_backup_sql(tables, 'backup_full.py')
        open(os.path.join(dest, 'database.sql'), 'wb').write(sql)
        files = []
        if os.path.isdir(A.UPLOAD_ROOT):
            for rel in walk_files(A.UPLOAD_ROOT):
                src = os.path.join(A.UPLOAD_ROOT, rel)
                dst = os.path.join(dest, 'uploads', rel)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copy2(src, dst)
                files.append({'path': rel, 'size': os.path.getsize(dst), 'sha256': sha256_file(dst)})
        rows = [{'id': i, 'lesson_id': l, 'storage_path': sp, 'upload_path': upload_rel(sp)} for i, l, sp, _ in lesson_rows()]
        manifest = {
            'format': 1,
            'created_utc': datetime.datetime.utcnow().isoformat() + 'Z',
            'source': {'dialect': A.db.engine.dialect.name, 'database_name': os.path.basename(dbname)},   # no host, user or password
            'sql': {'name': 'database.sql', 'bytes': len(sql), 'sha256': hashlib.sha256(sql).hexdigest()},
            'tables': {t.name: A.db.session.execute(text(f'SELECT COUNT(*) FROM `{t.name}`')).scalar() for t in tables},
            'table_hashes': {t.name: table_hash(t.name) for t in tables},
            'files': files,
            'lesson_file_rows': rows,
            'not_included': ['backend/.env and the repo-root .env (secrets)', 'TLS certificates', 'Docker images',
                             '/var/forge-tmp sandbox scratch space (temporary)'],
            'sensitivity': 'contains personal data and password hashes; no application secrets',
        }
        json.dump(manifest, open(os.path.join(dest, 'MANIFEST.json'), 'w'), indent=1)
        print('created', dest)
        print(f"tables {len(tables)}  files {len(files)}  lesson-file rows {len(rows)}  sql {len(sql)} bytes")
    raise SystemExit(0 if do_verify(dest) else 1)

# ───────────────────────── restore rehearsal ─────────────────────────
backup = sys.argv[2]
if not re.search(r'demo|test', dbname, re.I):
    raise SystemExit(f"refusing: database name '{dbname}' must contain demo/test (rehearsal databases only)")
if not do_verify(backup):
    raise SystemExit('backup did not verify; not restoring')
m = json.load(open(os.path.join(backup, 'MANIFEST.json')))
if os.path.isdir(A.UPLOAD_ROOT) and os.listdir(A.UPLOAD_ROOT):
    raise SystemExit(f'refusing: rehearsal uploads folder is not empty: {A.UPLOAD_ROOT}')
with A.app.app_context():
    sql = open(os.path.join(backup, 'database.sql'), encoding='utf-8').read()
    stmts = [s for s in re.split(r';\s*\n', sql)]
    ok = bad = 0; first_err = None
    raw = A.db.engine.raw_connection(); cur = raw.cursor()
    for st in stmts:
        st = '\n'.join(l for l in st.split('\n') if not l.startswith('--')).strip()
        if not st:
            continue
        try:
            cur.execute(st); ok += 1
        except Exception as e:
            bad += 1; first_err = first_err or f'{type(e).__name__}: {str(e)[:160]}'
    raw.commit()
    os.makedirs(A.UPLOAD_ROOT, exist_ok=True)
    shutil.copytree(os.path.join(backup, 'uploads'), A.UPLOAD_ROOT, dirs_exist_ok=True)
    print(f'sql statements ok={ok} failed={bad} {first_err or ""}')
    lost = []
    for n, want in sorted(m['tables'].items()):
        have = A.db.session.execute(text(f'SELECT COUNT(*) FROM `{n}`')).scalar()
        same = table_hash(n) == m['table_hashes'][n]
        if have != want or not same:
            lost.append(n)
        print(f"{n:28} {want:>6} {have:>6}  {'identical' if same else 'DIFFERENT'}")
    fbad = []
    by_path = {f['path']: f for f in m['files']}
    for rid, lid, sp, _ in lesson_rows():
        rel = upload_rel(sp)
        p = os.path.join(A.UPLOAD_ROOT, rel) if rel else None
        if not p or not os.path.exists(p) or sha256_file(p) != by_path.get(rel, {}).get('sha256'):
            fbad.append(rid)
    # a real download through the application, as the lesson's owner
    dl = 'not attempted'
    rows = lesson_rows()
    if rows:
        from flask_jwt_extended import create_access_token
        rid, lid, sp, _ = rows[0]
        owner = A.db.session.get(A.Lesson, lid).created_by
        u = A.db.session.get(A.User, owner)
        tok = create_access_token(identity=str(u.id), additional_claims={'tv': int(u.token_version or 0)})
        r = A.app.test_client().get(f'/api/lessons/{lid}/files/{rid}/download', headers={'Authorization': f'Bearer {tok}'})
        want = by_path[upload_rel(sp)]['sha256']
        dl = 'OK' if r.status_code == 200 and hashlib.sha256(r.data).hexdigest() == want else f'FAILED (HTTP {r.status_code})'
    print(f"tables not fully restored: {lost}   lesson files not restored/identical: {fbad}   download through the app: {dl}")
    raise SystemExit(0 if not lost and not fbad and bad == 0 and dl in ('OK', 'not attempted') else 1)
