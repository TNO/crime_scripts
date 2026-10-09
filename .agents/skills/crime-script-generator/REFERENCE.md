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
resolved CLI reports a compatible `>=0.1.1 <0.2.0` version before creating a workspace. Older
0.1.0 binaries do not have scene-chunk commands; if present, build or use the source launcher.

## Workspace lifecycle

`init` creates a versioned `brief.yaml` and empty evidence/research files. Its default workspace is
`<bundle-basename>-work/<script-slug>/` beside the input bundle. Restricted workspaces must not be
committed or published.

`prepare` normalizes the bundle without changing it and writes:

- `prepared/normalized-bundle.json`
- `prepared/context.json`
- `prepared/materials/*.md`
- `state.json`

Use the bundle as read-only taxonomy context: `prepared/context.json` contains its roles (`cast`),
attributes, products, transports, locations, geographic locations, partners, and (for updates)
the target script. Match existing keys/IDs before adding taxonomy items. Built-in script icon
keys and labels come from `crime-script-generator icons --json`; the generator does not import
arbitrary image files. Avoid feeding `prepared/normalized-bundle.json` or entire long documents
to a local model when the relevant context/passages suffice.

`--materials` accepts one supported file or a directory. A single PDF does not need a staging
folder. `prepare` creates the Markdown inside its own workspace and records source hashes;
do not create a second Markdown folder to link evidence. Local evidence uses the prepared
source's relative `sourcePath` as `filename` and its `sourceHash` or `markdownHash`.

Markdown, text, and CSV files are read directly. DOCX, XLSX, and text-native PDF require a local
`docling` executable. If Docling is unavailable, DOCX and text-native PDF can be converted locally
at <https://erikvullings.github.io/word-convert/>; export XLSX to CSV or install Docling. Unsupported,
hidden, temporary, executable, and symlink files are ignored. Recursion is opt-in.

Re-running `prepare` preserves authored files. Changed local sources mark linked evidence
`needs-review`; removed sources become `orphaned`.

`status` is safe to run repeatedly. With `--json`, it returns a stable object with `ok`, `issues`,
`nextAction`, and `artifacts`.

### Scene-sized authoring

Create a short header JSON using the `candidate.schema.json` fields, with `script.stages: []`,
explicit `safetyReview`, and taxonomy arrays. The empty stages array is accepted only during
chunked drafting; the completed candidate needs at least one scene. Do not assert that the
safety review passed until checked.
After `prepare`, run:

```sh
crime-script-generator init-candidate --workspace "$WORKSPACE" --file header.json
crime-script-generator add-taxonomy --workspace "$WORKSPACE" --taxonomy cast --file role-1.json
crime-script-generator add-scene --workspace "$WORKSPACE" --file scene-1.json
crime-script-generator add-activity --workspace "$WORKSPACE" --scene-key intake --variant-key review --file activity-2.json
crime-script-generator add-source --workspace "$WORKSPACE" --file source-1.json
crime-script-generator add-scene-claims --workspace "$WORKSPACE" --scene-key intake --file claims-1.json
crime-script-generator status --workspace "$WORKSPACE" --json
```

`role-1.json` is one taxonomy item; use `--taxonomy` with `cast`, `attributes`, `products`,
`transports`, `locations`, `geoLocations`, or `partners`. `scene-1.json` is one scene object
containing at least one M.O. variant and activity;
`activity-2.json` is one activity object; `source-1.json` is one source object; `claims-1.json`
is an array of claims for that scene only. Use their existing schema fields and keys; `stages`
remains the on-disk field for scenes in candidate JSON. The CLI validates each chunk before
atomically updating `candidate.json` or `evidence.json`; it rejects duplicate node/source keys,
unknown scene/variant keys, cross-scene claims, and claims referencing unknown sources.
For a deliberate revision of an existing scene, source, or scene's claims, rerun that command
with `--replace`; activity additions require a fresh key. Full evidence coverage, source
provenance, taxonomy, and safety checks still happen at `status` and `build`. Keep fragments in
the temporary workspace; do not put sensitive content in command-line arguments.

Machine-readable command envelopes use `schemaVersion`, `command`, `success`, and either `data` or
`error`. Exit codes are stable: `0` success, `3` invalid or incomplete authored data, `4` stale
prepared state, `5` an existing output, `6` document conversion failure, and `7` missing explicit
confirmation. A blocked `status` returns its normal data envelope and exits `3`.

