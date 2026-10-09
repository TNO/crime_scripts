# 0025 Apply generator retro findings

Status: done
Priority: high
Subsystem: script-generator + crime-script-generator skill
Depends on: 0009, 0024
Owner: Erik Vullings
Agent: Copilot

## Context

A restricted, document-driven script authoring run (ILT-IOD afval crime script, starter
bundle `packages/gui/public/starter-bundles/nl.json`) exposed friction points in the CLI
and skill docs; each cost extra status/build cycles or forced reverse-engineering of
`packages/script-generator/src/` internals.

Resolved upstream by 98cbb52 (do not re-do): stale-dist detection now works via the
`>=0.1.1` version gate, and chunked authoring exists as `init-candidate`, `add-taxonomy`,
`add-scene`, `add-activity`.

## Acceptance Criteria

### 1. Leak-checker error names the offending phrase (code)

`restricted-query-leak` in `packages/script-generator/src/operations.ts`
(`findRestrictedResearchLeak`, error raised near the `$.entries[${leakingEntry}]` path)
returns only the entry index, so authors must reimplement the tokenizer to diagnose it.

- Change `findRestrictedResearchLeak` to also return the matched sensitive phrase
  (and whether it came from `query` or `url`).
- Include the phrase, truncated to a safe display length, in the issue message, e.g.
  `... copied from restricted local material (matched phrase: "waste crime" in query)`.
  The message is local CLI output only; this does not leak anything new.
- Update all callers (`status`/`build` paths in operations.ts) and `test/privacy.test.ts`
  so tests assert the matched phrase for at least: a 3-word n-gram, a capitalized-name
  phrase, an alphanumeric identifier, and a material filename.

### 2. Document taxonomy-match mechanics (docs)

The `taxonomy-match-candidate` warning (trigram character similarity ≥ 0.65, computed in
`packages/script-generator/src/build.ts` against bundle labels AND previously declared new
labels in list order) is undocumented; recovering from it required reading `build.ts` and
guessing label renames.

- Add a short paragraph to `REFERENCE.md` (near the `prepare`/`context.json` guidance):
  labels too similar to an existing taxonomy item trigger the warning; resolve by either
  setting the explicit existing `id` from `prepared/context.json` (including opaque ids
  like `nl-starter:cast:category:7`) when the concept is the same, or choosing a
  materially distinct label when it is not.
- State that the check uses character trigrams, so substring-style labels
  ("Verwerker" vs "Eindverwerker") collide.

### 3. Document the local PDF fallback (docs)

`REFERENCE.md` routes DOCX/PDF conversion through `docling` or the web converter, but for
restricted PDFs the working path was `pdftotext -layout` (poppler) into a staging `.md`
passed via `--materials`.

- In `REFERENCE.md` "Fail safely" (Missing Docling bullet): name `pdftotext -layout` as
  the local fallback for text-native PDFs and reiterate: never upload restricted files to
  a conversion service.

### 4. Clarify evidence linkage in the standalone output (docs)

The built standalone JSON carries sources only as `script.literature` entries; per-node
claims stay in workspace `evidence.json`, with mappings in
`reports/build-report.json` (`keyToId`, `sourceKeyToLiteratureId`). Authors expected
per-activity evidence in the standalone file.

- Add one sentence to `REFERENCE.md` (build paragraph) stating where evidence linkage
  lives after `build`.

## Verification

- `pnpm --filter @crime-script/generator test` and `typecheck` pass.
- `pnpm --filter @crime-script/generator build:binary` succeeds and
  `./packages/script-generator/dist/crime-script-generator --version` prints >= 0.1.1.
- Manual smoke: in a scratch workspace with `sourceSensitivity: restricted`, a
  research-log entry whose query contains a 3-word phrase from the prepared material
  produces a `restricted-query-leak` error naming that phrase.
- Skill docs render sanely; keep `SKILL.md` frontmatter description unchanged.

## Constraints

- Do not modify starter bundles or GUI model code; scope is
  `packages/script-generator/src/operations.ts`, its tests, and the skill docs
  (`SKILL.md`, `REFERENCE.md`).
- No new CLI subcommands; docs + the message improvement in #1 only.
- Keep `test/privacy.test.ts` assertions on non-leaking entries unchanged in spirit:
  they must still prove queries naming brief-approved text pass.

## Agent Notes

- Fast-forwarded this worktree to `origin/main` at 1f9abfc. Implementing leak-match diagnostics and scoped reference updates; preserving existing chunking.
- `packages/script-generator/src/operations.ts` now returns the matching normalized phrase and query/URL field, with an 80-character display cap in status/build errors. `test/privacy.test.ts` covers copied three-word phrases, names, identifiers, filenames, non-leaks, status/build and truncation. `.agents/skills/crime-script-generator/REFERENCE.md` explains trigram taxonomy matches, local PDF fallback, and the evidence/report mapping; no starter bundle or GUI model change. The full generator suite, typecheck and compiled binary passed.
