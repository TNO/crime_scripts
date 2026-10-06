# PAX built-in icon catalogue

Except for the nine PNG icons listed below, the catalogue contains original PAX Crime Scripting repository artwork or user-contributed artwork authorized for publication under the repository MIT license. Source SVGs for the eight user-contributed icons (biogas-digester, company-registry-document, dangerous-dog, dog, freight-truck, hospital, pitbull, and shipping-container) are retained in `packages/gui/src/assets/icons/`.

The older multi-symbol pictograms have been replaced by single-subject artwork at their existing keys. This also applies to scene-specific icons, so previously saved bundles continue to resolve the same keys. Their source templates and mappings are in `packages/gui/scripts/rework-composite-icons.mjs`.

The following Noun Project images are used under [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/) (CC BY 3.0), **not** the repository's MIT license. Each PNG is the unmodified 512-pixel preview supplied by Noun Project. These are interim images pending replacement with new artwork:

| File | Icon and attribution |
| --- | --- |
| `asbestos-fibers.png` | [Asbestos Exposure](https://thenounproject.com/icon/asbestos-exposure-8074144/) by Mia Elysia |
| `blast.png` | [blast](https://thenounproject.com/icon/blast-6297938/) by Gacem Tachfin |
| `bribe.png` | [bribe](https://thenounproject.com/icon/bribe-26816/) by Luis Prado |
| `clothing.png` | [clothing](https://thenounproject.com/icon/clothing-5260292/) by Iconbunny |
| `gang.png` | [gang](https://thenounproject.com/icon/gang-3859536/) by WEBTECHOPS LLP |
| `lab-flask.png` | [lab](https://thenounproject.com/icon/lab-6650883/) by Dwi Budiyanto |
| `mortgage-house.png` | [mortage](https://thenounproject.com/icon/mortage-7360676/) by Ridwan Hamdani |
| `oil-drop.png` | [Oil](https://thenounproject.com/icon/oil-7301814/) by okta |
| `souvenir-shop.png` | [Souvenir shop](https://thenounproject.com/icon/souvenir-shop-4687505/) by Eucalyp |

The remaining catalogue SVGs were normalized and optimized with SVGO 4.0.0 using `packages/gui/svgo.config.mjs`. Machine-readable provenance is recorded in `catalogue.json`.
