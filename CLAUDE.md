# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Icon Builder is a specialized infinite-canvas design platform for icon designers. It lets them draw vector paths, place geometric shapes, organize icons in fixed-size frames, and export clean SVG and PNG files — purpose-built for icon pack creation workflows.

## Tech Stack

- Next.js 16 (App Router, RSC)
- TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui components (`@base-ui/react` primitives, not Radix UI)
- react-konva — sole canvas rendering engine
- Paper.js — bezier math utility only (never renders to DOM)
- Zustand — editor state management
- Turborepo — monorepo build system
- Bun — package manager and script runner

## Project Structure

```
apps/
  web/                  -- Next.js application
    app/                -- App Router pages and layouts
    components/         -- App-specific components (providers, editor shell)
    hooks/              -- App-specific hooks
    lib/                -- App-specific utilities
packages/
  ui/                   -- Shared design system
    src/
      components/       -- shadcn/ui components (import as @workspace/ui/components/<name>)
      lib/utils.ts      -- cn() utility (import as @workspace/ui/lib/utils)
      styles/globals.css -- Design tokens and Tailwind v4 config
  eslint-config/        -- Shared ESLint config
  typescript-config/    -- Shared tsconfig
```

## Commands

All commands run from the repo root:

```bash
bun dev          # start all apps (Next.js with Turbopack)
bun build        # build all packages and apps
bun lint         # lint all packages
bun typecheck    # type-check all packages
bun format       # format all .ts/.tsx files with Prettier
```

Scope to a single package with `--filter`:

```bash
bun turbo dev --filter=web
bun turbo typecheck --filter=@workspace/ui
```

## Conventions

### shadcn/ui — install, never build

Before writing any UI component, check whether shadcn/ui provides it. If it does, install it — never hand-roll it:

```bash
pnpm dlx shadcn@latest add <component> -c apps/web
```

Components are placed in `packages/ui/src/components/`, not in the app. This applies to: buttons, inputs, selects, checkboxes, toggles, tooltips, dropdowns, popovers, sliders, tabs, badges, separators, scroll areas, and anything else in the shadcn catalog.

### Dialogs — never use `alert()`, `confirm()`, or `prompt()`

Always use the shadcn `Dialog` component for modal interactions. If not yet installed:

```bash
pnpm dlx shadcn@latest add dialog -c apps/web
```

### Design system — use tokens, never hardcode values

All UI must use the CSS custom properties defined in `packages/ui/src/styles/globals.css`. Do not hardcode color values, border radii, or spacing. Use Tailwind utility classes that map to these tokens:

| Token class | Use for |
| --- | --- |
| `bg-background` / `text-foreground` | Page and canvas background, default text |
| `bg-card` / `text-card-foreground` | Panel and sidebar surfaces |
| `bg-primary` / `text-primary-foreground` | Primary actions, active states |
| `bg-muted` / `text-muted-foreground` | Subtle backgrounds, secondary labels |
| `bg-accent` / `text-accent-foreground` | Hover states, highlights |
| `border-border` | All borders |
| `text-destructive` | Error states, destructive actions |
| `rounded-sm` / `rounded-md` / `rounded-lg` | Use the defined radius scale |

The color palette uses the `oklch` color space. Do not introduce `hex`, `rgb`, or `hsl` values inline.

### Canvas area is the exception

The react-konva `Stage` renders to a `<canvas>` element — Tailwind classes and shadcn components do not apply inside it. Shape fills, strokes, and colors use Konva's own properties. To sync canvas colors with the design system, read token values at runtime via `getComputedStyle(document.documentElement)`.

### Icons

Icons come from `@hugeicons/react` (not lucide-react):

```tsx
import { IconName } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
```

### `cn` utility

Use `cn(...)` from `@workspace/ui/lib/utils` (wraps `clsx` + `tailwind-merge`) for all conditional class merging.

### Dark mode

`next-themes` powers dark mode via the provider in `apps/web/app/theme-provider.tsx`. The `.dark` class toggles CSS custom properties defined in `globals.css`.

---

## Canvas Architecture Rules

These rules enforce decisions made in the PRD. Violating them reintroduces known bugs.

### No Zustand writes during active mouse events

During drawing (shape tools, pen tool) and node editing, `mousemove` events must **never** write to Zustand. Updates flow directly to Konva via `layer.batchDraw()`. Zustand is written only on commit events (`mouseup`, path close, tool switch). Breaking this rule causes React re-render lag that degrades drawing to an unusable state — this is the exact bug that killed the previous Fabric.js attempt.

### Paper.js is a math utility only

Paper.js must never be initialized with a canvas element and must never render to the DOM. Do not call `paper.setup()` with a canvas reference. Paper.js is used only to parse SVG `d` strings into segment objects (`point`, `handleIn`, `handleOut`) and reserialize them after edits.

### SVG `d` string is the path source of truth

All path geometry is stored as an SVG `d` string in `elements[]`. Konva reads it via `<Path data={d} />`. Paper.js reads it via `new paper.Path(d)`. Do not store path geometry in any other format alongside or instead of the `d` string.

### Viewport must stay in Zustand

The Konva Stage transform (pan x/y and zoom scale) must always be reflected in Zustand `viewport`. The SVG node-editing overlay reads this same value to stay pixel-accurate with the canvas. Both must read from the same Zustand slice — never manage viewport state locally.
