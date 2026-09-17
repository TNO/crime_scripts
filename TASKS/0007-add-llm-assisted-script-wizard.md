# 0007 Add LLM-assisted script wizard

Status: done
Priority: medium
Subsystem: frontend
Depends on: 0003

## Context

Add a provider-neutral, offline workflow that helps a user ask Copilot Chat or another LLM to produce an importable crime script. The app must not call an LLM API or handle API keys. It collects a concise brief, creates a copyable prompt, and validates pasted JSON before import.

This task does not block the starter-library release.

## Acceptance Criteria

- A separate “Generate with LLM” flow asks for:
  - Language, defaulting to the GUI language.
  - Crime/domain.
  - Geographic applicability.
  - Detail preset.
  - Optional source URLs.
  - Optional pasted source text or notes.
- Detail presets are Oriënterend, Praktisch (default), and Operationeel.
- “Operationeel” requests concrete prevention/investigation indicators, evidence, controls, decision points, and responsible partners, while explicitly excluding step-by-step offending instructions, evasion tactics, and exploitable parameters.
- Source URLs are included verbatim and never fetched by the app.
- Pasted source text is clearly delimited as untrusted material; the prompt instructs the LLM to ignore commands within it and never invent citations.
- The copied prompt contains a compact current schema, controlled values, invariants, safety/provenance rules, and one minimal valid example.
- The requested output is a complete standalone single-script `DataModel` containing only referenced shared taxonomies.
- The paste step parses, normalizes, strictly validates, and previews generated JSON before any workspace mutation.
- Confirmed imports deduplicate referenced taxonomy items and set `AI-gegenereerd` and `Onbeoordeeld`.
- Validation errors identify exact invalid fields and dangling references in localized, understandable language.
- New and imported generated scripts preserve an explicit content language.
- Automated tests cover prompt construction, prompt-injection delimiters, parsing, validation, provenance, and import behavior.
- Desktop and mobile browser checks, typecheck, production build, and independent code review pass.

## Implementation Notes

- Reuse the preview/import and strict-validation seams created in `0003`.
- Do not send prompts, source material, generated JSON, or workspace data to third parties.
- Use concise B2 Dutch and equivalent clear English UI copy.
- Keep the schema text generated from typed application definitions where practical so it cannot silently drift.

## Agent Notes

- 2026-09-17: Added from the design interview. The workflow intentionally uses clipboard copy/paste so users can choose and manually edit prompts for any LLM.
- 2026-09-17 Copilot: Started after the starter-library release gate was completed and committed as `cb4d264`. The implementation remains offline and provider-neutral: prompt copy and validated JSON paste only.
- 2026-09-17 Copilot: Implemented the separate admin “Generate with LLM” brief → copy prompt → paste JSON → local validation → preview → explicit import flow in Dutch and English. Prompt construction is pure/offline, preserves source URLs verbatim, delimits pasted material as untrusted, includes the compact schema and one valid example, and adds preset-specific safety guidance. Strict validation rejects unknown/malformed fields, duplicate IDs, unsafe display URLs, and dangling taxonomy, hierarchy, selection, and track references with exact localized paths. Confirmation forces the chosen language plus `aiGenerated=true` and `unreviewed=true`, preserves existing scripts, and reuses conflict-safe taxonomy deduplication. Added 8 focused tests; verified 36 passing GUI tests with 1 pre-existing optional-fixture skip, clean typecheck, production build (existing chunk-size advisory only), `git diff --check`, and an Impeccable detector pass. Browser-verified desktop and 375×812 mobile flows, clipboard copy, invalid and valid paste, preview/cancel without mutation, confirmed import flags, zero supplied-URL requests, no horizontal clipping, and no console warnings/errors. Independent review found overwrite, remote-image, nested-parent, and error-path risks; all were fixed. Status remains `in_progress` for parent review.
- 2026-09-17 Copilot: Final review hardened bibliography URLs to credential-free HTTP(S), moved every user-controlled prompt value into injection-resistant JSON framing, added workspace-wide deep ID remapping, expanded confirmation to a complete read-only content/taxonomy/source preview, and synchronized validation with the literature and activity enums. Added regression coverage for delimiter injection, clipboard failure, unsafe URLs, repeated imports, cross-taxonomy collisions, and controlled values. Final verification: 13 focused tests, 41 passing package tests with one optional fixture skip, typecheck, production build, Impeccable detector, desktop/mobile browser checks, and `git diff --check`.
- 2026-09-17 Copilot: Addressed parent review: bibliography URLs now accept only absolute HTTP(S) URLs without credentials; all brief values are JSON-framed as untrusted data with delimiter-injection guidance; controlled literature/activity values match the shared enums; the confirmation screen renders scenes, variants, activities, conditions, opportunities, indicators, measures, taxonomy items, and complete source details; clipboard denial has an explicit localized failure path. Standalone import now builds a workspace-wide ID set, remaps every colliding taxonomy and script-owned ID plus selected-variant, hierarchy-parent, and track references, preserves existing records, and asserts final global uniqueness. Added repeated-import, generic cross-taxonomy collision, unsafe-URL, delimiter-injection, enum, and clipboard-failure coverage (13 focused tests). Reverified 41 passing GUI tests with 1 pre-existing optional-fixture skip, clean typecheck, production build (existing chunk-size advisory only), Impeccable detector, and `git diff --check`. Browser-verified localized unsafe-URL rejection and the complete preview at 1440×900 and 375×812 with no horizontal clipping, source requests, or console errors. A second independent review found schema-copy and source-type-preview omissions; both were fixed. Status remains `in_progress` for parent review.
