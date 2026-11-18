# Crime Scripts

A web application to create crime scripts.

## Installation

The application is a mono-repository, developed in TypeScript. It typically consists of the following packages:

## Development

```bash
pnpm i
npm start
```

The pnpm patch for `mithril-materialized@4.1.0` keeps Space as text input inside
`SearchSelect`, while preserving keyboard selection on the picker trigger.

## Crime-script data

Scenes own their activity-group variants directly. Reusable taxonomies such as roles, attributes, transports, locations, products, and partners remain shared across scripts.

Activities can optionally retain `observableTraces: string[]` and `decisionPoint: string`.
The activity inspector edits traces one per line and labels `decisionPoint` as a verification
question for the analyst. The viewer, Word report, and Markdown export keep both separate from
the action narrative. Traces are potential artefacts to verify, not proof or interpreted indicators.
Existing scripts need no migration or invented field values; outline edits and JSON round-trips
preserve the optional fields.

In the taxonomy editor, administrators can merge two items of the same type: the retained item's label and details win, while references in categories and in both public and restricted scripts are redirected to it. Review the retained item's details before merging, because a public script referencing it will include it in public exports. The merge remains cancellable until the taxonomy changes are saved.

Legacy JSON models with a top-level `acts` collection and schema-version-2 models are migrated when loaded. Scene, variant, and track IDs are preserved, while a reused legacy act is copied into each owning script so later edits cannot affect another script. Newly saved and exported models use `schemaVersion: 3`.

References receive an ID as soon as they are added. On loading an older workspace or JSON
file, empty reference drafts are removed and references with content but no ID receive one.
Recovery preserves source content, reports the changes, and saves the repaired workspace.

On first launch, users choose the fixed Dutch starter library at `/starter-bundles/nl.json` or an empty workspace. Starter imports are explicit and preserve local conflicts by default. Script language, AI/review provenance, starter origin, and source usage notes remain in JSON and Word exports.

The Dutch and English public starter bundles retain their own taxonomy IDs and include descriptions, synonyms, and category ancestry from matching taxonomy items used by their public scripts. Taxonomy exclusive to restricted scripts is not included in the public bundles.

Starter bundle 1.0.7 repairs measure categories to use shared catalogue IDs in both languages.
General response or support measures outside the situational-prevention techniques use `0_0`
(other). Legacy JSON's `other` category and missing categories normalize to that same ID;
unrecognized custom categories remain visible for explicit analyst review rather than being guessed.
Existing browser workspaces are not overwritten: re-import the updated starter library and review
its replacement choices to update previously imported scripts.

The Dutch and English starter libraries each contain seventeen AI-assisted, unreviewed public-safety scripts. Their original content is available under CC BY 4.0; third-party bibliography items retain their own rights. See `/starter-bundles/NOTICE.nl.md` and `/starter-bundles/NOTICE.en.md`. Icon requirements for the separate catalogue work are recorded in `/starter-bundles/icon-requirements.nl.json` and `/starter-bundles/icon-requirements.en.json`.

Every script has a `public` or `restricted` classification and a stable family ID that links counterparts. The global script mode defaults to public and is only persisted after the user switches it. Public exports omit restricted scripts and their private-only taxonomy data. Restricted JSON and Word exports require confirmation and use classified filenames and document headers; permanent links are unavailable when their model contains restricted content.

The application-level icon catalogue is available in `/icons/catalogue.json`, so built-in icons remain available in empty workspaces and single-script exports only need to retain their stable `builtin:*` key. Uploaded images remain embedded as data URLs. The supplied source artwork is retained in `src/assets/icons/`; its optimized catalogue counterpart is served from `/icons/`. Catalogue provenance and licensing are documented in `/icons/NOTICE.md`. Optimize catalogue artwork before committing changes:

```bash
pnpm --dir packages/gui icons:optimize
```

## Deployment to GitHub docs

```bash
pnpm i
npm run build:domain
```
