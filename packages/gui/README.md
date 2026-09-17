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

## Deployment to GitHub docs

```bash
pnpm i
npm run build:domain
```
