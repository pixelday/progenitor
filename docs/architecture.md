# Architecture: the philosophy and design choices behind progenitor

This document belongs in the docs folder of the progenitor repository. Progenitor is the
generic starter that every new site descends from. The document explains why the system
around it is shaped the way it is: its principles, the design choices that follow from them,
and the tests to apply when a new decision comes up. It is for anyone working in the
repository, human or agent.

It describes principles, not an implementation. The README and the setup steps cover
mechanics, and a separate brief covers the data layer.

The principles are written to hold for any static site generator and any static host. This
iteration of progenitor uses particular tools, which are named in the Terms table and at the
end of section 4. Nothing in the principles depends on them. Agnostic is meant as a
commitment, not as indifference, and section 1 says what it commits to. The document names no
client and no company, so it can travel with the repository.

## Status and confidence

- **Written 2026-11-26** from the system's architecture records, the stem-cell spec, the
  progenitor charter and the first production instance, all read that day.
- **Unmarked statements are settled.** Each is either a ruled principle or a practice running
  in production.
- **Statements marked "Direction" are not settled.** They are argued positions that have not
  been ruled on or built. Section 13 lists them together.
- **Production evidence is one site.** Every practice described as running in production comes
  from a single instance built by hand. Whether those practices generalize is the question
  progenitor exists to answer.
- **Progenitor exists as a working repository, and this document does not track its
  progress.** The document describes the design the repository is being built toward. What
  has been built is for the repository to show.
- **The progenitor repository was read on 2026-11-26, at commit `ae7ff40`, and not run.** The
  reading covered its README, its docs outside the archive, its configuration and its check
  scripts. The account of this iteration at the end of section 4 was checked against it. The
  other sections describe the wider design and were not rewritten to match the repository.
  Where the two differ, section 4 says so.

## Terms

| Term | Meaning |
|---|---|
| the system | stem-cell, the engine, progenitor and the tooling together: the machinery that produces sites |
| instance | one production site: one repository, one domain, one owner |
| operator | whoever maintains the system and stands up instances |
| client | the business that owns an instance |
| generator | a static site generator. This iteration uses Astro. The first production instance runs on Jekyll |
| static host | a CDN-backed host that builds from a git repository and serves the output. Cloudflare is the one in use; GitHub Pages is another example |
| git host | where repositories live and changes are reviewed. GitHub is the one in use |
| switch | a named value in a data file, usually a boolean, that turns behaviour on or off |
| gate | a condition in a page or template that reads a switch and shows or suppresses content |

## 1. What the system is for

The system exists to make a new production website a configuration exercise instead of a build
project. A new instance starts as a copy of progenitor. It becomes a particular site by
receiving configuration, content and design tokens. Nobody writes code for it. On its first
deploy it should already be valid, accessible, fast, private, secure and compliant, and it
should cost nothing to host.

The first target is small businesses in regulated industries. For them a wrong or missing
sentence on a page is a legal problem, and many of their visitors depend on accessible design.
This is the hardest case, and it was chosen on purpose: a system that holds there also serves
an ordinary brochure site.

"At scale" means many instances, not heavy traffic to one. The CDN absorbs traffic. What must
stay flat as the number of instances grows is operator effort, and three design choices keep
it flat:

- Instances differ by data, never by code, so there is one codebase to maintain (sections 4
  and 5).
- Nothing runs in production, so there is nothing to operate per site (section 3).
- Correctness is checked by machine, so quality does not depend on per-site attention
  (section 10).

The first production site was built by hand, with unlimited care given to every page. That is
not repeatable. Progenitor exists so that later sites are produced by constraint and
configuration, and so that declining a per-site customization is the default answer.

### Agnostic means a standard, not indifference

The system leaves several choices open: which generator and host build and serve a site, who
edits it, and who or what reads it. Leaving a choice open does not mean the choice is
unimportant. It means the system sets a minimum standard and holds it in every mode it
supports.

The choice this matters most for is who reads the repository. **The repository is designed to
stay readable by a person and efficient for a language model.** Those are two requirements,
and a change that serves one at the other's expense is a regression.

- *Readable by a person.* Someone can open a data file, a settings file, a document or a
  built page and follow it with nothing but a text editor. That takes plain text formats,
  names that say what a thing is, and comments that sit beside the value they explain.
- *Efficient for a model.* A session that starts with no memory reaches the right context in
  few tokens, with little room for a wrong guess. That takes a short map at the entry point,
  one home per fact, background kept out of the default reading path, schemas that reject bad
  data and name the entry, checks that print a plain pass or fail, and claims that say how
  far they have been tested.

Most of the time the two ask for the same thing. Where they pull apart, the design has to
satisfy both. The block test in section 7 is that rule applied to a schema.

