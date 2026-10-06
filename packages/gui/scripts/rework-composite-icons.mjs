import { readFileSync, writeFileSync } from 'node:fs';

const directory = new URL('../public/icons/', import.meta.url);
const catalogue = JSON.parse(readFileSync(new URL('catalogue.json', directory), 'utf8'));
const original = new Map(catalogue.icons.map(({ file }) => [
  file.slice(0, -4), readFileSync(new URL(file, directory), 'utf8'),
]));
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

const symbols = {
  lock: svg('<path d="M25 43V30a25 25 0 0 1 50 0v13h-9V30a16 16 0 0 0-32 0v13zM18 42h64v49H18z"/><circle cx="50" cy="64" r="7" fill="#fff"/><path d="M46 66h8v12h-8z" fill="#fff"/>'),
  factory: svg('<path d="M9 89V44l24 15V44l24 15V27h31v62zM59 20h24v7H59z"/><path d="M18 71h11v9H18zm21 0h11v9H39zm21 0h11v9H60z" fill="#fff"/>'),
  car: svg('<path d="M16 55 24 31q2-7 10-7h32q8 0 10 7l8 24q8 2 8 11v15H8V66q0-9 8-11zm14-20-6 20h52l-6-20z" fill-rule="evenodd"/><path d="M16 76h15v13H16zm53 0h15v13H69z"/><circle cx="28" cy="66" r="6" fill="#fff"/><circle cx="72" cy="66" r="6" fill="#fff"/>'),
  person: svg('<circle cx="50" cy="27" r="16"/><path d="M18 85V67q0-24 32-24t32 24v18z"/>'),
  search: svg('<path d="M43 10a33 33 0 1 0 0 66 33 33 0 0 0 0-66m0 10a23 23 0 1 1 0 46 23 23 0 0 1 0-46" fill-rule="evenodd"/><path d="m65 62 27 27-8 8-27-27z"/>'),
  mail: svg('<path d="M9 24h82v55H9z"/><path d="m9 30 41 31 41-31v10L50 71 9 40z" fill="#fff"/>'),
  coin: svg('<circle cx="50" cy="50" r="39"/><circle cx="50" cy="50" r="29" fill="#fff"/><path d="M68 31q-10-8-22-4-13 4-17 17H20v7h8v5h-8v7h9q5 14 19 17 11 2 20-5l-5-8q-9 7-17 2-4-2-6-6h19v-7H38v-5h21v-7H40q2-6 7-8 7-4 16 3z"/>'),
  barrel: svg('<ellipse cx="50" cy="21" rx="31" ry="10"/><path d="M19 22h62v57H19z"/><ellipse cx="50" cy="79" rx="31" ry="10"/><path d="M19 39h62v6H19zm0 22h62v6H19z" fill="#fff"/>'),
  suitcase: svg('<path d="M36 17q0-7 7-7h14q7 0 7 7v9h19q8 0 8 8v50q0 7-8 7H17q-8 0-8-7V34q0-8 8-8h19zm9 2v7h10v-7zM20 37v43h60V37z" fill-rule="evenodd"/>'),
  shield: svg('<path d="m50 5 37 14v30q0 31-37 46Q13 80 13 49V19zm0 12L24 27v22q0 23 26 34 26-11 26-34V27z" fill-rule="evenodd"/>'),
  hardhat: svg('<path d="M43 17h14v10q22 4 25 32h8v13H10V59h8q3-28 25-32zm-9 21q-9 9-9 21h50q0-12-9-21v15h-9V29H43v24h-9zM13 76h74v9H13z"/>'),
  phone: svg('<path d="M31 5h38q7 0 7 7v76q0 7-7 7H31q-7 0-7-7V12q0-7 7-7zm3 11v61h32V16zm16 64a5 5 0 1 0 0 10 5 5 0 0 0 0-10" fill-rule="evenodd"/>'),
  bank: svg('<path d="m50 9 45 23v9H5v-9zM10 78h80v9H10zM5 89h90v7H5zM16 44h12v32H16zm28 0h12v32H44zm28 0h12v32H72z"/>'),
  identity: svg('<path d="M9 19h82v62H9z"/><circle cx="36" cy="48" r="11" fill="#fff"/><path d="M20 71q0-13 16-13t16 13zm40-32h23v6H60zm0 13h23v6H60zm0 13h17v6H60z" fill="#fff"/>'),
  card: svg('<path d="M15 23h70q7 0 7 7v40q0 7-7 7H15q-7 0-7-7V30q0-7 7-7z"/><path d="M8 38h84v11H8z" fill="#fff"/><path d="M20 61h28v6H20z" fill="#fff"/>'),
  wrench: svg('<path d="M86 12Q63 4 53 24q-4 9-1 17L15 78a13 13 0 0 0 18 18l38-38q8 3 17-3 15-11 7-30L79 40l-14-4-4-14z"/>'),
  leaf: svg('<path d="M89 9Q39 9 20 33-1 59 25 85q32 19 52-9Q92 54 89 9zM15 93q28-41 64-61-31 12-70 47z"/>'),
  eye: svg('<path d="M2 50Q22 16 50 16T98 50Q78 84 50 84T2 50zm15 0q16 23 33 23t33-23Q67 27 50 27T17 50z" fill-rule="evenodd"/><circle cx="50" cy="50" r="16"/>'),
  package: svg('<path d="m50 6 41 22v45L50 96 9 73V28zm0 12L24 32l26 14 26-14zm-31 24v25l26 15V56zm62 0L55 56v26l26-15z" fill-rule="evenodd"/>'),
  paw: svg('<circle cx="19" cy="34" r="9"/><circle cx="39" cy="20" r="9"/><circle cx="63" cy="20" r="9"/><circle cx="83" cy="34" r="9"/><path d="M50 37q-12 0-19 13L18 69q-6 18 10 21 8 1 22-6 14 7 22 6 16-3 10-21L69 50Q62 37 50 37z"/>'),
  hand: svg('<path d="M19 54q-7-8-13-2-5 5 1 12l22 26q5 6 15 6h19q17 0 20-17l7-29q2-10-6-11-7-1-9 7l-3 10V19q0-10-8-10t-8 10v28h-4V12q0-10-8-10t-8 10v35h-4V23q0-10-8-10t-8 10v44z"/>'),
  wildlife: svg('<path d="M18 68c0-20 15-35 35-35h10l12-15 8 30-12 12v23H58V66H33v17H20zm10-32L15 23v26z"/>'),
  wallet: svg('<path d="M11 20h70v12h6q5 0 5 6v42q0 7-7 7H15q-7 0-7-7V27q0-7 3-7zm9 12h61v-5H20zm40 22v17h32V54z"/><circle cx="74" cy="62" r="4" fill="#fff"/>'),
};

