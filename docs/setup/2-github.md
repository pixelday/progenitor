# Step 2. Configure GitHub

As of 2026-11-25, except where a later date is given. **This step has been run only in part
with this starter.** On 2026-11-26 the starter's own repository, which is public, had `main`
pushed and the ruleset in part 4 set. Everything else comes from a live repo in earlier work
(LIVE) and from GitHub's documentation (DOCS). The git commands were run on a local fixture
(LOCAL).

The owner does this step in the browser. Only settings that differ from GitHub's defaults are
listed. The "default" column is what the background docs recorded; GitHub changes defaults,
so the check command at the end is the authority.

## 1. The account

On every account that will own the repo, push to it or merge in it:

| Setting | Default | Set to | Where | Tag |
|---|---|---|---|---|
| Two-factor authentication | Off | On: an authenticator app first, then a passkey | Settings, Password and authentication | LIVE |
| Keep my email addresses private | Off | On | Settings, Emails | DOCS |
| Block command line pushes that expose my email | Off | On | Settings, Emails | DOCS |

- Store the recovery codes offline, not inside the account they recover.
- Note the account's `noreply` address from the Emails page. It looks like
  `<id>+<login>@users.noreply.github.com`.

## 2. Create the repository and push the starter

Create it **private** and **empty**: no README, `.gitignore` or license from GitHub, because
this folder already has them. Leave the default branch as `main`.

Then, in this folder:

```bash
git init -b main
git config user.name  "<name to show on commits>"
git config user.email "<id>+<login>@users.noreply.github.com"
git add README.md AGENTS.md CLAUDE.md .gitignore .npmrc .nvmrc .claude/settings.json .codex .gemini \
        package.json package-lock.json astro.config.ts panda.config.ts tsconfig.json wrangler.jsonc \
        .htmlvalidate.mjs LICENSE \
        docs public scripts src
git status --short                 # read it: every line starts with "A", and nothing is left untracked
git commit -m "Start from the static site starter"
git log --all --format='%an <%ae>%n%cn <%ce>' | sort -u    # expect one line: the noreply address
```

- **Set the identity before the first commit.** A commit carries its author's email for good,
  and a global git config usually holds a personal address.
- The last command lists every author and committer on every branch. If a personal address
  shows, fix it before anything is pushed. Rewriting pushed history is the owner's decision.

The owner pushes:

```bash
git remote add origin https://github.com/OWNER/REPO.git
git push -u origin main
```

## 3. Repository settings that differ from the defaults

All under the repository's Settings.

| Setting | Default | Set to | Why | Tag |
|---|---|---|---|---|
| Visibility | chosen at creation | Private | Only `dist/` is ever public. | LIVE |
| Automatically delete head branches (General, Pull Requests) | Off | On | Merged branches don't pile up. | LIVE |
| Allow squash merging | On | Off | After a squash or rebase merge, `git branch -d` refuses the merged branch. With merge commits only, the safe delete keeps working. | DOCS; the `git branch -d` behavior was run on a fixture in earlier work |
| Allow rebase merging | On | Off | Same. | same |
| Wikis (General, Features) | On | Off | Unused. | LIVE |
| Actions permissions (Actions, General) | Enabled | Disabled | Cloudflare builds on its own infrastructure. With Actions off, a workflow file added later can't run, so a merge to `main` stays the only deploy path. | DOCS |
| Dependabot alerts (Advanced Security) | Off on a private repo (not confirmed) | On | Reports vulnerable build dependencies. It does not need Actions. | DOCS |

Left at the default on purpose: default branch `main`, Issues, Projects, Discussions,
auto-merge off, no GitHub Pages, no deploy keys, no Actions secrets.

**OPEN:** whether Cloudflare's build status still appears on pull requests with Actions
disabled. Check on the first pull request in step 3. If it does not, turn Actions back on and
keep the repo free of workflow files. On 2026-11-26 the build check did appear on the
starter's pull request (DEPLOYED), but nobody had confirmed that Actions was disabled there,
so this stays open.

Read the settings back. This works for a collaborator with Write access (LIVE):