The same commitment runs through the rest of the document.

- **Generators and hosts.** The quality bar in section 10 holds whichever tools an iteration
  uses.
- **Editors.** A change made in a browser at the git host, in a local editor or by an agent
  session meets the same checks (sections 7 and 10).
- **Assistants.** In this repository one rules file serves every agent tool, so no tool works
  to a weaker set.
- **Visitors.** A built page works by sight, by keyboard, with a screen reader, with scripts
  off and for a crawler. Accessibility is this commitment made to whoever reads the site.

## 2. Compliance as architecture

This is the principle the rest of the design serves.

The usual question is how to check a website for compliance. This system asks a different one:
how to build a site where the non-compliant version is hard to produce.

"Compliance" is meant broadly. It covers legal and regulatory wording, accessibility, privacy,
security posture and standards validity: every property someone could audit the site against.

A compliance decision handled as architecture has four properties.

1. **One home.** The decision is recorded once, as a value in a data file.
2. **Full propagation.** Every surface that depends on the decision derives from that one
   value: page copy, legal text, metadata, crawler files, security headers.
3. **Fail closed.** If the value is missing, contradictory or cannot be checked, the build or
   the release stops. Nothing degrades to a guess or to an empty string.
4. **An audit trail.** What was decided, by whom and when is in version control, next to the
   value.

**It is a property, not a subsystem.** The system has no compliance module, on purpose. A
folder you could point at would contradict the claim that compliance runs through everything.
The material that looks like one subject is four different things with four homes:

| Piece | Home | Ships to an instance? |
|---|---|---|
| Knowledge: what the rules say, by jurisdiction, with sources | the operator's private knowledge layer | never |
| Primitives: switches, gates, token substitution | the engine | yes, as part of the build |
| Universal legal pages: privacy policy, terms, accessibility statement | progenitor | yes, by default |
| Enforcement: checks that fail a build or a release | the tooling | the checks run on the instance. In the wider design their control data stays system-side; in this iteration it travels with the instance (section 6) |

Rules that apply to one industry belong to a vertical layer on top of this. That layer is
expected and not built. Until it is, vertical material is kept separate and labeled, and it
never goes into progenitor. An abstraction designed from one client encodes that client's
shape.

**The move is to remove what would otherwise need managing.** The same step shows up in
decisions that are already live:

| Instead of managing | The design removes it |
|---|---|
| a list of exceptions for vendor scripts | integrations are data-only by default, so no foreign code runs in the page |
| a rule against editing production directly | production changes only through one mechanical path |
| a reminder to log changes to legal pages | each legal page carries its own effective date, last-updated date and change log |
| credential hygiene, rotation and offboarding | the operator holds no login to the client's accounts by default |
| a reminder to keep tracker settings and privacy wording in step | one switch drives the copy, the security header and the legal text together |
| server patching and database backups | there is no server and no database |

This is also a test for any proposed control: **if it adds something a person has to remember,
it is not architecture yet.**

**What the principle does not claim.** Architecture narrows what can go wrong. It does not make
a business compliant, and it does not replace review: a person still reads regulated wording
before it ships. The working formula is "compliant by architecture, reviewed by humans,
controlled by process."

## 3. Static delivery, and what it buys

The deployed site is a pure function of the files in its repository. A generator turns those
files into a bundle of static files, and a CDN serves the bundle. Nothing executes when a page
is requested: no server-side rendering, no functions at the edge, no database, and no content
management system in the request path.

Most of the system's quality properties follow from this one choice.

| Property | How static delivery provides it |
|---|---|
| Security | There is no server, database or admin panel to attack. The realistic attack surface is the accounts that control the repository, the host and the domain, and the people who hold them. |
| Privacy | The site collects nothing itself. A form posts from the visitor's browser straight to the system that processes it, so visitor data never crosses the operator's infrastructure or the host account. That is a structural fact, not a policy promise. |
| Stability | A failed build changes nothing: the last good deployment keeps serving. Each deployment corresponds to one commit, and undoing a change is another commit. |
| Performance | Every page is rendered before anyone asks for it and served from the edge. |
| Affordability | The site fits the free tiers of a git host and a static host. There is no server to rent, and the client's only recurring cost is the domain. |
| Portability | The output is plain files that any web server can serve. |
| Auditability | Every change is a commit. The site's state on any past date can be recovered from history. |

**What the choice costs.** These constraints are accepted on purpose.

- A change appears only after a rebuild, because every switch is resolved at build time. A
  change due on a set date is a pull request prepared in advance and merged on the day, not a
  flag that flips itself. The first production instance shipped a regulated wording change on
  its legal effective date this way: the client merged the prepared pull request, with no
  developer present.
