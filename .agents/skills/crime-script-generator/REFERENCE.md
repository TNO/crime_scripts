# Crime Script Generator Reference

## CLI availability

Prefer a user-configured `$CRIME_SCRIPT_GENERATOR` executable or `crime-script-generator` on
`PATH`. In a source checkout, reuse `packages/script-generator/dist/crime-script-generator` when it
exists. Otherwise build it with:

```sh
pnpm --filter @crime-script/generator build:binary
```

That command requires Bun. If Bun is unavailable, use the repository's Node-dependent development
launcher:

```sh
packages/script-generator/bin/crime-script-generator --version
```

Restore missing repository dependencies with its declared package manager. Never download a
binary or install a runtime or package manager without user approval. Always verify that the
resolved CLI reports a compatible `>=0.1.0 <0.2.0` version before creating a workspace.

## Workspace lifecycle

`init` creates a versioned `brief.yaml` and empty evidence/research files. Its default workspace is
`<bundle-basename>-work/<script-slug>/` beside the input bundle. Restricted workspaces must not be
committed or published.

`prepare` normalizes the bundle without changing it and writes:

- `prepared/normalized-bundle.json`
- `prepared/context.json`
- `prepared/materials/*.md`
- `state.json`

Markdown, text, and CSV files are read directly. DOCX, XLSX, and text-native PDF require a local
`docling` executable. If Docling is unavailable, DOCX and text-native PDF can be converted locally
at <https://erikvullings.github.io/word-convert/>; export XLSX to CSV or install Docling. Unsupported,
hidden, temporary, executable, and symlink files are ignored. Recursion is opt-in.

Re-running `prepare` preserves authored files. Changed local sources mark linked evidence
`needs-review`; removed sources become `orphaned`.

`status` is safe to run repeatedly. With `--json`, it returns a stable object with `ok`, `issues`,
`nextAction`, and `artifacts`.

Machine-readable command envelopes use `schemaVersion`, `command`, `success`, and either `data` or
`error`. Exit codes are stable: `0` success, `3` invalid or incomplete authored data, `4` stale
prepared state, `5` an existing output, `6` document conversion failure, and `7` missing explicit
confirmation. A blocked `status` returns its normal data envelope and exits `3`.

`build` validates the current prepared hashes, complete research, evidence coverage, taxonomy,
hierarchy, safety declarations, duplicate content, ID ownership, and update deletions. It writes
`<script-slug>.standalone.json` without changing the bundle. Scene and
activity-group icons are discarded during normalization; only script icons remain.

Use `--confirm-classification-change` or `--confirm-deletions` only after showing the exact change
to the user and receiving approval.

Review the standalone file in the crime-script GUI. The reviewer may edit content, assign reviewers,
and change review status.

`merge` compares GUI edits with the last build. For each evidence-bearing changed node, decide
whether the previous evidence still applies. If not, add replacement source keys or accept an
`unsubstantiated-after-human-edit` marker. Non-interactive runs use a versioned review-answer JSON
file. Merge refuses stale target scripts and writes:

`<bundle-basename>-<script-slug>.json`

The original bundle remains unchanged.

## Research protocol

1. Read the brief and prepared context.
2. Extract generic concepts without copying restricted phrases.
3. Search broad official/international sources for the process structure.
4. Search legal, supervisory, law-enforcement, scientific, and professional sources for roles,
   observable traces, indicators, decision points, and defensible barriers.
5. Search explicitly for contradictions, alternative explanations, and missing stakeholder
   perspectives.
6. Record every visited URL and decision in `research-log.json`.
7. Store short supporting passages, locators, access dates, provenance, reliability rationale, and
   hashes in `evidence.json`. Do not copy complete web works.
8. Link evidence claims to candidate node keys.
9. Stop only when all core factual nodes have adequate evidence and both closing searches are done.

Age alone does not invalidate a source. Report its age. A source already marked invalid remains
blocking until replaced or explicitly repaired.

## Source hierarchy

Prefer, in order:

1. Legislation, court decisions, treaty bodies, and official government guidance.
2. Police, prosecution, inspectorate, regulator, and international-organization publications.
3. Peer-reviewed research and recognized professional standards.
4. High-quality journalism for named-case context only.
5. Encyclopedias for explicitly secondary historical context only.

Anonymous, SEO, social-media, model-memory, and unattributed claims do not count as evidence.

## Candidate quality bar

Every stage must explain its role in the overall process. Each activity needs:

- a concrete event;
- observable traces;
- a decision point where relevant;
- only applicable role, attribute, and transport keys.

Observable traces and decision points must add information rather than repeat or quote the activity
event. The generated description may not contain the normalized activity label.

Each indicator needs an observation, corroboration method, plausible benign alternatives, and
relevance. Each measure needs a partner or owner, decision moment, intended effect, category, and
evidence. Avoid repeated boilerplate; exact and strong near-duplicate descriptions block builds.

Restricted classification allows more concrete categories, dependencies, handoffs, evidence, and
intervention windows. It never permits operational instructions, exact exploitable parameters,
vulnerable security details, or evasion advice.

## Update rules

Set `existingScriptId` to the target script ID. Keep `scriptId` identical. Reuse `existingId` for
every retained stage, variant, activity, indicator, measure, and condition. Declare intended
removals in `script.removeIds`; omission alone never deletes an existing node.

The target script hash is guarded from `prepare` through `merge`. Unrelated bundle changes are
allowed. If the target changed, re-prepare and reconcile rather than forcing the merge.

## Fail safely

- Missing web tools: stop or use only sufficient available sources.
- Ambiguous taxonomy or materially conflicting evidence: ask the user.
- Missing Docling: use the documented local fallback; never upload restricted files to a service.
- Stale brief, bundle, or target: run `prepare` and reconcile changes.
- Existing output: choose a new path; use overwrite only with user approval.
- Invalid or unsupported source: replace it, do not downgrade or silently ignore it.
