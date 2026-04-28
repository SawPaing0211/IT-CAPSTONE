#!/bin/sh
# ─── Adventure Realm Java Runner ─────────────────────────────────────────────
# The problem: /tmp/sandbox is bind-mounted READ-ONLY (student source)
# The fix:     compile output goes to /tmp/work (tmpfs, writable)
set -e

JAVA_FILE="$1"
CLASS_NAME=$(basename "$JAVA_FILE" .java)

# Use writable tmpfs for compiled output — never touch the read-only mount
WORK_DIR="/tmp/work"
mkdir -p "$WORK_DIR"

# Compile: source from read-only mount, output to writable tmpfs
javac -encoding UTF-8 "$JAVA_FILE" -d "$WORK_DIR" 2>&1

# Run from the writable directory
exec java -cp "$WORK_DIR" "$CLASS_NAME"