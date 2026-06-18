# Politisk blogg-mal (politisk-blogg-template)

Rolig, redaksjonell one-page blogg med manifest, temaoversikt og en liste med
innlegg. Klones for hver ny kunde via Studio-portalen. Ren statisk side, ingen
byggsteg, hostes f.eks. på Netlify.

## Slik henger det sammen
- `content/innhold.json` styrer rammen: toppmeny, forside, manifest og temaoversikt.
- `content/innlegg/` har ett innlegg per fil (`<slug>.json`) pluss en `index.json`
  som er lista over innlegg. Portalen vedlikeholder index.json automatisk.
- `index.html` viser forside + innleggsliste. `innlegg.html?slug=...` viser ett innlegg.

Alt redigeres i Studio-portalen (ingen koding). Når kunden publiserer, committer
portalen til dette repoet, og Netlify bygger siden live.

## Slik tas den i bruk
1. Push denne mappen til GitHub som repoet **`politisk-blogg-template`**.
2. GitHub -> repoets **Settings** -> hak av **"Template repository"**.
3. Malen er allerede registrert i portalen (`src/lib/templates.ts`, key `politisk-blogg`).
4. I portalen: **+ Ny side** -> velg malen **"Politisk blogg"** -> hak av
   "Opprett GitHub-repo automatisk fra mal".
5. Koble repoet til Netlify (publish dir = reporoten, ingen build command).

## Felter (allerede i mal-registeret)
- info: navn, tittel, ingress, ctaTekst, heroBilde, epost, facebook
- manifestTittel (overskrift), manifest (rik tekst)
- temaer (liste: tittel, beskrivelse)
- innlegg (samling: tittel, dato, ingress, bilde, brødtekst) - hvert innlegg en egen fil

## SEO-merknad
Enkeltinnlegg setter tittel/meta/Open Graph via JavaScript ved innlasting.
Det er greit for en opinionsblogg. Vil du ha forhåndsrendret SEO (server-side),
er neste steg å bygge malen med Astro/Eleventy.

---
Laget av [helene.cloud](https://helene.cloud)
