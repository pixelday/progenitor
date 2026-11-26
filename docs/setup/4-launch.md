# Step 4. Launch on a domain

As of 2026-11-25. **This step has not been run with this starter.** The zone, DNS and
registrar settings are **LIVE**: they were set and measured on live sites in earlier work,
which were served by Cloudflare Pages. The Workers-specific parts are **DOCS**. The launch
switch in the repo is **LOCAL**.

Do the parts in order. Dashboard labels move, so navigate by intent.

## 1. Before changing anything

```bash
D=example.com
whois "$D" | grep -iE '^[[:space:]]*(registrar|name server):'   # where the domain lives today
dig +short NS "$D" @1.1.1.1                                      # which nameservers answer
dig +short MX "$D" @1.1.1.1                                      # is mail at risk?
dig +short DS "$D" @1.1.1.1                                      # is DNSSEC on?
```

- This step assumes the nameservers are already Cloudflare's. A Workers custom domain does
  not work otherwise (DOCS).
- If they are elsewhere, move them first, using section 7.1 of
  `docs/archive/cloudflare-and-github-setup.md`. A nameserver move moves mail too: recreate every
  mail record before it, and turn DNSSEC off at the old registrar first.
- If the apex already has a CNAME or serves a live site, this is a cutover. Export the zone's
  DNS records before touching anything.

## 2. What the starter does not have yet

The build enforces the first row. The rest are the launch floor in section 7 of
`docs/archive/technical-brief.md`, and none of them is built here:

| Missing | Where it goes |
|---|---|
| Real privacy and terms text | `src/pages/privacy.astro`, `src/pages/terms.astro` |
| Icons: `favicon.ico`, an SVG icon, the Apple touch icon, a web manifest | `public/`, linked from `src/layouts/Base.astro` |
| A social share card: Open Graph tags and a 1200x630 image | `src/layouts/Base.astro`, fed from `src/site.ts` |
| Structured data (JSON-LD `WebSite`) | `src/layouts/Base.astro` |
| A check on real phones at 320 and 390 px wide | by hand |

## 3. The launch switch: one pull request

In `src/site.ts`:

```ts
  url: 'https://<apex>',
  launched: true,
```

In `wrangler.jsonc`, add the route and turn the platform hostname off:

```jsonc
  "routes": [{ "pattern": "<apex>", "custom_domain": true }],
  "workers_dev": false,
```

What the switch does, all of it tested by building both ways (LOCAL):

- every page except the 404 loses `noindex` and gains `<link rel="canonical">` on the new origin
- `robots.txt` gains `Sitemap: https://<apex>/sitemap-index.xml`
- the sitemap lists every page on the new origin, with trailing slashes, and leaves out the 404
- `npm run build` fails if the URL is still `example.com`, the name is still "Site name", or
  the privacy or terms page still carries starter text

Merging it deploys the site on the domain. Cloudflare creates the DNS record and the
certificate itself (DOCS).

- **OPEN:** whether the build's token may create the custom domain during a deploy. If the
  deploy fails on permissions, the owner adds it once in the dashboard (the Worker, Settings,
  Domains & Routes, Add, Custom domain) and keeps the `routes` entry in the file as the record.
- **OPEN:** that pull-request previews keep their `workers.dev` URLs once `workers_dev` is
  false. Open one after this change to confirm.

## 4. `www` redirects to the apex

Do not attach `www` to the Worker: that would serve the whole site on a second hostname.

1. **DNS.** Add a proxied placeholder record. `192.0.2.1` is reserved documentation address
   space and is never contacted.

   | Type | Name | Content | Proxy |
   |---|---|---|---|
   | A | `www` | `192.0.2.1` | Proxied |

2. **Rule.** In the zone: Rules, Create rule, Redirect Rule.

   | Field | Value |
   |---|---|
   | When incoming requests match | Wildcard pattern |
   | Request URL | `https://www.*` |
   | Target URL | `https://${1}` |
   | Status code | 302 first, 301 after it is verified |
   | Preserve query string | On |

   The scheme is required in the pattern. Without `https://` the rule saves and never fires.
3. Deploying the rule warns that it "may not apply to your traffic". That is a false alarm
   from the wildcard. Confirm the `www` record exists and deploy anyway.
4. **Never leave the record without the rule.** A proxied `www` with nothing behind it does
   not error: it hangs, and `curl` reports `HTTP 000`.

**Why 302 first.** A browser caches a 301 for weeks and it can't be recalled. A 302 is asked
again every time, so a mistake is fixed the moment the rule is fixed.

```bash
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' "https://www.$D/x?y=1"
# expect: 302 https://<apex>/x?y=1   (301 once the rule is switched)
```

## 5. Zone settings that differ from the defaults

These exist only in the dashboard. Any feature that rewrites pages at the edge is a change to
the site that is not in the repo, so each stays off unless it was decided on purpose.

