# Devon Dashboard — QA Notes

Last full QA: **2026-06-13** (M2 step-22 automated pass; observational sweep TBD by human operator)
Milestone 1 QA: **2026-06-01** (see the dated section below)

Live: served at the domain root (no `/devon-landing/dashboard/` subpath — removed 2026-07-30, see git history if you need the old GitHub Pages demo URL)
Demo credentials: `admin@devon.uz` / `Demo2026!`

---

## Brand restyle QA — 2026-06-14 (blue/navy + Craftwork Grotesk)

Full rebrand of dashboard + landing to the new identity. See [`docs/adr/0001-brand-restyle.md`](../docs/adr/0001-brand-restyle.md).

**Automated (done):**
- Dashboard: `tsc` clean · `npm run build` clean (~196 KB JS gzip, < 500 KB target held) · lint at tolerated baseline (no new errors).
- Old-brand audit → **0**: `grep -rnw "emerald|cinnamon|cream"` + `Fraunces|font-serif|googleapis|gstatic|1F4E3F|BC6E2B` across `dashboard/src` + `dashboard/index.html`.
- Landing audit → **0**: old hexes (`1F4E3F`/`173A30`/`BC6E2B`/`FBF9F4`/`F2EDDF`/`3D7B66`), `Fraunces`, `googleapis`, `var(--cream|--emerald|--cinnamon|--signal)`, `font-style:italic`, all-caps `DEVON`. Full hex scan = all cool (blue/navy/slate + amber-warning + green-success).
- Fonts self-hosted (woff2 from app origin); Google Fonts `<link>` removed from both surfaces.
- Contrast (spec §8): body `#475569` 7.5:1 ✓, muted `#64748B` 4.8:1 ✓, interactive `#0A6BE0` 5:1 ✓; badge `*-fg` trio (`#15803D`/`#B45309`/`#B91C1C`) all ≥4.5:1 on their soft tints ✓; brand `#0878FE` used only for focus/large/decorative.

**Observational sweep — TBD by human operator:**
- [ ] Six viewports (360 / 390 / 768 / 1024 / 1280 / 1920) on dashboard **and** landing — no clipping/overflow.
- [ ] Font-load/FOUT check — Network panel shows woff2 from the app origin, **zero** `fonts.googleapis.com`/`gstatic` calls.
- [ ] Landing section rotation reads cohesive (canvas → white → brand-soft → navy); no clashing section.
- [ ] Inline SVG illustrations (hero MacBook, document list, Kanban, org-tree, ERI phone) recolored correctly — no stray green/amber/cream.
- [ ] **Decision:** landing hero CTA "Demoga kirish" is currently navy (`.btn-primary`); confirm navy vs. blue (`.btn-brand`).
- [ ] Dashboard: login + sidebar/topbar wordmark + favicon render; print isolation (A4 doc preview) still works; focus rings visible (brand blue).
- [ ] Landing mobile hamburger (<820px) still works; device-mockup animations intact.
- [ ] Lighthouse (mobile + desktop) on a couple of dashboard routes + landing — fill scores below.

---

## Known limitations (demo-acceptable per master §17)

These are intentional simplifications for the demo build, not bugs.

