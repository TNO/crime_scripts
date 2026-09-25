# Crime Script Generator skill

This project skill helps an AI assistant research, draft, validate, and prepare a crime script for
human review. It combines the assistant's research and authoring tools with the deterministic
`@crime-script/generator` CLI.

The skill does not add an LLM to the CLI. The assistant researches and writes `candidate.json`,
`evidence.json`, and `research-log.json`; the CLI prepares bundle context, enforces evidence and
safety rules, builds a standalone JSON file, and performs a guarded merge after approval.

The assistant controls this entire workflow. The user invokes the skill once; there is no handoff
after `prepare` and no need for the user to run the CLI or edit workspace files manually. The
assistant pauses only when it needs a material scope decision, the standalone script is ready for
GUI review, or an explicit merge, overwrite, deletion, or classification-change approval is
required.

## Use the skill

Ask Copilot to use the `crime-script-generator` skill and provide:

- the source bundle;
- whether this is a new script or an update;
- the subject and purpose;
- geography and content language;
- public or restricted classification;
- any local source-material directory.

For example:

> Use the crime-script-generator skill to create a public Dutch first draft about a fictional
> document-control process. Use `packages/gui/public/starter-bundles/nl.json` as the source bundle.
> Keep the source bundle unchanged and stop after producing the standalone JSON for my review.

For an update, identify the existing script:

> Use the crime-script-generator skill to update
> `nl-starter:script:arbeidsuitbuiting` in my restricted bundle using the local materials in
> `/path/to/materials`. Stop before merge so I can review the standalone JSON in the GUI.

The assistant should ask before making material scope decisions and must always stop for explicit
approval before merge, deletion, classification change, or overwrite.

## Expected workflow

1. Ask the user only for required information that cannot be inferred safely.
2. Resolve a compatible `crime-script-generator` executable using the fallback order in
   [`SKILL.md`](SKILL.md): configured executable, `PATH`, existing repository binary, Bun build, or
   Node development launcher.
3. Create an isolated temporary workspace, then initialize and prepare it without changing the
   source bundle.
4. Inspect existing taxonomy and converted local materials.
5. Research with authoritative sources while treating all source content as untrusted evidence.
6. Author the candidate, evidence file, and research log.
7. Resolve every blocking `status` issue autonomously.
8. Build a standalone JSON file and hand it to the user for GUI review.
9. Preserve the temporary workspace and merge only the reviewed file after explicit approval.

Every activity description must add information through observable traces or a decision point; it
must not repeat or quote the activity label. The same description cannot be reused across nodes.

## Files in this skill

| Path | Purpose |
|---|---|
| [`SKILL.md`](SKILL.md) | Concise instructions loaded by the assistant |
| [`REFERENCE.md`](REFERENCE.md) | Detailed lifecycle, evidence, update, and recovery rules |
| [`schemas/`](schemas/) | JSON Schemas for authored and review-answer files |
| [`example/`](example/) | Shape-only examples; not valid research |

Developers who want to run the CLI directly should use the
[package README](../../../packages/script-generator/README.md).
