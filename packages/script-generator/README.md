# Crime Script Generator CLI

`@crime-script/generator` turns researched, structured input into a validated standalone crime
script and can merge a reviewed result into a new bundle. The CLI is provider-neutral and contains
no LLM: it prepares context and validates files, while a person or an AI assistant performs the
research and authors the candidate.

Commands never modify the input bundle.

## Build and run the executable

Install the workspace dependencies from the repository root:

```sh
pnpm install
```

The recommended way to test the distributable CLI is to compile the standalone executable with
[Bun](https://bun.sh/):

```sh
pnpm --filter @crime-script/generator build:binary
export PATH="$PWD/packages/script-generator/dist:$PATH"
```

The executable is now available as `crime-script-generator`:

```sh
crime-script-generator --help
crime-script-generator --version
crime-script-generator icons
pnpm --filter @crime-script/generator test
```

## Run from source during development

For a faster edit-test cycle without compiling the standalone executable, use the package's
development launcher:

```sh
./packages/script-generator/bin/crime-script-generator --help
```

This Bash script is the `bin` entry declared in `package.json`. It starts `src/cli.ts` with Node's
TypeScript stripping enabled, so it still requires Node.js and the installed workspace
dependencies. It is convenient for local development but is not standalone or suitable for the
Windows release. The Bun build packages the application into the release executable and is
therefore the preferred route for distribution testing.

If you use the source launcher, either replace `crime-script-generator` in the examples below with
its path or temporarily add it to `PATH`:

```sh
export PATH="$PWD/packages/script-generator/bin:$PATH"
```

## Preferred workflow: let an agent run everything

The CLI deliberately does not contain an LLM. An agent supplies the missing intelligence: it reads
the prepared bundle context, researches the subject, and authors `candidate.json`, `evidence.json`,
and `research-log.json`. The CLI then validates those files and builds the standalone bundle.

You do not need to run `init`, wait for `prepare`, and then hand the workspace to an LLM. Invoke the
skill once. The agent should ask for any missing scope decisions, create an isolated temporary
workspace, control every CLI command, read the prepared materials, perform the research, author and
repair all three files, and build the standalone JSON. It should preserve the workspace until the
review cycle is finished.

The normal user interaction is therefore:

```text
User: request a new script or update
Agent: ask only for missing scope or safety decisions
Agent + CLI: init -> prepare -> research -> author -> validate -> build
User: review the standalone JSON in the GUI
Agent + CLI: merge the reviewed file after explicit approval
```

There is no LLM handoff after `prepare`: that is only an internal phase transition in the
agent-controlled workflow. The user-facing pause occurs after `build`, because GUI review and merge
approval must remain human decisions.

This repository includes the project skill at
[`../../.agents/skills/crime-script-generator/`](../../.agents/skills/crime-script-generator/).
In a Copilot session opened on this repository, ask the agent to use that skill. A complete request
for a new script can be as simple as:

> Use the crime-script-generator skill to create a public Dutch crime script about a fictional
> document-control process. Use `packages/gui/public/starter-bundles/nl.json` as the source bundle.
> The purpose is defensive analyst training in the Netherlands, at an orienting detail level. Use
> `builtin:document-check` as the icon. Research authoritative public sources, build a standalone
> JSON file, and stop before merge so I can review it in the GUI.

For a script based on local material, include the directory and its sensitivity:

> Use the crime-script-generator skill to create a restricted Dutch script about [subject], using
> the restricted bundle at `/path/to/bundle.json` and the local restricted source material in
> `/path/to/materials`. Keep all restricted content local. Build the standalone JSON and stop for
> my GUI review; do not merge, overwrite, delete, or change classification without asking me.

For an update, name the existing script ID:

> Use the crime-script-generator skill to update
> `nl-starter:script:arbeidsuitbuiting` in `/path/to/restricted-bundle.json`. Reuse retained node
> IDs and existing taxonomy where possible. Build a standalone JSON and stop before merge.

The agent should perform this workflow:

1. Collect any missing scope decisions and verify `crime-script-generator --version`.
2. Create an isolated temporary workspace, run `init` and `prepare`, then inspect
   `prepared/context.json` and local converted materials.
3. Research authoritative sources and explicitly search for contradictions and missing
   perspectives.
4. Write the candidate, evidence, and research-log files using the skill schemas.
5. Run `status --json`, repair every blocking issue, and repeat until the next action is `build`.
6. Run `build` and give you the standalone JSON for GUI review.
7. Stop. After you return the reviewed JSON and explicitly approve the merge, run `merge`.

If skills are not discovered automatically in another agent environment, tell the agent to read
`.agents/skills/crime-script-generator/SKILL.md` before starting. Do not ask a general chat model to
produce only `candidate.json`: the evidence and research-log files are required parts of the
validated workflow.

## Manual end-to-end trial for CLI development

You normally do not need these steps when using the skill: the agent performs them. This manual
walkthrough is useful when developing or diagnosing the CLI itself. It uses the public Dutch
starter bundle as read-only input and creates the workspace in a temporary directory:

```sh
BUNDLE="$PWD/packages/gui/public/starter-bundles/nl.json"
WORKSPACE="$(mktemp -d)/document-check"

crime-script-generator init \
  --bundle "$BUNDLE" \
  --workspace "$WORKSPACE" \
  --script-id generated:nl:script:documentcontrole-test \
  --subject "Fictieve documentcontrole" \
  --purpose "De generator veilig van begin tot eind testen" \
  --geography "Nederland" \
  --content-language nl \
  --classification public \
  --source-sensitivity public \
  --detail orienting \
  --script-icon builtin:document-check \
  --non-interactive

crime-script-generator prepare --workspace "$WORKSPACE"
crime-script-generator status --workspace "$WORKSPACE"
```

At this point, `status` reports `write-candidate`. This is expected: the CLI does not invent the
content. A blocked status exits with code `3`, even though it successfully reports the next action.

In this manual walkthrough, this is the point where LLM work would occur. In the preferred
skill-driven workflow, the same agent that ran `init` and `prepare` continues immediately: it reads
`brief.yaml`, `prepared/context.json`, and any converted source materials; researches the subject;
and writes `candidate.json`, `evidence.json`, and `research-log.json`. It then runs `status` and
repairs its authored files until the next action is `build`.

The complete division of work is:

```text
CLI: init -> prepare
LLM/agent: research -> candidate.json + evidence.json + research-log.json
CLI: status -> build
Human: review and edit the standalone JSON in the GUI
CLI: merge after explicit approval
```

The workspace files are:

| File | Written by | Purpose |
|---|---|---|
| `brief.yaml` | CLI during `init` | Scope, classification, source sensitivity, language, and input bundle |
| `prepared/context.json` | CLI during `prepare` | Existing script and taxonomy context for the agent to reuse |
| `candidate.json` | LLM/agent | Script, stages, activities, indicators, measures, and taxonomy additions |
| `evidence.json` | LLM/agent | Sources, supporting passages, provenance, hashes, and claim-to-node links |
| `research-log.json` | LLM/agent | Search decisions, visited URLs, contradictions, and missing perspectives |

The JSON Schemas and shape-only examples are in
[`../../.agents/skills/crime-script-generator/`](../../.agents/skills/crime-script-generator/).
Do not treat the example source or placeholder evidence as actual research.

Run `status` while authoring. Its `--json` output is convenient for tooling:

```sh
crime-script-generator status --workspace "$WORKSPACE" --json
```

When it reports `build`, create a standalone file:

```sh
STANDALONE="$WORKSPACE/documentcontrole.standalone.json"
crime-script-generator build --workspace "$WORKSPACE" --output "$STANDALONE"
```

Import the standalone JSON into the crime-script GUI, review and edit it, assign reviewers, and
export the reviewed JSON. Then merge that reviewed file:

```sh
REVIEWED="$HOME/Downloads/documentcontrole.standalone.json"
crime-script-generator merge \
  --workspace "$WORKSPACE" \
  --standalone "$REVIEWED" \
  --yes
```

Only pass `--yes` after reviewing the exact file being merged. The command writes a new bundle
beside the source bundle; it does not overwrite the source.

## Add local source material

Pass a material directory during initialization:

```sh
crime-script-generator init \
  --bundle "$BUNDLE" \
  --workspace "$WORKSPACE" \
  --materials "/absolute/path/to/materials"
```

Markdown, text, and CSV files are read directly. DOCX, PDF, and XLSX conversion uses a local
`docling` executable when available. Restricted documents must remain local and must not be
uploaded to an external conversion service.

After material changes, rerun:

```sh
crime-script-generator prepare --workspace "$WORKSPACE"
```

Changed sources mark linked evidence as `needs-review`; removed sources become `orphaned`.

## Update an existing script

Initialize with both IDs set to the existing script ID:

```sh
crime-script-generator init \
  --bundle "$BUNDLE" \
  --workspace "$WORKSPACE" \
  --script-id nl-starter:script:arbeidsuitbuiting \
  --existing-script-id nl-starter:script:arbeidsuitbuiting \
  --subject "Arbeidsuitbuiting" \
  --purpose "Bestaand script actualiseren" \
  --geography "Nederland" \
  --content-language nl \
  --classification restricted \
  --source-sensitivity restricted \
  --detail practical \
  --script-icon builtin:labour-exploitation \
  --non-interactive
```

Reuse each retained node's `existingId`. List deliberate removals in `script.removeIds`; omission
alone never deletes an existing node. Classification changes and removals need explicit build
confirmation after the exact changes have been reviewed.

## Common failures

| Result | Action |
| --- | --- |
| `prepare-required` | Rerun `prepare`, then reconcile changed context or material |
| `write-candidate` | Create `candidate.json`; the CLI deliberately does not generate it |
| `add-evidence` | Complete source records, claims, and both closing research checks |
| `fix-candidate` | Correct the reported schema, taxonomy, hierarchy, safety, or content issue |
| `output-exists` | Choose a new output path; overwrite only with explicit approval |
| `review` | Open the standalone JSON in the GUI and review it |
| `merge` | Merge the reviewed standalone file after approval |

Exit codes are stable: `0` success, `3` invalid or incomplete authored data, `4` stale prepared
state, `5` existing output, `6` document conversion failure, and `7` missing confirmation.

For evidence policy, update safeguards, merge review answers, and recovery procedures, see the
[skill reference](../../.agents/skills/crime-script-generator/REFERENCE.md).
