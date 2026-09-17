# 0005 Build reusable icon catalogue

Status: done
Priority: medium
Subsystem: frontend
Depends on: 0004

## Context

Starter scripts and every scene need a coherent monochrome icon. Icons must remain available even when a user starts with an empty workspace, so they belong to an application-level catalogue rather than the starter data. User-uploaded images remain embedded in scripts and therefore travel with single-script JSON exports.

Use the icon requirements authored in `0004`. The existing visual language uses simple black, solid-fill SVG artwork around a 100×100 view box.

## Acceptance Criteria

- Every starter script and scene references a valid stable icon key.
- Semantically equivalent scenes may reuse the same icon across scripts.
- The built-in icon picker exposes the complete catalogue whether the workspace started empty or from the starter bundle.
- Existing icon references and user-uploaded images remain compatible.
- Icons are SVG, visually consistent with the current monochrome solid-fill style, and optimized with SVGO.
- Noun Project assets are limited to Public Domain or CC BY 3.0 icons.
- Each third-party icon records title, creator, source URL, original license, and any SVGO modification in machine-readable attribution metadata and a human-readable notice.
- Third-party assets retain their original license and are not represented as covered by the starter data’s CC BY 4.0 license.
- Single-script export embeds user-uploaded images but may retain built-in icon keys because the catalogue ships with every app deployment.
- Tests detect missing icon keys and incomplete required attribution.

## Implementation Notes

- Do not rely on a paid royalty-free subscription license to grant downstream GitHub users rights to raw SVG files.
- Prefer Public Domain assets where suitable; otherwise preserve CC BY 3.0 attribution.
- Store optimized SVGs separately from starter JSON.
- The user normally uses SVGO and expects thorough SVG optimization.

## Agent Notes

- 2026-09-17: Created after reviewing the current `packages/gui/src/assets/icons/` collection and The Noun Project terms effective 2026-09-02. The current catalogue is a numeric `ICONS` enum with embedded data URIs; this task should preserve old references while adding stable extensible keys.
- 2026-09-17 Copilot: Started after `0004` was completed and committed as `4a1dbfa`. Use its icon-requirements manifest as the authoritative coverage list.
- 2026-09-17 Copilot: Added an application-level catalogue of 34 original MIT-licensed, monochrome 100×100 SVGs and mapped all 70 starter script/scene requirements to stable `builtin:*` keys (19 keys are reused, avoiding requirement-specific duplication). Added machine-readable provenance, a human notice, SVGO 4.0.0 configuration/workflow, built-in picker and rendering support for scripts/scenes, and a pure single-script export seam that preserves catalogue keys and embedded uploads. Legacy numeric values 1–14 remain unchanged. Verified 6 focused catalogue/export tests, the full GUI suite (24 passing, 1 pre-existing optional-fixture skip), clean typecheck, production build with matching deployed docs copies, a second SVGO pass reporting 0% changes for all 34 files, and `git diff --check`. No third-party artwork was introduced; no licensing uncertainty remains. Status intentionally remains `in_progress` for parent review.
- 2026-09-17 Copilot: Follow-up semantic audit replaced broad starter mappings with 59 requirement-specific scene icons and revised all 10 script icons, so 69 distinct keys now cover the 70 authoritative targets. The sole retained reuse is `protected-person-response` for the genuinely equivalent protected-victim multi-agency responses in labour and sexual exploitation. Every mapped icon now depicts the requirement's defining subjects; `hazardous-waste.svg` uses non-zero barrel separator rectangles. The catalogue retains the 24 earlier general-purpose keys for compatibility (93 SVGs total). Strengthened tests to reject empty mappings and duplicate requirement/target IDs, require exact starter target-set equality before key validation, and verify deployed copies. Reverified 6 focused tests, full GUI tests (24 passing, 1 pre-existing optional-fixture skip), clean typecheck, production build, a hash-identical second SVGO pass across all 93 SVGs, and `git diff --check`.
- 2026-09-17 Copilot: Browser-verified the application-level catalogue in an intentionally empty workspace: metadata reported 93 icons, every `/icons/*.svg` request succeeded, and no console errors occurred. An Impeccable detector pass over the changed UI files reported no findings.
