# 0011 Redesign Word report

Status: done
Priority: high
Subsystem: frontend
Depends on: 0010
Owner: Erik Vullings
Agent: GitHub Copilot

## Context

The current Word export converts a crime script to Markdown and then maps that
text to generic Word paragraphs. This produces a long document with weak
hierarchy, repeated headings, limited metadata, and no report-level navigation.
The export should become a professional, readable report while preserving the
existing textual Markdown export and browser-local privacy model.

## Acceptance Criteria

- The Word export has a cover section with title, summary, classification,
  language, scope, provenance, review status, and export date when available.
- The report includes a concise script overview and a native Word table of
  contents or equivalent navigation.
- Scenes use strong numbered section headings; steps and substeps retain their
  hierarchy and descriptions.
- Conditions, indicators, barriers, partners, and activity references are
  rendered as structured Word content rather than flattened Markdown.
- Headers or footers identify the script, classification, and page number.
- Barriers use the barrier-first presentation: one barrier followed by its
  applicable partners.
- The existing Markdown conversion remains available and compatible.
- Focused tests, GUI typecheck, and production build pass.

## Implementation Notes

- Build native `docx` elements directly from the crime-script model rather than
  adding more special cases to the Markdown parser.
- Keep the report deterministic and entirely browser-local.
- Reuse one report-oriented view model where practical so the later barrier
  visualisation can consume the same normalized labels and scene relationships.
- Prefer restrained, printable TNO/PAX styling over decorative report elements.

## Agent Notes

- 2026-09-23 GitHub Copilot: Started after reviewing the current
  `packages/gui/src/utils/word.ts` pipeline. The first implementation step is to
  introduce a typed report model and a native DOCX renderer while retaining the
  Markdown functions for compatibility.
- 2026-09-23 GitHub Copilot: Completed the typed report model in
  `packages/gui/src/utils/report-model.ts` and the native renderer in
  `packages/gui/src/utils/word-report.ts`. The report now has a classified cover,
  structured metadata, contents, scene overview, scene chapters, numbered
  step/substep tables, conditions, indicators, barrier-first partner tables,
  references, headers, footers, and page numbering. The old Markdown conversion
  remains in `packages/gui/src/utils/word.ts`. Focused tests, GUI typecheck, and
  production build passed.
- 2026-09-23 GitHub Copilot: Final review restored starter license links and
  disclaimers in the native report so the new export retains all provenance
  notices from the legacy Markdown path.
