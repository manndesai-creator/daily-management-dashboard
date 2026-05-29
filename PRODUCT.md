# Product

## Register

product

## Users

Mann Desai (founder of Varion Media, a social-media / advertising agency in Jaipur) and his small in-house team. Used daily on desktop (primary) and mobile (secondary) to plan, execute, and review work for 5–10 active clients. The user moves between this dashboard, client Instagram accounts, and tools like Notion or Drive throughout the day. Each session is usually 2–5 minutes of fast updating (ticking a task off, jotting an idea, queuing a reference link) rather than a long focused work session.

## Product Purpose

A single private workspace that replaces the "five tabs and a notebook" workflow most freelance agencies live in. It tracks:

- **Daily tasks** across client work, agency-internal work, learning, and personal items
- **Clients** as long-lived profiles with platforms, work types, photos, and weekly activity
- **Agency-internal work** organised by type (Outreach, Branding, Shoots, Hiring, SOPs, etc.) with overdue / upcoming / done views
- **Learning resources** (videos, articles, books, PDFs, AI tools) categorised by source, with planned vs completed dates
- **Weekly view** that pulls everything onto one calendar grid for review
- **Quick captures** for raw thoughts, ideas (with execution timeframes), and dated reminders, each able to hold long notes, links and file attachments

Success looks like: the user opens the app, knows in two seconds what's pending today, ticks things off in two more, and trusts the dashboard enough to never re-check Notion or Google Tasks.

## Brand Personality

Quiet, organised, dependable. Three words: **calm**, **practical**, **personal**. It is not a SaaS product to sell; it is a private cockpit. The voice should feel like a competent assistant — direct, declarative, low on marketing language. Warmth comes from the brown / cream palette and the personality of the per-client emoji and color choices, not from copy.

## Anti-references

- Notion (too generic, infinite-canvas anxiety, decision fatigue)
- Linear / Vercel-style ultra-dark tooling (too serious, too dev-coded for a creative agency context)
- ClickUp / monday.com (visual overload, too many features, feels like an enterprise tool the user has to fight with)
- Generic "AI productivity app" gradient-and-glassmorphism aesthetic
- The full cream-and-serif "warm magazine" aesthetic — this is a tool, not an editorial

## Design Principles

1. **One screen, one job.** Each tab earns its place by being the cleanest place to do one specific thing (log today, manage clients, plan the week, dump an idea). Don't load a tab with cross-cutting features.
2. **Show only what matters now.** Pending tasks are loud; done tasks fade or move to their own bucket. The "All / Active" view never carries finished work.
3. **Data lives once.** A task added in Daily Log shows in Weekly, Agency Work, and the client's chart simultaneously, with no duplication. Editing it anywhere updates it everywhere.
4. **Forgiving by default.** Soft-deletes with undo on tasks; clear "Cancel" on every form; data only lost via two-step confirmation. The user should be able to tap fast without fearing mistakes.
5. **Per-client identity carries through.** Client color and photo follow that client into every chart, list, and modal, so the user reads "this is Megha Mam" before reading the task title.

## Accessibility & Inclusion

WCAG AA at minimum:

- All body text ≥ 4.5:1 against its background; large text ≥ 3:1. The cream-on-cream tendency must be actively fought.
- Every interactive control reachable by keyboard with a visible focus ring (currently inherited from Tailwind's `focus:ring-1 focus:ring-ring` — needs verification).
- Reduced motion: any animated transitions (the existing Recharts animations, the undo toast slide-in) should have `prefers-reduced-motion: reduce` fallbacks.
- Touch targets ≥ 40 × 40 px on mobile. The recent compacted action buttons (12 × 12 icons inside p-0.5 buttons) drop below this and need a review.
- Color is never the sole carrier of meaning: the agency-type colour dot is paired with the type name; client colour is paired with photo + name; "done" state is paired with checkmark + strikethrough, not just opacity.
- Hindi / English bilingual support is not required (user works in English).
