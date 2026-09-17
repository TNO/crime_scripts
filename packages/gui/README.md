# Crime Scripts

A web application to create crime scripts.

## Installation

The application is a mono-repository, developed in TypeScript. It typically consists of the following packages:

## Development

```bash
pnpm i
npm start
```

## Crime-script data

Scenes own their activity-group variants directly. Reusable taxonomies such as roles, attributes, transports, locations, products, and partners remain shared across scripts.

Legacy JSON models with a top-level `acts` collection and schema-version-2 models are migrated when loaded. Scene, variant, and track IDs are preserved, while a reused legacy act is copied into each owning script so later edits cannot affect another script. Newly saved and exported models use `schemaVersion: 3`.

On first launch, users choose the fixed Dutch starter library at `/starter-bundles/nl.json` or an empty workspace. Starter imports are explicit and preserve local conflicts by default. Script language, AI/review provenance, starter origin, and source usage notes remain in JSON and Word exports.

The Dutch starter library contains ten AI-assisted, unreviewed public-safety scripts. Its original content is available under CC BY 4.0; third-party bibliography items retain their own rights. See `/starter-bundles/NOTICE.nl.md`. Icon requirements for the separate catalogue work are recorded in `/starter-bundles/icon-requirements.nl.json`.

The application-level icon catalogue is available in `/icons/catalogue.json`, so built-in icons remain available in empty workspaces and single-script exports only need to retain their stable `builtin:*` key. Uploaded images remain embedded as data URLs. Catalogue provenance and licensing are documented in `/icons/NOTICE.md`. Optimize catalogue artwork before committing changes:

```bash
pnpm --dir packages/gui icons:optimize
```

## Deployment to GitHub docs

```bash
pnpm i
npm run build:domain
```
