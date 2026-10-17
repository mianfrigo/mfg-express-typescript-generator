#!/bin/bash
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
case "$FILE" in *.md|*.json|*.txt|*.lock) exit 0;; esac   # don't gate docs/config
SID=$(echo "$INPUT" | jq -r '.session_id // empty')
MARK="/tmp/claude-ponytail-$SID"
# after a successful edit (PostToolUse) the marker is used up: ponytail must run again
[ "$1" = post ] && { rm -f "$MARK"; exit 0; }
[ -z "$SID" ] && exit 0   # no session id (or no jq): can't track it, so don't lock every edit
[ -f "$MARK" ] && exit 0
echo "Blocked: invoke the ponytail:ponytail skill before writing code." >&2
exit 2