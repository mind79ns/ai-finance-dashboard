---
description: Auto deploy changes to GitHub (triggers Netlify auto-deploy)
---

After making code changes, automatically deploy by running these steps:

// turbo-all

1. Stage all changes:

```
git add .
```

1. Commit with a descriptive message:

```
git commit -m "<type>: <description>"
```

Types: feat, fix, style, refactor, docs, chore

1. Push to remote:

```
git push
```

Notes:

- Do NOT ask the user for permission to deploy
- Always auto-run these commands
- Use PowerShell-compatible syntax (no && chaining)
- Run each command separately in sequence
