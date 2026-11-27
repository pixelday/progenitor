# The YAML data layer: how the reference instance is driven by flat files

This brief is for the session building the Astro starter. It explains how the reference
instance is driven from flat YAML files committed to its repository. The reference instance is
a production Jekyll site on Cloudflare, and you have a sandbox copy of it. The brief covers
the design and where each part lives in the copy. It does not translate anything to Astro;
that is your job.

The brief stands alone and names no client. Paths are relative to the root of the reference
copy. Where the reference's own key names carry its industry, this brief uses neutral names
and says where the real key sits.

## Status and confidence

- **Read from source on 2026-11-26.** Every statement about the reference instance comes from
  reading its files that day. Your copy may be newer or older, so open the cited file before
  relying on a detail.
- **Executed on 2026-11-26.** The parser readings in section 11. The Ruby side used Ruby 3.4's
  standard YAML library, which is what Jekyll uses. The JavaScript side used plain Node. No
  JavaScript YAML library was run.
- **Design input, not decided.** Section 9, on splitting the main data file by who edits it,
  describes a direction the reference has started and not finished.

## 1. The model

The deployed site is a pure function of the files in the repository. There is no database, no
CMS, and nothing runs when a page is requested.

- Site-wide facts and switches live in YAML files under `_data/`.
- Each page is also a YAML document. Its front matter holds the page's content as an ordered
  list of sections, and the file has no body.
- One layout, the sections engine, walks that list, pulls in modules, substitutes tokens,
  renders Markdown and hands the result to the site chrome. The chrome reads the same data
  files.

To change the site, you edit a YAML value and commit it. A merge to `main` makes Cloudflare
rebuild every page and redeploy. Every switch is resolved at build time, so flipping a switch
means making a commit, and every commit to `main` is a deploy.

## 2. The thin entry point

`_config.yml` is the config file Jekyll requires, and it is kept nearly empty on purpose. Its
first comment says so:

```yaml
# Deliberately minimal. Everything else has moved to files that
# hot-reload (_data/), the Gemfile.
```

It keeps only what the generator itself needs: the timezone that dates print in, the Sass
settings, and the include and exclude rules. The include rule force-copies two host-config
files whose names start with an underscore, so they reach the build output. The exclude rule
keeps repository docs and agent instruction files out of the deployed site.

This is the same idea as keeping `CLAUDE.md` and `AGENTS.md` as one-line pointers to a neutral
`index.md`. The file a tool insists on stays thin, and the real content lives in a neutral file
that the project owns. There are three reasons, and all of them carry over to a new stack:

1. **Portability.** A framework's config file is written in that framework's format and is
   useless once you change frameworks. YAML data files are not tied to a framework, which is
   the only reason copying them into another generator is plausible at all.
2. **Dev loop.** Jekyll's dev server rebuilds when files in `_data/` change, but it has to be
   restarted to pick up a change to `_config.yml`.
3. **One home per fact.** If site facts lived in both the config and the data, every reader
   would need to know which one wins.

The rule the reference follows: **a value that describes the site belongs in data, and a value
that describes the generator belongs in config.**

## 3. What lives where

```
_config.yml              generator settings only (section 2)
_data/
  global.yml             the switchboard: identity, contact facts, selection lists, all switches
  disclaimers.yml        regulated wording, stored as named versions; global.yml selects one
  reference.yml          derived lookup table: region code -> display name, external ID URL
  lists/
    team.yml             people: id, name, title, bio, photo with intrinsic size, email
    figures.yml          content images: id, file, intrinsic size, alt text, optional caption
    logos.yml            partner logos: id, display name, outbound URL, sprite offsets
    reviews.yml          curated testimonials: author, short callout, full text, rating
    credits.yml          attribution entries for media, icons and fonts
*.html                   pages: front matter only, no body (section 6)
_layouts/default.html    chrome: head, header, main, footer, mobile CTA bar, SVG sprite, scripts
_layouts/sections.html   the sections engine (section 6)
_includes/sections/      modules a page can name (team, steps, reviews, ...) and chrome parts
_includes/*.liquid       single-purpose emitters: phone link, hours, region list, figure,
                         headshot, structured data, head
```