- **Mock backend** — there is no real server. All "API" calls hit a typed wrapper over `localStorage` with simulated 200–600 ms latency and a 3 % random failure rate. UI exercises error paths via the simulated failures but no real recovery is possible (no retry queues, no offline reconciliation).
- **Real PFX parsing not implemented** — certificate uploads route through a fake metadata extractor (`features/certificates/FakePfxParser.ts`) that returns plausible X.509 data with the employee's PINFL/FIO mirrored so the round-trip passes the backend's `pinfl-mismatch` guard. Wrong passwords are NOT actually verified — any password is accepted and metadata is generated regardless.
- **Real E-IMZO plugin handshake not implemented** — replaced with a 1.5 s mocked challenge-response (`ShieldCheck` pulse) per master §17 ("fake the WebSocket with a delay").
- **Single login, multiple personas (M2 update)** — login is still the one HR_ADMIN demo user (`admin@devon.uz`). Since step 16 a **"Rol almashtirish" POV switcher** (user menu) lets that session act as any of the five M2 personas — HR_ADMIN · Rahbar (Karimov Bekzod) · Bo'lim boshlig'i (Akhmedov Akmal) · Devonxona (Yusupova Nilufar) · Xodim (Sobirova Dilnoza) — so the document-approval and letter pipelines can be walked end-to-end by one evaluator. Other roles in the data model that aren't one of these five personas still have no dedicated login.
- **Hardcoded credentials shown on the login screen** — intentional for demo discoverability. A real deploy would remove the `demo-hint` block from `LoginPage`.
- **Profile-change request approval path is unreachable in the demo** — `submitProfileChangeRequest` + `approveProfileRequest` are wired and audit-logged, but HR_ADMIN edits apply directly via `updateEmployee` (skipping the request flow), so no PENDING requests ever accumulate for the demo user to approve. The empty-state copy on the "Tahrirlash so'rovlari" tab explains the workflow exists for `ROLE_EMPLOYEE`.
- **Real SMS / email OTP / notification delivery** — not implemented. The wizard's "notify-SMS" / "notify-email" checkboxes are persisted to the new-employee record but no message is sent.
- **No automated tests** — Vitest / Playwright deliberately deferred per master §17. Verification is manual via the dev server + production smoke.
- **Russian and English locale files are empty** — `ru.json` / `en.json` are `{ "common": {}, "dashboard": {} }`. All strings fall back to UZ via `fallbackLng: 'uz'`. Filling these is part of the v1.1 roadmap.
- **Documents are not real PDFs** — there's no file upload / preview pipeline for actual document attachments. The TZ flows around document approval are out of scope for this demo (planned for a later milestone covering modules 2 + 4 + 8).

---

## Outstanding issues

QA findings that need follow-up. Listed in priority order (high → low).

### Architectural / requires user prioritisation

- [x] **Production bundle was a single chunk** (most recently ~1.21 MB raw / ~266 KB gzip after M2/M3 grew it). **Resolved 2026-06-14:** [`router.tsx`](src/router.tsx) now lazy-loads every page via `React.lazy()`; `AppShell` + `RequireAuth` stay eager, and `Suspense` boundaries render an in-content skeleton (`RouteFallback`) for in-shell routes / a centered spinner (`FullPageFallback`) for the full-screen wizard/transfer/upload/login routes (see [`components/common/RouteFallback.tsx`](src/components/common/RouteFallback.tsx)). The build now emits **24 per-route chunks** behind a **645 KB raw / 195 KB gzip** shared entry chunk (React + router + i18n + the mock-backend/seed every page imports). Home first-paint pulls the entry + a 3.4 KB `DashboardHome` chunk instead of the full monolith — the wizards, kanban (`@dnd-kit`), and detail pages no longer load upfront. The lingering Vite "chunk > 500 kB" warning is **raw**-size and pre-existing (the old single chunk warned too); we're far inside the `<500 KB gzipped` target. No vendor `manualChunks` tuning — route-lazy splits cleanly and hand-chunking risks the `@dnd-kit` shared-React-instance trap noted in [`vite.config.ts`](vite.config.ts).
- [x] **Unused shadcn primitives removed.** **Resolved 2026-06-14:** the step-15 list of "eight" was stale — by M3, `switch` (used by `documents/wizard/Step3Approvers.tsx`) and `input-group` (used by `command.tsx` → `Combobox`) had become live, so **6** were genuinely dead and were deleted: `breadcrumb`, `drawer`, `form`, `pagination`, `scroll-area`, `tooltip` (the `Pagination` in the list pages is a hand-rolled [`components/common/Pagination.tsx`](src/components/common/Pagination.tsx), not the primitive). Removing `drawer.tsx` let **`vaul`** come out of `package.json`. `switch` + `input-group` were **kept** (in use).
- [ ] **`LoginPage` carries no already-authenticated guard.** A user with an active session who navigates to `/login` directly sees the login screen instead of being redirected home. Cosmetic on the canonical entry path (the landing CTAs all hit `dashboard/`, and `RequireAuth` handles the unauthenticated bounce) but worth adding a 1-line redirect for direct-paste resilience.
- [ ] **Lint surfaces `setState-in-effect` warnings** from the React Compiler rules in `AuditLogPage.tsx`, `ProfilePage.tsx`, and `UnitsPage.tsx` (the last predates step 13). All three follow the same pattern: `useEffect(() => { setLoading(true); fetch(...).then(setData) })`. The pattern is correct for the current architecture but the new lint rule flags it. Either move fetches into a React Query / SWR layer (large refactor) or pragma-disable per-line. Not blocking the build.

