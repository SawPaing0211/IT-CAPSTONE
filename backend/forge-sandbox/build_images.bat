@echo off
REM ─── Adventure Realm: Build All Sandbox Images ─────────────────────────────
REM Run this once from the forge-sandbox\ directory.
REM Requires: Docker Desktop running, "docker" available in PATH

echo.
echo =====================================================
echo   Adventure Realm - Building Sandbox Docker Images
echo =====================================================
echo.

REM ── Python ──────────────────────────────────────────────────────────────────
echo [1/3] Building Python sandbox...
docker build -f Dockerfile.python -t forge-sandbox-python:latest .
if %errorlevel% neq 0 (
    echo [ERROR] Python image build failed!
    exit /b 1
)
echo [OK] Python image ready.
echo.

REM ── Java ────────────────────────────────────────────────────────────────────
echo [2/3] Building Java sandbox...
docker build -f Dockerfile.java -t forge-sandbox-java:latest .
if %errorlevel% neq 0 (
    echo [ERROR] Java image build failed!
    exit /b 1
)
echo [OK] Java image ready.
echo.

REM ── C# ──────────────────────────────────────────────────────────────────────
echo [3/3] Building C# sandbox (this one is slow the first time - NuGet warmup)...
docker build -f Dockerfile.csharp -t forge-sandbox-csharp:latest .
if %errorlevel% neq 0 (
    echo [ERROR] C# image build failed!
    exit /b 1
)
echo [OK] C# image ready.
echo.

REM ── Verify ──────────────────────────────────────────────────────────────────
echo =====================================================
echo   All images built! Verifying...
echo =====================================================
docker images | findstr "forge-sandbox"
echo.

REM ── Quick smoke test ────────────────────────────────────────────────────────
echo Running quick smoke test on Python image...
echo print("Forge sandbox: Python OK!") | docker run --rm -i forge-sandbox-python:latest /dev/stdin
echo.

echo =====================================================
echo   Done! You can now start your Flask backend.
echo =====================================================
pause