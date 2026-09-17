# 0004 Author Dutch starter scripts

Status: open
Priority: high
Subsystem: content
Depends on: 0003

## Context

Create an openly publishable Dutch starter library containing ten well-developed, AI-assisted crime scripts. The private v30 model must not be used because it contains private scripts. Every script must be synthesized from reputable public sources and clearly marked `AI-gegenereerd` and `Onbeoordeeld`.

The intended users are Dutch public-sector practitioners with HBO or MBO backgrounds. Use clear, concise B2 Dutch while preserving domain precision. Public content must support prevention and investigation without giving step-by-step offending instructions, evasion tactics, or exploitable operational parameters.

## Acceptance Criteria

- The bundle contains these ten distinct scripts:
  1. Cocaine import through seaports.
  2. Synthetic-drug production.
  3. Labour exploitation.
  4. Human trafficking for sexual exploitation.
  5. Money laundering through legitimate businesses.
  6. Illegal chemical-waste dumping.
  7. Poaching and illegal wildlife trade.
  8. Vehicle theft and export.
  9. Phishing/payment fraud.
  10. Illegal asbestos removal.
- Every script uses at least two reputable public sources. Prefer open official and open-access sources, but allow uniquely authoritative books or paywalled articles.
- Sources include title, authors/organization, URL where available, bibliographic details, summary, and optional `Used for` notes.
- Sources are summarized rather than copied. External source licenses and copyrights are respected.
- Each script has stable namespaced IDs, a Dutch language value, permanent AI provenance, and an unreviewed marker.
- Each script has approximately 5–8 meaningful scenes and source-supported actors, activities, conditions, indicators, and practical prevention measures with responsible partners.
- Every script is assessed for meaningful alternative routes. Variants/tracks are included only where the evidence supports them, without a quota.
- Geographic tags describe applicability rather than every source jurisdiction.
- Shared taxonomies contain all referenced items plus a small reusable baseline, with stable IDs and no dangling references.
- The public starter content is licensed CC BY 4.0 and includes appropriate attribution and disclaimer text.
- An icon-requirements manifest lists a stable icon ID and concise visual description for every script and scene. Semantically equivalent scenes may share an icon requirement.
- A source/editorial review confirms B2 readability, internal consistency, public suitability, and the absence of unsupported citations.

## Implementation Notes

- Do not use private content from `/Users/erik.vullings/Downloads/2026-09-17_v030_crime_scripts.json`.
- Strong international sources are allowed. Use Dutch wording and cite Dutch sources when they exist.
- Keep source material only in the top-level script bibliography; do not add entity-level citation fields.
- The content may initially reference icon IDs that `0005` will fulfill.
- The final deployed bundle is assembled and released by `0006`.

## Agent Notes

- 2026-09-17: Topic slate and editorial boundary were agreed during the design interview. Labour exploitation and trafficking for sexual exploitation are intentionally separate scripts.
