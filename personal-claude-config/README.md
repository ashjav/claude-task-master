# personal-claude-config — a mirror of `~/.claude/`

This folder is a portable copy of the user-scope Claude Code configuration that normally lives at `~/.claude/` on a Mac. It's stored in this repo so it survives machine wipes and follows you to any new machine.

It does **not** affect the behavior of this repo (`claude-task-master`). That's controlled separately by `.claude/` and `CLAUDE.md` at the repo root.

## What lives in `~/.claude/` and therefore in here

| File / folder | What it controls in Claude Code |
|---|---|
| `CLAUDE.md` | Your personal master profile. Auto-loaded into every Claude Code session in every project. Voice, defaults, hard rules, non-negotiables. |
| `settings.json` | Personal defaults: model, theme, editor mode, permission allowlists you want everywhere. |
| `keybindings.json` | Custom keyboard shortcuts in the Claude Code CLI. |
| `commands/<name>.md` | Personal slash commands. Typing `/<name>` in any project runs the prompt in that file. |
| `agents/<name>.md` | Personal subagents that Claude can delegate to via the Agent tool. |
| `skills/<name>/SKILL.md` (+ `references/`) | Personal skills loaded on-demand when their description matches what you're doing. |

Project-scope versions of these (under a repo's `.claude/`) override user-scope when names collide. So this folder is your default; per-project `.claude/` is the override.

## Restoring on a new machine

```bash
git clone https://github.com/ashjav/claude-task-master.git
cd claude-task-master
./personal-claude-config/install.sh
```

`install.sh` symlinks each item in this folder into `~/.claude/`. After that, `git pull` in this repo automatically updates your personal Claude Code config — no re-install needed.

## Decision tree — where does each piece of an instruction file go?

| If your instruction is… | Put it in |
|---|---|
| "Always write in this voice / style" | `CLAUDE.md` |
| "Use SI units / Canadian guidelines / no preamble" | `CLAUDE.md` |
| "Default to Opus 4.7, max effort" | `settings.json` → `model`, plus a note in `CLAUDE.md` |
| "Auto-approve `npm run *` everywhere" | `settings.json` → `permissions.allow` |
| "When I type `/livesurvey` …" | `commands/livesurvey.md` |
| "When I'm doing a phone-interview screener, follow these rules" | `skills/medical-survey/SKILL.md` |
| "Spawn a subagent that does X with these tools" | `agents/<name>.md` |
| "Run this script every time Claude Code starts" | `settings.json` → `hooks.SessionStart` + script in `.claude/hooks/` (project-scope, not here) |

## Safety notes

- **Never commit real API keys.** Anything in `settings.json` here will be public-ish (whoever can see this repo can see those values). Put real keys in `~/.claude/settings.local.json` on each machine, not in this folder.
- `settings.local.json` is the per-machine, per-secret override and is in the project `.gitignore`. Real keys go there.
- Symlinks vs copies: `install.sh` uses symlinks so edits flow back to git. If you prefer copies, change `ln -sfn` to `cp -R` in `install.sh`.

## Folder layout

```
personal-claude-config/
├── README.md                  ← this file
├── install.sh                 ← symlinks this dir → ~/.claude/
├── CLAUDE.md                  ← your master profile (the most important file)
├── settings.json              ← personal Claude Code settings
├── keybindings.json           ← custom keyboard shortcuts
├── commands/
│   └── example.md             ← worked example of a slash command
├── agents/
│   └── example.md             ← worked example of a subagent
└── skills/
    └── (drop SKILL.md folders here as you build them)
```
