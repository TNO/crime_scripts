# 0012 Add barrier-model export

Status: done
Priority: high
Subsystem: frontend
Depends on: 0011
Owner: Erik Vullings
Agent: GitHub Copilot

## Context

Crime scripts need a concise visual summary that connects barriers to the
scenes where they apply and identifies the partners that can use them. The
visual should complement the detailed Word report, follow the barrier-first
presentation, and remain useful as a separate presentation artifact.

## Acceptance Criteria

- A deterministic landscape barrier matrix is generated from one crime script.
- Matrix rows list barriers once, grouped by prevention category; columns
  represent scenes in script order.
- Populated cells identify the applicable partners without duplicating partner
  names.
- The visual can be downloaded as SVG and as PNG.
- The Word report embeds the same barrier model when the script contains
  barriers, with an accessible textual fallback following it.
- Empty and large scripts produce explicit, readable results rather than broken
  or silently truncated graphics.
- Export controls use clear localized labels and remain usable in the compact
  action menu.
- Focused tests, GUI typecheck, production build, and desktop/mobile browser
  checks pass.

## Implementation Notes

- Build the SVG from the shared report-oriented model introduced by 0011.
- Keep rendering local; do not use external diagram or image services.
- SVG is the source format. Produce PNG in the browser for Word compatibility
  and raster download while retaining SVG as the scalable standalone export.
- Preserve the detailed textual barrier section in Word for accessibility and
  print fallback.

## Agent Notes

- 2026-09-23 GitHub Copilot: Created as the sequential follow-up to 0011. Do not
  start until the native Word report and shared report model are complete.
- 2026-09-23 GitHub Copilot: Started after 0011 completed. The visual will use
  the report model as its input and expose a pure SVG generator before browser
  download and PNG conversion are wired into the action menu and Word report.
- 2026-09-23 GitHub Copilot: Completed the shared barrier matrix and accessible
  SVG renderer in `packages/gui/src/utils/barrier-visual.ts`, local SVG/PNG
  downloads in `packages/gui/src/utils/barrier-export.ts`, localized compact-menu
  actions, and paginated Word embedding with textual barrier tables as fallback.
  Rows and scene columns paginate without loss, classification is visible text,
  and raster dimensions have a fixed pixel-area budget.
- 2026-09-23 GitHub Copilot: Verified the largest local script (120 barriers,
  six scenes) as 40 matrix pages with all 720 barrier/scene cells represented
  exactly once and a valid 11.9 MB DOCX. Full GUI tests passed (87 passed, one
  pre-existing skip), along with typecheck, production build, desktop/mobile
  action-menu checks, and final diff review.
