# 0008 Add restricted script mode

Status: in_progress
Priority: high
Subsystem: frontend
Depends on: 0007

## Context

Restricted RIEC, police, and screened professional users need deeper descriptions of how criminals operate. This material must not be added to the public starter bundle or committed to the public repository. The GUI remains a local-first public application without authentication, so classification is an advisory workflow and disclosure safeguard rather than an access-control boundary.

The independently managed deliverable is one complete JSON workspace named `crime-scripts-restricted-v1.0.0.json`. It starts from the private v30 workspace, adds the ten public starter scripts plus separate restricted counterparts, and remains outside git. Restricted content may describe documented tactics, roles, sequencing, tools, concealment, failure points, and adaptations at investigative case-detail level. It must exclude live targets, personal data, credentials, exploit code, exact drug recipes or ratios, precise bypass settings, and immediately executable instructions.

## Acceptance Criteria

- `CrimeScript` supports `classification: 'public' | 'restricted'` and a stable `scriptFamilyId`.
- Legacy and public starter scripts normalize to `public`; scripts in the private v30 source normalize to `restricted` when assembling the private bundle.
- Public and restricted counterparts have separate script and owned-content IDs but share a `scriptFamilyId`.
- A prominent global mode defaults to public on a fresh browser and is remembered locally after an explicit change.
- Public mode lists public scripts only. Restricted mode prefers the restricted counterpart in each family and falls back to public when no restricted counterpart exists, so paired scripts appear once.
- Script creation inherits the active mode and shows the resulting classification before confirmation.
- A “Create restricted version” action deep-copies a public script, assigns collision-free IDs, preserves the family ID, marks it restricted, and is unavailable when a restricted counterpart already exists.
- Editors clearly display the current mode and script classification.
- JSON and Word exports show classified filenames/headers and require explicit confirmation for restricted content.
- Permanent-link/cloud sharing is disabled whenever the exported model contains restricted content.
- Public-mode model exports structurally omit restricted scripts rather than hiding them only in the UI.
- Import and merge preserve classifications, family links, taxonomy references, legacy compatibility, and global ID uniqueness.
- The public starter bundle and repository contain no restricted script content.
- A local, uncommitted `crime-scripts-restricted-v1.0.0.json` is produced from the private v30 input, containing its scripts as restricted plus the ten public starters and ten separately linked restricted counterparts.
- Restricted counterparts target 6–10 evidence-supported scenes with roles, actions, prerequisites, observable traces, decision/failure points, and interventions. Sources combine reputable public evidence with sanitized internal knowledge only.
- Tests cover normalization, mode filtering/fallback, counterpart creation, import/merge, public export filtering, restricted export safeguards, filenames/headers, and public-bundle separation.
- Desktop/mobile browser checks, typecheck, full tests, production build, design detector, and independent code review pass.

## Implementation Notes

- Only `public` and `restricted` are in scope; the earlier `confidential` idea was dropped.
- Keep paired scripts separate rather than introducing field-level classification or restricted overrides.
- Use `scriptFamilyId`, never labels, to pair scripts.
- Default the GUI to public mode even when restricted scripts are present.
- Classification warnings are advisory because JSON and local browser state can be edited outside the application.
- Restricted JSON is private output. Do not stage or commit it, derived content, or private source material.
- Private source: `/Users/erik.vullings/Downloads/2026-09-17_v030_crime_scripts.json`.

## Agent Notes

- 2026-09-18 Copilot: Created from the completed design interview. Agreed on separate paired scripts, a global public/restricted mode with public fallback, explicit classification and family IDs, mode-inherited creation, deep-copy counterpart creation, export warnings, permanent-link blocking, and a private semantic-versioned v1 bundle.
