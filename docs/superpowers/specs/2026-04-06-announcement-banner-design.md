# Announcement Banner — Design Spec

**Date:** 2026-04-06  
**Status:** Approved  

---

## Overview

A fixed, site-wide announcement banner that admins can enable, configure, and dismiss at will. Intended for maintenance windows, outage notices, policy updates, and other time-sensitive communications. Employees can dismiss it for their current browser session; the admin controls whether it exists at all.

---

## Requirements

| # | Requirement |
|---|---|
| 1 | Banner is fixed at the very top of the browser window, always visible while scrolling |
| 2 | Admin can enable/disable it and edit the message and type from `/admin/config` |
| 3 | Four types: Info (blue), Warning (amber), Critical (red), Success (green) |
| 4 | Employees can dismiss it for their session (gone on refresh unless admin still has it on) |
| 5 | Banner appears on all pages including the login page |
| 6 | Only `super_admin` can save banner settings; `hr_admin` can view but not save |

---

## Data Storage

Reuses the existing `company_settings` table (`CompanySetting` model). Three rows:

| Key | Values | Default |
|---|---|---|
| `banner.enabled` | `"true"` / `"false"` | `"false"` |
| `banner.type` | `"info"` / `"warning"` / `"critical"` / `"success"` | `"info"` |
| `banner.message` | Any string, max 300 chars | `""` |

No schema migration required.

---

## Backend

### New endpoint

```
GET /api/admin/banner
```

- **Auth:** Public (no token required) — needed so the banner can show on the login page during maintenance.
- **Returns:**
  ```json
  { "enabled": false, "type": "info", "message": "" }
  ```
- Reads the three `banner.*` keys from `company_settings`. If a key is missing, returns the safe default.

### Existing endpoint (no changes)

```
POST /api/admin/settings
```

Already handles upsert of any `CompanySetting` row. The admin UI calls this three times (once per key) on Save. Role check (`super_admin` only) already enforced.

---

## Frontend

### New files

| File | Purpose |
|---|---|
| `src/contexts/BannerContext.tsx` | Fetches `/admin/banner`, exposes state + dismiss |
| `src/components/layout/AnnouncementBanner.tsx` | Renders the fixed bar |

### `BannerContext`

```ts
interface BannerState {
  enabled: boolean;
  type: "info" | "warning" | "critical" | "success";
  message: string;
  dismissed: boolean;
  bannerHeight: number; // 40 when visible, 0 otherwise
  dismiss: () => void;
}
```

- Fetches on mount. Silent failure (treats as disabled) if the endpoint is unavailable.
- `dismissed` is `useState(false)` — session-only, resets on page reload.
- `bannerHeight` = `40` when `enabled && !dismissed && message.trim() !== ""`, else `0`.

### `AnnouncementBanner`

- `position: fixed; top: 0; left: 0; right: 0; z-index: 9999; height: 40px`
- Returns `null` when `bannerHeight === 0`.
- Left side: type icon + message text (truncated with ellipsis if too long).
- Right side: × dismiss button.
- Type → color mapping:

  | Type | Background | Text | Border | Icon |
  |---|---|---|---|---|
  | `info` | `bg-blue-100` | `text-blue-800` | `border-blue-200` | ℹ |
  | `warning` | `bg-amber-100` | `text-amber-800` | `border-amber-200` | ⚠ |
  | `critical` | `bg-red-100` | `text-red-800` | `border-red-200` | ✕ (alert) |
  | `success` | `bg-green-100` | `text-green-800` | `border-green-200` | ✓ |

### Layout integration

`src/app/layout.tsx` (root layout):
1. Wrap everything in `<BannerProvider>`.
2. Render `<AnnouncementBanner />` as the first child of `<body>`.
3. Set `--banner-h` CSS custom property on `<body>` via an inline style driven by `bannerHeight`.

`DashboardLayout`:
- The outer wrapper div gets `paddingTop: bannerHeight` from `useBanner()`.

`Sidebar` (fixed positioned):
- Gets `top: var(--banner-h, 0px)` so it sits below the banner.

`Header` (sticky):
- Gets `top: var(--banner-h, 0px)` so it sticks below the banner, not behind it.

---

## Admin UI

Location: top of `/admin/config` page, above the module groups, in its own card section titled **"System Banner"**.

### Controls

1. **Enable toggle** — identical style to the module toggles. Label: "Show banner to all users".
2. **Type selector** — four pill/chip buttons in a row, each colored with its respective theme. Selected state has a solid border + background tint.
3. **Message textarea** — 3 rows, `maxLength={300}`, live character counter (`e.g. "47 / 300"`).
4. **Live preview** — a non-fixed, full-width replica of the banner rendered inside the form, updates as the admin types. Shown only when enabled is on and message is non-empty.
5. **Save button** — blue, primary style. Disabled + spinner while saving. On success shows the existing green toast pattern. On error shows an alert.

### Role behaviour

- `super_admin`: all controls interactive.
- `hr_admin`: section is visible but Save button is `disabled` with tooltip "Only Super Admins can change the banner."
- Other roles: section not rendered.

---

## Error handling

| Scenario | Behaviour |
|---|---|
| `GET /admin/banner` fails / times out | Banner treated as disabled; no error shown to users |
| `POST /admin/settings` fails | Toast error shown to admin; previous state preserved |
| Message is empty when enabled | Save still allowed; banner not rendered (bannerHeight = 0) |

---

## Out of scope

- Scheduling (start/end time for auto-enable) — can be added later
- Per-department targeting
- Rich text / HTML in messages
- Persistent dismissal (localStorage) — session-only per user decision