- Anything that needs a server belongs to someone else's system. Forms go to a third-party
  processor. A feature that only works with server-side verification, such as a bot challenge,
  is left out, because the unverified version is decoration.
- Adding code that runs at request time changes the site's security and data-handling
  position. That is a new decision with its own review, not an increment.

**Free is a current fact, not a contract.** Free tiers can change. The defence is portability:
the bundle runs anywhere, and configuration lives in the repository wherever the platform
allows, so changing hosts is a small job. The design consequence is to stay inside the free
envelope:

- no paid host features and no paid services required out of the box (section 11);
- builds that fit the host's free build service;
- large media, video above all, kept out of the repository and off the static host, behind a
  single configurable base path, so the media host can be changed by editing one value.

## 4. The line of descent

```
 private layer            the system                              instances
 (never ships)
┌───────────────┐ design ┌──────────────────────────────┐ config ┌──────────────────┐
│ knowledge     │ ─────▶ │ admin       editing surface  │ and    │ one repository   │
│ research      │        │             (future)         │ build  │ per site, owned  │
│ client        │ config │ progenitor  reference build  │ ─────▶ │ by its client    │
│ context       │ ─────▶ │ engine      machinery        │        └────────┬─────────┘
└───────────────┘        │   ▲ dependency               │                 │ host builds
                         │ stem-cell   spec             │                 ▼ on merge
                         │ tooling     checks, release  │        static bundle on a CDN
                         └──────────────────────────────┘
```

| Layer | What it is | The question it answers | Scope |
|---|---|---|---|
| stem-cell | the spec: design tokens, markup and block standards, the accessibility bar | what does good look like? | universal, and destined to be open source |
| engine | the machinery: the renderer that turns ordered sections of data into pages, plus the gate and token primitives | how does content become pages? | universal |
| progenitor | the reference build: a real, working, brandless site that consumes both | what does a new site start as? | universal |
| instance | a descendant of progenitor, plus one client's configuration, content and tokens | what is this client's site? | one client |
| tooling | the checks, and the mechanism that moves system files into an instance | how is a change verified and released? | universal |
| admin | a friendly editing surface over an instance's data files | how does a non-developer edit? | future, deliberately deferred |

The names are meant literally. A progenitor cell descends from a stem cell and is more
committed but still generic, which is the relation of stem-cell to progenitor to instance.

Five rules govern the relationships.

1. **Siblings, not nesting.** stem-cell, the engine and progenitor sit at the same level. Each
   must be usable and shippable alone. A reference build placed inside the machinery would
   cost both of them that independence.
2. **Dependencies point one way.** Nothing upstream knows about anything downstream. The
   system contains nothing client-specific; a client's site is configured by data that arrives
   at build time. The system also never depends on the private layer at run time: design
   flows from it, and the system runs without it.
3. **The arrow into an instance is a copy, not a link.** The engine depending on stem-cell is
   a real dependency between two things with the same owner. The system reaching an instance
   is different: a one-way, filtered copy. Afterwards the instance stands alone. It may not
   depend on anything only the operator can supply: no private package, no submodule, no
   operator-run service.
4. **Whatever crosses into an instance passes an allowlist that fails closed.** Only named
   things cross, so private context cannot ride along with configuration. This applies to
   every path into an instance, including any future admin layer.
5. **Upgrades flow down the line.** An improvement lands once, upstream, and descendants
   inherit it. The mechanism for instances that already exist is not designed (section 13).

### How the layers map onto this repository

In this iteration the layers share one repository. Progenitor is a monorepo, and the
repository is itself a working site: an Astro project on GitHub that deploys to a Cloudflare
Worker. That path has run end to end. A merge to the main branch builds and deploys the
starter, and the repository records its live checks passing.

The repository is also designed to be instanced. For now, every site derived from progenitor
is an instance of this repository, and is itself a monorepo with the same parts. No second
site has been built yet.

The layers above are roles, and the repository holds a part of each. The README's file map
says which files hold what.

| Role | In the progenitor repository |
|---|---|
| instance | most of the repository. It has what an instance has: settings, data, pages, tokens and host configuration |
| engine and tooling | some of each: the layout and the code that turns data into pages, and the checks that run in the build, in a browser and against the live host |
| stem-cell | its seed: the colour tokens named by role, their contrast test and the markup rules, all expected to move into stem-cell later |
| private layer | its minimal counterpart: the README and a docs folder. This document is part of it |
| admin | absent |

Several things follow from the rest of this document.

- **The Worker has no code.** Its configuration names a folder of static files and no entry
  point. Adding one is the new decision described in section 3.
- **An instance carries everything.** An instance is a copy of the whole repository, so it
  holds its own copy of the engine, the tooling and the stem-cell seed along with its
  content. This is rule 3 in its strongest form: the client has everything needed to build
  the site, with no link back.
