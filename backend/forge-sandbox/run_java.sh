#!/bin/sh
# ─── Adventure Realm Java Runner ─────────────────────────────────────────────
# $1 = path to the .java file (injected by sandbox.py)
# Compile first, then run. Both stdout/stderr flow to the caller.
set -e

JAVA_FILE="$1"
CLASS_NAME=$(basename "$JAVA_FILE" .java)
DIR=$(dirname "$JAVA_FILE")

# Compile — any compile error goes straight to stderr (shown in Crystal Output)
javac -encoding UTF-8 "$JAVA_FILE" -d "$DIR" 2>&1

# Run — classpath is the same temp dir
exec java -cp "$DIR" "$CLASS_NAME"