A few files that are not pages also carry front matter, so the generator runs its templates
over them: `robots.txt`, `llms.txt`, `sitemap.xml`, `_headers`, `manifest.webmanifest` and the
main stylesheet. Section 7 covers why.

## 4. `global.yml`: the switchboard

The file is grouped by role, from top to bottom.

| Group | Keys (real names where they are neutral) | Read by |
|---|---|---|
| Identity | `companyName`, `legalName`, `srName` (the name as a screen reader should say it, with "&" spelled out), `tagline`, `defaultPageTitle`, `defaultPageDescription` | head fallbacks, header, footer, tokens, copyright line, `llms.txt` |
| Deploy address | `url` (canonical, with a trailing slash), `basePath` | canonical links, Open Graph, sitemap, robots, every internal link and asset path |
| Contact | `email`, `phone`, `fax`, `phoneE164`, `faxE164`, `address-1`, `city`, `state`, `zip`, `country`, `googleMapsURL` | footer, contact blocks on legal pages, click-to-call, JSON-LD, tokens |
| Hours | `hours.prose`, plus atomic fields (`days`, `open`, `openISO`, `close`, `closeISO`, `tzAbbr`, `tzName`, `note`) | prose: legal-page contact blocks. Atomic: footer `<time>` and `<abbr>` markup, JSON-LD opening hours |
| External profiles | `sameAs` (rows of `id`, `name`, `url`), `socialProfiles` (a list of ids) | every active `sameAs` row goes into JSON-LD; `socialProfiles` picks the footer icons and their order |
| Partner list | an ordered list of ids (called `partners` here) | joined to `lists/logos.yml` to draw the logo grid |
| Form copy | consent labels and detail text, each on one line with inline HTML links | the contact form |
| Switchboard | the region map, feature switches, a pointer into `disclaimers.yml`, deploy-exposure switches, `legalDocsDate` | sections 5 to 7 |

The switches, by kind:

- **Region map** (called `regions` here): every region the business could serve, each with a
  boolean.
- **Feature switches:** `reviewsShown`; whether the logo grid shows; whether the full partner
  page is published; `turnstileEnabled` (reserved, with no consumer yet); a messaging switch
  that turns on a form checkbox and present-tense policy wording; and a data-sharing switch that
  shows or hides one policy paragraph.
- **A footer-notice pointer** (called `footerNotice` here), plus one switch that must flip with
  it.
- **Deploy exposure:** `siteIsIndexable`, `showStructuredData`, `includeSocialShareMeta`,
  `assetCacheBusting`, `supportAIVisibility` (section 7).
- **`legalDocsDate`:** the default effective and last-updated date for legal pages.

**The comments are part of the design.** Each switch's comment says what ON and OFF do, lists
every consumer, and names any other change that must accompany a flip. One page switch lists
its four consumers and says that flipping it is the whole release. The comments also carry a
lot of project history, such as dates and decision references. When you carry the pattern over,
keep the consumer lists and the warnings about coupled changes, and drop the history.

## 5. Four data patterns

### 5.1 One value, many consumers

Each fact is stored once, and every surface that shows it derives it from that one value.

- `phone` is the display string. The click-to-call include strips the punctuation to build the
  `tel:` link, and the `${phone}` token puts the number into prose. Its E.164 form for
  structured data is stored separately, as a second copy kept in sync by hand (section 10).
- The region map produces three outputs in the same order: the prose list ("A, B, and C", with
  an Oxford comma, from `_includes/licensed-states.liquid`), the JSON-LD `areaServed` list, and
  the `when:` section gates.
- `url` feeds the canonical link, `og:url`, `sitemap.xml`, the sitemap line in `robots.txt`
  and the footer brand link.

### 5.2 Registry plus selection list

A registry holds every entry the site knows about. A short, ordered list of ids in `global.yml`
chooses which entries appear and in what order.

- `sameAs` is the registry and `socialProfiles` is the footer's selection.
- `lists/logos.yml` is the registry, and it includes logos not currently shown. The partner id
  list is the selection.
