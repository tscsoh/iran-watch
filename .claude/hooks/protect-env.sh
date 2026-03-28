#!/bin/bash
# Blocks Bash commands that would directly overwrite .env files.
# Reads tool input JSON from stdin (Claude Code PreToolUse hook format).

input=$(cat)
cmd=$(echo "$input" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('command', ''))
except:
    print('')
" 2>/dev/null || echo "")

if echo "$cmd" | grep -qE '(>|tee\s+).*\.env'; then
  echo '{"decision":"block","reason":"Direct .env file overwrites are blocked. Use the Edit tool to modify .env files safely."}'
  exit 0
fi
