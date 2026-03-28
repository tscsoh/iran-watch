#!/bin/bash
# Auto-format files after Claude edits them.
# Reads the tool input JSON from stdin to get the file path.

INPUT=$(cat)
FILE=$(echo "$INPUT" | node -e "
  let d='';
  process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    try { const p=JSON.parse(d); console.log(p.file_path||p.path||''); } catch { console.log(''); }
  });
" 2>/dev/null || echo "")

if [[ "$FILE" =~ \.(js|css|json|html)$ ]]; then
  cd /Users/toddswepston/Projects/iran-watch
  npx prettier --write "$FILE" --log-level silent 2>/dev/null || true
fi

exit 0
