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
#
# Read-only by default. SMOKE_WRITE=1 also saves content and reads it back;
# CI sets it because its database is thrown away. Never set it against an API
# whose content matters: it overwrites the homepage "What We Do" section.

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

created_id() { # id of the record in the last response body
  node -e "try{process.stdout.write(JSON.parse(require('fs').readFileSync('/tmp/smoke-body','utf8')).data.id||'')}catch(e){}"
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
check "" GET /api/public/homepage/what-we-do 200
check "" GET /api/public/pages 200

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
check "" PUT /api/admin/homepage/what-we-do 401

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
check "" GET /api/admin/homepage/what-we-do 200 "${AUTH[@]}"
# Rejected by validation before anything is written, so safe on any API.
check "" PUT /api/admin/homepage/what-we-do 400 "${AUTH[@]}" \
  -H 'Content-Type: application/json' -d '{"heading":"Smoke","subheading":"","items":[]}'

if [ "${SMOKE_WRITE:-0}" = "1" ]; then
  echo "content round-trip (SMOKE_WRITE=1)"
  SECTION='{"heading":"Smoke test heading","subheading":"","items":[{"title":"Card","description":"Text","icon":"heart","color":"teal"}]}'
  check "" PUT /api/admin/homepage/what-we-do 200 "${AUTH[@]}" \
    -H 'Content-Type: application/json' -d "$SECTION"

  # The public site must see the saved version, not the built-in default.
  : > /tmp/smoke-body
  code=$(curl -s -o /tmp/smoke-body -w '%{http_code}' --max-time 20 "$BASE_URL/api/public/homepage/what-we-do")
  if [ "$code" = "200" ] && grep -q "Smoke test heading" /tmp/smoke-body; then
    printf '  ok   %-44s serves the saved section\n' "GET /api/public/homepage/what-we-do"
    pass=$((pass + 1))
  else
    printf '  FAIL %-44s got %s; body: %s\n' "GET /api/public/homepage/what-we-do" "$code" "$(head -c 200 /tmp/smoke-body)"
    fail=$((fail + 1))
  fi

  echo "sub pages and the menu (SMOKE_WRITE=1)"
  ABOUT_ID=$(curl -s --max-time 20 "$BASE_URL/api/admin/pages" "${AUTH[@]}" | node -e \
    "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{process.stdout.write((JSON.parse(d).data.find(p=>p.slug==='about-us')||{}).id||'')}catch(e){}})")
  check "" POST /api/admin/pages 201 "${AUTH[@]}" -H 'Content-Type: application/json' \
    -d "{\"slug\":\"about-smoke-sub\",\"title\":\"Smoke sub page\",\"content\":\"<p>x</p>\",\"parentId\":\"$ABOUT_ID\",\"menuLabel\":\"Smoke link\"}"
  SUB_ID=$(created_id)
  : > /tmp/smoke-body
  code=$(curl -s -o /tmp/smoke-body -w '%{http_code}' --max-time 20 "$BASE_URL/api/public/pages")
  if [ "$code" = "200" ] && node -e "const p=JSON.parse(require('fs').readFileSync('/tmp/smoke-body','utf8')).data.find(p=>p.slug==='about-smoke-sub');process.exit(p&&p.parentId==='$ABOUT_ID'&&p.menuLabel==='Smoke link'?0:1)"; then
    printf '  ok   %-44s lists the sub page under About Us\n' "GET /api/public/pages"
    pass=$((pass + 1))
  else
    printf '  FAIL %-44s got %s; body: %s\n' "GET /api/public/pages" "$code" "$(head -c 200 /tmp/smoke-body)"
    fail=$((fail + 1))
  fi
  # The menu's third level: a page under the sub page. Nothing can go under that.
  check "" POST /api/admin/pages 201 "${AUTH[@]}" -H 'Content-Type: application/json' \
    -d "{\"slug\":\"about-smoke-sub-2\",\"title\":\"Smoke third level\",\"content\":\"<p>x</p>\",\"parentId\":\"$SUB_ID\"}"
  SUB2_ID=$(created_id)
  check "" POST /api/admin/pages 400 "${AUTH[@]}" -H 'Content-Type: application/json' \
    -d "{\"slug\":\"about-smoke-sub-3\",\"title\":\"Too deep\",\"content\":\"<p>x</p>\",\"parentId\":\"$SUB2_ID\"}"
  # A page with sub pages can't be deleted; once they are gone, it can.
  check "" DELETE /api/admin/pages/about-us 409 "${AUTH[@]}"
  check "" DELETE /api/admin/pages/about-smoke-sub 409 "${AUTH[@]}"
  check "" DELETE /api/admin/pages/about-smoke-sub-2 200 "${AUTH[@]}"
  check "" DELETE /api/admin/pages/about-smoke-sub 200 "${AUTH[@]}"
fi

echo
echo "passed $pass, failed $fail"
[ "$fail" -eq 0 ] || exit 1
