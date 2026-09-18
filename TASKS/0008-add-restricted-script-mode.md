# 0008 Add restricted script mode

Status: done
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
- 2026-09-18 Copilot: Implemented the repository portion without reading or producing the private v30 artifact. Added typed public/restricted classification and stable family IDs with legacy/public defaults plus an explicit restricted-normalization option; mode persistence, family fallback/grouping, mode-aware lists/search/case/editor suggestions, mode-inherited manual and LLM creation, globally unique deep-copy counterparts, classification disclosures, classified JSON/Word output, restricted export confirmation, public-model filtering, and restricted-content permalink blocking. Public starter/deployed bundles now carry explicit public metadata. Added 12 focused classification tests; verified the full GUI suite (55 passing, 1 optional private-fixture skip), clean typecheck, production build (existing chunk-size advisory only), `git diff --check`, Impeccable detector, independent review with all findings addressed, and desktop/mobile browser flows with no clipping or console warnings/errors. The private bundle remains owned by the separate worker; status intentionally remains `in_progress`.
- 2026-09-18 Copilot: Final review fixes preserve explicit public classifications during restricted normalization, remap imported family IDs consistently, give independent copies their own families, prefer restricted suggestions in restricted mode, and disclose LLM classification before confirmation. Final repository verification passed 58 tests with one optional private-fixture skip, typecheck, production build, Impeccable detector, desktop/mobile browser checks, `git diff --check`, and independent review with no material findings.
- 2026-09-18 Copilot: Produced the uncommitted private artifact at session storage as `crime-scripts-restricted-v1.0.0.json` (SHA-256 `0be9e12624bb855f190ca1134207744af9596f201038eb92faff8702916b4a2a`) plus a private validation report. It contains 27 scripts: 10 public starters, 10 paired restricted counterparts, and 7 preserved v30 scripts; 2,974 IDs are globally unique and all validation checks passed. No restricted content or private source material was added to git.
- 2026-09-18 Copilot: Addressed all five parent-review findings. Normalization now preserves valid explicit classifications while applying its caller-selected default to absent or invalid values; merge uses one batch-scoped family remap for imported counterpart pairs; starter copies, collision copies, and detached scripts become independent families; restricted suggestion selection resolves across starter and workspace families with restricted content taking precedence; and LLM previews apply and visibly disclose the active classification before confirmation. Added regressions for mixed-default bundles, paired-family collisions, independent-copy grouping, restricted suggestion precedence, and pre-confirmation LLM classification. Browser-verified the restricted LLM preview at desktop and 375×812 with no clipping or console warnings/errors. Full verification: 58 passing tests with 1 optional private-fixture skip, clean typecheck, production build, Impeccable detector, and `git diff --check`. The private artifact was not accessed; status remains `in_progress`.