| Setting | Default seen | Set to | Why | Tag |
|---|---|---|---|---|
| Always Use HTTPS (SSL/TLS, Edge Certificates) | Off on a new zone | On | Sends `http://` to `https://`. | LIVE |
| Browser Cache TTL (Caching, Configuration) | 4 hours | Respect Existing Headers | The default raises `max-age=0` to four hours, so visitors keep stale pages after every deploy. | LIVE |
| Email Address Obfuscation (Scrape Shield) | On, on zones nobody had configured | Off | It rewrites `mailto:` links and injects a script. | LIVE |
| Web Analytics | Found injecting on zones where it was never decided | Off, unless the owner chose analytics | The beacon is a third-party script. A plain `curl` never sees it: it is injected only when the request sends `Accept: text/html`. | LIVE |
| SSL/TLS encryption mode | not recorded | Full (strict), or leave Automatic if a new zone shows that. Never Flexible | Flexible is the classic redirect-loop cause. | LIVE, from the earlier runbook; not re-read from a dashboard |
| Minimum TLS version | not recorded | 1.2 | | DOCS |
| Rocket Loader | not recorded | Off | It rewrites scripts, which fights the CSP and hydration. | DOCS |
| Bot Fight Mode | not recorded | Off | Bot features can set cookies, which would make the privacy page's "no cookies" untrue. | LIVE |
| AI crawler policy (Security, Bot traffic) | Allow | What `docs/project.md` says, matching `robots.txt` | If a policy blocks and Bot Preference Sync is on, Cloudflare prepends its own rules to the served `robots.txt`. | DOCS |

Leave alone: no Cache Rules and no Edge Cache TTL; HSTS in the dashboard stays off because
`public/_headers` sends it; Zaraz not configured; Development Mode off.

**OPEN:** whether the Browser Cache TTL rewrite and the edge injections act on a Worker custom
domain. They were measured on Pages. `verify-live.sh` checks the result either way.

## 6. A domain that sends no mail

Skip this part if the domain has mailboxes, and never edit mail records as part of site work.

A domain with no mail should say so, or anyone can send mail that claims to come from it.
Three records, all DNS-only:

| Type | Name | Content |
|---|---|---|
| MX | `@` | priority `0`, mail server `.` |
| TXT | `@` | `v=spf1 -all` |
| TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s` |

```bash
dig +short MX "$D" @1.1.1.1                   # expect: 0 .
dig +short TXT "$D" @1.1.1.1 | grep -i spf1   # expect: "v=spf1 -all"
dig +short TXT "_dmarc.$D" @1.1.1.1           # expect: "v=DMARC1; p=reject; ..."
```

The commands print exactly this for the real `example.com`. No site in earlier work ran the
three records, so this part is DOCS.

## 7. Registrar and DNSSEC

- Auto-renew on, a valid payment method on the account, the transfer lock on, and a registrant
  email that someone reads. Copy the expiry date into `docs/project.md`.

  ```bash
  whois "$D" | grep -iE 'domain status|dnssec|expir'
  # expect "Domain Status: clientTransferProhibited" and an expiry well in the future
  ```
- **DNSSEC is the owner's call.** With Cloudflare as registrar and DNS it is one click and
  free. The cost comes at exit: it must be disabled, and the old record allowed to expire,
  before any nameserver change, or the domain stops resolving for validating resolvers (DOCS).

## 8. Verify the launch

```bash
bash scripts/verify-live.sh "$D" "$(git rev-parse main)"
```

In its default mode the script runs the page checks from step 3, except the `noindex` one,
then also checks:

- production sends no `X-Robots-Tag` and no `noindex` meta, and the canonical is `https://$D/`
- `www` answers 301 to the apex and keeps the path and query; `http` goes to `https`
- `robots.txt` names a sitemap, and that sitemap answers 200
- nameservers are Cloudflare's, the three no-mail records are present, and DNSSEC validates

**The last line of checks assumes a no-mail domain with DNSSEC on.** If this site has mail at
the domain or leaves DNSSEC off, those lines fail by design. Remove them from the script in a
change that does nothing else, and say why. While the `www` rule is still 302, its line fails
too; that is the cue for the next part.

The script checks `/` and one missing path. Check the other pages by hand, or loop the page
checks over the sitemap.

## 9. After it verifies

1. Switch the `www` rule from 302 to 301.
2. Raise HSTS in `public/_headers` from `max-age=300` to `max-age=31536000; includeSubDomains`,
   in its own pull request. Browsers hold it for the full year and it can't be recalled, so
   first list every subdomain of the zone, including DNS-only ones that point at other
   services: all of them are then committed to HTTPS. No `preload`.
3. Optional: add the domain to Google Search Console as a domain property, verified by a
   DNS-only TXT record, and submit the sitemap.
4. In `docs/project.md`, record **that** each dashboard setting was set, by whom and when. Do
   not keep a copy of the values: it drifts from the dashboard and then reads as fact. To
   learn the zone's state, read the zone or run the script.