- `reference.yml` is the registry of all known regions. The region map is the selection.

To turn an entry on, you add its id to the list. Entries that are not live yet stay in the file
as comments, each with a one-line reason such as "held until X", so the reason stays next to the
entry.

### 5.3 The ordered on/off map

```yaml
regions:
  AA: true
  BB: true
  CC: false   # flip to true when this region opens
  DD: true
```

Every option is listed. Turning one on or off means flipping its boolean, never commenting lines
in or out. Only active entries render, and they render in file order, so the order of the map is
the display order. Section 11 explains why that order is easy to lose in another stack.

### 5.4 Pointer to named versions

`disclaimers.yml` holds the regulated wording as named versions, two of them today, and both are
complete text. A single key in `global.yml` names the version the footer renders.

A wording change due on a known date is therefore not a text edit. It is a one-line pointer
change, which can be prepared as a pull request in advance and merged on the day.

When a pointer flip has to happen together with a switch flip, the reference keeps the two keys
on adjacent lines and says so in a comment. A separate check script fails if the two disagree.
That script is not in the deploy repository.

## 6. Pages are data: the sections contract

A page file is front matter with no body. Here is a sanitized page with the same shape as
`about.html`:

```yaml
---
layout: sections
title: About Us | Example Co
description: "One sentence for search results."
schemaType: AboutPage        # JSON-LD @type for this page
heading: About us            # the hero <h1>
heroImage: bg1               # file name, without extension, in assets/images/bg/
sectioned: true              # render each entry as its own block (see below)
sections:
  - class: t-align-center
    md: |-
      Example Co is a small business that ... We serve ${regionList}.
  - bg: light-gray
    class: t-align-center
    width: laptop
    heading: Meet the team     # passed to the module
    intro: |-                  # passed to the module
      We are ...
    include: sections/team     # module; reads lists/team.yml
  - bg: gradient-1
    include: sections/reviews
  - bg: light-gray
    class: t-align-center
    md: |-
      ## Ready to chat?

      Call us at ${phone}, or [send us a message](/contact#form).

      [Get in Touch](/contact){:.button.button--blue}
---
```

**Page fields.** `title` and `description` fall back to the defaults in `global.yml`. The others
are `schemaType`; the hero fields (`heading`, `heroImage`, `heroSize`, `headingStyle`, and
`heroCTA: {text, url}`); `sectioned`; `sections`; and the optional `effectiveDate`,
`lastUpdated`, `gatedBy` and `excludeFromSitemap`.

**Section entry fields:**

| Field | Meaning |
|---|---|
| `md` | a Markdown string |
| `include` | the name of a module under `_includes/`, such as `sections/team`. The module receives the whole entry, so its parameters (`heading`, `intro`, `items`, `outro` and so on) are just extra keys on the entry |
| `when: { state: XX }` | render only if region `XX` is on in the region map |
| `when: { switch: name }` | render only if `global.yml` key `name` is truthy |
| `inline: true` | attach to the previous entry with no paragraph break; used to gate one list item or one sentence inside a longer block |
| `width` | a max-width token; the default is `tablet-portrait` |
| `bg` | a background token, rendered as the class `bg-<token>` |
| `class` | extra classes, copied as written |
| `raw: true` | the fragment is already final HTML, so skip Markdown rendering |

**Where content lives.** A module that shows a shared collection (team, reviews, logos) reads it
from `_data/lists/`. A module whose content belongs to one page, such as the steps module on
the home page, reads it from that page's entry. So each piece of content has one home:
site-wide content goes in data, and page-specific content goes in the page's front matter.

**What the engine does, in order.** The engine is `_layouts/sections.html`, about 150 lines,
with no client-specific strings in it.

1. It walks `sections` in order and drops any entry whose `when:` fails. A dropped entry leaves
   no empty wrapper behind.
2. It turns each remaining entry into a fragment: the entry's `md` string, or its module's
   output, which is itself Markdown or HTML.
