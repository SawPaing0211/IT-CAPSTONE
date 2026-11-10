# Backup and recovery (database + uploaded files)

Status: the tool and the restore were **rehearsed on synthetic data only** (see "What was and was not rehearsed").
Nothing here has been run against the real database or real uploads.

## 1. Everything that must survive a rebuild

| State | Where it lives | In a backup made by `backup_full.py`? |
|---|---|---|
| All application data (18 tables: users, enrollments, quests, submissions, slots, lessons, announcements, achievements, audit log, system settings, ...) | MySQL, Docker volume `forge-mysql-data` | Yes: `database.sql` (data only; the schema comes from `manage_schema.py upgrade`) |
| Lesson attachments (the only user-uploaded asset type today: pdf, ppt/pptx, doc/docx, jpg/png, zip) | Docker volume `forge-uploads` mounted at `/app/uploads/lessons/<lesson_id>/<uuid>.<ext>`; the database row (`lesson_files.storage_path`) points at the file | Yes: `uploads/` plus checksums in `MANIFEST.json` |
| Secrets: `backend/.env` (SECRET_KEY, JWT_SECRET_KEY, GEMINI_API_KEY, CORS_ORIGINS, HEAD_ADMIN_EMAIL, ...) and repo-root `.env` (MYSQL_ROOT_PASSWORD) | The server's files | **No, on purpose.** Keep them in a password manager / secrets vault, separate from data backups |
| Deployment configuration: `docker-compose.yml`, `nginx/forge.conf`, TLS certificates, the frontend's hosting settings (Vercel environment variables, e.g. the API URL) | Repository, server, Vercel | Repository files are in git; certificates and Vercel settings are not in any backup here: record them in your runbook |
| Sandbox images (`forge-sandbox-*`) | Built on the Docker host | No: rebuild with `forge-sandbox/build_images.sh` |
| `/var/forge-tmp` sandbox scratch | Host folder | No (temporary) |
| Audit/activity logs | Table `audit_logs` | Yes (inside `database.sql`) |

No other upload path exists in the code: CSV imports are read in memory and not stored; there are no avatars or problem images.

Consequences of losing a secret: a new `JWT_SECRET_KEY` signs everyone out (sessions only); passwords are stored as hashes and do not depend on any key; `GEMINI_API_KEY` is optional (plagiarism verdict text).

## 2. Making a backup

Run from `backend/` (or inside the backend container). It only reads.

```
python backup_full.py create /path/to/backups
python backup_full.py verify /path/to/backups/forge_full_backup_<UTC timestamp>
```
With Docker Compose (the backup folder must be mounted, and the command uses the same uploads volume):
```
docker compose run --rm -v "$PWD/backups:/backups" backend python backup_full.py create /backups
```
(Compose form not executed here: no Docker was available.)

The result folder holds `database.sql`, `uploads/`, `MANIFEST.json` (row counts and content hashes per table, SHA-256 of every file and of the SQL, which lesson-file row needs which file; no host, user or password). `create` refuses if the schema is outdated (upgrade first), and `verify` fails if any file is missing, extra or altered or if a lesson-file row has no file.

**Handle the backup as sensitive**: it contains personal data and password hashes. Encrypt it before it leaves the server (for example `gpg --symmetric` or `age`), store it away from the server, and keep the passphrase with the other secrets, not next to the backup.

Daily check that does not need a backup: `python backup_full.py check-files` lists lesson-file rows whose file is missing, size mismatches, and files nobody references.

The older endpoint `POST /api/admin/backup` (administrator) still returns the SQL only; it cannot include files. Use `backup_full.py` for a complete backup.

## 3. Restoring (real recovery, new or repaired server)

1. Install Docker, get the repository, recreate `backend/.env` and `.env` from your secrets vault (never from a backup).
2. `docker compose up -d mysql`; wait until healthy. Use an **empty** database.
3. `docker compose run --rm backend python manage_schema.py upgrade` (creates the schema; type the database name when asked).
4. Verify the backup copy: `python backup_full.py verify <backup folder>` (decrypt first).
5. Load the data: `mysql --default-character-set=utf8mb4 -uroot -p forge_dev < database.sql` (through `docker compose exec -T mysql ...`). The file truncates and refills every table with foreign-key checks off.
6. Put the files in place: copy the backup's `uploads/` contents into the uploads volume (for example `docker run --rm -v <project>_forge-uploads:/dst -v "$PWD/backup/uploads":/src alpine cp -a /src/. /dst/`; find the volume name with `docker volume ls`).
7. `docker compose up -d`; then `curl .../api/health` (expect `execution_mode: docker-sandbox`), `python backup_full.py check-files` (expect 0 problems), and compare table counts with `MANIFEST.json`.
8. Download one lesson attachment through the application as a student or instructor.

Steps 2, 5 (with the stock `mysql` client), 6 and 7 (Docker forms) were **not executed** here; the equivalent logic was rehearsed with the tool below.

## 4. Rehearsal tool (isolated, synthetic data only)

`python backup_full.py restore <backup>` replays the SQL into the configured database and copies the files into `FORGE_UPLOADS_DIR`, then checks every table's row count and content hash, every file's SHA-256 and a real download through the application. It refuses unless `FORGE_DEMO=1`, `FORGE_ENV` is not production, the database name contains demo/test and is on this machine, and `FORGE_UPLOADS_DIR` is set and empty. It is not the production restore procedure.

`rehearse_full_recovery.py` prepares synthetic source data (uploads through the real endpoint into a temporary uploads folder).

## 5. What was and was not rehearsed

Done (synthetic demo database, 4 synthetic attachments including a non-ASCII file name and a binary zip; source SQLite, restore target throwaway MySQL 9.7.1): backup creation, `verify` (passes; fails when a file is altered, a file is missing, or the SQL is altered), restore of all 18 tables identical by content hash, 4 of 4 files identical by SHA-256, real download through the app identical, refusals (non-empty uploads folder, no uploads dir set, production), `check-files` on a database restored without its files (reports every row) and on a stray file.
Found while rehearsing: the demo seed listed 3 attachments with no file behind them (the rehearsal drops those from its copy); in this repository `backend/uploads/` contains PDF files that are **tracked by git** (not opened). Uploaded files should not live in the repository and are now excluded from the Docker image (`backend/.dockerignore`); removing them from git history is your decision.
Not done: any run against the real database or real uploads; the stock `mysql` client load; Docker volume commands; behaviour with large files (upload limit is 16 MB per file); encryption of the backup; off-server storage; a timed full recovery.
