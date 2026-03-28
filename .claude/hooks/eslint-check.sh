#!/bin/bash
# Run ESLint on the edited file and surface errors as a system message.
# Reads tool input JSON from stdin.

INPUT=$(cat)
FILE=$(echo "$INPUT" | node -e "
  let d='';
  process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    try { const p=JSON.parse(d); console.log(p.tool_input?.file_path||p.file_path||p.path||''); } catch { console.log(''); }
  });
" 2>/dev/null || echo "")

# Only lint JS files in src/
if [[ "$FILE" =~ \.js$ ]] && [[ "$FILE" =~ /src/ ]]; then
  cd /Users/toddswepston/Projects/iran-watch
  if [ -f "node_modules/.bin/eslint" ]; then
    RESULT=$(npx eslint "$FILE" --max-warnings 0 2>&1)
    EXIT=$?
    if [ $EXIT -ne 0 ] && [ -n "$RESULT" ]; then
      echo "{\"systemMessage\": \"ESLint: $RESULT\"}"
    fi
  fi
fi

exit 0
