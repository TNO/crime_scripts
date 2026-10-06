# PAX built-in icon catalogue

All icons in this directory are original PAX Crime Scripting repository artwork or user-contributed artwork authorized for publication under the repository MIT license. Source SVGs for the eight user-contributed icons (biogas-digester, company-registry-document, dangerous-dog, dog, freight-truck, hospital, pitbull, and shipping-container) and nine independently drawn icons (asbestos-fibers, blast, bribe, clothing, gang, lab-flask, mortgage-house, oil-drop, and souvenir-shop) are retained in `packages/gui/src/assets/icons/`. No Noun Project or other third-party artwork is included in this catalogue.

The older multi-symbol pictograms have been replaced by single-subject artwork at their existing keys. This also applies to scene-specific icons, so previously saved bundles continue to resolve the same keys. Their source templates and mappings are in `packages/gui/scripts/rework-composite-icons.mjs`.

Every SVG was normalized and optimized with SVGO 4.0.0 using `packages/gui/svgo.config.mjs`. Machine-readable provenance is recorded in `catalogue.json`.
