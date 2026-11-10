# Forge.Dev

Forge.Dev is a programming-learning platform for Python, Java, and C#. Students work through lessons and coding quests, instructors manage classes and review submissions, and administrators manage accounts and enrollment.

## What to install first

Install these on Windows before you start. Use the links below and accept the default options unless noted.

| Tool | Version | Download | Used for |
| --- | --- | --- | --- |
| Git | latest | [git-scm.com/download/win](https://git-scm.com/download/win) | Getting the project and pulling updates |
| Node.js | 24 (LTS) | [nodejs.org/en/download](https://nodejs.org/en/download) | Runs the website (frontend) |
| Python | 3.12 | [python.org/downloads/release/python-3120](https://www.python.org/downloads/release/python-3120/) | Runs the API (backend). Tick **Add python.exe to PATH** in the installer |
| Docker Desktop | latest, with Linux containers | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) | Runs the local MySQL database and the code sandbox. Restart Windows if the installer asks |

Optional: [VS Code](https://code.visualstudio.com/) to read the code, and [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) only if you want to share your running copy with a public link (`start-forge.bat`).

To check the installs, open PowerShell and run `git --version`, `node --version`, `py -3.12 --version` and `docker --version`. Each should print a version.

## Download the project

The latest version is always on the **`main`** branch (the GitHub default).

- **Clone with Git (recommended).** This lets you pull updates later.

  ```powershell
  git clone https://github.com/SawPaing0211/IT-CAPSTONE.git
  cd IT-CAPSTONE
  ```

- **Download a ZIP.** Open the [repository](https://github.com/SawPaing0211/IT-CAPSTONE), choose **Code → Download ZIP**, and extract it. Open the extracted folder, which contains `backend` and `frontend`. A ZIP cannot pull updates, so download a new ZIP each time or use Git.

If GitHub denies access, sign in with the GitHub account that has been granted access to the repo. If you only need to use the hosted app, ask the group for the current link and your account.

## Get the latest changes (for the group)

Whenever the maintainer pushes changes, pull them in your project folder:

```powershell
cd IT-CAPSTONE
git pull
```

To see what changed:

- Read [CHANGELOG.md](CHANGELOG.md), which lists the changes in plain words.
- Right after a pull, run `git log ORIG_HEAD..HEAD --oneline` for the new commits, or `git diff --stat ORIG_HEAD HEAD` for the files that changed.
- On GitHub, open the [commit list](https://github.com/SawPaing0211/IT-CAPSTONE/commits/main).

After pulling, only do the steps that match what changed (the `git diff --stat` output shows the file names):

| If this file changed | Run this, then restart the app |
| --- | --- |
| `frontend/package-lock.json` or `frontend/package.json` | `cd frontend` then `npm.cmd ci` |
| `backend/requirements.txt` | `cd backend` then `.\venv\Scripts\python.exe -m pip install -r requirements.txt` |
| anything in `backend/` that changes the database (see `docs/SCHEMA_UPGRADE.md`) | `cd backend` then `.\venv\Scripts\python.exe manage_schema.py status`, and `upgrade` if it asks for it |
| only files in `frontend/src` or `backend/*.py` | Nothing to install. The frontend reloads by itself; stop and start the backend |

If `git pull` says your local changes would be overwritten, save them first with `git stash`, run `git pull`, then `git stash pop`.

## Run locally on Windows

Install the tools from **What to install first** above. Run the commands in PowerShell from the project folder unless a step says otherwise.

### 1. Start a local MySQL database

Start Docker Desktop and wait for its engine. Replace both password placeholders below with different local passwords made of letters and numbers. Keep the user password handy for step 2. The container and its named volume are for your local copy.

```powershell
docker run -d --name forge-dev-local-db -p 127.0.0.1:3307:3306 -e MYSQL_DATABASE=forge_local -e MYSQL_USER=forge_local -e MYSQL_PASSWORD=REPLACE_LOCAL_USER_PASSWORD -e MYSQL_ROOT_PASSWORD=REPLACE_LOCAL_ROOT_PASSWORD -v forge-dev-local-db-data:/var/lib/mysql mysql:8.0
docker logs --tail 30 forge-dev-local-db
```

Wait for MySQL to finish initializing and report that it is ready on port 3306 **inside** the container. Run the `docker logs` command again if needed. On later sessions, reuse the container with `docker start forge-dev-local-db`.

### 2. Set up the backend

```powershell
cd backend
py -3.12 -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

In `backend/.env`, replace these settings. Use the MySQL **user** password from step 1. For each secret, run `.\venv\Scripts\python.exe -c "import secrets; print(secrets.token_hex(32))"` and paste the output.

```dotenv
DATABASE_URL=mysql+pymysql://forge_local:REPLACE_LOCAL_USER_PASSWORD@127.0.0.1:3307/forge_local
SECRET_KEY=REPLACE_WITH_RANDOM_SECRET
JWT_SECRET_KEY=REPLACE_WITH_ANOTHER_RANDOM_SECRET
CORS_ORIGINS=http://localhost:5300
FLASK_DEBUG=false
```

Keep `.env` private. `GEMINI_API_KEY` is optional for local setup and is used for AI-assisted similarity analysis.

```powershell
.\venv\Scripts\python.exe manage_schema.py status
.\venv\Scripts\python.exe manage_schema.py upgrade
.\venv\Scripts\waitress-serve.exe --host=127.0.0.1 --port=5000 app:app
```

On the first run, missing tables are expected. Check that the schema tool shows your local `forge_local` database before typing `forge_local` to confirm the upgrade. Keep the backend terminal open.

### 3. Start the frontend

Open a second PowerShell window in the project folder.

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev -- --strictPort
```

Open [http://localhost:5300](http://localhost:5300). The backend listens at [http://localhost:5000](http://localhost:5000). For local work, use these two terminals. The `start-forge.bat` launcher is for tunnel-based sharing and starts public Cloudflare tunnels.

### 4. Enable code execution and sign in

To use the Sandbox or run and submit quests, open a third terminal in the project folder and build the Python, Java, and C# sandbox images. The first build downloads the base images and dependencies.

```powershell
cd backend\forge-sandbox
.\build_images.bat
```

Public registration is disabled. A fresh local database has no sign-in accounts. Ask the project maintainer to provision the first local administrator, who can then create test accounts and set up classes. For an existing installation, use the account your administrator gave you. Keep school data and shared credentials out of personal copies.

## For the maintainer: publish an update

Work and commit on `master`, then push it to every branch your group uses so that `git pull` gives them the same thing:

```powershell
git push origin master
git push origin master:main
git push origin master:dev
git push origin master:prod
```

Add a short entry to the top of [CHANGELOG.md](CHANGELOG.md) before pushing, so the group can see what changed. Do not use `--force`.

## What each role can do

| Role | Workflows |
| --- | --- |
| Student | Open enrolled subjects, read lessons, practice in the Sandbox, run and submit quests, and view XP and achievements. |
| Instructor | Open assigned classes, manage modules and quests, post announcements, and review submissions and class analytics. |
| Administrator | Manage subjects, class codes, users, enrollments, and instructor assignments. Only the configured head administrator can create other administrators. |

The React/Vite frontend is in `frontend/`, the Flask/MySQL API is in `backend/`, and the sandbox Dockerfiles are in `backend/forge-sandbox/`.

- [Schema upgrade guide](docs/SCHEMA_UPGRADE.md)
- [Head administrator setup and recovery](docs/HEAD_ADMIN_SETUP_AND_RECOVERY.md)
- [Backup and recovery](docs/BACKUP_AND_RECOVERY.md)

Rejano, Paul Christian Caleb I.