const general = {
  'access-security': 'lock',
  'account-security': 'lock',
  'animal-trafficking': 'wildlife',
  'asbestos-safety': 'asbestos-fibers',
  'car-theft': 'car',
  'construction-safety': 'hardhat',
  'container-inspection': 'shipping-container',
  'finance-check': 'coin',
  'financial-investigation': 'search',
  'hazard-building': 'factory',
  'hazardous-waste': 'barrel',
  'human-trafficking': 'person',
  'illegal-asbestos-removal': 'asbestos-fibers',
  'illegal-dumping': 'barrel',
  laboratory: 'lab-flask',
  'materials-check': 'package',
  'money-laundering': 'bank',
  'nature-monitoring': 'leaf',
  'network-monitoring': 'dependency-network',
  'online-safety': 'shield',
  'payment-fraud': 'card',
  'port-security': 'cargo-ship',
  poaching: 'paw',
  'safe-work': 'hardhat',
  'secure-contact': 'mail',
  'secure-transport': 'freight-truck',
  'site-inspection': 'search',
  'site-safety': 'factory',
  'suspicious-offer': 'mail',
  'vehicle-export': 'car',
  'vehicle-security': 'car',
  'victim-support': 'person',
  'wildlife-protection': 'wildlife',
  'worker-protection': 'hardhat',
  'worker-travel': 'suitcase',
  'phishing-protection': 'shield',
};

const scenes = {
  arbeidsuitbuiting: {
    afhankelijkheid: 'person', controle: 'identity', reis: 'suitcase',
    werk: 'factory', werving: 'mail',
  },
  'cocaine-import-havens': {
    invoer: 'cargo-ship', toegang: 'lock', uithalen: 'shipping-container',
    verstoring: 'wrench', vervoer: 'freight-truck', voorbereiding: 'package',
  },
  'illegale-asbestverwijdering': {
    afvoer: 'freight-truck', inventarisatie: 'search', opdracht: 'identity',
    toezicht: 'eye', verwijdering: 'asbestos-fibers', werknemers: 'hardhat',
  },
  'illegale-dumping-chemisch-afval': {
    dumping: 'barrel', herstel: 'leaf', melding: 'phone',
    ontstaan: 'factory', transport: 'freight-truck', verzameling: 'package',
  },
  'mensenhandel-seksuele-uitbuiting': {
    benadering: 'phone', exploitatie: 'person', isolatie: 'lock',
    opbrengst: 'coin', verplaatsing: 'suitcase',
  },
  'phishing-betaalfraude': {
    betaling: 'card', contact: 'mail', doorgifte: 'phone',
    gegevens: 'identity', respons: 'shield', voorbereiding: 'mail',
  },
  protected: { 'person-response': 'hand' },
  'stroperij-illegale-wildhandel': {
    handel: 'wallet', interventie: 'shield', onttrekking: 'package',
    selectie: 'eye', vervoer: 'freight-truck', verzameling: 'package',
  },
  'synthetische-drugsproductie': {
    afvoer: 'barrel', inrichting: 'lab-flask', locatie: 'factory',
    middelen: 'package', onderzoek: 'search', productie: 'lab-flask',
  },
  'voertuigdiefstal-export': {
    diefstal: 'car', handel: 'coin', identiteit: 'identity',
    opslag: 'lock', opsporing: 'search', selectie: 'eye',
  },
  'witwassen-legale-ondernemingen': {
    administratie: 'identity', bedrijf: 'retail-store', besteding: 'wallet',
    inbreng: 'coin', verplaatsing: 'bank', verstoring: 'wrench',
  },
};

const replacements = new Map(Object.entries(general));
for (const [prefix, stages] of Object.entries(scenes)) {
  for (const [stage, symbol] of Object.entries(stages)) {
    replacements.set(`${prefix}-${stage}`, symbol);
  }
}
const sceneNames = catalogue.icons.filter(({ category }) => category === 'Starter scenes').map(({ file }) => file.slice(0, -4));
if (sceneNames.length !== 59 || sceneNames.some((name) => !replacements.has(name))) {
  throw new Error('A scene icon was not assigned a single subject');
}
for (const [name, replacement] of replacements) {
  const artwork = symbols[replacement] ?? original.get(replacement);
  if (!original.has(name) || !artwork) throw new Error(`Invalid replacement for ${name}: ${replacement}`);
  writeFileSync(new URL(`${name}.svg`, directory), artwork.trim());
}
console.log(`Replaced ${replacements.size} composite icons`);
