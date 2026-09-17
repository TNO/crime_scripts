# 0006 Integrate and verify starter bundle

Status: open
Priority: high
Subsystem: frontend
Depends on: 0005

## Context

Integrate the reviewed Dutch content from `0004` and icon catalogue from `0005` into the starter-library infrastructure from `0003`, then validate the complete public release as one user-facing workflow.

## Acceptance Criteria

- The deployed `/starter-bundles/nl.json` contains all ten reviewed Dutch scripts, shared taxonomies, metadata, provenance, and source bibliographies.
- First-run Dutch onboarding loads the complete starter library in one action.
- Starting empty still exposes every built-in public icon.
- Existing users can import the starter library at any time without being interrupted on upgrade.
- Non-empty import preview clearly lists incoming scripts and defaults conflicts to skip, with replace and import-as-copy options.
- Public editorial validation requires exactly the intended ten scripts, CC BY 4.0 bundle metadata, AI/unreviewed disclosures, sources, valid stable IDs, valid taxonomy/icon references, and no prohibited operational detail.
- Runtime validation remains compatible with protected replacement bundles and does not impose public-only editorial constraints.
- The complete first-run, start-empty, restore-empty, restore-nonempty, language-switch, provenance, source, icon, Word export, and single-script JSON export flows work on desktop and mobile.
- Existing version-2 and legacy imports continue to work.
- Typecheck, tests, production build, design detector, and independent code review pass.

## Implementation Notes

- Keep the public bundle content independent from private/protected bundles.
- GUI language and script language are independent. Switching the GUI does not translate or hide Dutch scripts.
- This task is the release gate for tasks `0003`–`0005`.

## Agent Notes

- 2026-09-17: Created as the final integration gate so infrastructure, researched content, and licensed assets can be reviewed independently before release.
