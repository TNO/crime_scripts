# 0001 Embed acts in crime scripts

Status: done
Priority: high
Subsystem: frontend
Depends on: none

## Context

Crime-script scenes currently reference acts from a global `DataModel.acts` collection. Editing or deleting a reused act can silently affect multiple scripts, script deletion leaves orphan acts, and users must manage an indirect global library while editing a script.

The supplied `/Users/erik.vullings/Downloads/2026-09-17_v030_crime_scripts.json` contains seven scripts and forty acts. All ten cross-script reuse cases involve the synthetic "Tracks test" script; the six substantive scripts share no acts. Scene variants and tracks are real, separate capabilities and must remain supported.

## Acceptance Criteria

- New in-memory and exported models embed act variants in their owning crime-script scenes and do not depend on a global acts collection.
- Existing models with top-level `acts`, scene `ids`, and scene `actId` load without losing referenced content.
- Scene variants and track selections retain their existing IDs and behavior.
- Editing or deleting an embedded act cannot change another crime script.
- Search, case matching, filtering, settings reverse lookups, Word export, JSON export, preview merging, and script deletion work with embedded acts.
- Migration detects missing legacy act references instead of silently discarding them.
- Automated migration coverage includes the supplied v30 model, and the GUI build succeeds.

## Implementation Notes

- Add a dedicated schema version; the existing `version` field is a content/save counter and must not drive schema migration.
- Recommended shape: `Scene.variants: Act[]` and `Scene.selectedVariantId?: ID`.
- Keep reusable taxonomies such as cast, attributes, transports, locations, products, and partners global.
- Normalize legacy data once at the load/import boundary. Preserve scene, act, and track IDs.
- Newly exported models use the embedded schema. Backward compatibility means current code can read old files, not that older application versions can read new exports.

## Agent Notes

- 2026-09-17: Investigation found 40 global acts, 36 referenced act IDs, 4 orphan acts, and no cross-script reuse among substantive scripts. A compact embedded conversion of the sample is about 20% larger, an acceptable tradeoff for ownership clarity. Implementation started on branch `product-context`.
- 2026-09-17: Implemented schema version 2 with scene-owned variants in `packages/gui/src/models/data-model.ts`, legacy normalization in `model-normalization.ts`, taxonomy-safe preview merging in `model-merge.ts`, and updated editor, viewer, search, settings, filters, and exports. Legacy shared acts are copied per script; old act-as-scene IDs, generic scenes, variants, and tracks are preserved. The supplied v30 file passes migration coverage with 7 scripts, 39 scenes, 46 variants, and 20 valid track references.