- **The repository as a whole is what crosses to a client.** Rule 4 therefore applies to all
  of it: anything a client must not receive must not be in the repository. The docs folder is
  held to the same rule, and it stays out of the built site. The starter's own repository is
  public, which makes the rule stricter there: nothing goes in that is not fit to publish.
- **Three places where this iteration differs from the sections that follow.**
  - Settings sit in fewer files than section 7 sketches. One typed settings file holds the
    site's identity and its two switches, the colour tokens sit in the styling configuration,
    and pages are template files listed in a registry. Moving the settings into a data file
    is an open item in the repository.
  - The one interactive control is a React island, built with Base UI and styled with
    PandaCSS, where the stem-cell spec in section 9 calls for plain HTML, CSS and minimal
    script. The records it filters are in the page as HTML either way. Whether the island
    stays is an open item in the repository.
  - The security policy allows the inline blocks the build emits, each by hash, and nothing
    else inline (section 10).
- **Two things sections 7 and 8 ask for are already written into it.** A record that breaks
  its schema fails the build and names the entry. A check fails any build in which the
  consumers of a switch disagree.
- **Direction.** Sharing a repository does not merge the roles. The parts that will become
  stem-cell and the engine should not depend on a site's own content or configuration, and an
  instance should differ from progenitor only in its configuration, content and tokens. Held
  to, that makes the kill criterion in section 5 a diff anyone can run, lets the generic
  parts be lifted out along clean lines later, and gives an upgrade a set of files it can
  replace without touching the client's. This is rules 1 and 2 applied inside one repository.
  It is this document's reading, not a ruling.
- **One principle is relaxed here, and one is left for later.** The wider design keeps the
  control plane out of the instance. This iteration relaxes that on purpose: each instance
  carries the checks it is judged by (section 6). Rule 5 says upgrades flow down the line,
  and a copied repository has no line until one is designed. That is listed in section 13 as
  something to consider going forward.

## 5. Progenitor's invariants

These are settled. They are the definition of the thing.

- **Always shippable.** Progenitor builds green alone, with no client data present. A broken
  progenitor breaks the birth of every future site.
- **Brandless, not styleless.** It looks finished. It adapts to a brand through design tokens
  and never carries a brand of its own. Nothing client-specific enters it, ever.
- **It passes the real checks from day one.** A freshly created instance should pass the same
  guards a production release does, not a relaxed set.
- **No operator-private material, by construction.** Anything a client must not receive is
  absent from progenitor in the first place. It is never stripped out downstream.
- **Client content is not its business.** A client's content and configuration are canonical
  in the client's own repository. Progenitor supplies the generic layers only.
- **Legal pages ship by default.** A privacy policy, terms and an accessibility statement have
  the same status as a favicon, a 404 page and a sitemap. Their slots are filled per site.
  The vertical-specific layer on top is not progenitor's.

**Direction.** The rest of this section comes from a design proposal that has not been ruled
on. Three things separate a progenitor from a site somebody copied.

- **Two instances, not one.** One instance cannot tell a progenitor from a template.
  Parameterization is the whole claim, and two visibly different sites sharing all of their
  code is the smallest test of it.
- **The kill criterion.** If making site B differ from site A requires editing progenitor, it
  is not a progenitor.
- **Component whitelisting.** An instance declares which components it uses, and components it
  does not use are left out of its built site.

The suggested order of proof follows dependency: first a brandless page reaches the internet
through the real deploy path; then two different instances come from one codebase; then one
gate fails closed across all of its consumers; then the tooling at the instance boundary; then
polish. Each step's failure invalidates the steps after it, so the cheapest and most
load-bearing proof goes first. The first step is done: the starter reaches the internet
through the real deploy path (section 4). The second has not been attempted.

## 6. Instances: ownership and the boundary

**The client owns everything the site needs to exist.** The repository, the host account, the
DNS zone and the domain registration all belong to the client. The operator is a collaborator
on the repository and by default holds no login to the client's host account.

**Sovereignty runs in both directions.**

- The client can take the files and go. The bundle runs on any host, the instance has no link
  back to the operator, and nothing rented sits in the request path.
- The operator can walk away without leaving an attack surface behind, because the operator
  holds no credentials that would need revoking.

**The boundary inside an instance follows who edits, not topic.** Files the system manages are
authoritative upstream and are overwritten by an update. Files the client owns are never
touched. A file the tooling does not recognize is reported and left alone. A file boundary is
something a git host can enforce, for example by requiring review on changes to one path.
Client edits are therefore expected and confined to known files, not ambiguous.

**In the wider design, the control plane lives in the system and never in the instance.**
What counts as production, and which files the system manages, are defined system-side. An
instance that supplied its own allowlist or its own production address would be writing its
own audit criteria.

