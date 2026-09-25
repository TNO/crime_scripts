# 0013 Improve crime-script visualization

Status: done
Priority: medium
Subsystem: frontend
Depends on: 0010
Owner: Erik Vullings
Agent: GitHub Copilot

## Context

The crime-script viewer currently hides alternative activity groups behind a
select, shows role and location information mainly as prominent aggregate
sections, and exposes track add/edit/delete controls directly in view mode.
This makes the process harder to scan and makes the viewer behave partly like
an editor.

The Dutch starter script "Phishing en betaalfraude" is the reference case. Its
scene "Misleidend contact" has the alternatives "E-mailroute" and "Sms-route",
and the script has the tracks "Benadering per e-mail" and "Benadering per sms".

The pre-implementation decisions are:

- Replace "Activiteitengroep" with "Modus operandi (M.O.)" in Dutch. The
  singular term is "modus operandi" and the plural is "modi operandi".
- View mode places a track select directly after the "Scènes" heading when
  tracks exist, while track creation, editing, and deletion remain editor-only
  actions.

## Acceptance Criteria

- Alternative variants in a scene use a compact single-open variant switcher:
  all variant names remain visible and only the selected variant is expanded.
- The switcher remains usable with long labels, many variants, narrow screens,
  keyboard navigation, light mode, and dark mode.
- Each activity shows its assigned roles as small wrapping pills beneath the
  activity content.
- Selecting a role pill applies one clearly visible role filter/highlight:
  matching activities remain emphasized, unrelated activities are de-emphasized,
  and an accessible clear-filter action is available.
- The scene outline says "activiteiten" rather than "stappen", including count
  text such as "4 activiteiten"; related viewer/editor actions and English copy
  use consistent domain terminology.
- A scene outline row adds an M.O. count only when the scene has more than one
  variant, for example "4 activiteiten · 2 M.O." The activity count describes
  the currently selected variant.
- Variant locations are rendered as compact pills beside or directly below the
  selected variant heading. They are not presented as if they belong to the
  scene, because locations are stored on the variant/activity group.
- The script-wide roles, attributes, transports, locations, and references are
  collapsed by default behind accessible disclosure controls with visible
  counts.
- In view mode, track controls are read-only selection controls. When tracks
  exist, the track select appears directly after the "Scènes" heading and
  selecting a track updates the selected variants.
- Track add, edit, and delete actions are available only in the editor and
  remain subject to the existing editing permissions/mode.
- Focused tests cover variant switching, role filtering, localized activity and
  M.O. counts, collapsed summaries, track selection, and editor-only track
  mutations.
- GUI typecheck, production build, desktop/mobile browser checks, keyboard
  checks, and the Impeccable detector pass.

## Implementation Notes

- Relevant files include
  `packages/gui/src/components/ui/crime-script-viewer.ts`,
  `packages/gui/src/components/ui/crime-script-editor.ts`,
  `packages/gui/src/css/style.css`, and
  `packages/gui/src/services/lang/{nl,en}.ts`.
- `Scene.variants` owns the alternative activity groups. `Act.locationIds`
  belongs to the selected variant, while `Activity.cast` may contain several
  roles.
- Prefer the stacked, single-open variant presentation over a horizontal tab
  bar when labels or descriptions are long. A select may remain as an overflow
  fallback for unusually large variant sets.
- Keep color supplementary: variant state, role pills, filters, and collapsed
  sections need text, shape, and accessible state in addition to color.
- Preserve the existing track behavior that coordinates selected variants
  across scenes; only separate selecting a track from editing track definitions.

## Agent Notes

- 2026-09-25 GitHub Copilot: Created from the visualization discussion. Agreed
  direction: activities remain process-ordered; roles appear as per-activity
  pills with one-role filtering/highlighting; variant locations become pills;
  secondary aggregate metadata is collapsed. Track placement and the exact
  "Activiteitengroep" versus "Modus operandi" terminology must be confirmed
  before implementation.
- 2026-09-25 GitHub Copilot: Started implementation after confirming Dutch
  "Modus operandi (M.O.)" terminology and selection-only tracks in the viewer,
  with track creation, editing, and deletion moved to edit mode.
- 2026-09-25 GitHub Copilot: Completed the stacked M.O. switcher, per-activity
  role pills and filtering, activity/M.O. summaries, location pills, collapsed
  metadata, viewer track selection, and editor-only track management. Verified
  with 92 passing GUI tests (one pre-existing skip), typecheck, production
  build, desktop/mobile/dark-mode browser checks, keyboard interaction, and the
  Impeccable detector. Final review fixes preserve legacy track matching and
  prevent a muted parent activity from dimming matching subactivities.
