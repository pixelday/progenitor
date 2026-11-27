# Early-stage patterns to avoid

> **Status (2026-11-26): a review note, not instructions.** Written by a Claude session after
> reading `README.md`, `docs/` and this archive at commit `5ccf817`, the day after the
> starter's first commit. Where it disagrees with `README.md` or the rest of `docs/`, they
> win. The examples are as found that day. The change that added this file corrected some of
> them, and each one says so.

Eight habits that had started to form. Each has what showed it and what to do instead.
[advice-from-predecessor.md](advice-from-predecessor.md) makes several of the same points
from outside the repository. This note adds what was run or read back on the day.

## What was checked

- **Run:** `npm run build` and `npm run tamper`, both passing; a read of the GitHub
  repository's settings through its API; three requests to the demo host; a search of
  tracked files; and a throwaway clone for pattern 3.
- **Not run:** `npm run audit` and `scripts/verify-live.sh`.
- **Taken from the docs as written:** everything else.

## 1. Verifying more than instancing

- **What showed it.** The browser audit covered ten color modes, print and forced colors, and
  the checker had a test of its own. No second site had been derived, so "copy it and change
  only the data and the settings" was still a design goal, as `README.md` says.
- **Instead.** Build the second site before more polish. Make its pass a command: a diff
  against the starter that names only the site's own files.

## 2. History written into instructions

- **What showed it.** The setup steps said both what to do and what happened on a date. In two
  days their expected counts disagreed with each other and with the build: the build's `PASS`
  lines were given as fifteen, eighteen and nineteen, and the unit tests as 12 when 24 ran.
  One step described a redirect the opposite way round from what the host did.
- **Corrected in this change.** The steps now say "every line says `PASS`", and the redirect
  sentence matches the host.
- **Instead.** A step says what to do and what a pass looks like, in words that stay true when
  a check is added. A dated result goes in one place: "What has been proven" in `README.md`.

## 3. Site decisions inside engine files

- **What showed it.** `scripts/verify-dist.mjs` holds the JS budget and the list of pages that
  may load JavaScript as constants. Step 4 tells a site with mail at its domain to delete
  lines from `scripts/verify-live.sh`. The legal text is in page files.
  `scripts/verify-dist.mjs` and `scripts/tamper-test.mjs` read `src/site.ts` with regular
  expressions.
- **Why it matters.** Each is a file that the starter and a site will both change. On a
  throwaway clone, a site and the starter each changed the budget line and the merge
  conflicted. Deleting check lines as the documented path also sits badly with "never weaken
  a check".
- **Not corrected.** `docs/working.md` carries it, under how a site is derived.
- **Instead.** A site's values live in settings files that the checks read. Engine files are
  identical in every site.

## 4. Docs that grow faster than the code, and are published before review

- **What showed it.** At `5ccf817` the archive was 359 KB, against 91 KB of live docs and
  125 KB under `src/` and `scripts/`. The repository is public. The archive went out with
  the first push while "decide whether these files stay" was still an open item, and four
  more files went out with the branch that added them. One of the four had been deleted
  earlier that day and came back without its status banner. The archive's index listed four
  of its eight files.
- **Corrected in this change.** The returned guide is removed again, the index lists every
  file, and the architecture brief moved to `docs/architecture.md`.
- **Instead.** A file enters the archive with its index line and a status banner in the same
  change. Decide what is fit to publish before the push: public history is one-way.
  [research-corpus-brief.md](research-corpus-brief.md) records the same drift in the earlier
  work, where the file every session loads grew from 114 lines to 627.

## 5. Guards that read stronger than they are

- **What showed it.**
  - The checks bind a deploy only because the build command in the Cloudflare dashboard is
    `npm run build`. That setting is not in the repository.
  - "Agents never push" is a sentence in `AGENTS.md` plus two deny rules for one tool.
    `.codex/config.toml` gives the shell network access and has no rule.
  - A private repository on GitHub's free plan has no ruleset, so there a push to `main` is a
    deploy. The starter's own repository is public and has one.
- **Not corrected.** `docs/working.md` carries the agent guards.
- **Instead.** Say in the docs exactly what each guard stops. Move enforcement into the
  repository where the platform allows it. Test a guard by trying to get past it
  (`docs/stack-wiring.md`, "Working with an agent").

## 6. Bars set from today's measurement, and defaults inherited by accident

- **What showed it.**
  - The JS budget is 90 KB because the first measurement was 83.4 KB. It cannot fail the
    design it judges.
  - Every derived site inherits a React island on its home page, for a search box and three
    toggles. `docs/working.md` carries that decision.
  - The accessibility page's starter text said every page works by keyboard, with a screen
    reader and at 200% zoom. None of the three had been run.
- **Corrected in this change.** The accessibility text is now an instruction to state what
  was checked.
- **Instead.** Set a bar from what the site should be. Treat everything in the starter as a
  default some site will ship, and decide it on purpose before a second site copies it.

## 7. A second system beside the first

- **What showed it.** [advice-from-predecessor.md](advice-from-predecessor.md) reports that
  the starter has settled, in practice, questions the earlier project's records still leave
  open: the generator, the host, the UI stack and a public MIT license. That was not checked
  here. Inside this repository, `docs/architecture.md` listed three places where the starter
  differs from the design, and three more went unlisted: one launch switch, one settings
  file, and agent guards that differ by tool.
- **Corrected in this change.** The three are in `docs/working.md`, under "Decide".
- **Instead.** When the starter departs from a written principle, record the departure
  beside the principle, in the same change.

## 8. Designing the contract before the second site

- **What showed it.** Open proposals for settings in YAML, a token format and a declared list
  of switches all come from one example. `docs/architecture.md`, section 8, says the real
  contract "is expected to be discovered by building the second site, not specified ahead of
  it".
- **Instead.** Draw one boundary first, because the second site tests it: the files a site
  owns, apart from the files it leaves alone (pattern 3). Leave the formats and schemas on
  the site's side of that boundary until two sites have needed them.