**This iteration relaxes that on purpose.** Progenitor is self-contained: the checks, and the
settings they check against, live in the repository and travel with every instance. The
project owner decided this on 2026-11-26, so that progenitor has room to grow into its own
shape before it is fitted back into a wider system. What it gives up is the separation: an
instance can change the checks it is judged by. Three things in the repository stand in for
it meanwhile.

- A standing rule says a check is never weakened to make a build pass. A check that is wrong
  is fixed in a change that does nothing else.
- Changes reach the main branch through a pull request. The git host enforces that where its
  plan allows, and it is a convention where it does not.
- A test breaks a build on purpose, one way per check, and confirms the checks still catch
  each break.

Restoring the separation is a later job (section 13).

**A merge to the main branch is the only deploy path.** The static host builds when the main
branch changes. There is no deploy pipeline to maintain, no deploy token and no secret stored
at the git host.

**Configuration lives in the repository wherever the platform allows.** Security headers,
cache rules, redirects, the 404 behaviour and the build's runtime version are files in the
repository. Whatever can only be set in a host dashboard does not travel with the client's
files, so those settings are kept few and are listed.

**The host must not change the site.** A host feature that rewrites pages at the edge is a
change to the site that is not in the repository. Script injection, link obfuscation and
similar features stay off unless one has been decided on purpose, together with the security
policy and the privacy wording it affects. Some hosts turn such features on by default, so the
setting is checked, not assumed.

**Direction.** The built HTML is itself a deliverable. Readable, well-formatted output is part
of "take the files and go", because it lets any web developer take over a site from the bundle
alone. In this iteration an instance carries all of the engine, because it is a copy of the
whole repository. Whether later instances carry less is not settled.

## 7. The configuration surface

**The data layer is the asset and the presentation layer is the liability.** Content and
configuration are plain data files, independent of any framework, so they survive a change of
generator. Templates only iterate over data. This is the design choice that makes the stack
replaceable.

**The generator's own config file stays thin.** A value that describes the site belongs in
data. A value that describes the generator belongs in the generator's config. Site facts never
live in both, so nobody has to know which copy wins.

**An instance is configured from a few top-level files.** An illustrative shape follows. The
names are placeholders, and the exact split into files is Direction.

```
<instance>/
  <generator config>        thin: only what the generator itself needs
  <runtime pin, lockfile>   the build's runtime version, pinned in the repository
  <host config>             security headers, cache rules, redirects, 404 behaviour
  data/
    deploy.*                operator: canonical address, indexability, exposure switches
    gates.*                 review-gated: regions served, switches with legal effect,
                            pointers to regulated wording
    site.*                  client: identity, contact details, hours, navigation,
                            selections
    tokens.*                brand: design token values
    lists/                  collections: people, images, partners, testimonials
  pages/                    each page is an ordered list of sections, held as data
```

The three data files at the top differ in who may change them: the operator, anyone through
review, and the client. Splitting by editor is the settled criterion. It has been carried out
once in production, where the regulated wording was moved into its own file with its own
review path. Shipping all three partitions as separate files from day one is Direction. The
argument is that a boundary is expensive to add to a site that has shipped, and an empty file
costs nothing.

**Rules for the data.** The data-layer brief covers the patterns in detail. The rules behind
them follow. They are the standard for progenitor, not a description of the first production
instance, which breaks several of them in known places. The data-layer brief lists those.

- **One home per fact.** A phone number, a company name or a list of regions is stored once,
  and every surface that shows it derives from that value. Renaming the company is a one-value
  change. A brand string typed into a template is a defect.
- **Switches are documented where they live.** The comment on a switch says what on and off
  do, lists every consumer, and names any change that must accompany a flip.
- **Choices are made by selection, not deletion.** A registry holds everything the site knows
  about, and a short ordered list picks what appears. Turning something off flips a value; it
  does not remove lines.
- **Dated changes are pointers.** Wording that will change on a known date is stored as named
  versions, and a single key selects the live one.
- **A missing value fails the build.** A reference to a key or id that does not exist is an
  error, never an empty string. The first production instance's template language renders a
  missing key as nothing, with no error, and that is the defect this rule exists to close.
- **Data names choices, not stylesheet classes.** Page data may pick from options that tokens
  define, such as a background family or a width step. It should not carry class names.
- **The configuration schema is a contract.** It is versioned and validated from its first
  real revision (Direction as to mechanism).

**Two authoring tests.**

- *The floor.* A person with no local tools and no code knowledge, editing a data file in the
  git host's web interface, must still get a correct site. This is how the first production
  instance is edited today. It is a floor to improve on, not a goal.