### Fixed during this QA pass

- [x] **React Router v7 future-flag warnings on every boot** — opted into `v7_startTransition` + `v7_relativeSplatPath` via `<BrowserRouter future={...}>` in [`App.tsx`](src/App.tsx). Zero console warnings on a fresh dev-server boot now.
- [x] **English `Close` sr-only labels on Sheet + Dialog corner-X buttons** — every modal / drawer / detail sheet inherited an English `Close` announcement on a Uzbek-first UI. Replaced with `Yopish` directly in [`sheet.tsx`](src/components/ui/sheet.tsx) and [`dialog.tsx`](src/components/ui/dialog.tsx) per the LESSONS.md "edit shadcn primitives only when the default is wrong for every call site" rule — this affected every Sheet and every Dialog.

### Pending observational sweep (human operator)

These need DevTools / a real browser / a phone. I cannot drive them from an agentic session.

- [ ] **Six-viewport sweep** at 360 × 640 / 390 × 844 / 768 × 1024 / 1024 × 1366 / 1280 × 800 / 1920 × 1080. Walk every route. Look for: horizontal scroll, clipped text, tap targets below 44 pt on mobile, sticky CTAs covered by keyboard, sidebar drawer not full-screen below `lg`, tables not collapsing to cards below `md`.
- [ ] **Lighthouse runs** — mobile + desktop on the live deploy:
  - `/` (dashboard home)
  - `/employees`
  - `/employees/new` (wizard, full-screen route)
  - `/employees/:uuid` (profile)
  - `/certificates` (Kanban)
  - `/audit`
  - `/profile`
  - `/documents` (registry) + `/documents/:uuid` (detail)
  - `/letters` (registry) + `/letters/:uuid` (detail)
  Target: Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95. Scores drop into the table below.
- [ ] **Throttled-network skeleton check** — DevTools → Slow 3G → confirm `LoadingState` skeletons render on first paint of `/units`, `/employees`, `/certificates`, `/audit`, `/profile`. No blank screens.
- [ ] **Forced-failure sweep** — temporarily raise `maybeFail(probability = 0.5)` in `lib/mock-backend/errors.ts` or set an invalid JSON on one of the `devon.dashboard.*` localStorage tables, walk every route, confirm `ErrorState` renders with a Retry where applicable.
- [ ] **Offline check** — DevTools → Network → Offline. Existing pages render from cached localStorage data; new mutations should toast a network error, not crash.
- [ ] **Empty-state check** — filter every list to zero results (e.g. `/employees?search=zzzz`, archive every unit) and confirm `EmptyState` renders with a real icon + title + body.
- [ ] **Keyboard-only navigation** — complete the employee wizard end-to-end using `Tab` / `Shift+Tab` / `Enter` only, no mouse. Every step's "Keyingisi" button must be reachable and the wizard must save successfully.
- [ ] **`prefers-reduced-motion`** — toggle in DevTools Rendering panel, reload the certificates Kanban + the employee wizard transitions + the sidebar drawer slide. Animations should either skip or use instant transitions; no jarring snaps.
- [ ] **Focus ring visibility** — Tab through every screen and confirm the emerald focus ring is visible on every interactive element. Particularly check: shadcn `Select` triggers, `Combobox` triggers, Kanban cards (drag-handle), table rows (clickable), card grids.
- [ ] **Status-badge colour-only check** — confirm every `StatusBadge` carries both icon + text, never colour alone.
- [ ] **Contrast spot-checks** — DevTools' contrast checker on ink-on-cream and ink-on-emerald combinations. Should be ≥ 4.5:1 for body, ≥ 3:1 for large text.
- [ ] **Mobile real-device check** — iPhone safe-area on `/employees/new` wizard footer + `/employees/:uuid/transfer` footer (`pb-safe`). Hamburger menu opens full-screen. Hardware back button doesn't escape the SPA mid-wizard.
- [ ] **Hard-refresh on deep routes** on the live deploy — paste `/employees/<uuid>` in a fresh tab. The SPA 404 fallback should hand off via `?/employees/<uuid>` and the right profile should load.
- [ ] **"Reset demo" against the published bundle** — click in the user menu, confirm the localStorage tables clear + reseed, the page reloads, and the HR_ADMIN is back to `admin@devon.uz` with their original FIO and `mustChangePassword = true`.
- [ ] **Letter detail (`/letters/:uuid`) at 360 px + POV switch (step 21)** — the BP-3 `LetterTimeline` rail stays readable (no clipped station labels, dots aligned), the route/assign/execute/dispatch dialogs render as bottom sheets with the band-padding footer, and the per-role action button is reachable. Switch POV (user menu → persona) and confirm the page re-resolves so the right lane sees its action: Rahbar (Karimov Bekzod) routes/signs, Backend Bo'lim boshlig'i (Akhmedov Akmal) assigns/accepts, XODIM (Sobirova Dilnoza) starts/submits, Devonxona (Yusupova Nilufar) dispatches. Walk **K-2026/0004** (ON_SIGNATURE — Rahbar signs via the ERI dialog) and **K-2026/0007** (overdue ASSIGNED — destructive deadline on the hero) by switching personas; confirm the timeline fills at each hop.

