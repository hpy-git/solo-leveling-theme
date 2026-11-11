# SOLO LEVELING — SHADOW GATE HOTSPOT
## Implementation Plan & Concept Proposal

**Status:** Awaiting approval
**Baseline reference:** `one-piece-theme` (Grand Line Hotspot)
**Target folder:** `solo-leveling-theme/`
**Theme concept:** Solo Leveling — "The System", Gates, Hunters, Ranks, Monarch energy

---

## 1. Objective

Build a complete MikroTik hotspot template with a **Solo Leveling-inspired "System" interface** that:

- Feels cinematic and game-like without copying copyrighted character art, logos, or music.
- Uses a **brand-new layout** — not a recolored One Piece poster.
- Is **mobile-first** and comfortable from 320px phones to wide desktops.
- Stays **fast on low-end phones** through a 3-tier performance system.
- Preserves **100% of MikroTik hotspot variables, CHAP authentication, trial, status, logout, advert, redirect, and XML flows**.
- Works **offline from the router** — no external fonts, CDNs, or remote images. (Critical: a captive portal usually has no internet before login.)

---

## 2. Concept Direction

### 2.1 Visual language

The UI is presented as a **holographic System window** floating inside a dark Gate chamber.

| Motif | Implementation |
|---|---|
| System notification window | Sharp-cornered panel, 1px cyan border, corner brackets, title bar, scanline sheen |
| Gate / dungeon portal | Layered SVG rings, counter-rotating, radial mana glow |
| Hunter ranks | E · D · C · B · A · S badges used for plans and status |
| Mana / shadow energy | Cyan-to-violet gradients, soft glows, drifting rune particles |
| "ARISE" | Primary action button with beveled edges and energy sweep |
| System messages | Monospace labels, uppercase tracking, blinking cursor, `//` separators |
| Danger / warning | Monarch red panel, glitch shake (motion-safe) |

**Originality:** All artwork is original vector art inspired by the *system-window / gate / shadow* aesthetic. No traced characters, official logos, screenshots, or OST audio.

### 2.2 Palette (dark-first)

| Token | Value | Use |
|---|---|---|
| `--void` | `#04060C` | Page base |
| `--panel` | `#0A1220` | System windows |
| `--ink` | `#E8F6FF` | Primary text |
| `--muted` | `#8FB4CC` | Secondary text |
| `--cyan` | `#35E0FF` | System accent / focus |
| `--blue` | `#2B7FFF` | Mana midtone |
| `--violet` | `#8B5CF6` | Monarch accent |
| `--gold` | `#F5C451` | S-Rank / rewards |
| `--red` | `#FF3B4E` | Errors / leave gate |
| `--green` | `#34F5A0` | Success / online |

Optional **"Awakened" light mode**: ice-white panels, deep navy text, teal accent — readable outdoors in daylight. Dark remains the default.

### 2.3 Typography (zero downloads)

- **Display / labels:** `system-ui, "Segoe UI", Roboto, sans-serif` — uppercase, tight tracking.
- **Data / system text:** `ui-monospace, "Cascadia Mono", Consolas, monospace`.
- **Body:** system UI stack.
- No web fonts → instant text paint, no FOUT, no extra requests.

### 2.4 Geometry

- Panels: 2–6px radius, **cut corners** via `clip-path`, double border (outer glow + inner hairline).
- Buttons: beveled rectangular, not pills — game-UI feel.
- Tabs: segmented control with animated energy underline.
- Touch targets: **minimum 48px**, inputs **16px** (prevents iOS zoom).

---

## 3. New Layout

### 3.1 Desktop (≥ 900px) — asymmetric split

```
┌────────────────────────────────────────────────────────────────────┐
│  ◈ SHADOW GATE          HUNTER NETWORK          ● SYSTEM ONLINE   │
├───────────────────────────────────┬────────────────────────────────┤
│                                   │  ┌──────────────────────────┐  │
│      [ rotating gate rings ]      │  │ SYSTEM // AUTHENTICATION │  │
│                                   │  │ ──────────────────────── │  │
│      S H A D O W                  │  │ NOTIFICATION             │  │
│      G A T E                      │  │ Welcome, Hunter.         │  │
│                                   │  │ The System has detected  │  │
│      [ hunter silhouette ]        │  │ your presence.           │  │
│                                   │  │                          │  │
│                                   │  │ [GATE KEY] [HUNTER ID]   │  │
│                                   │  │ [ access code field ]    │  │
│                                   │  │                          │  │
│                                   │  │ [      ARISE      ]      │  │
│                                   │  │ [QUEST BOARD][DAILY]     │  │
│                                   │  └──────────────────────────┘  │
│  GATE RANK: A // MANA: 98% // AWAITING HUNTER                     │
└───────────────────────────────────┴────────────────────────────────┘
```