```bash
gh api repos/OWNER/REPO --jq '{private, default_branch, delete_branch_on_merge, allow_merge_commit, allow_squash_merge, allow_rebase_merge, has_wiki}'
# expect:
# {"allow_merge_commit":true,"allow_rebase_merge":false,"allow_squash_merge":false,"default_branch":"main","delete_branch_on_merge":true,"has_wiki":false,"private":true}
```

The Actions and Dependabot settings have no command a collaborator can run: both API reads
answer 404 without Admin (LIVE). Confirm those two on the settings page.

## 4. What GitHub Free does not give a private repo

Branch protection and rulesets work only on public repos on the Free plan (DOCS). So nothing
on GitHub's side stops a push to `main`, and once step 3 is done **a push to `main` is a
production deploy**. "Every change goes through a pull request" is a convention. What backs it:

- `AGENTS.md` forbids agent sessions from pushing, and `.claude/settings.json` denies the
  plain `git push` shapes. `docs/archive/workspace.md` proposes stronger guards; they are
  not installed.
- The build runs the checks, so a broken change fails before it deploys (step 1).

**If the repository is public**, the limit above does not apply. Add a ruleset for `main`
that requires a pull request before merging and blocks force pushes, and GitHub enforces
the convention.

The starter's own repository has one, set on 2026-11-26. It targets the default branch,
requires a pull request with no approvals, blocks force pushes and restricts deletions. Its
bypass list is empty: that was seen on the settings page, because the API does not show the
list to an account with Write access. Read the rules back with:

```bash
gh api repos/OWNER/REPO/rules/branches/main --jq '[.[].type] | sort | join(", ")'
# expect: deletion, non_fast_forward, pull_request
```

`non_fast_forward` is the API's name for "Block force pushes". On a public repository this
read needs no Admin access. It also answered a request with no credentials.

## 5. The Cloudflare GitHub App

Step 3 installs it when the repo is connected. When GitHub asks, choose **Only select
repositories** and pick this repo alone. To change it later: the account's Settings,
Applications, Installed GitHub Apps, Cloudflare Workers and Pages, Configure.

If a repo is missing from Cloudflare's picker, this scope is the usual cause (LIVE).

**Where the app is already installed with a list of repositories, add this repo to the list
before creating the Worker.** On 2026-11-26 the starter's repository was not on the list when
its Worker was created (DEPLOYED). Nothing refused. The first build deployed, and after that
no push built anything. No error appeared where a push would show one. The only signs were:

- the pushed commits had no build check on GitHub, and the pull requests no comment
- the Worker's Settings, Builds page carried a banner: "This project is disconnected from
  your Git account. This may cause deployments to fail."

The owner then added the repository to the app's list. The banner went away, and the next
push built: its build check appeared 16 seconds after the push (DEPLOYED).

To see whether Cloudflare built a commit:

```bash
gh api repos/OWNER/REPO/commits/<sha>/check-runs --jq '.check_runs[] | {name, status, conclusion}'
# built:       {"conclusion":"success","name":"Workers Builds: <worker-name>","status":"completed"}
# never seen:  prints nothing
```

## 6. The working loop, once step 3 is done

1. Branch from `main`, commit, and the owner pushes the branch.
2. The owner opens a pull request. Cloudflare builds a preview and shows its build check on
   the pull request (DEPLOYED). It also comments, with a column for the preview's URL.
   Whether that column gets filled is open (step 3, part 6).
3. Review the preview. Before merging, check the branch already contains `main`, so the merge
   ships exactly what the preview showed (LOCAL):

   ```bash
   B=<branch>; if ! git fetch -q origin; then echo "FAIL  fetch: no network or no access"; elif git merge-base --is-ancestor origin/main "origin/$B"; then echo "PASS  $B contains main: merging ships what the preview showed"; else echo "FAIL  main moved (or no such branch): merge main into $B, push, re-check the preview"; fi
   ```
4. The owner merges with a merge commit. Cloudflare builds and deploys production.
5. Run `scripts/verify-live.sh` against the new commit (step 3). A failed build leaves the
   previous version serving, so "the site is up" proves nothing (DOCS).
6. Delete the local branch with `git branch -d <branch>`, never `-D`.

Set `git config fetch.prune true` once, or merged branches linger as stale `origin/*` refs
(LIVE). `git ls-remote --heads origin` is the ground truth for what exists on GitHub.
