import { situationCrimePreventionClassificationTableNL } from '../abstract';
import { messages } from './en';

export const messagesNL: typeof messages = {
  LANDING_CASES: { TITLE: 'Case management', DESC: 'Voer uw zaak in en vind de meest relevante misdaadscripts.' },
  LANDING_HAND: { TITLE: 'Samenwerken', DESC: 'Werk samen om misdaden op te lossen en te voorkomen.' },
  LANDING_SECURITY: {
    TITLE: 'Veiligheid voorop',
    DESC: 'Alle misdaadscripts worden opgeslagen in een lokaal bestand en gecached in uw browser. Geen wachtwoord vereist, geen informatiedeling met derden. Dit bestand dient u natuurlijk wel zelf veilig te beheeren.',
  },
  HOME: { TITLE: 'Home', ROUTE: '/home' },
  ABOUT: { TITLE: 'Over de app', ROUTE: '/over', TEXT: situationCrimePreventionClassificationTableNL },
  CRIME_SCRIPT: { TITLE: 'Crime script', ROUTE: '/crime_script' },
  SETTINGS: { TITLE: 'Instellingen', ROUTE: '/instellingen' },
  LANDING: { TITLE: 'Introductie', ROUTE: '/' },
  CASE: { TITLE: 'Casus', ROUTE: '/casus' },
  USER: 'Gebruiker',
  EDITOR: 'Redacteur',
  ADMIN: 'Beheerder',
  CANCEL: 'Annuleren',
  DELETE: 'Verwijderen',
  YES: 'Ja',
  NO: 'Nee',
  OK: 'Ok',
  NAME: 'Naam',
  MISC: 'Overig',
  DESCRIPTION: 'Beschrijving',
  DELETE_ITEM: {
    TITLE: '{item} verwijderen',
    DESCRIPTION: 'Weet je zeker dat je dit {item} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.',
  },
  EDIT_BUTTON: {
    LABEL: 'Bewerken',
    TOOLTIP: 'Bewerken',
  },
  SAVE_BUTTON: {
    LABEL: 'Opslaan',
    TOOLTIP: 'Wijzigingen opslaan',
  },
  MODEL: 'Model',
  TITLE: 'Titel',
  AUTHORS: 'Auteurs',
  LINK: 'Link',
  TYPE: 'Type',
  CAST_TYPE: 'Roltype',
  SAVE_SCRIPT: 'Script opslaan',
  EDIT_SCRIPT: 'Script bewerken',
  DELETE_SCRIPT: 'Script verwijderen',
  NEW_SCRIPT: 'Nieuw script',
  DELETE_SCRIPT_CONFIRM: 'Weet je zeker dat je het script "{name}" wilt verwijderen?',
  ACTIVITIES: 'Activiteiten',
  CAST: 'Rollen',
  CONDITIONS: 'Voorwaarden',
  ATTRIBUTES: 'Attributen',
  MEASURES: 'Maatregelen',
  NEW_ACT: 'Nieuwe handeling',
  PREPARATION_PHASE: 'Voorbereidingsfase',
  PRE_ACTIVITY_PHASE: 'Voor-activiteitsfase',
  ACTIVITY_PHASE: 'Activiteitsfase',
  POST_ACTIVITY_PHASE: 'Na-activiteitsfase',
  SUMMARY: 'Samenvatting',
  IMAGE: 'Afbeelding',
  ACTIVITY: 'Activiteit',
  SPECIFY: 'Specificeer',
  CONDITION: 'Voorwaarde',
  CATEGORY: 'Categorie',
  SELECT: 'Selecteren',
  CREATE: 'Maken',
  STAGES: 'Fasen',
  STAGE: 'Fase',
  SCENES: 'Scenes',
  SCENE: 'Scene',
  ACTS: 'Actes',
  ACT: 'Acte',
  SELECT_ACT_TO_EDIT: 'Selecteer handeling om te bewerken',
  CREATE_NEW_ACT: 'Nieuwe handeling maken',
  REFERENCES: 'Referenties',
  DETAILS: 'Details',
  LANGUAGE: 'Taal',
  CLEAR: 'Wis model',
  UPLOAD: 'Lees model in als JSON',
  DOWNLOAD: 'Sla model op als JSON',
  PERMALINK: 'Maak permanente link',
  ROLE: 'Rol',
  SELECT_ACT: 'Selecteer act om te bewerken',
  SELECT_ACT_N: 'Selecteer een of meerdere acts in deze stage',

  /** Crime Prevention Techniques */
  INCREASE_EFFORT: 'Verhoog de inspanning',
  TARGET_HARDEN: {
    TITLE: 'Doelversteviging',
    DESC: 'Stuursloten en startonderbrekers, Anti-overval schermen, Manipulatiebestendige verpakking',
  },
  CONTROL_ACCESS: {
    TITLE: 'Controleer toegang tot faciliteiten',
    DESC: 'Deurtelefoons, Elektronische kaart toegang, Bagagecontrole',
  },
  SCREEN_EXITS: {
    TITLE: 'Controleer uitgangen',
    DESC: 'Ticket nodig voor vertrek, Exportdocumenten, Elektronische artikelbeveiliging',
  },
  DEFLECT_OFFENDERS: {
    TITLE: 'Leid overtreders af',
    DESC: 'Straatafsluitingen, Aparte toiletten voor vrouwen, Verspreid pubs',
  },
  CONTROL_TOOLS: {
    TITLE: 'Beheers gereedschappen/wapens',
    DESC: '"Slimme" wapens, Beperk verkoop spuitverf aan jongeren, Geharde bierglazen',
  },
  INCREASE_RISKS: "Verhoog de risico's",
  EXTEND_GUARDIANSHIP: {
    TITLE: 'Breid toezicht uit',
    DESC: "Ga 's nachts in groep uit, Laat tekenen van bewoning achter, Draag een mobiele telefoon",
  },
  ASSIST_SURVEILLANCE: {
    TITLE: 'Ondersteun natuurlijk toezicht',
    DESC: 'Verbeterde straatverlichting, Verdedigbaar ruimteontwerp, Ondersteuning van klokkenluiders',
  },
  REDUCE_ANONYMITY: {
    TITLE: 'Verminder anonimiteit',
    DESC: 'Taxichauffeur ID\'s, "Hoe is mijn rijgedrag?" stickers, Schooluniformen',
  },
  USE_PLACE_MANAGERS: {
    TITLE: 'Gebruik plaatsmanagers',
    DESC: 'CCTV voor dubbeldekkers, Twee bedienden voor gemakswinkels, Beloon waakzaamheid',
  },
  STRENGTHEN_SURVEILLANCE: {
    TITLE: 'Versterk formeel toezicht',
    DESC: "Roodlichtcamera's, Inbraakalarm, Beveiligingspersoneel",
  },
  REDUCE_REWARDS: 'Verminder de beloningen',
  CONCEAL_TARGETS: {
    TITLE: 'Verberg doelen',
    DESC: 'Parkeren buiten de straat, Genderneutrale telefoongidsen, Ongemarkeerde gepantserde vrachtwagens',
  },
  REMOVE_TARGETS: {
    TITLE: 'Verwijder doelen',
    DESC: 'Verwijderbare autoradio, Vrouwenopvang, Prepaidkaarten voor openbare telefoons',
  },
  IDENTIFY_PROPERTY: {
    TITLE: 'Identificeer eigendom',
    DESC: 'Eigendomsmarkering, Voertuigregistratie en onderdelenmarkering, Veemerken',
  },
  DISRUPT_MARKETS: {
    TITLE: 'Verstoor markten',
    DESC: 'Monitor pandjeshuis, Controles op rubrieksadvertenties, Vergunning voor straatverkopers',
  },
  DENY_BENEFITS: {
    TITLE: 'Ontzeg voordelen',
    DESC: 'Inktlabels op artikelen, Graffiti reiniging, Uitschakelen gestolen mobiele telefoons',
  },
  REDUCE_PROVOCATIONS: 'Verminder provocaties',
  REDUCE_FRUSTRATIONS: {
    TITLE: 'Verminder frustraties en stress',
    DESC: 'Efficiënte rijen, Beleefde service, Uitgebreide zitplaatsen, Rustgevende muziek/gedempte verlichting',
  },
  AVOID_DISPUTES: {
    TITLE: 'Vermijd geschillen',
    DESC: 'Gescheiden zitplaatsen voor rivaliserende voetbalfans, Verminder drukte in bars, Vaste taxitarieven',
  },
  REDUCE_TEMPTATION: {
    TITLE: 'Verminder verleiding en opwinding',
    DESC: 'Controles op gewelddadige pornografie, Handhaaf goed gedrag op voetbalveld, Verbied racistische opmerkingen',
  },
  NEUTRALIZE_PRESSURE: {
    TITLE: 'Neutraliseer groepsdruk',
    DESC: '"Idioten drinken en rijden", "Het is OK om Nee te zeggen", Verspreid onruststokers op school',
  },
  DISCOURAGE_IMITATION: {
    TITLE: 'Ontmoedig imitatie',
    DESC: "Snelle reparatie van vandalisme, V-chips in TV's, Censureer details van modus operandi",
  },
  REMOVE_EXCUSES: 'Verwijder excuses',
  SET_RULES: {
    TITLE: 'Stel regels op',
    DESC: 'Huurovereenkomsten, Intimidatiecodes, Hotelregistratie',
  },
  POST_INSTRUCTIONS: {
    TITLE: 'Plaats instructies',
    DESC: '"Parkeren verboden", "Privé-eigendom", "Doof kampvuren"',
  },
  ALERT_CONSCIENCE: {
    TITLE: 'Activeer geweten',
    DESC: 'Snelheidsweergaveborden langs de weg, Handtekeningen voor douaneaangiften, "Winkeldiefstal is stelen"',
  },
  ASSIST_COMPLIANCE: {
    TITLE: 'Help bij naleving',
    DESC: 'Eenvoudige bibliotheekuitleen, Openbare toiletten, Afvalbakken',
  },
  CONTROL_DRUGS: {
    TITLE: 'Beheers drugs en alcohol',
    DESC: "Ademanalysers in bars, Interventie programma's voor barpersoneel, Alcoholvrije evenementen",
  },
  EXPORT_TO_WORD: 'Exporteer naar Word',
  INTRODUCTION: 'Introductie',
  SEARCH: 'Zoek...',
  SEARCH_TOOLTIP: 'Type / om te zoeken',
  HITS: {
    0: 'Geen resultaten gevonden.',
    1: '1 resultaat gevonden:',
    n: '{n} resultaten gevonden:',
  },
  SYNONYMS: 'Synoniemen',
  PARENTS: 'Ouders',
  CATEGORIES: 'Categorieën',
  BELONGS_TO: 'Behoort tot',
  LOCATIONS: { 0: 'Locaties', 1: 'Locatie', n: 'Locaties' },
  PRODUCTS: { 0: 'Producten', 1: 'Product', n: 'Producten' },
  GEOLOCATIONS: { 0: 'Kaartlocatie', 1: 'Kaartlocatie', n: 'Kaartlocaties' },
  TRANSPORTS: 'Transportmiddelen',
  I18n: {
    editRepeat: 'Bewerk item',
    createRepeat: 'Maak een nieuw item',
    deleteItem: 'Verwijder een item',
    agree: 'Ja',
    disagree: 'Nee',
    pickOne: 'Kies één',
    pickOneOrMore: 'Kies één of meer',
    cancel: 'Opheffen',
    save: 'Bewaren',
  },
  OTHER: 'Overig',
  TEXT: 'Tekst',
};
