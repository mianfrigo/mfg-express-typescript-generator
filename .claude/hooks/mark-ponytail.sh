#!/bin/bash
INPUT=$(cat)
[ "$(echo "$INPUT" | jq -r '.tool_input.skill // empty')" = "ponytail:ponytail" ] || exit 0
SID=$(echo "$INPUT" | jq -r '.session_id // empty')
[ -n "$SID" ] && touch "/tmp/claude-ponytail-$SID"
exit 0
