# 0003 Build starter-library infrastructure

Status: done
Priority: high
Subsystem: frontend
Depends on: 0002

## Context

A fresh browser currently receives an empty `DataModel`, leaving users without roles, products, partners, locations, or example scripts. First-time users should explicitly choose between a Dutch starter library and an empty workspace. Existing users must not be interrupted or have data changed automatically.

The public deployment will load a fixed same-origin Dutch JSON file. A protected deployment can replace that file without changing application code. The starter model is copied once into local storage; future updates are always explicit.

Starter-derived scripts and generated scripts need lightweight provenance. The permanent label is `AI-gegenereerd`; editors and administrators may remove the separate `Onbeoordeeld` label after expert review. The script bibliography remains the only location for source material and gains an optional `Used for` note.

Indicators and prevention measures remain owned by their activity-group variant. Their editors should offer a unified SearchSelect over original items found in the starter bundle and workspace. Accepting a suggestion creates an independent local copy with internal origin metadata. Copies are excluded from suggestion indexing unless explicitly detached with “Save as new suggestion.”

## Acceptance Criteria

- First launch shows a required localized choice before persisting a model; Dutch defaults to the starter library, while English offers an empty workspace or switching to Dutch.
- A dedicated onboarding-choice key distinguishes first launch from an intentionally empty model. Clearing a model does not reopen onboarding; a full local reset does.
- Existing users are not interrupted and retain their current data.
- `/starter-bundles/nl.json` is fetched, normalized, structurally validated, and copied into local storage only after confirmation.
- Starter-load failures show localized Retry and Start empty actions rather than silently succeeding.
- The side navigation exposes `Importeer starterbibliotheek` to all roles. Empty workspaces load after confirmation; non-empty workspaces use preview/import.
- Import conflicts default to skip and support replace or import-as-copy without silently overwriting local edits.
- `DataModel` supports embedded starter-bundle metadata: stable ID, version, locale, title, and publication date.
- `CrimeScript` stores content language, permanent AI provenance, starter origin metadata, and a removable unreviewed flag.
- New scripts default their editable language from the GUI locale.
- Source entries support an optional usage note.
- Viewer, editor, Word export, and JSON export show or preserve provenance, review state, language, sources, and usage notes.
- Indicator and measure SearchSelect suggestions combine bundle/workspace originals without visible origin grouping, filter by script language by default, optionally show other languages, and warn on close duplicates.
- Selecting a suggestion creates a local copy. Measure copies include category and partners. Origin metadata is retained internally and inherited source information cannot disappear through an ordinary edit.
- Users can explicitly save an edited sourced copy as a new suggestion.
- Existing schema-version-2 and legacy models normalize without data loss; the new schema is covered by migration tests.

## Implementation Notes

- Keep the app offline after loading the same-origin starter JSON.
- Use a fixed path rather than a runtime manifest.
- Keep starter scripts fully editable. “Detach from starter script” creates a new script ID and clears starter-origin metadata only; AI provenance and bibliography remain.
- Do not introduce global mutable indicators, measures, or acts.
- Runtime validation covers structure and reference integrity. Public editorial rules belong to `0006`.
- Use B2 Dutch copy: concise active sentences and explained specialist terminology.
- Suggested technical areas: `packages/gui/src/models/data-model.ts`, `model-normalization.ts`, `model-merge.ts`, `services/meiosis.ts`, onboarding/layout, sidenav, editor/viewer, Word/JSON export, and tests.

## Agent Notes

- 2026-09-17: Created from the completed design interview. The current model initializes from `{ crimeScripts: [] }`, stores `CSS_MODEL` in local storage, and embeds indicators/measures per act. Existing `search_select` prior art is used for roles, attributes, transports, and locations.
- 2026-09-17 Copilot: Implemented schema 3, strict starter validation and the fixed Dutch fixture, first-run choice and existing-user migration, explicit conflict-safe imports, script/source provenance across editor/viewer/Word/JSON, suggestion copy/detach helpers and language-aware indicator/measure SearchSelect flows. Added 6 focused starter tests and updated migration expectations. Verified 12 passing GUI tests (1 optional legacy-fixture test skipped), `npm run typecheck`, and `npm run build`. Status intentionally remains `in_progress` for parent review.
- 2026-09-17 Copilot: Completed parent review and hardened deep copy imports, taxonomy remapping, hierarchy validation, and distinct workspace/bundle suggestion provenance. Consolidated copied-item provenance under `derivedFrom`. Browser-verified required onboarding, explicit empty-workspace persistence, and the permanent starter-import dialog; the deployed Dutch fixture remains intentionally content-free until `0004`. Verified all 16 GUI tests including the supplied v30 model, typecheck, production build, `git diff --check`, and an Impeccable detector pass over changed UI files.
