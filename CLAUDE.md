# Glokal Dashboard — Project Documentation

## Overview

Content operations dashboard for **Glokal Advertising**, an offline advertising agency based in Jaipur, Rajasthan. Centralizes social media management, content planning, competitor research, news monitoring, and performance analytics in a single dark-themed web app.

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Next.js | ^15.2.4 | App framework (App Router) |
| TypeScript | ^5 | Type safety across the project |
| Tailwind CSS | ^3.4.1 | Utility-first styling |
| shadcn/ui | (manual scaffold) | Component system with Radix UI primitives |
| Lucide React | ^0.468.0 | Icon library (only icon source used) |
| Radix UI Slot | ^1.1.1 | Headless `asChild` pattern for Button |
| Radix UI Separator | ^1.1.0 | Accessible separator primitive |
| clsx | ^2.1.1 | Conditional class name merging |
| tailwind-merge | ^2.5.5 | Resolve Tailwind class conflicts |
| class-variance-authority | ^0.7.1 | Type-safe component variant management |

---

## Folder Structure

```
glokal-dashboard/
├── app/
│   ├── globals.css                  # CSS custom properties (design tokens) + Tailwind directives
│   ├── layout.tsx                   # Root layout — sets `dark` class on <html>, imports globals.css
│   ├── page.tsx                     # Root page — immediately redirects to /instagram-manager
│   └── (dashboard)/                 # Route group: applies sidebar layout without affecting URLs
│       ├── layout.tsx               # Sidebar + <main> wrapper for all dashboard sections
│       ├── instagram-manager/
│       │   └── page.tsx
│       ├── content-calendar/
│       │   └── page.tsx
│       ├── competitor-tracker/
│       │   └── page.tsx
│       ├── news-consolidator/
│       │   └── page.tsx
│       └── analytics/
│           └── page.tsx
├── components/
│   ├── sidebar.tsx                  # Primary navigation sidebar (client component)
│   └── ui/                          # shadcn/ui components (manually scaffolded)
│       ├── button.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       └── separator.tsx
├── lib/
│   └── utils.ts                     # cn() — clsx + tailwind-merge helper
├── components.json                  # shadcn/ui CLI configuration
├── tailwind.config.ts               # Tailwind config with CSS variable color tokens
├── postcss.config.mjs               # PostCSS (tailwindcss + autoprefixer)
├── tsconfig.json                    # TypeScript strict mode, path alias @/*
├── next.config.ts                   # Next.js config (minimal, no overrides)
├── .eslintrc.json                   # ESLint with next/core-web-vitals + next/typescript
└── CLAUDE.md                        # This file
```

---

## Architecture Decisions

### Route Groups & Layout Nesting

All 5 dashboard sections live inside `app/(dashboard)/`. The parentheses make this a **route group** — it applies a shared layout (sidebar) without adding a URL segment. URLs are clean: `/instagram-manager`, `/content-calendar`, etc. — not `/dashboard/instagram-manager`.

The root `app/page.tsx` immediately calls `redirect("/instagram-manager")` so the app always lands on a section.

### Dark Theme — Forced, No Toggle

- `tailwind.config.ts` uses `darkMode: ["class"]` (Tailwind's class strategy).
- The `dark` class is hardcoded on `<html>` in `app/layout.tsx`.
- All CSS custom properties in `app/globals.css` are set under `:root` with dark-mode values — there is no light mode and no toggle UI.
- This is intentional: the dashboard is an internal ops tool, always dark.

### Color Palette (CSS Custom Properties)

| Token | HSL Value | Usage |
|---|---|---|
| `--background` | `240 10% 3.9%` | Main page background |
| `--card` | `240 6% 7%` | Card and sidebar background |
| `--primary` | `24 95% 53%` | Orange accent — CTA buttons, active nav |
| `--secondary` | `240 5% 15%` | Subtle fill for hover/secondary states |
| `--muted-foreground` | `240 5% 55%` | Dim/secondary text |
| `--border` | `240 5% 15%` | All border colors |

Orange (`--primary`) was chosen to reflect energy and creativity — appropriate for an advertising agency.

### shadcn/ui — Manual Scaffold

`create-next-app` and `npx shadcn init` were not run (Node.js not available in the scaffolding environment). All project files were written directly. Components in `components/ui/` follow exact shadcn/ui conventions so they are compatible with future `npx shadcn@latest add <component>` commands, which will work after `npm install`.

Only the components in active use are present: `Button`, `Card`, `Badge`, `Separator`. Add more as needed via the shadcn CLI.

### Sidebar

`components/sidebar.tsx` is a `"use client"` component — it uses `usePathname()` from `next/navigation` to detect the active route and highlight the correct nav item.

- Fixed with `h-screen sticky top-0` so it stays visible when the main content scrolls.
- Active nav item gets `bg-primary text-primary-foreground`.
- Each nav item has a label + a sub-description line.

### TypeScript

Strict mode is enabled. The `@/*` path alias maps to the project root. All component props use explicit TypeScript interfaces — no implicit `any`.

### Icons

**Lucide React only.** Do not add other icon libraries. If a Lucide icon doesn't exist for a use case, use a similar one or a simple SVG inline.

---

## Sections

| Section | Route | Description |
|---|---|---|
| Instagram Manager | `/instagram-manager` | Post scheduling, account connections, IG stats |
| Content Calendar | `/content-calendar` | Monthly visual calendar for content planning |
| Competitor Tracker | `/competitor-tracker` | Monitor competitor social accounts and metrics |
| News Consolidator | `/news-consolidator` | Aggregated industry news with category filters |
| Analytics | `/analytics` | Cross-platform performance dashboard with charts |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Type-check
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build
```

---

## Component Conventions

- All **shadcn/ui components** live in `components/ui/` and use named exports.
- **Page components** are `default` exports in `app/(dashboard)/<section>/page.tsx`.
- **Shared layout/nav components** live in `components/` (not `components/ui/`).
- Use `cn()` from `lib/utils.ts` for all conditional `className` composition.
- Use `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` for content sections.
- Icons are always imported from `lucide-react`.
- Client components (those using hooks or browser APIs) must include `"use client"` as the first line.

---

## Adding a New shadcn Component

After `npm install`, use the shadcn CLI to add any component:

```bash
npx shadcn@latest add <component-name>
# e.g. npx shadcn@latest add dialog
# e.g. npx shadcn@latest add table
# e.g. npx shadcn@latest add input
```

The CLI reads `components.json` for configuration and places the component in `components/ui/`.

---

## Environment Notes

- Node.js must be installed to run `npm install` and `npm run dev`.
- The project was scaffolded manually (all files hand-written) because Node.js was not available during initial setup.
- No `.env` file is required for the placeholder build. Add one as API integrations are built.