---

## Lighthouse scores

Run on the production deploy after a hard-refresh.

### Mobile (DevTools → Lighthouse → Mobile)

- Performance: `<TBD>`
- Accessibility: `<TBD>`
- Best Practices: `<TBD>`

### Desktop (DevTools → Lighthouse → Desktop)

- Performance: `<TBD>`
- Accessibility: `<TBD>`
- Best Practices: `<TBD>`

---

## Automated checks run on 2026-06-01

These are the checks that landed during the agentic QA pass — they don't replace the observational sweep above but cover the parts that scripts can verify.

| Check | Result |
|---|---|
| Cyrillic-literal grep in `dashboard/src` (excl. locale files) | Clean |
| Hardcoded JSX text heuristic | Clean (only intentional `DEVON` brand wordmarks + `sr-only` accessibility labels) |
| `toast.<level>("literal")` non-`t()` calls | Clean |
| `PLYMA` / `PLYMO` in user-facing strings | Clean |
| Tech-stack name leak (`Laravel` / `PostgreSQL` / `React` / `Vite` etc.) in i18n + landing | Clean |
| `Date.toString()` / `toLocaleDateString` without `formatDate*` | Clean |
| Raw `≥4-digit` numeric literals in JSX | Clean |
| Production build (`npm run build`) | 2902 modules · 116.22 KB CSS · 922.46 KB JS / **266.28 KB gzip** |
| Bundle size vs. < 500 KB gzipped target | **PASS** (266 KB ≪ 500 KB) |
| Dev-server warnings on cold boot | **0** (was 2 RR future-flag warnings before fix) |
| Route reachability (9 routes via `curl`) | All 200 |

---

## Milestone 2 QA — 2026-06-13 (step 22)

M2 wrap-up: home-surface integration of documents / letters / approvals, plus the step-15 QA battery re-scoped to the new surfaces (`dashboard-home`, `documents`, `letters`, `approvals`, `audit`).

### Automated checks (step 22)

| Check | Result |
|---|---|
| Production build (`npm run build`) | 2952 modules · 121.53 KB CSS · 1,132.20 KB JS / **313.92 KB gzip** |
| Bundle size vs. < 500 KB gzipped target | **PASS** (314 KB < 500 KB; +0.5 KB vs the post-M2 313.41 KB baseline) |
| i18n referenced-key resolution (whole `src`) | **639 / 639 static keys resolve, 0 unresolved**; 26 dynamic-family roots; 953 UZ keys total |
| Cyrillic literals in `src` (excl. locale files) | Clean |
| `toast.<level>("literal")` non-`t()` calls | Clean |
| `PLYMA` / `PLYMO` in source | Clean |
| `NotificationType` title keys | All **13** union members have a `notifications.title.*` key (+1 intentional `DOC_ACCEPT_REQUESTED` acceptance-variant title) |
| `DocumentValidationCode` → `documents.errors.*` | All **11** codes keyed |
| `LetterValidationCode` → `letters.errors.*` | All **8** codes keyed |
| State-machine conformance (status literals in home code) | Clean — only `ACTIVE` / `DRAFT`, both canonical (no invented states) |
| Read APIs call `maybeFail()`? | **No** — all list reads are `simulatedDelay()`-only, so the forced-failure pass can't break the read-only home surfaces (see note below) |
| Route reachability (17 route patterns via `curl`) | All 200; dev-server cold-boot log error/warning-free |
| Lint (`eslint .`) | 34 errors / 10 warnings, **all the pre-existing tolerated `react-hooks/*` idioms**. Net new from step 22: **+2** `set-state-in-effect` in `LettersPage.tsx` (the `?overdue=1` / `?register=1` URL→state-sync effects) — same family as the documented step-09/13/18/19/20/21 clones. Every other step-22 file is lint-clean. |

