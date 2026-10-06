# PAX built-in icon catalogue

Except for the nine Noun Project SVGs listed below, the catalogue contains original PAX Crime Scripting repository artwork or user-contributed artwork authorized for publication under the repository MIT license. Source SVGs for the eight user-contributed icons (biogas-digester, company-registry-document, dangerous-dog, dog, freight-truck, hospital, pitbull, and shipping-container) are retained in `packages/gui/src/assets/icons/`.

Earlier original artwork is retained for the non-scene catalogue icons, including money laundering and illegal dumping. Scene-specific multi-symbol pictograms remain replaced by single-subject artwork at their existing keys, so previously saved bundles continue to resolve the same keys. Their source templates and mappings are in `packages/gui/scripts/rework-composite-icons.mjs`.

The following Noun Project images are used under [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/) (CC BY 3.0), **not** the repository's MIT license. Each SVG is the unmodified vector download supplied by Noun Project. These are interim images pending replacement with new artwork:

| File | Icon and attribution |
| --- | --- |
| `asbestos-fibers.svg` | [Asbestos Exposure](https://thenounproject.com/icon/asbestos-exposure-8074144/) by Mia Elysia |
| `blast.svg` | [blast](https://thenounproject.com/icon/blast-6297938/) by Gacem Tachfin |
| `bribe.svg` | [bribe](https://thenounproject.com/icon/bribe-26816/) by Luis Prado |
| `clothing.svg` | [clothing](https://thenounproject.com/icon/clothing-5260292/) by Iconbunny |
| `gang.svg` | [gang](https://thenounproject.com/icon/gang-3859536/) by WEBTECHOPS LLP |
| `lab-flask.svg` | [lab](https://thenounproject.com/icon/lab-6650883/) by Dwi Budiyanto |
| `mortgage-house.svg` | [mortage](https://thenounproject.com/icon/mortage-7360676/) by Ridwan Hamdani |
| `oil-drop.svg` | [Oil](https://thenounproject.com/icon/oil-7301814/) by okta |
| `souvenir-shop.svg` | [Souvenir shop](https://thenounproject.com/icon/souvenir-shop-4687505/) by Eucalyp |

The other catalogue SVGs were normalized and optimized with SVGO 4.0.0 using `packages/gui/svgo.config.mjs`. Machine-readable provenance is recorded in `catalogue.json`.
