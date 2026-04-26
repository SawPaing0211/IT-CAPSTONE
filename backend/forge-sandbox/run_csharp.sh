#!/bin/sh
# ─── Adventure Realm C# Runner ────────────────────────────────────────────────
# $1 = path to the student's .cs file
set -e

CS_FILE="$1"
WORK_DIR=$(dirname "$CS_FILE")

# Copy baked-in project file into the temp work dir
cp /sandbox-template/sandbox.csproj "$WORK_DIR/sandbox.csproj"

# Build & run in one step — Release config is faster
exec dotnet run \
    --project "$WORK_DIR/sandbox.csproj" \
    --configuration Release \
    --no-restore \
    -- "$CS_FILE"