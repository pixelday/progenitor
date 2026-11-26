# Workspace shell: root files and tool adapters

> **Status (2026-11-25): DRAFT for the owner's review. Only the "Now" column is installed.**
> Once the owner approves, the proposed files get written, the guard tests run
> (technical-brief.md §12.4), and the results go at the bottom of this file.
>
> This was written for a two-folder workspace whose root sat outside both repos. The starter
> is one repo, so the guard files are versioned with it and this file is their reasoning and
> test log. Below, read `development/` as `docs/` and `production/` as the repo root, drop
> `git -C <repo>`, and leave out the second Codex rule, which exists only for the `-C` form.

`.claude/settings.local.json` is personal. It is gitignored and never recorded here. Section
numbers (§) refer to [technical-brief.md](technical-brief.md).

## Files

| File | Now (in the starter) | Proposed |
|---|---|---|
| `AGENTS.md` | a shorter text: boundary, branch, no-push and attribution rules | §12.3's text, adapted to one repo |
| `CLAUDE.md` | `@AGENTS.md` and `@docs/index.md` | as is |
| `.claude/settings.json` | two deny rules: `Bash(git push:*)`, `Bash(git push *)` | §12.3 with six changes (below) |
| `.codex/config.toml` | web search live, shell network **on** | network-off profile, web search kept |
| `.codex/rules/no-remote-write.rules` | missing | new; §12.3's first rule |
| `.gemini/settings.json` | points Gemini at `AGENTS.md` | as is |

## `AGENTS.md`

```markdown
Before doing project work, read `development/index.md`: it is the project map. Follow its
pointers as the task needs.

Treat the folder containing this file and everything under it as the whole project. Do not
read, search, run against, or modify anything outside it unless the owner explicitly asks. If
outside access seems necessary, explain why and wait for approval.

The workspace root is not a git repo. `production/` (the site Cloudflare deploys) and
`development/` (docs and notes) are separate repos; scope every git command with `git -C <repo>`.
Stay at the workspace root: run anything that needs a repo's folder in a subshell, for example
`( cd production && npm run build )`.

Work on a non-`main` branch named `<tool>-<topic>` (for example `claude-hero-layout`), and check
the branch of every repo you will write to before writing. A push to `main` deploys production.
The owner reviews every change and merges every pull request.

Never push to any Git remote, and do not use another command, script, API, connector, or Git
plumbing operation to perform an equivalent remote write.

Stage files by explicit path. Never use `git add -A` or `git add .`.

Do not add an AI assistant as a commit co-author or add AI attribution to commits or pull
requests.

Files are the memory: record decisions, status, and lessons in `development/` before the session
ends, and add a one-line entry to `development/index.md` for any new document. Nothing important
may live only in chat or in an assistant's private memory.

State confidence inside the sentence: MEASURED (run and observed), DOCS (read in current vendor
docs, not tested), or RECALLED (from memory, unchecked). Verify built output and the deployed
site, not just exit codes.

Keep `production/` limited to the site and its operator README: no notes, agent files, or
development vocabulary.

Ask the owner early for anything that needs a dashboard, a login, or human judgment. Put anything
the owner will paste elsewhere inside a fenced code block.

Never weaken a check to get a build to pass: not a test, an assertion, a scan pattern, the build
script, `_headers`, the CSP in `astro.config.mjs` or `wrangler.jsonc`. If a check is wrong, say
so and fix it in a branch that does nothing else. If the same failure survives two attempts at
a fix, stop: record the first and latest output where `development/index.md` keeps open
decisions, and ask the owner.

Once `AGENTS.md`, `.claude/`, `.codex/` and `.gemini/` are set up, only the owner changes them;
propose the change instead. A review or research session writes nothing but its own output file.
```

## `CLAUDE.md`

```
@AGENTS.md
@development/index.md
```

## `.claude/settings.json`

```json
{
  "permissions": {
    "deny": [
      "Bash(git push:*)",
      "Bash(git push *)",
      "Bash(git -C * push*)",
      "Bash(gh *)",
      "Bash(wrangler login:*)",
      "Bash(npx wrangler login:*)",
      "Bash(wrangler deploy:*)",
      "Bash(npx wrangler deploy:*)"
    ],
    "disableBypassPermissionsMode": "disable"
  },
  "sandbox": {
    "enabled": true,
    "failIfUnavailable": true,
    "allowUnsandboxedCommands": false,
    "network": {
      "allowedDomains": ["registry.npmjs.org"],
      "deniedDomains": ["github.com", "*.github.com"],
      "allowLocalBinding": true
    },
    "filesystem": {
      "allowWrite": ["~/.npm"]
    }
  },
  "attribution": { "commit": "", "pr": "", "sessionUrl": false },
  "autoMemoryEnabled": false
}
```

Every key is DOCS: the settings schema that ships with the Claude Code VS Code extension
2.1.330, read 2026-11-25. None of it has run yet; the sandbox has never been on in this
workspace. The six changes from §12.3:

1. **`attribution` is the object, not `false`.** Both hide all attribution. The schema says
   versions that predate the boolean reject it and then skip the whole settings file, which
   would drop the sandbox and the deny rules with it. The object form is safe on every version.
