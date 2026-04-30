#!/bin/sh
CS_FILE="$1"
WORK_DIR="/tmp/work"
BUILD_DIR="$WORK_DIR/build"

mkdir -p "$BUILD_DIR"
mkdir -p "$BUILD_DIR/obj"
mkdir -p "/tmp/work/.nuget"

cp /sandbox-template/sandbox.csproj "$BUILD_DIR/sandbox.csproj"
cp "$CS_FILE" "$BUILD_DIR/Program.cs"

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
    -v quiet > /dev/null 2>&1

BUILD_EXIT=$?
if [ $BUILD_EXIT -ne 0 ]; then
    # ── Re-run build to show student the actual error ─────────────────────
    dotnet build "$BUILD_DIR/sandbox.csproj" \
        --configuration Release \
        --no-restore \
        --output "$BUILD_DIR/out" \
        -v quiet 2>&1
    exit $BUILD_EXIT
fi

exec dotnet "$BUILD_DIR/out/sandbox.dll"