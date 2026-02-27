# PLAN_SUMMARY.md

## Steps
1) Discover current layout ownership, breakpoints, and test/build commands; capture baseline mobile/desktop screenshots.  
2) Consolidate responsive orchestration in an `AppShell` (header/sidebar/content) with safe `min-w-0` defaults.  
3) Add compact mobile header (hamburger, project/status, activity log) with 44px touch targets.  
4) Convert sidebar to a fixed drawer on mobile with backdrop + close + ESC + scroll lock.  
5) Make board mobile-friendly via horizontal scroll + snap (one column per page) plus a column-switch affordance.  
6) Fix card overflow: wrapping/truncation for text and badges; eliminate accidental horizontal growth.  
7) Implement mobile activity log as bottom sheet (or full-screen overlay) with consistent dismiss behavior.  
8) Add/extend Vitest coverage and optional `/api/health`; run smoke checks including manual mobile viewport verification.

## Key risks + mitigations
- Risk: Desktop regressions from shared components → Mitigation: guard styles by breakpoint, add targeted desktop DOM/snapshot checks.  
- Risk: Scroll-snap conflicts with existing drag/drop or column sizing → Mitigation: enable snap only on mobile container and keep desktop widths untouched.  
- Risk: Drawer/sheet accessibility (focus, ESC, scroll bleed) → Mitigation: implement ESC + scroll lock + focus return to trigger; test open/close paths.  
- Risk: Badge wrapping causes height jumps → Mitigation: define consistent spacing, max widths, and line-clamp/truncate rules.

## QA validation
- Mobile 390×844: no sidebar overlap/clipping; drawer open/close via hamburger/backdrop/close/ESC; board columns readable and switchable; cards never overflow; activity log usable and dismissible.  
- Desktop ≥1024px: v3 layout visually unchanged; sidebar remains fixed; multi-column board unchanged; activity log behavior unchanged.  
- CI: `pnpm test` passes; `pnpm build` passes; optional `curl /api/health` succeeds; optional Playwright screenshots (if added) produced.
