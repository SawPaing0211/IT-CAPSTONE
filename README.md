# Forge.Dev

Forge.Dev is a programming-learning platform for Python, Java, and C#. Students work through lessons and coding quests, instructors manage classes and review submissions, and administrators manage accounts and enrollment.

## Download the project

The current application is on the **`master`** branch.

- **Download a ZIP.** Open the [current branch](https://github.com/SawPaing0211/IT-CAPSTONE/tree/master), choose **Code → Download ZIP**, and extract it. Open the extracted `IT-CAPSTONE-master` folder, which contains `backend` and `frontend`.
- **Clone with Git.** Use this option if you want to pull updates or contribute.

  ```powershell
  git clone --branch master https://github.com/SawPaing0211/IT-CAPSTONE.git
  cd IT-CAPSTONE
  ```

If GitHub denies access, sign in with the GitHub account that has been granted access to the repo. If you only need to use the hosted app, ask the group for the current link and your account.

## Run locally on Windows

Install **Node.js 24**, **Python 3.12**, and **Docker Desktop** with Linux containers enabled. Git is needed only for the clone option. Run the commands in PowerShell from the project folder unless a step says otherwise.

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