`build` validates the current prepared hashes, complete research, evidence coverage, taxonomy,
hierarchy, safety declarations, duplicate content, ID ownership, and update deletions. It writes
`<script-slug>.standalone.json` without changing the bundle. Choose an output in the temporary
workspace so no file is placed beside or merged into the input bundle. The output is one
GUI-importable JSON model containing one script and its needed taxonomy entries, not a modified
copy of the source bundle. Scene and activity-group icons are discarded during normalization;
only script icons remain.

Use `--confirm-classification-change` or `--confirm-deletions` only after showing the exact change
to the user and receiving approval.

Review the standalone file in the crime-script GUI. The reviewer may edit content, assign reviewers,
and change review status.

After rebuilding a reviewed draft, re-import the new standalone file in every open browser context.
The GUI stores its imported model locally; reloading a tab does not reread the file, and other
browser tabs or profiles may retain the earlier version. Check the rendered label and description
in each active review view before reporting that it has been refreshed.

If the user requested separate handoff copies, compare them with the prior workspace outputs
before replacing them. Preserve restricted file permissions and never overwrite independent
reviewer changes. Updating a disk file does not update an already imported browser model.

The default handoff ends at the standalone file. The user imports and reviews it in the GUI;
do not invoke `merge` unless explicitly requested later. If requested, `merge` compares GUI
edits with the last build. For each evidence-bearing changed node, decide
whether the previous evidence still applies. If not, add replacement source keys or accept an
`unsubstantiated-after-human-edit` marker. Non-interactive runs use a versioned review-answer JSON
file. Merge refuses stale target scripts and writes:

`<bundle-basename>-<script-slug>.json`

The original bundle remains unchanged.

## Research protocol

1. Read the brief, prepared context, and relevant portions of provided local documents.
2. Extract source-supported activities, roles, resources, traces, and measures. Use the supplied
   documents as the primary evidence, checking contradictions, alternative explanations, and
   missing perspectives within them. Never present a single document as independent corroboration.
3. If no adequate local documents exist, or the user asks for enrichment, research authoritative
   public sources. Supplement local documents when essential claims cannot otherwise be supported;
   do not fill gaps with model memory or invented details. Ask before broadening the requested scope.
4. Keep web queries generic when working with restricted material. Record visited URLs and decisions
   in `research-log.json`; with local-only research, do not invent web entries. Complete its two
   closing checks only after actually assessing contradictions and missing perspectives.
5. Store short supporting passages, locators, provenance, reliability rationale, and hashes in
   `evidence.json`. Link evidence claims to candidate node keys. Do not copy complete works.
6. Stop only when all core factual nodes have adequate evidence; omit unsupported optional claims.

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
- an unnumbered label and a concrete `description` of the actual event (the GUI adds numbering);
- source-supported observable traces and a decision point where relevant, recorded in candidate
  fields for evidence review rather than substituted for the reader-facing activity description;
- only applicable role, attribute, and transport keys.

For source tables with setting, hulpmiddelen, and roles, make a per-activity coverage check rather
than copying only the event labels. Map the actual function to `castKeys`, equipment and other
applicable resources to `attributeKeys`, and vehicles to `transportKeys`. Put reusable, broad
places in `taxonomies.locations` and link them through variant `locationKeys`; the current model
has no activity-level location field, so state an activity-specific setting in its `description`.
Keep the source's concrete non-operational categories and mark optional or speculative items as
such. Do not invent a role or tool merely to fill an empty cell. Check the generated JSON:
activities must retain their role/attribute/transport links, each relevant variant its locations,
and each sourced activity its distinct setting. In the viewer, equipment is grouped by variant
even though the JSON links it to individual activities.

The generated description may not contain the normalized activity label. Each description should
say who does what and in what broad context without procedural crime-enabling detail. Distinguish
documented events from assumptions. Replace vague references to "the source" with supported
specifics or an explicit, relevant qualification. Do not present signs of an event or an
investigator's decision as the event itself.

Each indicator needs an observation, corroboration method, plausible benign alternatives, and
relevance. Corroboration means checking the observation against independent evidence; it is not
proof by itself. Each measure needs a partner or owner, decision moment, intended effect, category,
and evidence. Write all reader-facing text in the brief's content language. Avoid repeated
boilerplate; exact and strong near-duplicate descriptions block builds.

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
