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
  not work otherwise (DOCS). A domain registered at Cloudflare with Cloudflare's nameservers
  needs no registrar work at all.
- If they are elsewhere, move them first. A nameserver move moves all DNS, mail included
  (LIVE):
  - recreate every mail record in the Cloudflare zone before the move, and send test mail in
    both directions after it
  - turn DNSSEC off at the old registrar first, and let the old `DS` record's TTL expire,
    commonly 24 to 48 hours, or validating resolvers stop finding the domain (DOCS). Empty
    `DS` output above means none is set.
- **A registrar transfer has a trap** (LIVE). Changing the registrant's name, organization or
  email can start a 60-day transfer lock at the losing registrar. Transfer first and change
  the contact details after. The registrant email must be one that receives mail.
- Mail and verification records (MX, SPF, DKIM, DMARC, site-verification TXT) stay DNS-only
  and are never edited as part of site work (LIVE).
- If the apex already has a record or serves a live site, this is a cutover. Export the zone's
  DNS records before touching anything. A custom domain can't be created on a hostname that
  already has a CNAME record, so remove the apex record before part 3 (DOCS).

## 2. What only the owner can supply

The starter ships the whole launch floor in section 7 of
`docs/archive/technical-brief.md`: the legal pages, icons, a share card, structured data,
`sitemap.xml` and `llms.txt`. What it cannot ship is this site's own content. The build
enforces the first three rows:

| Needed | Where it goes |
|---|---|
| Real privacy policy, terms and accessibility text | `src/pages/privacy-policy.astro`, `src/pages/terms.astro`, `src/pages/accessibility.astro`; then `legalUpdated` in `src/site.ts` |
| The site's own icons and share image | the six files in `public/`, under the same names and sizes (step 1, part 6) |
| The share image's alt text: what the image shows | `shareImage.alt` in `src/site.ts` |
| A publisher for the structured data, only if it is true | `publisher` in `src/site.ts` |
| A contact for accessibility reports: an alias, never a personal address | `contact` in `src/site.ts` |
| The AI-crawler decision | `aiCrawlers` in `src/site.ts`, and the same setting in part 5 |

And by hand, because no tool can:

- Real phones at 320 and 390 px wide: iOS Safari and Android Chrome.
- A screen reader on every page (VoiceOver with Safari, or NVDA with Firefox), and the whole
  site by keyboard alone.
- 200% zoom, and the text-spacing overrides, with nothing clipped.
- `npm run audit` and the table in step 1, part 5a, on the launch branch's preview.
- The accessibility page then says what was tested and when. Until it does, it is not true.

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

- every page except the 404 loses `noindex` and gains `<link rel="canonical">`, a share card
  and, on the home page, structured data, all on the new origin
- `robots.txt` gains `Sitemap: https://<apex>/sitemap.xml`
- `sitemap.xml` appears. It lists every page on the new origin, without trailing slashes
  and with a last-modified date where one is known, and leaves out the 404
- `llms.txt` appears, if `aiCrawlers` is `'allow'`
- `npm run build` fails if the URL is still `example.com`, the name is still "Site name", a
  legal page still carries starter text, or the icons, the share image or its alt text are
  still the starter's
- `npm run build` also fails if any of those consumers is out of step with the others

Merging it deploys the site on the domain. Cloudflare creates the DNS record and the
certificate itself (DOCS).

- The dashboard's "up to 48 hours" for the certificate is boilerplate: on Pages it took
  minutes. If it is still pending after 24 hours, look for CAA records on the zone (LIVE).
- **The universal certificate covers the apex and one level of subdomains only.** `www.<apex>`
  and `staging.<apex>` are covered. `www.staging.<apex>` fails in the TLS handshake, before
  any redirect can run, and no rule can fix that. Don't create records two levels deep (LIVE).
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
| AI crawler policy (Security, Bot traffic) | Allow | What `aiCrawlers` in `src/site.ts` says | The file is a request and this setting is the enforcement, so the two must agree. If a policy blocks and Bot Preference Sync is on, Cloudflare prepends its own rules to the served `robots.txt`. | DOCS |

Leave alone: no Cache Rules and no Edge Cache TTL; HSTS in the dashboard stays off because
`public/_headers` sends it; Zaraz not configured; Development Mode off.