- *The block test.* Can a language model emit this block cold from the schema alone, with no
  examples? Is it still pleasant to write by hand? A schema has to satisfy both. Optimizing
  for either side alone is easy.

**An admin layer, when it comes, is an editing surface over these files.** The repository
stays canonical. An admin tool writes into the client's repository and can be switched off
without lock-in. It is not a second content system and not a database that regenerates files
and overwrites edits made in the repository.

## 8. Switches and gates

Gates are how one configuration value changes many parts of a site at once.

- **Present but suppressed.** Gated content stays in the source and is left out of the output
  while its switch is off. That keeps it auditable and makes turning it back on a one-value
  change.
- **Three levels.** A gate can cover one section or sentence, a whole page, or a file that is
  not a page. Crawler files, the sitemap and the host's header file are templated too, so the
  same switches control them.
- **One switch, every consumer, or the model has failed.** Indexability is the standard
  example. One value must move the robots meta tag, the canonical link, the robots file and
  the sitemap together. If a gate can be half-applied, no amount of polish repairs it.
- **Coupled settings share a switch.** Two settings that are only safe together are driven by
  one value so they cannot drift. Long cache lifetimes with stamped asset addresses are one
  such pair. A tracker with its security-policy entry and its privacy wording is another.
- **"Off" for a page means unfindable, not absent.** A gated page still builds and deploys. To
  guarantee that a page is absent, keep its file out of the instance.
- **Exposure switches are separate, not one production flag.** Indexability, structured data,
  share metadata and crawler permissions are independent, so a test deploy can stay out of
  search results and still exercise the rest.
- **Production values are committed in the file.** A non-production deploy overrides them from
  the build environment and never by editing the file. A production release once shipped with
  pre-launch values because those values lived outside the file and a copy step overwrote
  them. The rule is settled; the override mechanism is not built.

**Direction.** In the first production instance the list of switches is a convention. The
intended design is a contract: a declared schema of switches that the engine validates, so a
gate that goes missing fails the build. The real contract is expected to be discovered by
building the second site, not specified ahead of it.

## 9. Design tokens and the stem-cell bar

stem-cell is the spec that progenitor's markup and styling are built to. It is destined to be
open source, so nothing confidential or client-specific may enter it. The spec is a draft: its
colour system is specified in full, and the other areas below are stated intent.

**Markup is the tip of the spear.** HTML is the layer that browsers, crawlers, validators,
audits and assistive technology receive directly. The method is to start from the smallest
page that is valid and accessible, and to test every addition against the full bar.

**A brand is a set of token values.** Everything brand-specific flows from a small curated set
of design tokens, emitted as CSS custom properties. Changing brand means changing token
values, not editing components. The planned token taxonomy covers colour, type scale, spacing,
line length, focus styles and motion. The planned interchange format is the Design Tokens
Community Group format, so the tokens work with standard tooling.

**Colour ships in pairs, never alone.**

- Content colours are derived from the background of the section they sit in. A token names a
  family, and the family resolves to the member that is correctly paired with the nearest
  background.
- Every background and foreground pair is checked against the contrast formula before it
  ships. The target is the enhanced level: 7:1 for normal text and 4.5:1 for large text.
- A nested element that resets the background resets the colours beneath it, so text is always
  paired with what is actually behind it.
- Sections stack. Each sets a background, and the background decides the content colours.
  Contrast therefore holds by construction, in light and dark modes.

**An invariant must be structural, not remembered.** A production gradient once passed its
contrast target only inside a width constraint that lived in the designer's head, and it
stopped holding on small screens. The rule that came out of it: the default variant is the one
that passes everywhere, and the richer variant is an enhancement for the conditions where it
is safe. An enhancement that fails to apply then costs aesthetics, never accessibility.

**The shipped site carries as little as possible.** stem-cell itself is plain HTML, CSS and
minimal vanilla JavaScript, built on no framework. Pages remain usable with scripts off, with
styles off and with images off.

**A component is done when** it has a documented keyboard model, defined behaviour under
reduced motion and forced colours, a fallback without scripts, accessible error handling if it
is a form, contrast that holds on every background family, and a schema that passes the block
test in section 7.

**Direction.** The end state is a brand configurator, where tokens are exposed as controls and
a functional, accessible site exists before the brand does. Where the token file sits in an
instance, and its format, are not settled.

## 10. The quality bar, and how it is held

