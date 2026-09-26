# 0015 Document restricted Witwassen CLI workflow

Status: done
Priority: high
Subsystem: content
Depends on: 0009
Owner: Erik Vullings
Agent: GitHub Copilot

## Context

Demonstrate the agent-oriented CLI by creating a restricted Dutch crime script
about witwassen. Record the process as a concise video or screenshot sequence,
review the generated standalone script, and add it to the restricted starter
bundle without exposing restricted source material in public artifacts.

## Acceptance Criteria

- The crime-script-generator workflow creates a restricted Dutch script about
  witwassen from the current restricted bundle.
- The script is evidence-backed, defensive, non-operational, marked
  `aiGenerated` and `unreviewed`, and uses an existing catalogue icon.
- CLI validation, standalone build, GUI review, and guarded merge complete
  without modifying the input bundle in place.
- The merged script is present in the restricted bundle, has globally unique
  IDs, and passes the existing restricted-bundle validation.
- A checked-in Dutch walkthrough explains the exact CLI stages and includes a
  reproducible screenshot sequence or short video with sensitive paths and
  local material removed.
- Public repository content does not include the restricted bundle or any
  restricted source text; only safe documentation/media belongs in Git.
- The task records the local restricted-bundle output path and validation
  outcome without committing sensitive content.

## Implementation Notes

- Follow `.agents/skills/crime-script-generator/SKILL.md`; the CLI itself does
  not call an LLM.
- Use only authoritative public sources for general facts and never include
  executable laundering instructions, evasion tactics, exploitable thresholds,
  or unique case details.
- Stop before merge if GUI review or classification approval cannot be
  completed safely.

## Agent Notes

- 2026-09-25 GitHub Copilot: Created for a restricted “Witwassen” CLI
  demonstration, media sequence, and guarded restricted-bundle merge.
- 2026-09-25 GitHub Copilot: Started the isolated generator workflow. The
  reviewed standalone artifact and explicit merge approval remain mandatory.
- 2026-09-26 GitHub Copilot: Completed a source-backed, non-operational
  restricted Witwassen draft with three scenes, six activities and six
  authoritative public sources. Generator status returned `nextAction: build`;
  the standalone loaded and rendered correctly in an isolated GUI context.
  The user's explicit instruction to add the script authorized the guarded
  merge into a local bundle copy. The resulting 18-script bundle has no
  duplicate IDs and remains outside Git at
  `files/restricted-bundle-witwassen.json`. Added a five-frame PNG walkthrough,
  an 18-second WebM, exact commands, artifact hashes and privacy guidance in
  `documentation/restricted-witwassen-cli.nl.md`.
