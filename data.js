/**
 * Data adapter contract for future public tender integrations.
 * Each opportunity: {id,title,description,category,region,city,issuer,publishedAt,deadline,sourceName,sourceUrl,isDemo}.
 * Replace DEMO_OPPORTUNITIES with verified, legally reusable source records.
 * Do not imply these demo records are real tenders.
 */
export const DEMO_OPPORTUNITIES = [
{id:'demo-001',title:'Daglig rengøring af kontorbygninger',description:'Illustrativ opgave om løbende rengøring af kontorlokaler, møderum og fællesarealer.',category:'Rengøring',region:'Midtjylland',city:'Aarhus',issuer:'Fiktiv Ejendomsdrift A/S',publishedAt:'2026-11-12',deadline:'2026-12-18'},
{id:'demo-002',title:'Vinduespolering af erhvervsejendomme',description:'Illustrativ rammeaftale om indvendig og udvendig vinduespolering.',category:'Ejendomsservice',region:'Midtjylland',city:'Herning',issuer:'Eksempel Ejendomme',publishedAt:'2026-11-10',deadline:'2026-12-10'},
{id:'demo-003',title:'Rengøring af undervisningslokaler',description:'Illustrativ opgave om periodisk rengøring og hovedrengøring af lokaler.',category:'Rengøring',region:'Nordjylland',city:'Aalborg',issuer:'Eksempel Institution',publishedAt:'2026-11-09',deadline:'2026-12-09'},
{id:'demo-004',title:'Udendørs vedligehold og grønne arealer',description:'Illustrativ opgave om græsslåning, hækklipning og vedligehold.',category:'Ejendomsservice',region:'Syddanmark',city:'Odense',issuer:'Fiktiv Boligforening',publishedAt:'2026-11-07',deadline:'2026-12-20'},
{id:'demo-005',title:'Hovedrengøring af fællesfaciliteter',description:'Illustrativ opgave om grundig rengøring af trappeopgange og fællesrum.',category:'Rengøring',region:'Hovedstaden',city:'København',issuer:'Eksempel Administration',publishedAt:'2026-11-05',deadline:'2026-11-30'},
{id:'demo-006',title:'Vinterservice og glatførebekæmpelse',description:'Illustrativ sæsonopgave med snerydning og saltning.',category:'Ejendomsservice',region:'Sjælland',city:'Roskilde',issuer:'Fiktiv Driftspartner',publishedAt:'2026-11-04',deadline:'2026-12-03'},
{id:'demo-007',title:'IT-support til mindre kontorer',description:'Illustrativ aftale om helpdesk og drift af arbejdsstationer.',category:'IT',region:'Midtjylland',city:'Viborg',issuer:'Eksempel Kontorhus',publishedAt:'2026-11-02',deadline:'2026-12-15'},
{id:'demo-008',title:'Malerarbejde i boligafdeling',description:'Illustrativ opgave om indvendig maling ved fraflytning.',category:'Håndværk',region:'Syddanmark',city:'Esbjerg',issuer:'Fiktiv Boligdrift',publishedAt:'2026-10-30',deadline:'2026-12-12'},
{id:'demo-009',title:'Gulvpleje i erhvervslokaler',description:'Illustrativ opgave om periodisk gulvbehandling og polering.',category:'Rengøring',region:'Midtjylland',city:'Holstebro',issuer:'Eksempel Erhvervspark',publishedAt:'2026-10-28',deadline:'2026-12-21'},
{id:'demo-010',title:'Teknisk tilsyn af ejendomme',description:'Illustrativ serviceaftale om tilsyn og mindre vedligeholdelsesopgaver.',category:'Ejendomsservice',region:'Hovedstaden',city:'Hillerød',issuer:'Fiktiv Ejendomsfond',publishedAt:'2026-10-25',deadline:'2026-12-07'},
{id:'demo-011',title:'Facaderengøring og algebehandling',description:'Illustrativ opgave om rensning af facader og udendørs overflader.',category:'Rengøring',region:'Nordjylland',city:'Hjørring',issuer:'Eksempel Erhvervscenter',publishedAt:'2026-10-22',deadline:'2026-12-05'},
{id:'demo-012',title:'Vedligehold af udearealer ved kontorer',description:'Illustrativ opgave om løbende udendørs service og affaldshåndtering.',category:'Ejendomsservice',region:'Sjælland',city:'Næstved',issuer:'Fiktiv Servicegruppe',publishedAt:'2026-10-20',deadline:'2026-12-28'}
].map(item=>({...item,sourceName:'Demo – ingen originalkilde',sourceUrl:null,isDemo:true}));

export async function loadOpportunities(){
  // FUTURE INTEGRATION: replace with fetch('/data/opportunities.json') from an authorized data pipeline.
  // Normalize source records to the adapter contract and validate URLs and dates.
  return DEMO_OPPORTUNITIES;
}
