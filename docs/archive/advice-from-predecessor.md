# Advice from Predecessor

**Verdict:** the spike is real and it works. It has proven the deploy path and the gate model. It has not proven that it is a progenitor (as opposed to one well-built site), and the "clone it, follow the README" promise breaks at step 2. I found no dealbreakers.

What I ran, all green at `ae7ff40`:
- **Live demo:** passes its own live check, 39 of 39.
- **Fresh clone:** installs and builds on Node 24.22.3 with 19 checks, 24 tests and 12 pages.
- **Tamper test:** catches all 88 deliberate breaks.
- **GitHub:** public, pull request required on `main`, merge commits only, Cloudflare build check green.

Not run: the browser audit, step 4, and anything on a private repo. The repo records only a public-repo deploy, so "also works for private repos" is untested with this starter. I did not read `docs/archive/` or `untracked/`, per the repo's own AGENTS.md; I swept the archive by string instead.

## 1. What it gets right

- **It closed the biggest open risk.** The original project's pipeline spike called GitHub → Cloudflare → live Astro "assumed everywhere and demonstrated nowhere". It is now demonstrated, and neither kill criterion in the stack decision fired.
- **It turns the original project incidents into mechanisms.** Each of these was prose in the original project; here a build or script fails:
  - the commit marker on every page (an instance repo is not its deploy source until measured);
  - browser-shaped requests plus an injection check (Cloudflare rewrites pages);
  - the launch switch with six consumers (a past noindex incident).
- **The checker is itself tested.** The tamper test is the best single idea in the repo.
- **It is honest about itself.** Claims carry evidence tags, and the README says "change only the data and settings" is a design goal until a second site exists.
- **It is clean.** Zero hits for about twenty client and internal names across the tree and full history, and every commit uses a noreply address.

## 2. Significant concerns

**The front door doesn't work for a clone.** I ran [step 2](../setup/2-github.md) exactly as written on a fresh clone of the public repo:
- `git init` is a no-op and there is nothing to commit.
- The identity check prints three inherited identities where it expects one.
- `git remote add origin` errors, and origin still points at the upstream repository.

The docs never use the words clone, fork or template, and the repo is not a GitHub template. How a site is derived also decides whether it can ever take an upstream fix, so that decision is being made by omission.

**The stand-ins for the relaxed control plane are thinner than they read.** The Nov 26 ruling leans on the never-weaken rule, pull requests into `main`, and the tamper test.
- **No ruleset on the default:** on a private repo on GitHub Free, a push to `main` is a production deploy.
- **Push block for Claude only:** the Codex config ships with network access on and no equivalent.
- **Build command in the dashboard:** it is the only thing that makes the checks bind, and `verify-live.sh` cannot tell whether the live site went through `verify-dist`.

**Compliance claims run ahead of the evidence.**
- The legal-page gate detects a removed attribute, not a review. An agent told to make the launch build pass will delete that line.
- The privacy page's claims are prose, tied to the CSP only by a rule.
- The accessibility page says every page works by keyboard, screen reader and 200% zoom. [working.md](../working.md) says none of those has been run, and only desktop Chrome has been used.

That is tolerable on a noindex demo with a placeholder banner, but not as text every descendant inherits.

**The archive was published before it was reviewed**, and that item is still open. It names no one, but the YAML brief describes a real production site's data shape. Whether that fits the original client agreement is your call, and MIT plus public history is one-way.

Smaller points:
- The 90 KB JS budget was set from the 83.4 KB measurement, so it cannot fail the design it judges.
- The no-AI-attribution rule ships as a default to every descendant. That deserves a conscious choice, since some clients may expect AI involvement to be disclosed.

## 3. Traps it is repeating

**Live numbers in boot docs.** The repo is two days old and already drifting:

| Docs say | Measured today |
|---|---|
| live check: 36 or 38 `PASS` | 39 |
| unit tests: 12 passed | 24 |
| build checks: fifteen, eighteen or nineteen | 19 |
| tamper: 87 breaks | 88 |
| CSS 6.8 KB, home page 4.3 KB | 7.1 KB, 5.2 KB |
| squash, rebase and wikis still on | all off |

Some are dated records and true as history, but steps 1 and 3 state them as what to expect.

**`src/site.ts` is the unsplit `global.yml`.** Deploy exposure (`url`, `launched`), compliance surfaces (`legalUpdated`, `aiCrawlers`, `contact`) and content sit in one file. That is the who-edits split the original project already paid for, and the proposed `site.yml` is still one file.

**Each instance is a small copy of the original project's monorepo.** Engine, content, working notes and agent config share one repo, and site-specific edits land inside engine files:
- which pages may load JavaScript is a constant in `verify-dist.mjs`;
- step 4 tells a site with mail at its domain to delete lines from `verify-live.sh`;
- legal prose lives inside page templates.

Any future upstream merge will conflict in exactly those files.

**Polish before parameterization.** Batch-08 was the theme select, forced colors, print and ten color modes. the original project's own ordering puts that tier last, after the two-instance proof, which has not been attempted.

**A second system.** Progenitor has in practice chosen Astro, Workers, React/Panda/Base UI and public MIT. the original project's stack decision still says UNRULED, and the original project's progenitor record still says "marker file only".

## 4. Disagreements with the original project, and whether they hold (4.1)

| The original project | Progenitor | Defensible? |
|---|---|---|
| The control plane lives in system, never the instance | Each instance carries its checks, URL and launch switch (ruled Nov 26) | Yes for a self-contained seed, if the stand-ins are real. On the default setup one of three is missing. |
| System is confidential; the compliance mechanism is the moat | Public, MIT | Yes, and arguably better: "no operator-private material" enforces itself. It is one-way, so record it as a ruling, and the vertical layer must never land there. |
| Instances descend; upgrades flow down the line | A full copy with no line back | Only until site 2. A copy with no line is a template, and the name stops being true. |
| Stem-cell bar: plain HTML, minimal script | A React island on the home page | As proof that hydration works under a strict CSP, yes. As the default every descendant inherits, no. |

Astro versus Jekyll and Workers versus Pages are not real disagreements: the first was unruled and passed its kill criteria, and the second matches the latest setup guide.

## 5. What I would do

1. **Build site 2 next and stop polishing.** Make the kill criterion a command: the diff between progenitor and site B touches only a named list of site-owned files.
2. **Do the who-edits split first, while no instance exists.** Site-owned files hold no engine code, and checker constants are read from settings, not edited in scripts.
3. **Write the derive step and run it against a throwaway.** It also settles the upgrade path.
4. **Move enforcement into the repo.** The installed Wrangler schema accepts `build.command` (I have not run it); or have `verify-dist` stamp the build and `verify-live` require the stamp.
5. **Take counts out of the docs.** "Every line prints `PASS`" never drifts; the README already does this for the spike criterion.
6. **Fold the results back into the original project.** For example, the instance-init checklist still says `_headers` is ignored on Workers, which this deploy disproved.

In short, the site's quality is no longer the risk: it is over-verified and under-instanced.
