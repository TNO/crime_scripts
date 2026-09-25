# 0014 Create user guide and video

Status: done
Priority: medium
Subsystem: documentation
Depends on: none
Owner: Erik Vullings
Agent: GitHub Copilot

## Context

Create a practical Dutch guide for occasional PAX users. It must explain the
main usage flow, editing a crime script, and the provider-neutral LLM wizard.
The written guide and a short video should use the current interface rather
than screenshots or instructions from an older layout.

## Acceptance Criteria

- A versioned Dutch user guide covers opening and navigating PAX, selecting the
  public or restricted mode, viewing a script, entering edit mode, editing and
  saving content, and exporting or importing data.
- The guide covers the complete LLM wizard: brief, generated prompt, external
  LLM handoff, JSON validation and preview, and explicit import.
- Privacy and safety constraints are explicit: PAX does not contact an LLM or
  fetch source URLs, restricted data stays under user control, and imports
  remain unreviewed until a person reviews them.
- A short, reproducible walkthrough video follows the documented flow and is
  stored in a web-friendly format with a poster or representative screenshot.
- The repository documents how the media was produced so it can be refreshed
  after UI changes.
- Documentation links are discoverable from the main repository README.
- Browser verification confirms that all documented controls and labels match
  the current Dutch UI.

## Implementation Notes

- Prefer Markdown plus checked-in compressed WebM/PNG assets.
- Keep the video concise and avoid embedding real operational or sensitive
  information.
- Reuse the existing development server and deterministic starter data.

## Agent Notes

- 2026-09-25 GitHub Copilot: Created from the request for a usage, editing, and
  LLM-wizard manual with matching video material.
- 2026-09-25 GitHub Copilot: Started implementation with deterministic Dutch
  starter content and browser-captured media from the current interface.
- 2026-09-25 GitHub Copilot: Added `documentation/handleiding.nl.md` covering
  public/restricted usage, viewing, editing, import/export, and all four LLM
  wizard steps. Captured five current-interface PNGs, generated a 15-second
  VP9 WebM, documented the reproducible media workflow, and linked the guide
  from the repository README. All media uses public starter or synthetic data.