- Left side is a cinematic Gate scene with original SVG rings, runes, and a hooded-hunter silhouette.
- Right side is the floating System window (max ~440px), vertically centered.
- Bottom ticker shows hostname/status text (no fake dynamic data).
- Rich tier adds parallax and layered depth; lite tier renders a static gradient + rings.

### 3.2 Mobile (< 900px) — single column, thumb-first

```
┌──────────────────────────┐
│ ◈ SHADOW GATE   ● ONLINE │
│                          │
│   [ gate glow backdrop ] │
│                          │
│ ┌──────────────────────┐ │
│ │ SYSTEM // AUTH       │ │
│ │ Welcome, Hunter.     │ │
│ │ [GATE KEY][HUNTER ID]│ │
│ │ [ access code      ] │ │
│ │ [     ARISE        ] │ │
│ │ [QUEST] [DAILY]      │ │
│ └──────────────────────┘ │
│  SYSTEM v2.0 · SFX ⏻     │
└──────────────────────────┘
```

- Gate scene becomes a full-bleed background behind a semi-opaque panel.
- Everything essential fits above the fold on a 360×640 viewport.
- Dialogs become **bottom sheets** that slide up; max height `88dvh`, scroll inside.
- Safe-area insets (`env(safe-area-inset-*)`) and `100dvh` fallbacks.
- Landscape/short screens: page scrolls naturally; scene simplifies.

---

## 4. Page-by-Page Design

| Page | Theme name | Content |
|---|---|---|
| `login.html` | **GATE ACCESS** | Dual auth (Gate Key / Hunter ID), plans, trial, buy guide |
| `status.html` | **STATUS WINDOW** | Session stats as a hunter stat sheet; leave-gate logout |
| `success.html` | **LEVEL UP** | Level-up ring burst, "You have entered the Gate", check status |
| `logout.html` | **GATE CLOSED** | Final session log, re-enter gate |
| `error.html` | **SYSTEM WARNING** | Red warning panel with `$(error)` |
| `alogin.html` | **SYSTEM ONLINE** | Connection confirmed; never self-navigates (captive-sheet safe) |
| `radvert.html` | **SPONSOR SIGNAL** | Sponsor message, preserved advert popup logic |
| `redirect.html` | **TRANSFER** | Animated transfer bar, preserved meta redirect |
| `rlogin.html` | *(unchanged)* | WISPr XML redirect, preserved exactly |
| `xml/*` | *(copied)* | WISPr access gateway XML |

### 4.1 Login page details

- **Tabs:** `GATE KEY` (voucher, single access code) and `HUNTER ID` (username + password, with show/hide password).
- **Primary CTA:** `ARISE` with sublabel `CONNECT TO THE NETWORK`.
- **Secondary:** `QUEST BOARD` (plans), `DAILY QUEST` (1-hour trial, conditional on `$(if trial == 'yes')`).
- **System log line:** `aria-live` status text: "Awaiting authentication…" → "Verifying gate key…" → "Gate open."
- **Error:** red System Warning block with `$(error)`.
- **Footer:** `SYSTEM v2.0 // mTikOps`, SFX toggle, optional theme toggle.
- **Dialogs:**
  1. **Quest Board** — Prepaid/Postpaid tabs, plan cards with E–S rank badges, duration, devices, speed, price.
  2. **System Archive** — filterable plan briefing + comparison table.
  3. **Merchant Guild** — hotline, copy button, call/text, 3-step guide.
  4. **Daily Quest** — trial confirmation, `T-$(mac-esc)` preserved.

### 4.2 Plan → rank mapping (editable)

| Plan | Rank | Duration | Devices | Price |
|---|---|---|---|---|
| Day pass | E | 1 day | 1 | ₱10 |
| Week pass | D | 7 days | 1 | ₱70 |
| Combo pass | C | 14 days | 1 | ₱140 |
| Month pass | B | 30 days | 1 | ₱280 |
| Connect Plus | A | 30 days | 2 | ₱300 |
| Connect Pro | A | 30 days | 4 | ₱500 |
| Connect Max | S | 30 days | 6 | ₱700 |
| Connect Prime | S | 30 days | 10 | ₱800 |

