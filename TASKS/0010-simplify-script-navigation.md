# 0010 Simplify script navigation

Status: done
Priority: high
Subsystem: frontend
Depends on: 0001, 0002
Owner: Erik Vullings
Agent: GitHub Copilot

## Context

The outline-first editor still spends too much horizontal space on step actions,
does not distinguish a focused step from its containing scene, and duplicates
scene/activity-group creation controls in the inspector. Scene icons are costly to
author and add little analytical value. View mode also uses a different horizontal
scene visualization instead of the editor's more usable left-hand scene navigation.

## Acceptance Criteria

- Top-level steps and substeps show stable visible sequence numbers.
- Step deletion is available in the selected step inspector, not in every outline row.
- A scene remains visibly contextual while a child step has primary focus.
- The inspector no longer offers duplicate activity-group add/delete controls.
- Scene and activity-group icons are removed from the model contract, normalization,
  editor, viewer, generator workflow, public/deployed bundles, and restricted bundle.
- Script-level icons remain supported.
- View mode uses the same responsive left scene outline and right content layout as edit mode.
- Focused tests, typecheck, production build, and desktop/mobile browser checks pass.

## Implementation Notes

- Preserve script-level icon composition and the existing reusable icon catalogue.
- Legacy uploaded models may contain scene/variant icon fields; normalization should
  discard them rather than failing to load old bundles.
- Scene outline navigation must remain horizontally scrollable on narrow screens.

## Agent Notes

- 2026-09-23 GitHub Copilot: Started from direct browser feedback on the outline-first
  editor. The selected spatial thesis is scene-as-context and step-as-focus, with
  destructive actions disclosed in the inspector and one shared navigation model
  across edit and view modes.
- 2026-09-23 GitHub Copilot: Completed the shared navigation model in
  `packages/gui/src/components/ui/crime-script-editor.ts`,
  `packages/gui/src/components/ui/crime-script-viewer.ts`, and
  `packages/gui/src/css/style.css`. Steps use hierarchical numbering, the selected
  step owns primary focus and deletion, and its scene remains visible as dashed
  context. Removed lower-level visual fields from
  `packages/crime-script-core/src/data-model.ts`, kept legacy imports compatible
  through normalization, and migrated the public/deployed starter bundles plus the
  restricted attachment while preserving script-level icons. Core, generator, and
  GUI tests/typechecks and the production build passed. Desktop and 390 px browser
  checks confirmed the editor hierarchy and responsive horizontal scene navigation;
  the Impeccable detector reported no findings, and bundle validation found zero
  lower-level visual fields across 17 public and 37 restricted scripts.
- 2026-09-23 GitHub Copilot: Tightened the outline layout after browser review.
  Scene and step numbers now use compact, left-aligned columns, leaving more width
  for long labels. The add-step and add-substep actions share one non-wrapping row.
  Desktop and 390 px browser measurements confirmed alignment, same-line actions,
  and no horizontal overflow; the production build and layout detector passed.
- 2026-09-23 GitHub Copilot: Completed the responsive follow-up pass. Medium-width
  navigation now exposes the full compact menu, the script toolbar uses a primary
  action plus an accessible overflow menu, and that toolbar shares the hamburger
  row below 993 px. Replaced the editor's nested library tab grid with a flat,
  keyboard-navigable tab panel and compressed each move-arrow pair from 56 px to
  42 px. Browser checks, 79 GUI tests, typecheck, production build, and the
  Impeccable detector passed.
