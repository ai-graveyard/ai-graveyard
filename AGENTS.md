<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: AI Graveyard

A pixel-art cemetery web app for open-sourced AI products that missed product-market fit.

## Stack

- **Next.js 16.2.4** with App Router (`app/` directory)
- **React 19.2.4** (use `"use client"` for interactive components)
- **TypeScript 5**
- **Tailwind CSS v4** via `@tailwindcss/postcss` (PostCSS config in `postcss.config.mjs`)
- **CSS Modules** for component-scoped styles (e.g. `graveyard-experience.module.css`)
- **pnpm** (workspace config in `pnpm-workspace.yaml`)
- **Geist / Geist Mono** fonts via `next/font/google`

## File structure

```
app/
  layout.tsx                      # Root layout: metadata, fonts, html/body shell
  page.tsx                        # Home page — renders <GraveyardExperience />
  graveyard-experience.tsx        # Main interactive client component ("use client")
  graveyard-experience.module.css # All styles for the graveyard experience
  globals.css                     # Global resets / Tailwind base
  opengraph-image.tsx             # OG image route
  favicon.ico
public/                           # Static SVG assets
```

## Key design decisions

- All product data is hardcoded in `graveyard-experience.tsx` as the `products` array (no external data source).
- User preferences (language, theme, buried IDs) are persisted in `localStorage` using keys:
  - `ai-graveyard-language` — `"en" | "zh"`
  - `ai-graveyard-theme` — `"night" | "day"`
  - `ai-graveyard-buried-ids` — JSON array of product IDs
- The "bury" animation runs for exactly `1450ms` (`buryAnimationMs`), controlled by a `setTimeout`.
- CSS custom properties (`--lane`, `--plot`, `--accent`) are used for grid placement and per-tombstone accent colors.
- The cemetery grid reflows. `boardColumnSteps` maps the board's own measured width to 4 / 3 / 2 / 1 plot columns (a `ResizeObserver` on `.boardScroll` drives it, not a media query), `boardLayout` re-slices the graves into rows for that count, and `.board[data-columns="…"]` picks the matching `grid-template-columns`. Graves are placed by year and `born` date, so a product's `lane` / `plot` fields no longer decide where it lands.
- `graveyardYears` is derived from the products (every distinct `born` year, oldest first), so a product from a new year gets its own section with no config. Every section after the first is preceded by a `.yearDivider` row — a strip of deeper grass with a row of pixel flowers and grass tufts — and is shifted up by `.raisedYearRow`.
- Because divider rows and plot rows are different heights, `grid-template-rows` cannot be a `repeat()`. `boardLayout` builds the track list as `rowSizes` (`var(--plot-row-height)` / `var(--year-divider-height)` tokens) and the board reads it from `--board-row-sizes`; `--board-plot-rows` and `--board-divider-rows` only feed the `min-height` calc.
- The dossier panel only follows the clicked selection (`activeId`). Hover (`hoverId`, set on mouseenter/focus) is purely local to the board: it lifts + glows the tombstone (`.hoverTombstone`) and highlights buried mounds, but never changes the dossier.
- The dossier lives in the board section, not the header, so graves in the last row still have their dossier on screen. `.boardWrap` is a grid (`score`/`board`/`panel` areas) and the panel is `position: sticky` in the right column.
- Below 1080px there is no room for that sidebar, so the dossier turns into a drawer fixed to the bottom edge: `data-docked` on the `<aside>` raises it, `.dossierClose` puts it away, and `keepPlotVisible` re-centres the clicked plot in the strip left above it. A `ResizeObserver` publishes the panel height as `--dossier-height`, which `.boardWrap[data-dossier-docked="true"]` turns into bottom padding so the last row can scroll clear. The breakpoint is written twice — `dossierDockQuery` in the tsx and the media query in the CSS — keep them in sync.

## Adding a new product

Add an entry to the `products` array in `app/graveyard-experience.tsx`:

```ts
{
  id: "kebab-case-id",
  name: "display-name",
  repository: "https://github.com/ai-graveyard/<repo>",
  born: "YYYY.MM",
  buried: "YYYY.MM",
  lane: "1" | "2" | "3",      // legacy, unused — placement comes from born/buried
  plot: "1" | "2" | "3" | "4" | "5",  // legacy, unused
  accent: "#rrggbb",          // tombstone cap color
  plant: "sprout" | "mushroom" | "chipflower",
  emblem: "gradcap" | "idcard" | ...,  // pixel icon carved on the stone, see `Emblem` type
  copy: {
    en: { status, tagline, epitaph, autopsy, stack: string[], signal },
    zh: { status, tagline, epitaph, autopsy, stack: string[], signal },
  },
}
```