3. It joins the fragments. An `inline` entry attaches to the one before it. Any other entry
   starts a new block, and the engine records that block's `width`, `raw`, `bg` and `class`
   settings alongside it.
4. It replaces `${tokens}` across the whole document in one pass, before rendering Markdown.
   The tokens are `${email}`, `${phone}`, `${companyName}`, `${legalName}`, `${effectiveDate}`
   and `${lastUpdated}` (both dates come from page front matter and fall back to
   `legalDocsDate`), plus one token for the region list, built from the region map. The
   reference names that token after its industry.
5. It renders the page in one of two shapes.
   - With `sectioned: true` (marketing pages), each block is rendered separately. A block whose
     output starts with a heading is wrapped in `<section>`, and any other block in `<div>`,
     because a section with no heading is not a real page region.
   - With `sectioned` unset (legal and other long pages), everything is joined and rendered
     once, as a single document. If that document wraps a contents list in a
     `<!-- sticky-nav -->` ... `<!-- /sticky-nav -->` pair, the output splits into intro,
     contents and body wrappers, which become a sticky sidebar on wide screens. A broken pair
     falls back to the plain document.
6. It post-processes the HTML. It replaces each `<!-- figure:id -->` and `<!-- headshot:id -->`
   marker with an image from `lists/figures.yml` or `lists/team.yml`; a marker with an unknown
   id stays an invisible comment. It gives external links `target="_blank" rel="noopener"`. It
   adds an icon to links that carry a button class.

The hero is rendered from the page's hero fields before the sections. The chrome (head, header
and footer) wraps the result and reads `global.yml` directly.

## 7. Switches reach past the page body

Gates work at three levels.

- **Section:** the `when:` field from section 6.
- **Page:** `gatedBy: switchName` in a page's front matter. While that switch is off, the page
  still builds and still deploys. But its head emits `noindex` and leaves out the canonical link,
  `sitemap.xml` skips it, its entry on the human-readable sitemap page sits behind a matching
  `when:`, and the only link to it is behind the same switch. **"Off" means nobody can find the
  page, not that it is gone:** the file is still on the server at its URL. The only way to
  guarantee it is absent is to keep the file out of the deploy repository.
- **Files that are not pages.** Jekyll runs templates only over files that start with front
  matter, so the reference adds front matter to `robots.txt`, `llms.txt`, `sitemap.xml`,
  `_headers`, `manifest.webmanifest` and the main stylesheet. That lets the same switches
  control crawler files and host config. For example, `assetCacheBusting` does two things. It
  adds a build-time `?v=` stamp to the CSS, JavaScript and font URLs, in the head, the scripts
  include and the stylesheet's `@font-face`. It also turns on year-long cache headers for those
  paths in `_headers`. The two halves are only safe together, because year-long caching without
  stamped URLs would leave visitors on stale files. One switch controls both so they cannot drift
  apart.

**The deploy-exposure switches are kept separate on purpose,** rather than being one
`isProduction` flag:

| Switch | When it is off |
|---|---|
| `siteIsIndexable` | every page gets `noindex` and loses its canonical link, `robots.txt` blocks all crawlers, and `sitemap.xml` is valid but empty |
| `showStructuredData` | no JSON-LD is emitted |
| `includeSocialShareMeta` | no Open Graph or Twitter card tags are emitted |
| `supportAIVisibility` | `robots.txt` blocks the named AI crawlers, and `llms.txt` becomes a short notice that they are not permitted. It has no effect while the site is not indexable |

Because they are separate, a test deploy can stay out of search results and still emit
structured data and share cards for testing. A single page can also opt out with
`excludeFromSitemap: true`. That removes it from the sitemap and also drops its canonical link,
JSON-LD and share tags. The generated files such as `robots.txt` use this setting.

**The production values are committed in the file.** The reference once shipped a production
release with pre-launch values, because those values lived outside the file and a copy step
overwrote them. Since then the rule has been that a non-production deploy overrides these values
from the build environment and never by editing the file. The reference states this rule but
does not implement the override. It has no environment-specific config, so every build of it
uses the production values.

## 8. Commit, build, deploy

