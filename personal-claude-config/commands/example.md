---
description: Worked example of a slash command. Delete this file once you've added real commands.
argument-hint: "[optional arg]"
---

# Example command

This is the body of the slash command. When you type `/example` in any project, Claude Code injects this entire body as a user message.

## Substitutions you can use

- `$ARGUMENTS` — everything the user typed after `/example`. Example: `/example foo bar` makes `$ARGUMENTS` equal `foo bar`.
- `$0`, `$1`, `$2`, … — positional arguments split on whitespace.
- `${CLAUDE_SESSION_ID}` — the current session ID.
- `${CLAUDE_PROJECT_DIR}` — absolute path to the current project root.
- `` !`shell command` `` — runs the shell command at slash-invocation time and substitutes the output inline. Example: `Branch is !`git branch --show-current``.

## Steps

1. Do the first thing with `$ARGUMENTS`.
2. Then the second thing.
3. Report back in 2-3 sentences.

---

When you're ready to add your real commands, copy this file, rename it to `<your-command>.md`, and replace the body. The filename (minus `.md`) becomes the slash command name.
