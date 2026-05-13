---
"task-master-ai": minor
---

Security hardening across task metadata, the loop runner, and the legacy file-locking utilities:

- **Task metadata sanitization.** The user-defined `metadata` field on tasks is now validated and scrubbed before it is persisted, returned through MCP tool results, or stored on a `TaskEntity`. ANSI/control characters are stripped, depth and key-count limits are enforced, and non-plain values (functions, symbols, bigints, class instances, circular references) are rejected. This closes a prompt-injection / terminal-spoofing vector where metadata could carry instructions or escape sequences back to the calling LLM or user terminal.
- **Loop permission bypass is now opt-in.** `task-master loop` previously passed `--dangerously-skip-permissions` to Claude by default whenever Docker sandbox mode was off. The loop now refuses to start in CLI mode unless you pass the new `--yes-dangerously-skip-permissions` flag (or set `bypassPermissionsAck: true` on `LoopConfig`). Sandbox mode is unaffected.
- **Loop progress file is constrained to the project root.** The `--progress-file` path is now resolved and rejected if it escapes the project root via `..` or via an absolute path outside the project. Prevents the loop's per-iteration `appendFile` from being weaponized as an arbitrary-write primitive.
- **Legacy file lock + atomic write hardening.** `withFileLock` / `withFileLockSync` now require BOTH an old `mtime` AND a dead recorded PID before taking over a stale lock, refuse to operate on symlinked lockfiles, and reject lockfile paths that would land outside the target's parent directory. Atomic writes through `writeJSON` use an unguessable random suffix instead of the predictable `${pid}` form, blocking symlink-hijack attacks against the temp file.
- **MCP metadata writes are always audited.** Every accepted metadata mutation through the MCP server emits a `[metadata-audit]` line on stderr (and via the tool logger when present), regardless of debug flags.
