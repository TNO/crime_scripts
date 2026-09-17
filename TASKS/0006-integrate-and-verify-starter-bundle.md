# 0006 Integrate and verify starter bundle

Status: done
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
- 2026-09-17 Copilot: Started after the icon catalogue was completed and committed as `352bb48`. This task verifies the public release without tightening runtime validation for protected replacement bundles.
- 2026-09-17 Copilot: Completed the release integration pass without inspecting the private v30 fixture. Added explicit CC BY 4.0 attribution/disclaimer metadata to the public bundle while keeping generic runtime validation compatible with protected bundles; surfaced that metadata in the viewer and Word output; fixed blank English first launch, persisted GUI-language changes independently of Dutch script content, removed missing-category `undefined` output, localized source authorship, made clear use a fresh model and return home, and made conflict review/footer responsive on mobile. Added 3 focused release tests for protected-bundle compatibility, complete conflict-safe import, and all ten standalone script exports. Browser-verified Dutch and English first run (including the non-dismissible modal and switch-to-Dutch action), start empty with all 93 built-in icons available, empty/non-empty complete import with skip/replace/copy, schema-2 existing-user migration, clear/restore/full reset, GUI/script language independence, viewer disclosures/sources/icons, valid single-script JSON, and a generated 12.8 kB Word blob at 1440×900 and 375×812 with no clipping or console warnings/errors. Independent review found and prompted fixes for shared default-model mutation and mobile import overflow. Verified 3/3 task-focused tests, full GUI suite (27 passing, 1 pre-existing optional-fixture skip), clean typecheck, GUI and workspace production builds (only the existing bundle-size advisory), deployed-copy equality, no Impeccable detector findings, and `git diff --check`.
- 2026-09-17 Copilot: Final review added version-aware starter metadata matching so retained scripts cannot inherit attribution or licenses from a newer skipped bundle, included the explicit attribution in the web viewer, and removed mismatched metadata from standalone exports. Final verification: 28 passing tests with one optional fixture skip, typecheck, production build, Impeccable detector, and `git diff --check`.