- The repository is connected to Cloudflare through Cloudflare's Git integration. A push to
  `main` starts a build (`bundle exec jekyll build` in the reference), and the static output is
  served from Cloudflare's edge. There are no GitHub Actions and no deploy tokens.
- A failed build changes nothing. The previous deployment keeps serving.
- The reference builds on Cloudflare Pages, and the target is Workers with static assets. The
  loop has the same shape on both: data is committed, the platform builds, and static files
  land on the edge.
- The only build settings in the Cloudflare dashboard are two environment variables: a Ruby
  version pin and a UTF-8 locale. Both belong to the generator, not the site. Every value that
  describes the site is in the repository.
- The site never reads its data at request time, so a data change appears only after a rebuild.
  A change due on a set date is therefore a pull request prepared in advance and merged on the
  day, not a flag set to switch itself later.
- In the reference setup, the deploy repository is itself an output: an upstream sync writes an
  approved list of files into it, and merging the sync's pull request is the deploy. The data
  design does not depend on this. It is the reason a switched-off page still deploys (section 7).

## 9. Who edits: where the data shape is heading

This section is design input. Nothing in it has been decided.

The reference has started splitting its data files by **who edits them**, not by topic. The
first split moved the regulated wording into `disclaimers.yml`, which has a named editor outside
the development team and its own review path. A file boundary is something the repository host
can enforce, for example by requiring review on changes to one path.

`global.yml` has not been split yet. Sorted key by key, it holds three kinds of value:

| Partition | Who changes it | Keys |
|---|---|---|
| Deploy exposure | the operator | `url`, `siteIsIndexable`, `basePath`, `showStructuredData`, `includeSocialShareMeta`, `assetCacheBusting`, `supportAIVisibility` |
| Review-gated | anyone, through review | the region map, feature switches with legal effect, the footer pointer and the switch that flips with it, `legalDocsDate`, the form consent text |
| Owner content | the site owner | identity, contact details, hours, profiles, the partner list |

The lines between them are not clean:

- The consent text reads like content, but it is reviewed wording that must not be reworded.
- The partner list is content, but it has a review history.
- The anti-bot switch looks technical, but turning it on sets a cookie, and that changes what
  the privacy and accessibility pages have to say.

The recommendation, which has not been ruled on, is that a new starter ship all three partitions
as separate files from day one, even when an instance fills only one of them. Adding a boundary
to a site that has already shipped is expensive, and empty files cost nothing.

## 10. Known problems in the reference: do not copy these

1. **A missing key renders as an empty string, with no error.** Liquid does not fail when a
   template asks for a key or id that does not exist. The build stays green and the text simply
   disappears. The reference guards against this only for its regulated wording, with a separate
   script run after the build. In the starter, a reference to a missing data key or id should
   fail the build.
2. **Brand strings outside the data.** The structured-data include writes the organization name
   as a literal string four times, even though `companyName` exists. The Open Graph site name and
   image alt text in the head do the same, the structured data also hard-codes its service
   catalog's name and three service names, and the logo's sprite id contains the brand. Renaming the company in `global.yml` would
   leave all of these stale.
3. **Hard-coded navigation.** The header and footer each list their links by hand, and the header
   repeats its active-page logic for every item. The links belong in data, as one list.
4. **One fact stored two ways.** The phone and fax numbers exist as both a display string and an
   E.164 string. Hours exist as a sentence and as separate fields. Each pair is kept in sync by
   hand. Derive one form from the other, or store only one.
5. **Presentation mixed into content.** The values of `class`, `bg` and `width` are stylesheet
   class names and tokens, so page data depends on the CSS. Markdown strings also use kramdown's
   attribute syntax, such as `{:.button.button--blue}` (section 11).
6. **Workarounds for kramdown, Jekyll's Markdown renderer, that are not part of the design.** Raw
   HTML inside Markdown must start at column 0, or kramdown treats it as a code block. Markers are
   replaced after rendering, because kramdown rewrites `<img>` as `<img ... />`. The button icon
   is added by an exact string match on `class="button">`, so a link with any other combination
   of classes gets no icon and no warning.
