# KundeRadar V2 – gratis, statisk webapp

V2 bygger videre på V1. Ingen betalte API'er, database, backend eller build-værktøjer er nødvendige.

## Nyheder
- Vælg mellem **Verificerede muligheder** og **Fiktive demoeksempler**.
- Verificerede muligheder læses fra `data/opportunities.json`.
- Tomme rigtige data vises ærligt som tom liste, ikke som opdigtede udbud.
- Hvert verificeret opslag skal have originalkilde og datoer; ugyldige poster afvises.
- Søgning, filtre, sortering, favoritter og præferencer er bevaret.

## Test i browseren
1. Åbn siden: 'Verificerede muligheder' viser **0**, da JSON-filen starter tom.
2. Skift til 'Prøv med fiktive eksempler': der vises **12** kort med mærket FIKTIVT EKSEMPEL.
3. Søg `rengøring`, filtrér på Midtjylland, sorter efter frist, gem en mulighed og genindlæs siden.
4. Skift tilbage til 'Verificerede muligheder': der vises ikke fiktive kort.
5. Åbn browserens udviklerværktøjer og kontrollér for fejl, hvis noget ikke virker.

## Sådan lægger du V2 på eksisterende GitHub/Cloudflare
1. Pak `KundeRadar-v2.zip` ud.
2. Gå til dit eksisterende GitHub-repository `kunderadar-v1`.
3. Vælg **Add file → Upload files**.
4. Upload **index.html, styles.css, app.js, data.js og mappen data med opportunities.json**. Erstat eksisterende filer. `README.md` kan også opdateres.
5. VIGTIGT: `data/opportunities.json` skal ligge i mappen `data` (ikke i rodmappen).
6. Klik **Commit changes**. Cloudflare Pages deployer automatisk efter commit.
7. Åbn din eksisterende `*.pages.dev`-adresse, og genindlæs eventuelt med Ctrl+F5.

Hvis GitHub-webupload ikke bevarer undermappen, kan du oprette `data/opportunities.json` direkte via **Add file → Create new file** og skrive `data/opportunities.json` som filnavn, indsætte `[]` og committe.

## Sådan tilføjer du en verificeret mulighed
Redigér `data/opportunities.json` til en JSON-liste med poster i dette format:

```json
[
  {
    "id": "unik-kilde-id-123",
    "title": "PRÆCIS titel fra originalopslaget",
    "description": "Kort, faktuelt resumé af opslaget",
    "category": "Rengøring",
    "region": "Midtjylland",
    "city": "Aarhus",
    "issuer": "Navn på faktisk ordregiver",
    "publishedAt": "2026-11-14",
    "deadline": "2026-12-01",
    "sourceName": "Navn på originalkilden",
    "sourceUrl": "https://eksempel.dk/originalt-opslag",
    "isDemo": false
  }
]
```

**Dette er en formatillustration – IKKE en rigtig mulighed.** Kopiér ikke eksemplet til produktion. Kontrollér at titel, ordregiver, datoer, URL og rettigheder er korrekte, før en post publiceres. Brug kun lovligt tilgængelige og verificerede kilder. Appen indhenter ikke automatisk udbud; tilføj poster manuelt i V2. Der findes endnu ikke AI-matching, abonnement, login eller notifikationer.

## Teknisk
- `index.html` bruger `app.js` som ES-module.
- `data.js` validerer poster og loader JSON med `fetch('./data/opportunities.json')`.
- `styles.css` er responsivt.
- Browserens `localStorage` gemmer favoritter og præferencer på den aktuelle enhed.
- Hosting: Cloudflare Pages gratis plan inden for gældende grænser.
