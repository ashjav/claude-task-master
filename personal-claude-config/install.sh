#!/usr/bin/env bash
# install.sh — symlink this folder into ~/.claude/ so personal Claude Code
# config is portable across machines via git.
#
# Idempotent: existing items at the target are backed up before being replaced.
# Run any time. Safe to re-run.

set -euo pipefail

TARGET="$HOME/.claude"
SRC="$(cd "$(dirname "$0")" && pwd)"

ts() { date +%Y%m%d-%H%M%S; }

# If ~/.claude/ exists as a real directory (not already a symlink chain to here),
# back it up wholesale so we never blow it away.
if [ -d "$TARGET" ] && [ ! -L "$TARGET" ]; then
  # Only back up if it has any content that isn't already from us
  if [ -n "$(ls -A "$TARGET" 2>/dev/null || true)" ]; then
    backup="${TARGET}.backup.$(ts)"
    echo "→ Existing ~/.claude/ found with content. Moving to: $backup"
    mv "$TARGET" "$backup"
  fi
fi

mkdir -p "$TARGET"

# Per-item symlink so individual files in ~/.claude/ that we don't manage
# (e.g. ~/.claude/projects/ auto-memory) stay where they are.
for item in CLAUDE.md settings.json keybindings.json commands agents skills; do
  src_path="$SRC/$item"
  target_path="$TARGET/$item"

  if [ ! -e "$src_path" ]; then
    continue
  fi

  if [ -e "$target_path" ] || [ -L "$target_path" ]; then
    # Skip if already pointing where we want
    if [ -L "$target_path" ] && [ "$(readlink "$target_path")" = "$src_path" ]; then
      echo "= $item (already linked)"
      continue
    fi
    backup="${target_path}.backup.$(ts)"
    echo "→ Backing up existing $item to $(basename "$backup")"
    mv "$target_path" "$backup"
  fi

  ln -sfn "$src_path" "$target_path"
  echo "✓ Linked $item"
done

echo ""
echo "Done. Personal Claude Code config is now linked:"
echo "  $SRC"
echo "    → $TARGET"
echo ""
echo "Edit files in this folder, commit + push, and other machines pick"
echo "up the changes on 'git pull' — no re-install needed."
