# Deploying Forge.dev

Two pieces: the **frontend** (Vercel) and the **backend + database** (your own
Oracle Cloud "Always Free" VM, via Docker Compose) — the backend can't live on
a typical free PaaS because the code sandbox needs a real Docker daemon.

## 1. Provision the VM (you do this — needs your own Oracle account)

1. Sign up at oracle.com/cloud/free (identity verification required — do this
   first, it can take a bit).
2. Create a VM instance: **Ampere A1 (Arm)** shape, "Always Free" eligible,
   4 OCPUs / 24GB RAM is the free-tier max — plenty for this. Ubuntu 22.04 or
   24.04 image.
3. In the VM's networking / Security List (or NSG), open ingress ports
   **80** and **443** (HTTP/HTTPS) in addition to the default 22 (SSH) —
   Oracle blocks everything else by default even after you configure the
   VM's own firewall.
4. Note the VM's public IP. SSH in: `ssh ubuntu@<public-ip>`.

## 2. Install Docker on the VM

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker   # or log out/in
docker --version
docker compose version
```

## 3. Get the code onto the VM

```bash
git clone <your-repo-url> forge-dev
cd forge-dev
```

(If the repo isn't pushed anywhere yet, `git init` + push to a private GitHub
repo first — easiest way to get code onto the VM.)

## 4. Configure secrets

```bash
cp backend/.env.example backend/.env
nano backend/.env       # fill in SECRET_KEY, JWT_SECRET_KEY, GEMINI_API_KEY,
                         # and CORS_ORIGINS (your eventual Vercel URL)
                         # -- leave DATABASE_URL alone, compose sets it for you

cp .env.example .env    # repo-root .env, read by docker compose itself
nano .env               # set MYSQL_ROOT_PASSWORD to something strong
```

Generate strong secrets with:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## 5. Build the sandbox images

```bash
cd backend/forge-sandbox
chmod +x build_images.sh
./build_images.sh
cd ../..
```

## 6. Bring the stack up

```bash
docker compose up -d --build
docker compose logs -f backend   # watch it come up; Ctrl+C to stop watching
curl http://127.0.0.1:5000/api/health   # should return {"status":"running",...}
```

## 7. Put Nginx in front (HTTPS)

See `nginx/forge.conf` — installs Nginx, reverse-proxies port 80 to the
backend container, and (once you have a domain) gets you a free HTTPS cert
via Certbot in one command.

## 8. Deploy the frontend to Vercel

1. Push the repo to GitHub if it isn't already.
2. vercel.com → New Project → import the repo → set root directory to
   `frontend/`.
3. Add an environment variable: `VITE_API_URL` = `https://api.yourdomain.com`
   (or `http://<vm-ip>` if you don't have a domain yet).
4. Deploy. Vercel gives you a `*.vercel.app` HTTPS URL immediately.
5. Go back to `backend/.env` on the VM and set `CORS_ORIGINS` to that Vercel
   URL, then `docker compose restart backend`.

## 9. End-to-end test

Open the Vercel URL, log in, and exercise: auth, a quest submission through
the code sandbox, and the instructor Analytics/Activities pages (the ones
that hit the database the most).

---

**Redeploying after a code change:**
```bash
git pull
docker compose up -d --build   # rebuilds only what changed
```