2. **`deniedDomains` for GitHub.** The schema says `allowedDomains` is merged with every
   `WebFetch(domain:...)` allow rule from every settings source. So answering "always allow"
   to one WebFetch of github.com would also open github.com to sandboxed shell commands, and
   the push guard with it. `deniedDomains` beats both lists. Count the `WebFetch` rules in
   `.claude/settings.local.json`: shell commands will reach each of those hosts as well as the
   npm registry.
3. **`allowLocalBinding`.** macOS only: lets sandboxed commands listen on localhost.
   `astro dev`, `astro preview` and `wrangler dev` (§4.13) need it.
4. **`filesystem.allowWrite` for `~/.npm`.** npm keeps its cache and logs there, outside the
   workspace. That the sandbox blocks it by default is RECALLED; the first `npm ci` is the test.
5. **`Bash(gh *)` denied.** Where `gh` is installed, it can merge a pull request or call the
   API. A second layer, like the wrangler rules.
6. **`autoMemoryEnabled: false`.** Makes "assistant-private memory stays empty" (§12.1)
   mechanical for Claude.

Left out on purpose:

- `blockReadsOutsideWorkingDirectories` (§12.3 calls it optional and cheap). The schema now
  says it also binds shell commands, and that the sandbox denies such reads. Node lives outside
  the workspace, so this could break every build. The brief's line is stale.
- `blockWritesOutsideWorkingDirectories`: the owner's call. It stops Claude's file tools from
  writing outside the workspace and from writing Claude settings files anywhere, which backs
  "only the owner changes the guard files". Worth adding once the files are installed.

What the sandbox changes about the work (DOCS, same schema, unless marked):

- **It write-protects git config and git hooks.** Set each repo's identity (§6.2 item 3)
  before the sandbox goes on, or the owner runs those two commands in a terminal.
- **`failIfUnavailable` exits the session at startup** if the sandbox can't start. The fix is a
  hand edit of this file, not a session.
- **Hosts outside the two lists prompt.** `strictAllowlist` would deny them outright, but it is
  ignored in project settings. `verify-live`, `dig` and `whois` will prompt per host, or the
  owner runs them.
- **A deny rule with a false positive** (reasoned, not run): `Bash(git -C * push*)` also
  matches a commit whose message contains " push", such as
  `git -C production commit -m "add push guard"`. Reword the message; don't loosen the rule.

## `.codex/config.toml`

```toml
web_search = "live"
approval_policy = "on-request"
default_permissions = "site"

[permissions.site]
description = "Built-in workspace profile with network off: writes stay in the workspace and temp dirs; anything more needs the owner's approval."
extends = ":workspace"

[permissions.site.network]
enabled = false
```

- **This replaces a file that does the opposite.** The current one is
  `web_search = "live"` plus `[sandbox_workspace_write] network_access = true`, which gives
  Codex's shell the network. Where a repo uses an HTTPS remote with a saved credential (for
  example `credential.helper = osxkeychain`), a shell with network can push with it. That is
  the path §12.5 closes. Until this file is in and tested, Codex sessions review and research
  only.
- `web_search = "live"` stays, because §12.1 wants reviewers to have web search. That it is a
  hosted tool, separate from the shell's network, is RECALLED.
- Not validated against a Codex build. The owner runs
  `codex --strict-config doctor --summary` from the workspace root (§12.3).

## `.codex/rules/no-remote-write.rules`

```python
prefix_rule(
    pattern = ["git", ["push", "send-pack"]],
    decision = "forbidden",
    justification = "Remote Git writes are owner-only; prepare a local branch for the owner to review and push.",
    match = ["git push", "git push origin main", "git send-pack origin refs/heads/local:refs/heads/main"],
    not_match = ["git status", "git fetch origin"],
)

prefix_rule(
    pattern = ["git", "-C", ["production", "development"], ["push", "send-pack"]],
    decision = "forbidden",
    justification = "Remote Git writes are owner-only; prepare a local branch for the owner to review and push.",
    match = ["git -C production push", "git -C development push origin main"],
    not_match = ["git -C production status", "git -C development fetch origin"],
)
```

Not validated, for the same reason. The owner runs the two `codex execpolicy check` commands
in §12.3; each should print `forbidden`.

## User-level mirror (the owner's edit; the file is outside the workspace)

A session opened in `production/` or `development/` doesn't load the root
`.claude/settings.json` (§12.2), so the deny rules also go in `~/.claude/settings.json`. Look
at what's there first, then merge these into its `permissions.deny` array without replacing it:

```json
"Bash(git push:*)",
"Bash(git push *)",
"Bash(git -C * push*)",
"Bash(gh *)",
"Bash(wrangler login:*)",
"Bash(npx wrangler login:*)",
"Bash(wrangler deploy:*)",
"Bash(npx wrangler deploy:*)"
```

`Bash(gh *)` at user level blocks `gh` in every project's Claude sessions. Leave it out there
if other projects need it. The sandbox stays project-level.

## Install order

1. The owner rules on the drafts above.
2. Each repo's git identity is set (§6.2 item 3), before the sandbox exists.
3. A session writes the five files, or the owner copies them. The owner reopens the session at
   the workspace root.
4. The guard tests in §12.4 run, plus two that this draft adds: `node -v` inside the sandbox
   prints the pinned Node, and the first `npm ci` writes its cache. Results go here, with tool
   and version.
5. The owner mirrors the deny rules at user level.

## Guard test results

None yet.