Where the grave lands is worked out by `boardLayout`: graves are grouped by the year in `born` (`getProductYear`), sorted by `born`, then filled left to right across however many plot columns currently fit. `lane` and `plot` are still required by the `Product` type but nothing reads them.

`tagline` is the short "what is this" label (e.g. "Sticker camera" / "贴纸相机"). It is the tombstone's main plaque text (the repo name renders as a small subtitle below it), so keep it to a few words; the witty `epitaph` only shows in the dossier panel.

`emblem` picks a 12×12 pixel icon drawn on the stone face and next to the dossier title. Icons are string grids in `emblemArt` (`.`=transparent, `O`=outline, `A`=accent, `B`=accent light, `C`=accent dark, `W`=paper); to add a new one, extend the `Emblem` union and `emblemArt`, coloring derives from the product's `accent` automatically.

## i18n

Two languages: `"en"` (default) and `"zh"`. All user-visible strings live in the `copy` record in `graveyard-experience.tsx`. No external i18n library is used.

## Theming

Two themes: `"night"` (default) and `"day"`. Theme is toggled via a segmented control and stored in `localStorage`. Day-mode overrides are all scoped to `.scene[data-theme="day"]` in the CSS module.

The dossier and the scoreboard share a surface that has to work on both a dark sky and a bright one, so every colour inside them comes from a `--paper-*` token instead of a literal: `--paper` (surface), `--paper-line` (outlines), `--paper-rule` (dividers *inside* the panel, which need to be lighter than the surface at night, not darker), `--paper-drop` / `--paper-sheen` / `--paper-frame`, the chip fills (`--paper-chip`, `--paper-chip-lit`, `--paper-chip-muted` + `-ink`, `--paper-chip-drop`) and the ink (`--paper-ink`, `--paper-ink-soft`, `--paper-body`, `--paper-epitaph`, `--paper-dust-a/b/c`). The base set on `.dossier, .scoreboard` is night — a moonlit slate plaque — and `.scene[data-theme="day"] .dossier, …` swaps in the sunlit parchment set. Anything new inside the panel should reach for a token, otherwise it is only readable in one theme. The saturated chips (green `bury` / `undoBurial`, deep green `status`, cyan `stack` / `consuming`, orange `exhume`) are a second family: `--pop-ink` plus `--pop-cyan` / `--pop-orange` / `--pop-green` / `--pop-green-deep`. They invert with the theme exactly like the panel does — day is a bright fill with near-black ink, night a deep fill with white ink. **The fill and the ink must move together**: white on the day fills lands at 1.2–2.5:1 and is unreadable, so a night fill is only valid if it clears 4.5:1 against white while keeping its hue (the current set runs 4.9–5.7:1). `--paper-chip-muted` (the "buried" state) inverts the same way, into a dark slab with pale ink. Check any new value with a contrast calculator rather than by eye — `.status` and the buttons are 14px bold, which does *not* qualify for the WCAG large-text exemption, so 4.5:1 is the bar, not 3:1.

## Deployment

- Site URL defaults to `https://ai-graveyard.v2ai.org` (override via `NEXT_PUBLIC_SITE_URL`).
- OG image is generated by `app/opengraph-image.tsx`.
- Static export (`output: "export"`) — `pnpm build` emits `out/`, which is the whole deployable. There is no server runtime, so `next start` (the `start` script) does not work here; preview a build with a static server instead.
- Hosted on GitHub Pages. Pushing to `main` runs `.github/workflows/nextjs.yml`: build on the runner, upload `out/` as a Pages artifact, deploy. No secrets needed.
- `.github/workflows/ci.yml` is the separate check pipeline (push + PR): `tsc --noEmit`, `pnpm lint`, `pnpm build`.
- The deploy workflow is GitHub's Next.js sample with three deliberate changes — pnpm instead of the npm/yarn auto-detect, no `static_site_generator: next` on `configure-pages` (it would inject a `basePath` that breaks the custom domain), and a `.next/cache` key hashed from `pnpm-lock.yaml` instead of `package-lock.json`/`yarn.lock`. Keep all three when syncing against upstream.
- The custom domain lives in `public/CNAME`, which the export copies to `out/CNAME`. Deleting it drops the site back to the `github.io` sub-path and breaks every asset URL.
- Repo Settings → Pages must have Source set to "GitHub Actions", otherwise the deploy job fails.
