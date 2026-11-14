# KundeRadar v1 – gratis prototype

En responsiv, dansk webapp uden frameworks, betalte API'er eller krav om database. **Alle 12 muligheder er fiktive eksempeldata** og må ikke fremstilles som faktiske udbud.

## Funktioner
- Søgning i titel, beskrivelse, udsteder og geografi
- Filtre for branche og region; sortering efter dato, frist eller titel
- Gem favoritter og præferencer lokalt i browseren (`localStorage`)
- Mobilvenligt dashboard og tydelig demo-markering
- Dataadapter i `data.js` klar til senere integration af verificerede udbud

## Test lokalt
Da appen bruger JavaScript-moduler, skal den åbnes via en lokal webserver, ikke ved at dobbeltklikke på `index.html`.

Med Python installeret:

```bash
cd kunderadar-v1
python -m http.server 8000
```

Åbn http://localhost:8000 i browseren.

Alternativt kan du bruge VS Code med en gratis lokal webserver-udvidelse.

## Gratis offentliggørelse på Cloudflare Pages
1. Opret en gratis GitHub-konto på https://github.com/ og en gratis Cloudflare-konto på https://dash.cloudflare.com/.
2. Opret et nyt **public eller private** repository på GitHub, fx `kunderadar-v1`.
3. Upload filerne `index.html`, `styles.css`, `app.js`, `data.js` til repositoryets rod (ikke som ZIP-fil).
4. I Cloudflare: **Workers & Pages → Create → Pages → Connect to Git** (menunavne kan ændres).
5. Vælg dit GitHub-repository og godkend forbindelsen.
6. Brug framework preset **None**, lad build command stå tom, og sæt output directory til `/` eller repositoryets rod, hvis feltet kræves.
7. Klik **Save and Deploy**. Efter deployment får du typisk en gratis `*.pages.dev`-adresse.
8. Åbn adressen på både mobil og computer. Test søgning, filtre og gemte muligheder.

**Alternativ:** Cloudflare Pages Direct Upload kan også bruges til statiske filer, hvis Git-forbindelsen ikke er tilgængelig.

Ingen betalingskort er nødvendige for selve koden. Tjek altid udbyderens aktuelle gratis plan og eventuelle krav ved tilmelding.

## Fra demo til rigtige offentlige udbud
`data.js` definerer et normaliseret dataformat med felterne:

`id, title, description, category, region, city, issuer, publishedAt, deadline, sourceName, sourceUrl, isDemo`

1. Undersøg de **aktuelle** muligheder, tilladelser og vilkår for adgang til udbudsdata via https://udbud.dk/ og andre officielle kilder. Antag ikke, at fri scraping eller et offentligt API er tilladt.
2. Lav en serverbaseret, lovlig importproces (eller begynd med manuelt verificerede muligheder).
3. Valider data og kildelinks, fjern dubletter, og noter hvornår data sidst er kontrolleret.
4. Publicér et JSON-datasæt, fx `/data/opportunities.json`, og udskift `loadOpportunities()` med et `fetch()` til dette datasæt.
5. Vis kun `isDemo: false` for faktisk verificerede opslag. Link altid til originalkilden.
6. Overvej senere login, serverdatabase, abonnement og opdateringsjobs. Disse dele er **ikke** implementeret i v1.

## Begrænsninger
- Ingen faktiske udbud eller live-data endnu.
- Ingen login, betaling, automatiske notifikationer eller AI-matching.
- Gemte muligheder synkroniseres ikke mellem enheder og kan forsvinde, hvis browserdata slettes.
- Fiktive deadlines og match-tal må ikke bruges til beslutninger om reelle opgaver.

## Filoversigt
- `index.html` – struktur og indhold
- `styles.css` – layout og responsivt design
- `app.js` – interaktiv funktionalitet
- `data.js` – eksempeldata og fremtidig integrationskontrakt
