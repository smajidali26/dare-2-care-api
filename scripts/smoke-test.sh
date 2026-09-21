#!/usr/bin/env bash
#
# Boots nothing itself — assumes an API is already listening on $BASE_URL — and
# asserts that the routes the two front-ends depend on actually respond.
#
# Run locally against a dev server:
#   BASE_URL=http://localhost:4000 ./scripts/smoke-test.sh
#
# In CI this runs against a freshly migrated and seeded Postgres, so the
# seeded admin credentials below are expected to work.

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000}"
ADMIN_EMAIL="${SMOKE_ADMIN_EMAIL:-admin@dare2care.org}"
ADMIN_PASSWORD="${SMOKE_ADMIN_PASSWORD:-Admin123!}"

pass=0
fail=0

check() { # label method path expected-status [extra curl args...]
  local label="$1" method="$2" path="$3" want="$4"; shift 4
  local code
  : > /tmp/smoke-body   # curl leaves the file untouched on a connection failure
  code=$(curl -s -o /tmp/smoke-body -w '%{http_code}' --max-time 20 -X "$method" "$BASE_URL$path" "$@")
  if [ "$code" = "$want" ]; then
    printf '  ok   %-44s %s\n' "$method $path" "$code"
    pass=$((pass + 1))
  else
    printf '  FAIL %-44s got %s, want %s\n' "$method $path" "$code" "$want"
    printf '       body: %s\n' "$(head -c 200 /tmp/smoke-body)"
    fail=$((fail + 1))
  fi
}

echo "Smoke testing $BASE_URL"
echo

echo "health"
check "" GET /api/health 200
check "" GET /api/health/db 200

echo "public routes (the website reads these)"
check "" GET /api/public/events 200
check "" GET /api/public/images/slider 200
check "" GET /api/public/management 200
check "" GET /api/public/pages/about-us 200
check "" GET /api/public/pages/history 200

echo "routing and error handling"
# Guards the outage where a bad rewrite handed Express the wrong path and every
# route 404'd: this must 404 with the path we asked for, not some other path.
: > /tmp/smoke-body
code=$(curl -s -o /tmp/smoke-body -w '%{http_code}' --max-time 20 "$BASE_URL/api/definitely-not-a-route")
if [ "$code" = "404" ] && grep -q "definitely-not-a-route" /tmp/smoke-body; then
  printf '  ok   %-44s 404 names the requested path\n' "GET /api/definitely-not-a-route"
  pass=$((pass + 1))
else
  printf '  FAIL %-44s got %s; body: %s\n' "GET /api/definitely-not-a-route" "$code" "$(head -c 200 /tmp/smoke-body)"
  printf '       the 404 should name the path that was requested — if it names a\n'
  printf '       build artifact instead, request paths are being rewritten.\n'
  fail=$((fail + 1))
fi
check "" GET /api/public/pages/no-such-page 404
check "" GET /api/admin/stats 401

echo "authentication"
LOGIN_BODY=$(curl -s --max-time 20 -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
TOKEN=$(printf '%s' "$LOGIN_BODY" | node -e \
  "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{process.stdout.write(JSON.parse(d).data.accessToken||'')}catch(e){}})")

if [ -n "$TOKEN" ]; then
  printf '  ok   %-44s token issued\n' "POST /api/auth/login"
  pass=$((pass + 1))
else
  printf '  FAIL %-44s no token; body: %s\n' "POST /api/auth/login" "$(printf '%s' "$LOGIN_BODY" | head -c 200)"
  fail=$((fail + 1))
fi

AUTH=(-H "Authorization: Bearer $TOKEN")
echo "authenticated admin routes"
check "" GET /api/auth/me 200 "${AUTH[@]}"
check "" GET /api/admin/stats 200 "${AUTH[@]}"
check "" GET /api/admin/events 200 "${AUTH[@]}"
check "" GET /api/admin/images 200 "${AUTH[@]}"
check "" GET /api/admin/pages 200 "${AUTH[@]}"
check "" GET /api/admin/contacts 200 "${AUTH[@]}"

echo
echo "passed $pass, failed $fail"
[ "$fail" -eq 0 ] || exit 1