> Names, prices, speeds, and hotline remain easy to edit in one place. Baseline values are shown as placeholders.

---

## 5. Interactive Features

### Core (all tiers, cheap)
- Tab switching with animated indicator + keyboard arrows/Home/End.
- Native `<dialog>` sheets with backdrop click, Escape, focus management, non-native fallback.
- Form validation with shake + `aria-invalid`.
- Password reveal toggle.
- Copy hotline with "COPIED" feedback.
- Submit state: button becomes `CONNECTING…` with rune spinner, form disabled.
- `aria-live` system log announcements.

### Balanced tier
- Panel materialize entrance (opacity + translate + clip).
- Slow gate-ring rotation, scan sweep, button energy shine.
- Ripple on pointer press.
- Bottom-sheet slide-up.

### Rich tier (desktop, capable GPU)
- Pointer parallax/tilt on the System window.
- Layered gate depth, floating runes, sparkles.
- Emblem glow pulse.
- Subtle holographic sheen following the pointer.

### Optional extras (approval needed)
- **Monarch Mode easter egg:** tap the sigil 5× → violet theme + shadow particles + alternate SFX. Persisted.
- **Awakened light mode:** manual toggle for bright outdoor use.
- **Mana Flow ambient drone:** Web Audio-generated low drone, default **on** (starts on first interaction), zero download, balanced/rich only.
- **Tawk.to chat:** deferred/optional (see risks).

---

## 6. Performance Strategy

### 6.1 Three tiers (`data-perf`)

| Tier | Detection | Experience |
|---|---|---|
| **lite** | reduced motion, save-data, 2G, ≤2GB RAM, ≤2 cores, no `dataset` | Static gradients, no loops, no blur, no tilt, no ripple, no glow filters, instant transitions |
| **balanced** (default) | Most phones / mid-range | CSS transform loops, entrance animation, shine, ripple |
| **rich** | ≥768px, fine pointer, backdrop-filter, ≥6GB RAM, ≥6 cores | Parallax, layered runes, sparkles, holographic sheen |

### 6.2 Budgets

| Asset | Budget |
|---|---|
| CSS (all 5 files, uncompressed) | < 55 KB |
| JS (4 files) | < 32 KB |
| SVG art (all) | < 90 KB |
| Any single image | < 40 KB |
| External requests | **0** |
| Web fonts | **0** |
| Canvas / WebGL | **0** |
| First meaningful paint (router LAN) | < 500 ms typical |
| First meaningful paint (throttled 3G) | < 1.5 s |

### 6.3 Optimizations
- Animate only `transform` / `opacity` / `filter` (filter only on rich).
- `contain: strict` on the scene; `content-visibility` where safe.
- Pause all loops when the tab is hidden (`visibilitychange`).
- No layout thrash: reads batched in `requestAnimationFrame`.
- `will-change` only on rich-tier moving layers.
- SVG instead of bitmaps → tiny, crisp on all DPRs.
- Defer all JS; only `perf-tier.js` runs in `<head>`.
- No third-party scripts on the pre-auth login page.

### 6.4 Low-end fallback guarantees
- Login form is fully usable with **JS disabled** (standard POST).
- CHAP works with the existing `md5.js`.
- Dialogs fall back to `<dialog open>` + class toggling.
- Sound is optional and never blocks interaction.
- No animation gates input; entrance animations never delay typing.

---

## 7. Accessibility

- WCAG AA contrast in dark and light modes.
- Visible cyan focus ring on every interactive element.
- Semantic landmarks: `main`, `section`, `header`, `footer`, `form`, `dialog`.
- ARIA tabs, tabpanels, alerts, labels, `aria-live` status.
- Skip link to the sign-in form.
- 48px touch targets; 16px inputs.
- `prefers-reduced-motion`, `prefers-reduced-transparency`, `forced-colors` support.
- No flashing above 3 Hz; scanline is static/low-opacity.
- Password reveal has `aria-pressed` and an accessible label.
- All decorative SVG marked `aria-hidden="true"`.

---

## 8. MikroTik Compatibility (must preserve)

