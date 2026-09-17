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

Legacy JSON models with a top-level `acts` collection are migrated when loaded. Scene, variant, and track IDs are preserved, while a reused legacy act is copied into each owning script so later edits cannot affect another script. Newly saved and exported models use `schemaVersion: 2`.

## Deployment to GitHub docs

```bash
pnpm i
npm run build:domain
```
