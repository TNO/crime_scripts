# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are RIEC crime-scripting working groups and partner analysts. They use PAX while investigating criminal phenomena and concrete cases to model criminal processes, compare case information with known crime scripts, and identify useful prevention barriers.

## Product Purpose

PAX Crime Scripting helps practitioners structure knowledge about how crimes are carried out, reuse that knowledge when examining a case, and identify points where a criminal process can be disrupted. Success means users can turn complex case and phenomenon information into a navigable script, find relevant scripts efficiently, and derive practical prevention measures without surrendering control of sensitive information.

## Positioning

PAX connects scenes and their variants with actors, activities, attributes, conditions, locations, evidence, and prevention measures in one structured crime-script model. That model supports both case-to-script matching and the identification of intervention points instead of treating crime analysis as an unstructured document exercise.

## Operating Context

- Working groups build and review crime scripts around criminal phenomena and operational case information.
- Users browse and filter scripts by products, geographic locations, and activity locations; full-text and case searches lead to matching scenes and acts.
- Editors create and revise scripts, stages, act variants, tracks, activities, conditions, references, barriers, and related taxonomies.
- Users can inspect scripts in the browser and export a script to Word or JSON.
- The complete model can be imported from or exported to JSON. Users can also create an encoded permalink when they intentionally choose to share a model.
- A prominent public/restricted script mode groups counterparts by stable family identity. Public exports exclude restricted content, while restricted exports require an explicit warning confirmation and cannot be shared through permanent links.
- The interface supports Dutch and English, light and dark themes, and user, editor, and administrator modes.

## Capabilities and Constraints

- Data is stored in the browser's local storage rather than a product backend. Users remain responsible for safeguarding exported files and links.
- Sensitive case information must remain user-controlled and must not be shared with third parties unless a user takes an explicit export or sharing action.
- A generated permalink contains an encoded model in its URL; users must treat that URL as sensitive when the model contains operational information.
- The current role selector is a client-side prototype behavior, not confirmed access control or authentication.
- The product must keep the training burden low for practitioners who may use it only occasionally.
- Crime-script terminology and the Situational Crime Prevention classification are part of the working method and should remain methodologically coherent.
- The application is a TypeScript single-page web application built with Mithril, Meiosis, and `mithril-materialized`.
- PAX is a research prototype supplied as-is for evaluation; availability, functionality, and quality are not guaranteed as production-service commitments.

## Brand Commitments

- Product name: PAX Crime Scripting; short name: PAX.
- TNO owns and provides the research prototype, developed with contributions from RIECs.
- TNO and PAX names and the existing TNO and PAX logo assets are established identifiers.
- Product language should be direct, professional, and understandable to public-sector practitioners in both Dutch and English.

## Evidence on Hand

- Product and development overview: `README.md` and `packages/gui/README.md`.
- Product name, navigation, role modes, local persistence, search, and model workflows: `packages/gui/src/services/` and `packages/gui/src/components/`.
- Crime-script domain model and terminology: `packages/gui/src/models/data-model.ts`.
- Dutch and English product copy and Situational Crime Prevention terminology: `packages/gui/src/services/lang/`.
- Research status, intended evaluation context, ownership, and usage conditions: `packages/gui/src/components/about-page.ts`.
- PAX and TNO identity assets: `packages/gui/src/assets/logo.svg`, `packages/gui/src/assets/tno.svg`, and `packages/gui/src/assets/tno_white.svg`.
- No testimonials, validated outcome metrics, production-service guarantees, or public customer claims are present and future work must not fabricate them.

## Product Principles

1. Turn complex criminal processes into structured, traceable models that practitioners can navigate and reuse.
2. Keep sensitive operational information under the user's control, with sharing always intentional.
3. Connect analysis to prevention by making intervention points and relevant measures explicit.
4. Make occasional use viable through recognizable terminology, clear workflows, and low training burden.
5. Preserve methodological credibility and distinguish research findings from unverified product claims.
