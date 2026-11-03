#!/usr/bin/env bash
# Smoke test for POST /api/admin/enrollment/bulk-upload against a running backend.
# Uploads every file in sample_csv/ and prints each summary. Needs curl and jq.
# Student year level is not part of any file except 6_legacy_..., which checks
# that an old column is accepted and ignored.
#
# Usage: API=http://localhost:5000 ADMIN_USERNAME=... ADMIN_PASSWORD=... ./smoke_bulk_upload.sh
# The section_no values in the samples (29022, 29024, 30011) must exist as class codes.
set -euo pipefail
API="${API:-http://localhost:5000}"
: "${ADMIN_USERNAME:?set ADMIN_USERNAME}"
: "${ADMIN_PASSWORD:?set ADMIN_PASSWORD}"
HERE="$(cd "$(dirname "$0")" && pwd)"

TOKEN=$(curl -s -X POST "$API/api/auth/login" -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}" | jq -r '.access_token // empty')
[ -n "$TOKEN" ] || { echo "Login failed (wrong credentials or account locked)"; exit 1; }

for f in "$HERE"/sample_csv/*.csv; do
  echo "== $(basename "$f")"
  curl -s -X POST "$API/api/admin/enrollment/bulk-upload" \
    -H "Authorization: Bearer $TOKEN" -F "file=@$f" | jq '{error, missing, summary, errors}'
done
