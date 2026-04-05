---
name: shadcn
description: Add shadcn/ui components to the web app using the shadcn CLI
allowed-tools: Bash
---

Add the requested shadcn/ui component(s) to `apps/web`.

Run this from the repo root:

```
pnpm dlx shadcn@latest add $ARGUMENTS --cwd apps/web
```

After the command completes, list which files were created under `apps/web/src/components/ui/`.