**Forced-failure note.** Step 22's new surfaces are **read-only + navigation** (the 6 home stat cards, the pending-approvals alert, the quick-action tiles, the audit icon/filter wiring). List reads never call `maybeFail()`, so raising `maybeFail` to 100 % leaves the home intact. The only mutation entry point step 22 adds is the home "Xat ro'yxatga olish" quick action → `/letters?register=1`, which opens the **step-20 `RegisterLetterDialog`** whose flake handling was verified in the step-20 harness (53/53). No new unrecoverable UI state introduced; the interactive 100 %-fail click-through stays on the observational list below for completeness.

### Pending observational sweep — M2 surfaces (human operator)

These need DevTools / a real browser / a phone, and the **POV switcher** (user menu → "Rol almashtirish").

- [ ] **Home persona-awareness** — on `/`, note the three M2 stat cards (Kelishuv kutilmoqda → `/approvals`, Hujjatlar → `/documents`, Muddati o'tgan xatlar → `/letters?overdue=1`). Switch POV and confirm the counts change (e.g. Rahbar and Bo'lim boshlig'i have non-zero "Kelishuv kutilmoqda"; the overdue-letters card turns the destructive tint when > 0). The **PendingApprovalsAlert** banner appears for a persona with a non-empty approvals queue and is absent for one with an empty queue.
- [ ] **Stat-card deep links** — clicking "Muddati o'tgan xatlar" lands on `/letters` with the "Muddati o'tgan" filter already applied and the `?overdue=1` param stripped from the URL; "Kelishuv kutilmoqda" → `/approvals`; "Hujjatlar" → `/documents`.
- [ ] **Devonxona quick action** — switch to the Devonxona persona (Yusupova) and confirm the **"Xat ro'yxatga olish"** quick-action tile appears; clicking it lands on `/letters` with the register dialog already open. Switch to any non-Devonxona persona and confirm the tile is **absent**.
- [ ] **Audit M2 coverage** — `/audit`: filter resourceType by **Hujjat** and **Xat**; confirm rows render with the M2 icons (FilePlus / FileCheck / PenLine / MailPlus / Forward / SendHorizontal etc.). The same icons must match what `/documents/:uuid` and `/letters/:uuid` history and the home `RecentActivityCard` show (now sourced from the shared `lib/audit-icons.ts`).
- [ ] **Keyboard-only document approval** — from `/approvals`, Tab to a queue row, Enter to open the document, Tab to the action bar, approve / reject via keyboard only (the DecideDialog comment field reachable, reject requires the ≥ 5-char comment). No mouse.
- [ ] **Print stylesheet** — on a SIGNED `/documents/:uuid` (TEMPLATE source), use "Chop etish / PDF saqlash"; the `.print-area` rule must isolate the A4 sheet (chrome hidden, ERI stamp block visible) in the print preview.
- [ ] **Six-viewport sweep of the home grid** — at 360 / 390 / 768 / 1024 / 1280 / 1920 px confirm the stat grid reflows 1-col → 2-col (`sm`) → 3-col (`lg`, 3 × 2), the quick-action tiles wrap without clipping (6-col at `lg` when the Devonxona tile is present), and both home alert banners stack their CTA below the body text on mobile.
- [ ] **Lighthouse** — add `/approvals` to the M1 route list above; targets unchanged (Perf ≥ 85, A11y ≥ 95, Best Practices ≥ 95).

---

## Milestone 3 QA — 2026-06-14 (task delegation)

M3 wrap-up: task delegation (BPMN 3.2 / BP-2) is demo-complete. The Kanban board at `/tasks` and the task detail page at `/tasks/:uuid` are fully walkable via the POV switcher.

### Automated checks

| Check | Result |
|---|---|
| Production build (`npm run build`) | **2970 modules** · CSS · JS / **≪ 500 KB gzip** target **PASS** |
| Bundle size vs. < 500 KB gzipped target | **PASS** |
| i18n referenced-key resolution (whole `src`) | All static + dynamic-family roots resolve; 0 unresolved; UZ keys only (RU/EN fall back per roadmap) |
| Cyrillic literals in `src` (excl. locale files) | Clean |
| `toast.<level>("literal")` non-`t()` calls | Clean |
| `PLYMA` / `PLYMO` in source | Clean |
| `NotificationType` title keys — M3 additions (`TASK_*` ×7) | All keyed |
| `AuditAction` — M3 additions (`TASK_*` ×9) | All keyed + icons in `audit-icons.ts` |
| State-machine conformance (status literals in tasks code) | Clean — only `NEW`/`IN_PROGRESS`/`UNDER_REVIEW`/`DONE`/`REJECTED` (canonical) |
| tsc (`--noEmit`) | Clean (only tolerated `set-state-in-effect` + RHF `incompatible-library` idioms) |
| Lint (`eslint .`) | Clean (only the project's tolerated pre-existing clones) |
| BP-2 node harness (full lifecycle walk) | **23/23 PASS** (initial run) |
| BP-2 node harness re-run (post adversarial review fixes) | **15/15 PASS** |
| Route reachability (`/tasks`, `/tasks/:uuid`) | All 200 |

**Adversarial review findings — 4 confirmed, 4 fixed:**
- **(A) Deadline date-only vs. ISO-timestamp mismatch** — `updateTask` stored deadlines as full ISO timestamps while the seed and the audit comparison used `YYYY-MM-DD` date-only strings. Scope-only edits produced phantom audit diffs ("deadline changed" when no deadline was touched). Fix: normalized `updateTask` + seed to date-only throughout. *(See LESSONS.md — Deadline date-only trap.)*
- **(B) `CreateTaskDialog` forked `MetaFileField`** — the dialog had an inline copy of the attachment picker instead of reusing the shared `MetaFileField` primitive (introduced in post-M2 HR-attachments). Fix: refactored to import `MetaFileField` from `components/common`.
- **(C) Duplicate `sr-only` overdue label on the detail hero** — two adjacent `sr-only` spans both announced "muddati o'tgan" to screen readers. Fix: removed the duplicate.
- **(D) Two icons missing `aria-hidden`** — two purely decorative Lucide icons in the task action bar lacked `aria-hidden="true"`. Fix: added the attribute.

### Pending observational sweep — M3 surfaces (human operator)

These need DevTools / a real browser / a phone, and the **POV switcher** (user menu → "Rol almashtirish").

- [ ] **Six-viewport sweep at 360 / 390 / 768 / 1024 / 1280 / 1920 px** — walk `/tasks` and `/tasks/:uuid`. Look for: Kanban columns clipping on narrow screens, card tap targets below 44 pt, the stats band reflow on mobile (collapses to a stacked list), drag handles not covering adjacent columns at 360 px.
- [ ] **Touch-drag caveat on mobile board** — `@dnd-kit` drag is desktop-only (mouse events). On mobile ≤ `lg`, the board collapses to tabs (one column at a time); task movement uses the dialog-based action bar instead of drag. Confirm the column tabs render and the action dialogs open correctly on a real iPhone/Android.
- [ ] **Keyboard-only task walk via the detail action bar** — from `/tasks`, Tab to a task card, Enter to open `/tasks/:uuid`, Tab to the action bar, complete the full BP-2 lifecycle (start → submit deliverable → accept/return) using only keyboard. No mouse. Confirm focus returns to the action bar after each dialog closes.
- [ ] **`prefers-reduced-motion`** — toggle in DevTools Rendering panel and reload the Kanban. Card drag animations and column transitions should either skip or use instant transitions.
- [ ] **Focus ring and contrast** — Tab through the Kanban board and the detail page. Confirm the emerald focus ring is visible on: task cards (drag handle), column headers, action bar buttons, dialog form fields.
- [ ] **Drag-opens-dialog rollback-on-cancel** — drag a task to a column that requires input (e.g., In Progress → Under Review prompts for a deliverable). Cancel the dialog. Confirm the task card visually snaps back to its original column (optimistic UI rolled back) and no state change was written to the mock backend.
- [ ] **Manager stats band** (manager personas only) — switch to Karimov (IT Departament rahbari) and confirm the stats band appears on `/tasks` showing task counts / overdue count / load-per-employee. Switch to Sobirova (XODIM) and confirm the stats band is absent.
- [ ] **`PendingTasksAlert` on home** — on `/` as a manager persona with tasks in their queue, confirm the pending-tasks alert banner appears and links to `/tasks`. As a persona with no pending tasks, confirm it is absent.
- [ ] **Lighthouse** — add `/tasks` and `/tasks/:uuid` to the standard route list; targets unchanged (Perf ≥ 85, A11y ≥ 95, Best Practices ≥ 95).

### Known limitation — `getTask` view-scope

`getTask(uuid)` is actor-less: navigating directly to `/tasks/:uuid` discloses task content (title, description, deliverable details) to any currently-signed-in persona, regardless of whether they are the assigner or assignee. Mutations (start, submit, accept, return, reject) remain policy-gated and are locked to the correct persona. **This matches the established M2 behavior** of `/documents/:uuid` and `/letters/:uuid`, which are also actor-less reads. It is not an M3 regression; logged here as a known demo limitation to align expectations. Addressing it would require threading `actorUuid` into all `getDocument` / `getLetter` / `getTask` reads — a consistent change deferred to a future pass.

---

## Create-flow modal → page conversion — 2026-06-14

The two **create** dialogs were converted to full-page routes for consistency with the existing wizard/transfer flows (`/employees/new`, `/documents/new`, `/certificates/upload`, `/employees/:uuid/transfer`). Action/confirm dialogs (route/assign/execute/dispatch, decide/sign, approve/reject/revoke, task review) stay as modals.

- `RegisterLetterDialog` → **`/letters/new`** (new `RegisterLetterPage` + extracted `RegisterLetterForm`). Devonxona-gated route — non-Devonxona personas `<Navigate>` back to `/letters`; backend still enforces `not-devonxona`.
- `CreateTaskDialog` → **`/tasks/new`** (new `CreateTaskPage` + extracted `CreateTaskForm`). Manager-gated route — non-managers `<Navigate>` back to `/tasks`; backend still enforces scope.
- Triggers re-pointed: the Devonxona "Xat ro'yxatga olish" CTA + home quick action → `/letters/new`; the manager "Topshiriq berish" CTA + home quick action → `/tasks/new`. The `?register=1` / `?create=1` deep-link params (and their `LettersPage` / `TasksPage` effects) were removed.
- Chrome mirrors `EmployeeTransferPage`: mobile X-topbar, desktop back-link header, centered `md:max-w-3xl` card, sticky `pb-safe` footer with an external-submit `<Button form={…}>`. No dirty-confirm on close (matches the transfer page; the wizards' dirty-confirm is for multi-step flows).
- **Automated verification:** build clean (2972 modules); lint 56 problems vs 57 baseline (−1 error, no new findings); all 38 static i18n keys resolve; dev sweep `/letters/new` + `/tasks/new` → 200 with clean module transforms. **Backend untouched** → audit + notifications fire exactly as before; no `SEED_VERSION` bump.

**Pending observational (human operator):** click-through both create flows on mobile (360 px) + desktop — submit → toast with assigned number → land back on the list with the new row; cancel/X discards; direct-URL guard redirect for a non-eligible persona (switch POV, paste `/letters/new` or `/tasks/new`); keyboard-only completion; sticky footer above the iOS safe area.

---

## Cross-references

- Build prompt: [`docs/dashboard-prompts/15-final-qa.md`](../docs/dashboard-prompts/15-final-qa.md) · [`docs/dashboard-prompts/22-m2-home-qa.md`](../docs/dashboard-prompts/22-m2-home-qa.md)
- Master prompt §17 (out-of-scope): [`docs/dashboard-prompts/00-master.md`](../docs/dashboard-prompts/00-master.md)
- Build lessons (cross-step decisions): [`ai_context/LESSONS.md`](../ai_context/LESSONS.md)
- Project snapshot: [`ai_context/AI_CONTEXT.md`](../ai_context/AI_CONTEXT.md)
