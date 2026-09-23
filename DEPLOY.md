# Deploying Forge.dev

Two pieces: the **frontend** (Vercel) and the **backend + database** (a VPS,
via Docker Compose) — the backend can't live on a typical free PaaS because
the code sandbox needs a real Docker daemon.

## Quick testing without a VPS yet

If you just need testers to try the live app before the VPS is set up,
Cloudflare Quick Tunnels work well and need no account or setup:

```bash
cloudflared tunnel --url http://localhost:5000   # backend, in one terminal
cloudflared tunnel --url http://localhost:5173   # frontend, in another
```

Each command prints a random `https://<random-words>.trycloudflare.com`
URL. Put the backend one in `frontend/.env.local` as `VITE_API_URL=...`,
restart `npm run dev`, and set `CORS_ORIGINS` to the frontend one before
starting Flask. The URLs change every time you restart the tunnels (sleep,
shutdown, or a dropped connection all count), so this is fine for one-off
testing days but not a permanent link.

## 1. Get a VPS

We're using DigitalOcean, paid for with the credit from the **GitHub
Student Developer Pack** (education.github.com/pack) — once your
application is approved, claim the DigitalOcean offer from your GitHub
Education benefits page and create a droplet:

1. Choose the cheapest **Ubuntu 22.04 or 24.04** droplet — 1-2 GB RAM is
   enough to start.
2. In the droplet's firewall settings, open ports **80** and **443**
   (HTTP/HTTPS) in addition to the default 22 (SSH).
3. Note the droplet's public IP. SSH in: `ssh root@<public-ip>`.

(Any other VPS — Oracle Cloud, Azure, a school-provided server — works the
same way from step 2 onward; only the sign-up step differs.)

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
git clone https://github.com/SawPaing0211/IT-CAPSTONE.git forge-dev
cd forge-dev
```

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
the code sandbox, and the instructor Analytics/Plagiarism/Activities pages
(the ones that hit the database and Gemini API the most).

---

**Redeploying after a code change:**
```bash
git pull
docker compose up -d --build   # rebuilds only what changed
```
