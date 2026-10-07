# 0024 Refresh starter docs and walkthroughs

Status: done
Priority: medium
Subsystem: documentation
Depends on: none
Owner: Erik Vullings
Agent: GitHub Copilot

## Context

The README has an incomplete installation section and a historical TODO list
instead of an introduction to the current starter kit. The Dutch and English
walkthrough media predates recent changes to script sharing, editing,
navigation, taxonomy, icons, and starter content.

## Acceptance Criteria

- README explains the current starter kit, setup and user flows with current
  public-data images and links to both guides.
- Dutch and English written guides match the current controls and media.
- Dutch and English screenshot sets and walkthrough videos show the current
  public interface, with aligned captions and in-app seekable steps.
- Media-production instructions reproduce the new media; generated videos
  and guide routes are verified.
- No restricted, personal, or operationally sensitive content is captured.

## Implementation Notes

- Use the existing 1440x900 light-theme captures and public starter library.
- Keep walkthrough assets in `documentation/assets/user-guide/`; README images
  may reuse the refreshed guide assets.
- Keep the video's captions, in-app steps in
  `packages/gui/src/components/guide-page.ts`, and production instructions in
  sync if the timeline changes.

## Agent Notes

- 2026-10-07 GitHub Copilot: Started after the request to refresh the README,
  starter-kit imagery, and both localized video tutorials. Existing 0023 is
  already done; this is a new refresh after later UI changes.
- 2026-10-07 GitHub Copilot: Replaced the stale README with a starter-kit
  introduction and three current public screenshots; updated
  `documentation/handleiding.nl.md`, `documentation/user-guide.en.md`, and
  `documentation/media-productie.md`. Recaptured all 22 guide PNGs, regenerated
  both 44-second WebM videos, aligned both VTT files and the in-app steps in
  `packages/gui/src/components/guide-page.ts`. Synthetic LLM JSON is previewed
  but never imported; screenshots contain only public starter material.
  Recheck labels and seek points when future UI changes alter the walkthrough.