7. **A stale comment.** The header comment in `_includes/figure.liquid` says markers are replaced
   before Markdown rendering. The engine replaces them after. Trust the engine.

## 11. Copying the YAML to another generator

**What copies cleanly.** The `_data/*.yml` files are plain YAML. A search found no template
syntax in any of them, so in principle they copy over unchanged.

Page front matter is also plain YAML, but some things inside its Markdown strings get their
meaning from the engine, not from YAML:

- The `${tokens}` and the `<!-- figure:id -->`, `<!-- headshot:id -->` and `<!-- sticky-nav -->`
  markers are conventions the reference invented. They work only if the new engine implements
  them.
- Kramdown attribute syntax (`{:.class}`) appears on six lines across four pages, and inside some
  modules. Other Markdown renderers print it as literal text.
- Raw HTML inside the Markdown refers to sprite ids and stylesheet classes.

The front matter on the non-page files (`robots.txt` and the rest) belongs to templates, not
data, and does not port.

**Parsers can disagree about the same file.** Jekyll reads YAML with Ruby's library, which follows
YAML 1.1. Most JavaScript YAML libraries follow YAML 1.2, which reads several of these values
differently. The table shows what the reference's parser produces, run on 2026-11-26:

| In the file | Ruby reads it as | Why it matters |
|---|---|---|
| `yes`, `no`, `on` or `off` as a value | `true` or `false` | a YAML 1.2 parser reads them as strings |
| `NO:` as a map key, for example a region code | the boolean `false` as the key | the region silently vanishes from the map in the reference stack |
| `02134`, a postal code with a leading zero | the integer `1116` (read as octal) | other parsers give other numbers or a string |
| `2026-07-31` | a date | a date read as UTC midnight prints as July 30 in a US Pacific timezone (checked in Node) |
| `2026-09-06T12:00` | a plain string, because without seconds it is not a YAML timestamp | its meaning depends on whichever date parser reads it later |

How the current reference data fares: a search found no bare yes/no/on/off values, no leading-zero
numbers and no numeric map keys. `legalDocsDate` is the only bare date. The page-level dates use
the `T12:00` form, and a noon time leaves twelve hours on either side before converting it to
another timezone can change the day.

**Map order.** The region map's order is its display order. Ruby keeps keys in the order they were
written. JavaScript objects move integer-like keys to the front, sorted, wherever they were
written: inserting `AA, BB, 10, 2, CC` produces `2, 10, AA, BB, CC` (checked in Node). Letter codes
are safe, numeric codes are not, and a list keeps its order in either stack.

**Defenses.** Quote anything that only looks like a number, a boolean or a date. Use `true` and
`false` as the only booleans. A date with no time must print as the same calendar day in any
build timezone. Wherever order matters, check it in the new stack.

## 12. Where to look in the reference copy

| To see | Open |
|---|---|
| the thin entry point | `_config.yml` |
| the switchboard and its consumer comments | `_data/global.yml` |
| the pointer to named versions | `_data/disclaimers.yml` and `_includes/sections/footer.liquid` |
| a registry with a selection list | `sameAs` and `socialProfiles` in `_data/global.yml`, rendered by `_includes/sections/footer.liquid` |
| the engine | `_layouts/sections.html` |
| a module that takes parameters from the page | `_includes/sections/steps.liquid`, used by `index.html` |
| a module that reads a collection | `_includes/sections/team.liquid` |
| marker replacement | `_includes/markers-resolve.liquid` |
| the region-list token | `_includes/licensed-states.liquid` and `_data/reference.yml` |
| pages made only of front matter | `about.html`, `index.html` |
| a long page with a sticky contents list | `privacy-policy.html` |
| `inline` gating a single list item | `sitemap.html` |
| a switched-off page | search the page files for `gatedBy:`, then read `_includes/head.liquid` and `sitemap.xml` |
| switches in files that are not pages | `robots.txt`, `llms.txt`, `_headers`, `assets/css/main.scss` |
| page defaults and deploy-exposure logic | `_includes/head.liquid` |
