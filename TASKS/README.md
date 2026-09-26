# Tasks

## Data-model simplification

- [x] 0001 Embed acts in crime scripts
- [x] 0002 Simplify crime-script creation

## Starter library

These tasks are implemented in order because content depends on the starter infrastructure, the icon catalogue depends on the authored content's icon requirements, and final integration depends on both.

- [x] 0003 Build starter-library infrastructure
- [x] 0004 Author Dutch starter scripts *(needs 0003)*
- [x] 0005 Build reusable icon catalogue *(needs 0004)*
- [x] 0006 Integrate and verify starter bundle *(needs 0005)*

## Assisted authoring

This does not block the starter-library release but follows it in the current implementation sequence.

- [x] 0007 Add LLM-assisted script wizard *(needs 0003)*
- [x] 0009 Build agent crime-script generator *(needs 0007, 0008)*
- [x] 0010 Simplify script navigation *(needs 0001, 0002)*

## Reporting and visualisation

The structured Word report establishes the shared report model used by the
barrier visualisation, so these tasks are implemented sequentially.

- [x] 0011 Redesign Word report *(needs 0010)*
- [x] 0012 Add barrier-model export *(needs 0011)*

## Viewer UX

This follow-up builds on the shared scene navigation from 0010 and requires the
track interaction and activity-group terminology to be agreed before coding.

- [x] 0013 Improve crime-script visualization *(needs 0010)*

## Restricted workflows

Restricted content remains outside the public repository; only classification, mode, safeguards, and assembly tooling are versioned here.

- [x] 0008 Add restricted script mode *(needs 0007)*
