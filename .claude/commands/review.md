Review the current changes for quality, security, and Iran Watch conventions.

## What gets reviewed

- All files modified since the last git commit (or all `src/` files if no git history)
- Focus: XSS risks in innerHTML, hardcoded colours, state outside app.js, localStorage access outside storage.js, missing `rel="noopener"`

## Process

1. List changed files with `git diff --name-only HEAD` (or scan `src/` if no git)
2. Read each changed file
3. Apply the code review checklist from `@code-reviewer`
4. Output three sections: **Must Fix**, **Should Fix**, **Nice to Have**

Use `@code-reviewer` agent for a thorough review.