| Property | The bar | How it is held |
|---|---|---|
| Valid | zero errors and zero warnings from the standard HTML, CSS, link and structured-data validators | templates emit valid markup by construction; validators run against built output |
| Accessible | WCAG 2.2 AA at minimum, with enhanced colour contrast; fully operable by keyboard; usable at 400% zoom, with reduced motion, in forced-colours mode and with scripts off | token pairs, semantic markup and the component criteria in section 9; automated scanners as a baseline; keyboard and screen-reader passes before release |
| Fast | a perfect lab score as the baseline, and good field vitals | pre-rendered pages; self-hosted fonts and assets; minimal script; images with stored dimensions, sized for their slot, compressed and lazy-loaded; long cache lifetimes only for assets whose address changes when their content does |
| Findable | canonical addresses, a sitemap, a robots file, structured data, share metadata and a real 404 response | generated from the same data and switches as the pages (section 8) |
| Secure | a strict same-origin content security policy: no inline script or style except a block the policy allows by hash, no inline style attributes and no frames; the standard security headers; no secrets in the repository or the build | headers live in a repository file; a check runs the built site against its own policy and refuses a release that ships a blocked resource |
| Private | no cookies and no third-party requests by default | the security policy blocks what the privacy policy says does not happen; an exception changes both in the same change |
| Compliant | required pages present, and regulated wording on every page that owes it | wording is stored once as named versions; a check reads the built pages and fails on a miss |

The stem-cell spec aims higher on accessibility than this floor. It targets the AAA level as a
shared responsibility: it guarantees the criteria a framework controls, and it makes the
content-dependent criteria achievable for the author.

**Rules for the checks.**

- **Check the output, not the intent.** Some properties can only be verified against the HTML
  that was actually produced. Validation runs after rendering.
- **Then check the live site.** After a release, the properties that matter are confirmed on
  the live canonical domain, requested the way a browser requests it. The host can alter a
  response in ways the source does not show.
- **A check exits non-zero.** A check that only prints a warning is not a check, and neither
  is one whose failure a pipeline swallows.
- **A check that cannot run refuses.** It does not fall back to a weaker method.
- **Run a check in the environment it guards.** A preflight in a different locale or runtime
  than the real gate proves nothing about the gate.
- **A check must be able to tell absent from empty.** Otherwise a missing thing reads as a
  pass.
- **Automated green is necessary, not sufficient.** Scanners catch only part of what an
  accessibility audit covers. Manual and assistive-technology passes are what substantiate a
  claim.
- **Destructive tooling is tested on throwaway fixtures, never on real repositories.**

## 11. Third-party integrations

Direction. This section reports a stated stance and an argued model. Neither has been ruled
on.

**Out of the box, an instance depends on no paid service and runs no foreign code.** An
integration can take one of three shapes:

| Shape | What it is | What the site gives up |
|---|---|---|
| Data only | configuration supplies an endpoint and field names, and the site emits its own markup | nothing: no foreign code, no change to the security policy |
| Foreign script | a vendor's script runs in the page | it runs in the site's origin: it can read the page, set cookies and make requests, and the security policy must be widened |
| Foreign frame | a vendor's document in an iframe | the browser isolates it, but the site loses control of its styling, accessibility and flow |

- **Data only is the default, and the only shape the engine depends on.** The first production
  instance sends its lead form this way: a plain form post from the browser to the client's
  customer-management system.
- **The other two shapes are declared adapters, never ad-hoc tags in a template.** A
  declaration names the vendor and widens the security policy by named directive, not by
  wildcard.
- **The shape belongs to the vendor and the feature together.** One vendor can be data-only
  for one field type and need a script for another. The dependency posture can therefore
  escalate from a vendor's dashboard, without a commit. Making the shape a declared
  configuration value gives that change something to trip over.
- **An instance should be able to report its own posture,** for example "no paid services, one
  foreign script, no frames", as a property a check can assert.
- **The endpoint and field names belong in data.** In the first production instance they are
  written into the template, so the clean pattern does not yet transfer to a second site.

This is a sovereignty question as much as a cost one. A site whose consent layer, customer
system or analytics is a rented script cannot fully be taken away by its owner.

## 12. Working principles and decision tests

**Principles.**

- **Always shippable.** Every layer stands alone at any moment. No date, gate or default leaves
  a thing unshippable.
- **Start from first principles.** Interrogate the framing before answering the question. The
  compliance principle came from rejecting the industry's question, not from answering it
  better.
- **Scrutinize in proportion to load.** The more a claim holds up, the harder it is attacked.
  Verify by running the thing, not by reading it, and prefer a deterministic check to
  confidence.
- **Fail cheap and fast.** Experiments are disposable and carry kill criteria stated in
  advance. Settled invariants change only deliberately. The gates exist so that experiments
  can be reckless around a core that never is.
- **Remove, do not manage** (section 2).
- **Replace policy with guard.** A mechanical control that fails closed scales past one
  client. A ritual a person performs does not.
- **Build what a real page uses.** Do not abstract from one example.
- **Agnostic by standard.** Where the system leaves a choice open, between generators, hosts,
  editors or readers, it sets a floor and holds it in each one. The repository stays readable
  by a person and efficient for a language model (section 1).
