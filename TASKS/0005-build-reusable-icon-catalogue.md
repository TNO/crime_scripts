# 0005 Build reusable icon catalogue

Status: open
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