### Variables
`$(chap-id)`, `$(chap-challenge)`, `$(link-login-only)`, `$(link-login)`, `$(link-orig)`, `$(link-orig-esc)`, `$(link-redirect)`, `$(link-redirect-esc)`, `$(link-status)`, `$(link-logout)`, `$(link-advert)`, `$(hostname)`, `$(username)`, `$(ip)`, `$(mac)`, `$(mac-esc)`, `$(uptime)`, `$(bytes-in-nice)`, `$(bytes-out-nice)`, `$(session-time-left)`, `$(remain-bytes-total-nice)`, `$(error)`, `$(refresh-timeout)`, `$(refresh-timeout-secs)`, `$(location-id)`, `$(location-name)`.

### Conditional blocks
`$(if chap-id)`, `$(if error)`, `$(if trial == 'yes')`, `$(if login-by == 'mac')`, `$(if login-by != 'mac')`, `$(if login-by-mac != 'yes')`, `$(if session-time-left)`, `$(if remain-bytes-total)`, `$(if refresh-timeout)`, `$(if advert-pending == 'yes')`, `$(if blocked == 'yes')`, `$(if http-status == 302)`, `$(if http-header == "Location")`.

### Flows
- CHAP hidden `sendin` form + `hexMD5(chapId + password + chapChallenge)`.
- Voucher mode: password = access code.
- Member mode: username + password.
- Trial: `$(link-login-only)?dst=$(link-orig-esc)&username=T-$(mac-esc)`.
- Status refresh meta, logout popup (`hotspot_status` / `hotspot_logout`), advert popup (`hotspot_advert`).
- Post-login: `alogin.html` never navigates itself. Its "Check Status" button targets `$(link-status)` and is only retargeted when RouterOS supplies `$(link-redirect-esc)`. No timer, no user-agent sniffing and no raw `$(link-redirect)` fallback — this mirrors the working `one-piece-theme` reference exactly (identical inline script and identical variable set). The captive-network sheet closes on a successful login and reopens the requested page on its own; a page-initiated redirect there triggers iOS's "network connection was lost" error. `success.html` is a standalone page and stays manual.
- `api.json`, `errors.txt`, `errors-en.txt`, `xml/` copied and preserved.

### Audit
A final grep audit will confirm every `$(` variable from the baseline still exists with the same meaning and no accidental substitution.

---

## 9. Asset Plan (all original, all local)

### SVG art to create
| Asset | Purpose |
|---|---|
| `img/system-sigil.svg` | Brand emblem: winged rune/dagger monogram |
| `img/gate-portal.svg` | Layered dungeon gate rings |
| `img/gate-runes.svg` | Rotating rune ring |
| `img/rune-grid.svg` | Subtle background grid/hex texture |
| `img/shadow-hunter.svg` | Hooded hunter silhouette (original) |
| `img/rank-badge.svg` | E–S rank badge sprite |
| `img/corner-frame.svg` | Optional corner bracket ornament |
| `img/favicon.svg` + `.ico` | Browser icon |
| `concept/concept-board.svg` | Approval concept board (palette, wireframes, buttons, ranks) |

### Audio
- **Default:** System navigation taps use the local `audio/tap.mp3` sample, decoded once into an `AudioBuffer` and pitch-shifted per interaction. Confirm, error, level-up, and gate cues layer original Web Audio synthesis on top; if the sample is missing, every cue falls back to synthesis.
- **Optional:** "Mana Flow" ambient track (`audio/theme.mp3`), default on and starts on the first interaction.
- `audio/tap.mp3` is a local asset supplied by the site owner; confirm redistribution rights before deploying. No external OST streaming.

### Not included
- No external image URLs.
- No Google Fonts.
- No analytics/tracking on the login page.

---

## 10. File Structure

