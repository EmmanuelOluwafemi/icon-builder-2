# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root via Turborepo:

```bash
bun dev          # start all apps in watch mode (Next.js with Turbopack)
bun build        # build all packages and apps
bun lint         # lint all packages
bun typecheck    # type-check all packages
bun format       # format all .ts/.tsx files with Prettier
```

To scope a command to a single package, use `--filter`:
```bash
bun turbo dev --filter=web
bun turbo typecheck --filter=@workspace/ui
```

## Architecture

This is a **Turborepo + Next.js 16 monorepo** with the following workspaces:

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js app (App Router, RSC) |
| `packages/ui` | Shared design system (shadcn/ui components) |
| `packages/eslint-config` | Shared ESLint config |
| `packages/typescript-config` | Shared TypeScript config |

### Key conventions

- **Shared UI components** go in `packages/ui/src/components/`. The app imports them as `@workspace/ui/components/<name>`. Do not duplicate components inside `apps/web`.
- **App-specific components** (pages, layouts, providers) go in `apps/web/components/` or colocated under `apps/web/app/`.
- **Utilities** live in `packages/ui/src/lib/utils.ts`. Import via `@workspace/ui/lib/utils`.
- **Global CSS and design tokens** are in `packages/ui/src/styles/globals.css`. Tailwind CSS v4 is used — design tokens are CSS custom properties (`oklch` color space), wired into Tailwind via `@theme inline`.
- `apps/web/next.config.mjs` has `transpilePackages: ["@workspace/ui"]` so the UI package is consumed without a separate build step.

### Adding shadcn/ui components

Run this from the repo root (not inside `apps/web`):
```bash
pnpm dlx shadcn@latest add <component> -c apps/web
```
Components are placed in `packages/ui/src/components/`, not in the app.

### Icon library

Icons come from `@hugeicons/react` (not lucide-react). Import as:
```tsx
import { IconName } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
```

### Component primitives

shadcn components use **`@base-ui/react`** as the headless primitive layer (not Radix UI). Keep this in mind when reading component internals or adding new ones.

### Theme / dark mode

`next-themes` powers dark mode. The provider is in `apps/web/app/theme-provider.tsx`. The `.dark` class toggles the CSS custom properties defined in `globals.css`.

### `cn` utility

Use `cn(...)` from `@workspace/ui/lib/utils` (wraps `clsx` + `tailwind-merge`) for all conditional class merging.
