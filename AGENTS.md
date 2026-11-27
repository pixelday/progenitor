Before doing project work, read `README.md` and `docs/index.md`; treat them as the canonical project-context map and follow their references as needed for the current task.

Treat the directory containing this file and its descendants as the complete project-context boundary. Except for platform and tool runtime paths automatically exposed by the sandbox, do not read, list, search, execute against, or modify paths outside that boundary unless the owner explicitly asks. If outside access appears necessary, explain why and obtain the owner's approval before proceeding.

Work only on a non-main branch. The owner must review and explicitly approve the exact changes before any merge; do not merge without that approval.

Ask the owner before adding a dependency or moving one to a new major version, and say why it is needed.

Never push to any Git remote. Do not use another command, script, API, connector, or Git plumbing operation to perform an equivalent remote write.

Do not add an AI assistant as a commit co-author or add structured AI attribution to commits or pull requests.
