#!/usr/bin/env bash
# ─── Adventure Realm: Build All Sandbox Images (Linux) ─────────────────────
# Linux/VM equivalent of build_images.bat. Run this once from the
# forge-sandbox/ directory on the server (e.g. the Oracle Cloud VM), after
# Docker is installed. These images are used by routes/sandbox.py via
# docker.from_env() — they must exist on whichever host actually runs the
# backend, since they're referenced by name/tag, not built automatically.
set -euo pipefail
cd "$(dirname "$0")"

echo
echo "====================================================="
echo "  Adventure Realm - Building Sandbox Docker Images"
echo "====================================================="
echo

# ── Python ───────────────────────────────────────────────────────────────
echo "[1/3] Building Python sandbox..."
docker build -f Dockerfile.python -t forge-sandbox-python:latest .
echo "[OK] Python image ready."
echo

# ── Java ──────────────────────────────────────────────────────────────────
echo "[2/3] Building Java sandbox..."
docker build -f Dockerfile.java -t forge-sandbox-java:latest .
echo "[OK] Java image ready."
echo

# ── C# ───────────────────────────────────────────────────────────────────
echo "[3/3] Building C# sandbox (this one is slow the first time - NuGet warmup)..."
docker build -f Dockerfile.csharp -t forge-sandbox-csharp:latest .
echo "[OK] C# image ready."
echo

# ── Verify ───────────────────────────────────────────────────────────────
echo "====================================================="
echo "  All images built! Verifying..."
echo "====================================================="
docker images | grep "forge-sandbox" || true
echo

# ── Quick smoke test ─────────────────────────────────────────────────────
echo "Running quick smoke test on Python image..."
echo 'print("Forge sandbox: Python OK!")' | docker run --rm -i forge-sandbox-python:latest /dev/stdin
echo

echo "====================================================="
echo "  Done! You can now start the backend (docker compose up)."
echo "====================================================="