**OPEN:** whether the Browser Cache TTL rewrite and the edge injections act on a Worker custom
domain. They were measured on Pages. `verify-live.sh` checks the result on the domain either
way: HTML must still say `max-age=0, must-revalidate`, a file under `/_astro/` must say
`immutable`, and nothing may be injected.

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
  email that someone reads. Copy the expiry date into `docs/index.md`.

  ```bash
  whois "$D" | grep -iE 'domain status|dnssec|expir'
  # expect "Domain Status: clientTransferProhibited" and an expiry well in the future
  ```
- **DNSSEC is the owner's call.** With Cloudflare as registrar and DNS it is free: Domain
  Registration, Manage Domains, Manage, Configuration, Enable DNSSEC. Cloudflare adds the `DS`
  record at the registry itself. Activation can take one to two days, so turn it on well
  before part 8, which checks it (DOCS). The cost comes at exit: it must be disabled, and the
  old record allowed to expire (commonly 24 to 48 hours), before any nameserver change, or
  the domain stops resolving for validating resolvers (DOCS).

## 8. Verify the launch

```bash
bash scripts/verify-live.sh "$D" "$(git rev-parse main)" prod <worker-name>.<subdomain>.workers.dev
```

In its default mode the script runs the page checks from step 3, except the `noindex` one.
Their two cache lines settle part 5's OPEN: on the domain, HTML must still say `max-age=0`.
Then it also checks:

- production sends no `X-Robots-Tag` and no `noindex` meta, and the canonical is `https://$D/`
- `www` answers 301 to the apex and keeps the path and query; `http` goes to `https`
- `robots.txt` names a sitemap, that sitemap answers 200 and lists the home page
- the share image is on this host and is a PNG, and the home page carries structured data
- `llms.txt` answers 200 if `robots.txt` allows AI crawlers, and 404 if it blocks them
- nameservers are Cloudflare's, the three no-mail records are present, and DNSSEC validates
- the `workers.dev` hostname, the fourth argument, no longer serves the site

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
   services: all of them are then committed to HTTPS. A proxied subdomain two levels deep
   has no certificate (part 3). No `preload`.
3. Optional: add the domain to Google Search Console as a domain property, verified by a
   DNS-only TXT record, and submit `https://<apex>/sitemap.xml`.
4. Check the share card in a validator, and the structured data in the Rich Results Test.
   Previews are cached: to change the card, add the new image under a new file name and
   change `shareImage.path` in `src/site.ts`.
5. In `docs/index.md`, record **that** each dashboard setting was set, by whom and when. Do
   not keep a copy of the values: it drifts from the dashboard and then reads as fact. To
   learn the zone's state, read the zone or run the script.

## 10. If a site needs it

The starter sets up none of these.

- **A second domain that only redirects here**, such as another TLD of the same name (LIVE).
  It is its own zone with one rule:
  - DNS: proxied `192.0.2.1` A records for `@` and `www`. No wildcard record on a zone that
    carries mail.
  - Rule: match All incoming requests; type Dynamic; expression
    `concat("https://<apex>", http.request.uri)`; 302 first, then 301; Preserve query string
    Off, because `http.request.uri` already holds the query.
  - Always Use HTTPS on that zone: Off. The rule already catches `http://`, and the toggle
    would add a second hop.

  If that zone serves a live site or carries mail, export its DNS first, change only the web
  records, and confirm mail still arrives.
- **Cloudflare Web Analytics.** Three things change in one pull request (README, rule 2): the
  zone's Web Analytics setting; the CSP in `astro.config.ts`, which needs
  `script-src https://static.cloudflareinsights.com` and
  `connect-src https://cloudflareinsights.com` (LIVE); and the privacy policy, which says
  there are no analytics. `verify-live.sh` fails its "no edge injection" line while the
  beacon is on, so that line changes in the same pull request. Whether Cloudflare injects the
  beacon on a Worker custom domain is OPEN. The fallback is the manual snippet from the Web
  Analytics setup screen, with the same CSP entries.
- **Path aliases**, such as `/about-us` to `/about` (DOCS). One per line in
  `public/_redirects`: `/about-us /about 301`. Always write the status code, which otherwise
  defaults to 302. The file matches paths only, never hostnames. Limits: 2,000 static and 100
  dynamic rules, 1,000 characters each.