- **Craft is a system property.** The standard is "programmable matter": beauty and elegance
  that come from the system being lean, focused and fast, and not from per-site effort.

**Decision tests.** Apply these to any proposed design.

| Ask | If the answer is wrong |
|---|---|
| Would a second, different site need a change to progenitor? | it is per-instance code, and it belongs in data |
| Does it add something a person must remember? | it is a policy; find the guard |
| Can it be half-applied? | give it one switch and make every consumer read it |
| What happens when the value is missing? | it must stop the build, not render blank |
| Does anything run at request time? | that is a new security and privacy decision, not an increment |
| Does it load foreign code, set a cookie or need a paid service? | declare it, and change the security policy and privacy wording in the same change |
| Could the client take the files and run the site without the operator? | remove the link back |
| Could the operator leave without holding a credential? | do not take the credential |
| Does it survive a change of generator or host? | move it out of framework config and dashboards, into data and repository files |
| Can a non-developer edit it in a browser and still get a correct site? | simplify the schema or validate it harder |
| Could a new person, and a model session with no memory, each find it from the entry point and follow it? | it serves one reader only; fix the structure so both can |
| Is anything private present that must later be stripped? | make it absent by construction |
| Is the fact stored in two places? | derive one from the other |

## 13. What is settled, and what is not

**Settled.**

- Compliance as architecture, including the decision to have no compliance subsystem.
- Static output only. Nothing executes at request time.
- The layer model and its names; stem-cell, the engine and progenitor as siblings.
- Progenitor's six invariants (section 5).
- The client owns the instance and its accounts. Client content and configuration are
  canonical in the client's repository. The path into an instance is a one-way, filtered,
  fail-closed copy with no link back.
- The universal legal pages ship by default.
- File boundaries follow who edits.
- An admin layer is deferred. When it comes, it is an editing surface over client-owned files.
- The shape of this iteration: progenitor is one repository, an Astro project on GitHub
  deploying to a Cloudflare Worker, and for now every derived site is an instance of that
  repository and is itself a monorepo. The principles do not depend on the tools.
- The repository stays readable by a person and efficient for a language model, and agnostic
  means a standard held in every supported mode (section 1). Stated by the project owner on
  2026-11-26.
- For this iteration the control plane is relaxed: progenitor is self-contained, and each
  instance carries its own checks (section 6). Decided by the project owner on 2026-11-26.

**Running in production, on one site.**

- Pages held as data and rendered by a small engine that contains no client strings.
- Switches with several consumers, including switches over crawler files and host headers.
- A dated wording change released by a pointer flip.
- A strict security policy with self-hosted assets, and a lead form posted straight to the
  processor.
- Free-tier hosting with merge-to-main as the only deploy path.
- A non-developer client editing data files through the git host's web interface.

**Not settled (Direction, or open).**

- The exact split of configuration into files, and where the token file sits.
- The switch list as a validated engine contract, and how the configuration schema is
  versioned.
- What the tooling at the instance boundary becomes once instances are generated. The argued
  position is that the set of managed files should be computed from the generator's output,
  not curated by hand; that most of today's guards are artifacts of how the first site's
  source was arranged; and that the compliance checks are the part that survives and grows.
- How much of the engine's abstraction ships in an instance.
- The integration model in section 11, and whether "no paid dependency" is an invariant or a
  default.
- The vertical layer for industry-specific rules: expected, not built.
- Template documentation for clients. An instance ships a plain-language maintenance and
  security manual for its owner, and each one is written by hand today.
- Instance stand-up. It is a manual checklist today, written from very few stand-ups. Most of
  its steps can be driven through provider APIs, so the checklist is meant as a specification
  for automation.
- The two-instance proof, component whitelisting and the order of proof (section 5). The
  first step of that order is done, and no second site has been built.

**To consider going forward.** Nothing waits on these today. They are the questions this
shape will raise as it grows.

- **Upgrades.** How a later change in progenitor reaches a site already built from it. A site
  begins as a copy, and today nothing carries a fix down to it: it is a port by hand. The
  invariants constrain any answer. An upgrade arrives as files the client then owns, never as
  a live dependency, and it leaves alone the files a site has made its own. That is the
  practical reason to keep generic files and site-owned files apart from the start
  (section 4): an upgrade then has a known set of files to replace. The second site is where
  the cost will first show, and the repository's open-items file carries the decision.
- **Folding back.** How the control-plane separation is restored when progenitor is fitted
  into a wider system: which definitions move out of the instance, and what an instance
  keeps. Holding the checks and their settings in a few known files makes that a move and not
  a rewrite.
- **Extraction.** Whether the layers stay in one repository after this iteration, and when
  the stem-cell seed is lifted out.
