# 0026 Readable source usage in literature panel

Status: done
Priority: medium
Subsystem: frontend
Depends on: none

## Context

The literature/source panel shows `Gebruikt voor: <usedFor>` for every source. For
generator-built scripts this string is a flat, comma-separated list of raw workspace node
keys (`import, a-imp-01, ..., m-exp-04`) — for the primary rapport source it runs past the
"more" cutoff with ~80 opaque keys. Reviewers cannot tell which activity an entry refers
to without the workspace's `candidate.json`. The build already knows every label; the
GUI has the full node tree loaded; the key list is the worst of both worlds.

## Acceptance Criteria

- `usedFor` is rendered in reviewer-readable form: stage grouping with human labels
  (e.g. `Import — 4 activiteiten, 3 indicatoren, 3 maatregelen` or per-node activity
  events truncated), not raw keys alone.
- Resolution is robust: unknown keys still render as raw keys (never silently dropped).
- Word report export (`word.ts`, `word-report.ts`) shows the same readable form.
- Focused GUI tests for the resolver pass; existing `learning-mode`/viewer tests unaffected.

## Implementation Notes

- Written at build time: `packages/script-generator/src/build.ts` (~line 434-448) joins
  node keys into `usedFor`. The standalone keeps `keyToId` + `sourceKeyToLiteratureId`
  in `reports/build-report.json`, but the GUI only sees the model, not that report.
- Render sites (read `literature[].usedFor` verbatim):
  - `packages/gui/src/components/ui/reference.ts:29` (literature panel)
  - `packages/gui/src/components/ui/llm_script_wizard.ts:293`
  - `packages/gui/src/utils/word.ts:205`, `packages/gui/src/utils/word-report.ts:621`
  - editor field: `packages/gui/src/models/forms.ts:64`
- Model fields: `packages/crime-script-core/src/data-model.ts:114` and
  `llm-script.ts` (`usedFor?: string`, optionalString — free-form is allowed).
- Preferred approach: resolve at render time in the GUI — for each key, find the node in
  the loaded script whose `id` ends with `:${key}` (stages: `scene:<key>`, activities:
  `activity:<key>`, indicators `indicator:<key>` — check the actual id segments in
  `crime-script-viewer.ts`) and display its `label`; fall back to the raw key. A shared
  helper (e.g. `gui/src/utils/literature-usage.ts`) used by all four render sites keeps
  one source of truth.
- Alternative (worse): change `build.ts` to emit labels into `usedFor` — bloats the
  standalone with duplicated text and breaks when reviewers relabel nodes.
- Hand-authored `usedFor` values (free text from the editor textarea) must pass through
  unchanged when they don't look like key lists.

## Agent Notes

- Started after fast-forward to `a3e3bcf`. Resolve at GUI render time so labels reflect reviewer edits, preserve unknown keys and hand-authored free text; share resolution across viewer, preview, and both Word paths.
- `packages/gui/src/utils/literature-usage.ts` summarizes exact generated keys by scene with localized counts; unmatched, punctuated, and retained-ID keys remain visible as raw keys rather than being misattributed. Integrated in `reference.ts`, `llm_script_wizard.ts`, `word.ts`, and `word-report.ts`; `test/literature-usage.test.ts` covers long lists, revised labels, repeated scene labels, free text and slug collisions. The GUI-only model lacks the generator's `keyToId` report, so retained IDs without generated key suffixes cannot be resolved safely at render time; preserve the raw key until an explicit mapping can be carried into the model.
- GUI typecheck, full suite (153 passed, 1 skipped), and production build passed. `/code-review` found slug collision, punctuation and retained-ID caveats; collision/punctuation were fixed and tested, with the retained-ID fallback documented above. The production build rewrote tracked `docs/` artifacts, which were restored to their clean pre-build state.
