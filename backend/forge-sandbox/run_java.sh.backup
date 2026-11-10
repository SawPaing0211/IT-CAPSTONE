#!/bin/sh
# ─── Adventure Realm Java Runner ─────────────────────────────────────────────
#
# Wrapper pattern:
#   /tmp/sandbox/Solution.java  — student code (untouched, read-only mount)
#   /tmp/sandbox/Main.java      — generated wrapper (also in read-only mount)
#
# Both files are compiled together into /tmp/work (tmpfs, writable).
# The JVM then runs Main, which calls Solution's static method.
#
# $1 is the student file path passed by sandbox.py, e.g.
#    /tmp/sandbox/Solution.java
# We derive the sandbox directory from it so the script stays flexible.
# ─────────────────────────────────────────────────────────────────────────────
set -e

STUDENT_FILE="$1"
SANDBOX_DIR="$(dirname "$STUDENT_FILE")"

WORK_DIR="/tmp/work"
mkdir -p "$WORK_DIR"

# Compile BOTH the student's Solution.java and the generated Main.java.
# -encoding UTF-8  → safe for any source characters
# -d $WORK_DIR     → .class files go to writable tmpfs, never the read-only mount
javac -encoding UTF-8 \
    "$SANDBOX_DIR/Solution.java" \
    "$SANDBOX_DIR/Main.java" \
    -d "$WORK_DIR" 2>&1

# Run the wrapper entry point (Main.class).
# -cp $WORK_DIR    → classpath includes Solution.class compiled above
if [ -f /tmp/sandbox/input.txt ]; then
    exec java -cp "$WORK_DIR" Main < /tmp/sandbox/input.txt
else
    exec java -cp "$WORK_DIR" Main
fi