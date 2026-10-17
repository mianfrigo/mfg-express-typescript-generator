#!/bin/bash
INPUT=$(cat)
[ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ] && exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
[ -z "$(git status --porcelain 2>/dev/null)" ] && exit 0          # nothing changed
HASH=$( (git status --porcelain; git diff HEAD; git ls-files -o --exclude-standard -z | xargs -0 -r cat) 2>/dev/null | cksum | cut -d' ' -f1)
MARK="/tmp/claude-review-$(echo "$INPUT" | jq -r '.session_id')"
[ "$(cat "$MARK" 2>/dev/null)" = "$HASH" ] && exit 0               # already reviewed this state
echo "$HASH" > "$MARK"
jq -n '{decision:"block", reason:"Code changed. Run /code-review on the changes, then address its findings before finishing."}'