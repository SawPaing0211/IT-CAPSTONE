#!/bin/sh
# ─── Adventure Realm Java Runner ─────────────────────────────────────────────
#
# NOTE: No "set -e" here intentionally.
#   With set -e, if javac fails the script exits immediately inside the $()
#   subshell context — the __COMPILE_ERROR__ sentinel never gets written to
#   stderr, and Python cannot distinguish a compile failure from a runtime
#   crash.  We check $COMPILE_EXIT explicitly instead.
#
# Flow:
#   1. Compile Solution.java + Main.java → /tmp/work (tmpfs, writable)
#   2. If compile fails → write __COMPILE_ERROR__ sentinel to stderr, exit 1
#   3. If compile passes → run Main with optional stdin from input.txt
# ─────────────────────────────────────────────────────────────────────────────

STUDENT_FILE="$1"
SANDBOX_DIR="$(dirname "$STUDENT_FILE")"
WORK_DIR="/tmp/work"
mkdir -p "$WORK_DIR"

# ── Compile ───────────────────────────────────────────────────────────────────
# $() captures stdout+stderr; COMPILE_EXIT captures the real javac exit code.
COMPILE_OUTPUT=$(javac -encoding UTF-8 \
    "$SANDBOX_DIR/Solution.java" \
    "$SANDBOX_DIR/Main.java" \
    -d "$WORK_DIR" 2>&1)
COMPILE_EXIT=$?

if [ $COMPILE_EXIT -ne 0 ]; then
    printf '__COMPILE_ERROR__\n' >&2
    printf '%s\n' "$COMPILE_OUTPUT" >&2
    exit 1
fi

# ── Run ───────────────────────────────────────────────────────────────────────
if [ -f /tmp/sandbox/input.txt ]; then
    exec java -cp "$WORK_DIR" Main < /tmp/sandbox/input.txt
else
    exec java -cp "$WORK_DIR" Main
fi
