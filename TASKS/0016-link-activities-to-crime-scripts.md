# 0016 Link activities to crime scripts

Status: open
Priority: medium
Subsystem: frontend
Depends on: 0001, 0010

## Context

Activities sometimes refer to a criminal process that is already modeled in
another crime script, for example an activity that leads into a separate
witwassen script. Add explicit, navigable script links instead of relying on
free-text mentions.

## Acceptance Criteria

- An activity can reference zero or more crime scripts by stable script ID.
- The editor provides a clear multi-select for maintaining related-script
  links and prevents self-links, duplicates, and dangling selections.
- The viewer renders related scripts as compact accessible links beneath the
  activity and navigates to the referenced script.
- Links respect public/restricted visibility: public mode never exposes a
  restricted target, while restricted mode can show available restricted
  targets.
- Normalization, standalone export/import, script copying, deletion, and
  public export preserve or remove references consistently without leaving
  dangling IDs.
- Dutch and English labels and empty/error behavior are covered.
- Focused tests cover valid links, self-links, missing/deleted targets,
  public-export filtering, and viewer/editor behavior.
- GUI typecheck, tests, production build, desktop/mobile browser checks, and
  dark-theme verification pass.

## Implementation Notes

- Extend the existing `Activity` model rather than encoding links in
  descriptions.
- Reuse the current crime-script route and script classification helpers.
- Render a text label in addition to any icon so the relationship is
  understandable without color.

## Agent Notes

- 2026-09-25 GitHub Copilot: Created from the request for activity-level links
  to related crime scripts such as witwassen.
