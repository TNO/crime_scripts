# 0002 Simplify crime-script creation

Status: done
Priority: high
Subsystem: frontend
Depends on: 0001

## Context

The creation wizard should let users outline optional scenes without forcing detailed scene configuration. Every entered scene must immediately own one activity group so newly created scripts are structurally valid and users can continue editing without first understanding variant management.

The current wizard mixes scene goals and images into creation, creates only its first scene with an activity group, and can produce additional empty scenes.

## Acceptance Criteria

- The wizard requires basic script information and offers a lightweight optional scene-outline step.
- Users can add, rename, and remove scene rows without entering goals, imagery, activities, barriers, or track details.
- Every non-empty scene entered in the wizard creates exactly one owned activity group with the same provisional name.
- Leaving the scene outline empty creates a valid script with no scenes.
- Completing the wizard opens the new script in the existing editor.
- English and Dutch copy clearly communicates that scene outlining is optional.
- Automated tests cover scene-to-activity-group creation, and the GUI typecheck and production build pass.

## Implementation Notes

- Build on schema version 2 from `0001`; never recreate global act reuse.
- Keep detailed scene and activity-group fields in the main editor.
- Put scene construction in a pure public helper so the ownership invariant is tested independently of Mithril forms.

## Agent Notes

- 2026-09-17: Started from the agreed workflow: script name first, optional lightweight scene outline second, one same-named owned activity group per entered scene.
- 2026-09-17: Added the pure `createScenesFromOutline` helper in `packages/gui/src/models/script-creation.ts`, rewired `packages/gui/src/components/ui/new_script_wizard.ts` to collect basic information and optional scene names, and added English/Dutch guidance and required-name feedback. Blank and incomplete rows are ignored; every entered scene receives one same-named owned activity group. Verified the two-scene and required-name flows in the browser, all seven tests including the supplied v30 legacy model, typecheck, production build, and a clean Impeccable detector pass.
