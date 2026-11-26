#!/usr/bin/env bash
# verify-live.sh <host> <expected-commit-sha> [prod|preview]
#   prod (default): <host> is the production domain. Every check, including www, http and DNS.
#   preview: <host> is a workers.dev hostname (a PR Preview or the production alias).
#            Page checks only, and the host must send noindex.
# Prints PASS/FAIL per check; exits 1 if any check failed.
set -uo pipefail
D=${1:?host}; SHA=${2:?expected commit sha}; MODE=${3:-prod}
H='Accept: text/html,application/xhtml+xml'   # browser-shaped: bare curl misses edge injection
bad=0
check() { local name=$1; shift; if "$@"; then echo "PASS  $name"; else echo "FAIL  $name"; bad=1; fi; }
has()   { grep -qiE -- "$1" <<<"$2"; }        # here-strings, not pipes: no SIGPIPE races
lacks() { ! has "$1" "$2"; }
eq()    { [ "$1" = "$2" ]; }
get()   { curl -sS --max-time 15 -A 'verify-live' -H "$H" "$@"; }
code()  { get -o /dev/null -w '%{http_code}' "$1"; }
dest()  { get -o /dev/null -w '%{redirect_url}' "$1"; }
hdrs()  { get -D - -o /dev/null "$1"; }
blanket() { sed 's/#.*//' <<<"$1" | tr -d '\r' | awk '   # prints a Disallow: / that applies to *
  { l = tolower($0); sub(/^[ \t]+/, "", l) }
  l == "" { next }
  l ~ /^user-agent:/ { if (!ua) star = 0; ua = 1; if (l ~ /^user-agent:[ \t]*\*[ \t]*$/) star = 1; next }
  { ua = 0 }
  star && l ~ /^disallow:[ \t]*\/[ \t]*$/ { print; exit }'; }

PAGE="https://$D/"; MISS="https://$D/verify-live-no-such-page"
PH=$(hdrs "$PAGE"); PB=$(get "$PAGE"); MH=$(hdrs "$MISS"); MB=$(get "$MISS")

check "page 200"                     eq "$(code "$PAGE")" 200
check "page is build $SHA"           has "name=\"site-marker\" content=\"$SHA\"" "$PB"
check "unknown path 404"             eq "$(code "$MISS")" 404
check "404 is the site's own page"   has "$SHA" "$MB"
for h in content-security-policy strict-transport-security x-content-type-options \
         referrer-policy x-frame-options permissions-policy; do
  check "$h (page)"                  has "^$h:" "$PH"
  check "$h (404)"                   has "^$h:" "$MH"
done
check "no Set-Cookie (page)"         lacks '^set-cookie:' "$PH"
check "no Set-Cookie (404)"          lacks '^set-cookie:' "$MH"
check "no edge injection"            lacks 'cloudflareinsights|__cf_email__|rocket-loader' "$PB"
check "CSP meta (page)"              has "<meta[^>]*http-equiv=[\"']?content-security-policy" "$PB"
check "CSP meta (404)"               has "<meta[^>]*http-equiv=[\"']?content-security-policy" "$MB"
ROBOTS=$(get "https://$D/robots.txt")
check "robots.txt 200"               eq "$(code "https://$D/robots.txt")" 200
check "robots.txt doesn't block *"   eq "$(blanket "$ROBOTS")" ""

if [ "$MODE" = preview ]; then
  check "noindex on this host"       has '^x-robots-tag:.*noindex' "$PH"
else
  check "production is indexable"    lacks '^x-robots-tag:' "$PH"
  check "no noindex meta"            lacks '<meta[^>]*noindex' "$PB"
  check "canonical is https://$D/"   has "<link[^>]*rel=\"canonical\"[^>]*href=\"https://$D/\"|<link[^>]*href=\"https://$D/\"[^>]*rel=\"canonical\"" "$PB"
  check "www -> apex, 301"           eq "$(code "https://www.$D/x?y=1")" 301
  check "www keeps path and query"   eq "$(dest "https://www.$D/x?y=1")" "https://$D/x?y=1"
  check "http -> https"              eq "$(dest "http://$D/")" "https://$D/"
  SMAP=$(sed -nE 's/^[Ss]itemap:[[:space:]]*([^[:space:]]+).*/\1/p' <<<"$ROBOTS" | head -n1)
  check "robots.txt has Sitemap"     has "^Sitemap: https://$D/" "$ROBOTS"
  check "named sitemap is 200"       eq "$(code "${SMAP:-https://$D/sitemap.xml}")" 200
  check "nameservers on Cloudflare"  has 'ns\.cloudflare\.com\.?$' "$(dig +short NS "$D" @1.1.1.1)"
  check "null MX"                    eq "$(dig +short MX "$D" @1.1.1.1)" "0 ."
  check "SPF -all"                   has '"v=spf1 -all"' "$(dig +short TXT "$D" @1.1.1.1)"
  check "DMARC p=reject"             has 'p=reject' "$(dig +short TXT "_dmarc.$D" @1.1.1.1)"
  check "DNSSEC validates (ad flag)" has '^;; flags:.* ad[ ;]' "$(dig +dnssec "$D" A @1.1.1.1)"
fi
exit $bad
