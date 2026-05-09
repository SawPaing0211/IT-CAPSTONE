#!/bin/sh
# ─── Adventure Realm C# Runner ───────────────────────────────────────────────
#
# Wrapper pattern:
#   /tmp/sandbox/Solution.cs  — student code (untouched, read-only mount)
#   /tmp/sandbox/Program.cs   — generated wrapper (also in read-only mount)
#
# Both .cs files are copied into the build directory so dotnet sees them as
# part of the same project, then compiled and executed.
#
# $1 is the student file path, e.g. /tmp/sandbox/Solution.cs
# ─────────────────────────────────────────────────────────────────────────────

STUDENT_FILE="$1"
SANDBOX_DIR="$(dirname "$STUDENT_FILE")"

WORK_DIR="/tmp/work"
BUILD_DIR="$WORK_DIR/build"

mkdir -p "$BUILD_DIR"
mkdir -p "$BUILD_DIR/obj"
mkdir -p "$WORK_DIR/.nuget"

# ── Copy project template ─────────────────────────────────────────────────
cp /sandbox-template/sandbox.csproj "$BUILD_DIR/sandbox.csproj"

# ── Copy BOTH source files into the build directory ──────────────────────
#    dotnet picks up every *.cs in the project directory automatically.
cp "$SANDBOX_DIR/Solution.cs" "$BUILD_DIR/Solution.cs"
cp "$SANDBOX_DIR/Program.cs"  "$BUILD_DIR/Program.cs"

# ── Environment ──────────────────────────────────────────────────────────
export HOME=/dotnet-sentinel
export DOTNET_CLI_HOME=/dotnet-sentinel/.dotnet
export NUGET_PACKAGES=/tmp/work/.nuget/packages
export NUGET_HTTP_CACHE_PATH=/tmp/work/.nuget-http-cache
export NUGET_SCRATCH=/tmp/work/.nuget-scratch
export DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1
export DOTNET_CLI_TELEMETRY_OPTOUT=1
export DOTNET_NOLOGO=1
export DOTNET_MULTILEVEL_LOOKUP=0

# ── Symlink baked-in NuGet packages ──────────────────────────────────────
ln -s /dotnet-sentinel/.nuget/packages /tmp/work/.nuget/packages

# ── Restore silently ─────────────────────────────────────────────────────
dotnet restore "$BUILD_DIR/sandbox.csproj" \
    --packages /tmp/work/.nuget/packages > /dev/null 2>&1

# ── Build silently — only errors go to stderr ─────────────────────────────
dotnet build "$BUILD_DIR/sandbox.csproj" \
    --configuration Release \
    --no-restore \
    --output "$BUILD_DIR/out" \
    -p:StartupObject=Program \
    -v quiet > /dev/null 2>&1

BUILD_EXIT=$?
if [ $BUILD_EXIT -ne 0 ]; then
    # Re-run to surface the actual compiler error to the student
    dotnet build "$BUILD_DIR/sandbox.csproj" \
        --configuration Release \
        --no-restore \
        --output "$BUILD_DIR/out" \
        -p:StartupObject=Program \
        -v quiet 2>&1
    exit $BUILD_EXIT
fi

if [ -f /tmp/sandbox/input.txt ]; then
    exec dotnet "$BUILD_DIR/out/sandbox.dll" < /tmp/sandbox/input.txt
else
    exec dotnet "$BUILD_DIR/out/sandbox.dll"
fi