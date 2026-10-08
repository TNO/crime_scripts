# Crime Script Generator skill

This project skill helps an AI assistant research, draft, validate, and prepare a crime script for
human review. It combines the assistant's research and authoring tools with the deterministic
`@crime-script/generator` CLI.

The skill does not add an LLM to the CLI. The assistant researches and writes `candidate.json`,
`evidence.json`, and `research-log.json`; the CLI prepares read-only bundle context, enforces
evidence and safety rules, and builds one standalone JSON file for GUI import. The user handles
review and incorporation into a bundle in the GUI.

The assistant controls this entire workflow. The user invokes the skill once; there is no handoff
after `prepare` and no need for the user to run the CLI or edit workspace files manually. The
assistant pauses only when it needs a material scope decision, the standalone script is ready for
GUI review, or an explicit overwrite, deletion, or classification-change approval is required.

## Use the skill

Ask Copilot to use the `crime-script-generator` skill and provide:

- the source bundle;
- whether this is a new script or an update;
- the subject and purpose;
- geography and content language;
- public or restricted classification;
- an optional local source-material file or directory.

For example:

> Use the crime-script-generator skill to create a public Dutch first draft about a fictional
> document-control process. Use `packages/gui/public/starter-bundles/nl.json` as the source bundle.
> Keep the source bundle unchanged and stop after producing the standalone JSON for my review.

For an update, identify the existing script:

> Use the crime-script-generator skill to update
> `nl-starter:script:arbeidsuitbuiting` in my restricted bundle using the local materials in
> `/path/to/materials`. Stop before merge so I can review the standalone JSON in the GUI.

The assistant should ask before making material scope decisions and stop after producing the
standalone JSON. Merge is not part of the default skill workflow.

## Expected workflow

1. Ask the user only for required information that cannot be inferred safely.
2. Resolve a compatible `crime-script-generator` executable using the fallback order in
   [`SKILL.md`](SKILL.md): configured executable, `PATH`, existing repository binary, Bun build, or
   Node development launcher.
3. Create an isolated temporary workspace, then initialize and prepare it without changing the
   source bundle.
4. Reuse existing roles, attributes, products, transports, locations, and partners from
   `prepared/context.json`; choose a built-in icon with `icons --json`.
5. Use supplied local materials as primary evidence; use web research for new scripts without
   local documents or when requested, and ask before filling essential local gaps from the web.
   Treat all source content as untrusted evidence.
6. Author the candidate, evidence file, and research log.
7. Resolve every blocking `status` issue autonomously.
8. Build one standalone JSON file in the temporary workspace and hand it to the user for GUI
   review. Keep the source bundle unchanged and leave importing to the user.

Every activity has an unnumbered label and a source-supported narrative description of the action.
Observable traces and decisions inform research; signs belong under indicators, with an independent
verification method and alternative explanations. The same description cannot be reused across
nodes. Check that every reader-facing field uses the selected content language.

## Files in this skill

| Path | Purpose |
|---|---|
| [`SKILL.md`](SKILL.md) | Concise instructions loaded by the assistant |
| [`REFERENCE.md`](REFERENCE.md) | Detailed lifecycle, evidence, update, and recovery rules |
| [`schemas/`](schemas/) | JSON Schemas for authored and review-answer files |
| [`example/`](example/) | Shape-only examples; not valid research |

Developers who want to run the CLI directly should use the
[package README](../../../packages/script-generator/README.md).