```
solo-leveling-theme/
├── css/
│   ├── tokens.css          # palette, ranks, type, geometry
│   ├── base.css            # reset, shell, gate scene, typography
│   ├── components.css      # system window, tabs, fields, buttons, rank cards, sheets, stats
│   ├── motion.css          # keyframes + tier animations
│   └── perf.css            # lite/balanced/rich downgrades
├── js/
│   ├── perf-tier.js        # head-time tier detection
│   ├── theme-motion.js     # tabs, sheets, ripple, tilt, reveal, copy, submit
│   ├── theme-sounds.js     # Web Audio SFX + optional ambient
│   └── md5.js              # CHAP (copied from baseline)
├── img/
│   ├── system-sigil.svg
│   ├── gate-portal.svg
│   ├── gate-runes.svg
│   ├── rune-grid.svg
│   ├── shadow-hunter.svg
│   ├── rank-badge.svg
│   ├── favicon.svg
│   └── favicon.ico
├── concept/
│   └── concept-board.svg   # visual concept for approval
├── audio/                  # optional; empty by default
├── xml/                    # copied WISPr XML files
├── login.html
├── status.html
├── success.html
├── logout.html
├── error.html
├── alogin.html
├── radvert.html
├── redirect.html
├── rlogin.html
├── api.json
├── errors.txt
├── errors-en.txt
├── md5.js
├── README.md
└── IMPLEMENTATION_PLAN.md
```

---

## 11. Implementation Phases

| Phase | Work | Output |
|---|---|---|
| 1 | Design tokens, base shell, gate scene, SVG art | `tokens.css`, `base.css`, `img/*` |
| 2 | Core components, motion tiers, perf downgrades | `components.css`, `motion.css`, `perf.css` |
| 3 | JS interaction layer + audio + tier detection | `js/*` |
| 4 | `login.html` (most complex) + 4 dialogs | login flow |
| 5 | Secondary pages (status, success, logout, error, alogin, radvert, redirect) | 7 pages |
| 6 | MikroTik assets copied + variable audit | `xml/`, `api.json`, `errors*`, `md5.js` |
| 7 | QA: responsive, performance, accessibility, browser tests | test report |

---

## 12. QA / Test Checklist

### Functional
- [ ] Voucher login → CHAP → success
- [ ] Hunter ID login → CHAP → success
- [ ] Trial login (`T-$(mac-esc)`)
- [ ] Status variables render correctly
- [ ] Logout clears session and shows summary
- [ ] Error page shows `$(error)`
- [ ] Advert popup and redirect flow
- [ ] All dialogs open/close (button, backdrop, Escape)
- [ ] Tabs and filters work with keyboard
- [ ] Copy hotline
- [ ] SFX toggle persists
- [ ] Password reveal works
- [ ] JS-disabled login still posts

### Responsive
- [ ] 320 / 360 / 390 / 414 / 768 / 1024 / 1440 widths
- [ ] Portrait and landscape phones
- [ ] No horizontal scroll
- [ ] No input zoom on iOS
- [ ] Bottom sheets usable one-handed
- [ ] Safe-area insets on notched devices

### Performance
- [ ] `lite` on throttled CPU (4×/6×) with no loops
- [ ] `balanced` on typical phone
- [ ] `rich` on desktop
- [ ] Reduced motion disables all loops
- [ ] Reduced transparency removes blur
- [ ] Forced colors keeps borders/text visible
- [ ] Animations pause when tab hidden
- [ ] No external network requests on login

### Compatibility
- [ ] Chrome / Edge / Firefox / Safari
- [ ] iOS Safari captive portal
- [ ] Android Chrome captive portal
- [ ] MikroTik variable audit passes
- [ ] CHAP works

---

## 13. Risks & Decisions

| Risk | Mitigation |
|---|---|
| Tawk.to chat adds a third-party request and cannot work pre-auth | Remove from `login.html`; optionally defer on `status/success` only |
| Copyrighted Solo Leveling art/audio | Original vector art + synthesized SFX only |
| Heavy glow/blur on low-end phones | Tier system + no backdrop-filter on lite/balanced |
| Bottom sheets on very short screens | `max-height: 88dvh`, internal scroll, page fallback |
| RouterOS parses `$(` sequences | No `$(` in CSS/JS; final audit |
| Long usernames/errors overflow | `overflow-wrap: anywhere`, min-width: 0 |
| Motion sickness | `prefers-reduced-motion` + lite tier |

---

## 14. Approval Questions

1. **Approve the plan?**
2. **Brand name:** `SHADOW GATE` (recommended), `SYSTEM ONLINE`, or keep `mTikOps` only?
3. **Chat widget:** remove from login (recommended), or keep it?
4. **Optional extras:** Awakened light mode, Monarch Mode easter egg, Mana Flow ambient audio?
5. **Contact/plans:** reuse the baseline hotline (`09626606116`) and prices as placeholders, or provide new values?

---

*Plan prepared for approval. No theme files will be built until approved.*
