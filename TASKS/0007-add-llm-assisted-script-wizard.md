# 0007 Add LLM-assisted script wizard

Status: open
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
