import { situationCrimePreventionClassificationTable } from '../abstract';

export const messages = {
  HOME: { TITLE: 'Home', ROUTE: '/home' },
  ABOUT: { TITLE: 'About the app', ROUTE: '/about', TEXT: situationCrimePreventionClassificationTable },
  CRIME_SCRIPT: { TITLE: 'Crime script', ROUTE: '/crime_script' },
  SETTINGS: { TITLE: 'Settings', ROUTE: '/settings' },
  LANDING: { TITLE: 'Introduction', ROUTE: '/' },
  CASE: { TITLE: 'Case file', ROUTE: '/case' },
  USER: 'User',
  EDITOR: 'Editor',
  ADMIN: 'Administrator',
  CANCEL: 'Cancel',
  DELETE: 'Delete',
  YES: 'Yes',
  NO: 'No',
  OK: 'Ok',
  NAME: 'Name',
  MISC: 'Miscellaneous',
  DESCRIPTION: 'Description',
  DELETE_ITEM: {
    TITLE: 'Delete {item}',
    DESCRIPTION: 'Are you certain you want to delete this {item}. There is no turning back?',
  },
  EDIT_BUTTON: {
    LABEL: 'Edit',
    TOOLTIP: 'Edit',
  },
  SAVE_BUTTON: {
    LABEL: 'Save',
    TOOLTIP: 'Save unsaved changes',
  },
  MODEL: 'Model',
  TITLE: 'Title',
  AUTHORS: 'Authors',
  LINK: 'Link',
  TYPE: 'Type',
  CAST_TYPE: 'Role type',
  SAVE_SCRIPT: 'Save Script',
  EDIT_SCRIPT: 'Edit Script',
  DELETE_SCRIPT: 'Delete Script',
  NEW_SCRIPT: 'New Script',
  DELETE_SCRIPT_CONFIRM: 'Are you certain you want to delete the script "{name}"?',
  ACTIVITIES: 'Activities',
  CAST: 'Cast',
  CONDITIONS: 'Conditions',
  ATTRIBUTES: 'Attributes',
  MEASURES: 'Measures',
  NEW_ACT: 'New Act',
  PREPARATION_PHASE: 'Preparation Phase',
  PRE_ACTIVITY_PHASE: 'Pre-Activity Phase',
  ACTIVITY_PHASE: 'Activity Phase',
  POST_ACTIVITY_PHASE: 'Post-Activity Phase',
  SUMMARY: 'Summary',
  IMAGE: 'Image',
  ACTIVITY: 'Activity',
  SPECIFY: 'Specify',
  CONDITION: 'Condition',
  CATEGORY: 'Category',
  SELECT: 'Select',
  CREATE: 'Create',
  STAGES: 'Stages',
  STAGE: 'Stage',
  SCENES: 'Scenes',
  SCENE: 'Scene',
  ACTS: 'Acts',
  ACT: 'Act',
  SELECT_ACT_TO_EDIT: 'Select act to edit',
  CREATE_NEW_ACT: 'Create new act',
  REFERENCES: 'References',
  DETAILS: 'Details',
  LANGUAGE: 'Language',
  CLEAR: 'Clear model',
  UPLOAD: 'Upload model as JSON',
  DOWNLOAD: 'Download model as JSON',
  PERMALINK: 'Create permanent link',
  ROLE: 'Role',
  SELECT_ACT: 'Select act to edit',
  SELECT_ACT_N: 'Select one or more acts for this step',
  /** Crime Prevention Techniques */
  INCREASE_EFFORT: 'Increase the effort',
  TARGET_HARDEN: {
    TITLE: 'Target harden',
    DESC: 'Steering column locks and ignition immobilizers, Anti-robbery screens, Tamper-proof packaging',
  },
  CONTROL_ACCESS: {
    TITLE: 'Control access to facilities',
    DESC: 'Entry phones, Electronic card access, Baggage screening',
  },
  SCREEN_EXITS: {
    TITLE: 'Screen exits',
    DESC: 'Ticket needed for exit, Export documents, Electronic merchandise tags',
  },
  DEFLECT_OFFENDERS: {
    TITLE: 'Deflect offenders',
    DESC: 'Street closures, Separate bathrooms for women, Disperse pubs',
  },
  CONTROL_TOOLS: {
    TITLE: 'Control tools/weapons',
    DESC: '"Smart" guns, Restrict spray paint sales to juveniles, Toughened beer glasses',
  },
  INCREASE_RISKS: 'Increase the risks',
  EXTEND_GUARDIANSHIP: {
    TITLE: 'Extend guardianship',
    DESC: 'Go out in group at night, Leave signs of occupancy, Carry cell phone',
  },
  ASSIST_SURVEILLANCE: {
    TITLE: 'Assist natural surveillance',
    DESC: 'Improved street lighting, Defensible space design, Support whistleblowers',
  },
  REDUCE_ANONYMITY: {
    TITLE: 'Reduce anonymity',
    DESC: 'Taxi driver IDs, "How\'s my driving?" decals, School uniforms',
  },
  USE_PLACE_MANAGERS: {
    TITLE: 'Use place managers',
    DESC: 'CCTV for double-deck buses, Two clerks for convenience stores, Reward vigilance',
  },
  STRENGTHEN_SURVEILLANCE: {
    TITLE: 'Strengthen formal surveillance',
    DESC: 'Red light cameras, Burglar alarms, Security guards',
  },
  REDUCE_REWARDS: 'Reduce the rewards',
  CONCEAL_TARGETS: {
    TITLE: 'Conceal targets',
    DESC: 'Off-street parking, Gender-neutral phone directories, Unmarked armored trucks',
  },
  REMOVE_TARGETS: {
    TITLE: 'Remove targets',
    DESC: "Removable car radio, Women's shelters, Pre-paid cards for pay phones",
  },
  IDENTIFY_PROPERTY: {
    TITLE: 'Identify property',
    DESC: 'Property marking, Vehicle licensing and parts marking, Cattle branding',
  },
  DISRUPT_MARKETS: {
    TITLE: 'Disrupt markets',
    DESC: 'Monitor pawn shops, Controls on classified ads, License street vendors',
  },
  DENY_BENEFITS: {
    TITLE: 'Deny benefits',
    DESC: 'Ink merchandise tags, Graffiti cleaning, Disabling stolen cell phones',
  },
  REDUCE_PROVOCATIONS: 'Reduce provocations',
  REDUCE_FRUSTRATIONS: {
    TITLE: 'Reduce frustrations and stress',
    DESC: 'Efficient lines, Polite service, Expanded seating, Soothing music/muted lights',
  },
  AVOID_DISPUTES: {
    TITLE: 'Avoid disputes',
    DESC: 'Separate seating for rival soccer fans, Reduce crowding in bars, Fixed cab fares',
  },
  REDUCE_TEMPTATION: {
    TITLE: 'Reduce temptation and arousal',
    DESC: 'Controls on violent pornography, Enforce good behavior on soccer field, Prohibit racial slurs',
  },
  NEUTRALIZE_PRESSURE: {
    TITLE: 'Neutralize peer pressure',
    DESC: '"Idiots drink and drive", "It\'s OK to say No", Disperse troublemakers at school',
  },
  DISCOURAGE_IMITATION: {
    TITLE: 'Discourage imitation',
    DESC: 'Rapid repair of vandalism, V-chips in TVs, Censor details of modus operandi',
  },
  REMOVE_EXCUSES: 'Remove excuses',
  SET_RULES: {
    TITLE: 'Set rules',
    DESC: 'Rental agreements, Harassment codes, Hotel registration',
  },
  POST_INSTRUCTIONS: {
    TITLE: 'Post instructions',
    DESC: '"No parking", "Private property", "Extinguish camp fires"',
  },
  ALERT_CONSCIENCE: {
    TITLE: 'Alert conscience',
    DESC: 'Roadside speed display boards, Signatures for customs declarations, "Shoplifting is stealing"',
  },
  ASSIST_COMPLIANCE: {
    TITLE: 'Assist compliance',
    DESC: 'Easy library checkout, Public lavatories, Litter receptacles',
  },
  CONTROL_DRUGS: {
    TITLE: 'Control drugs and alcohol',
    DESC: 'Breathalyzers in bars, Server intervention programs, Alcohol-free events',
  },
  EXPORT_TO_WORD: 'Export to Word',
  INTRODUCTION: 'Introduction',
  SEARCH: 'Search...',
  SEARCH_TOOLTIP: 'Type / to search',
  HITS: {
    0: 'No results found',
    1: '1 result found',
    n: '{n} results found',
  },
  SYNONYMS: 'Synonyms',
  PARENTS: 'Parents',
  CATEGORIES: 'Categories',
  BELONGS_TO: 'Belongs to',
  PRODUCTS: { 0: 'Products', 1: 'Product', n: 'Products' },
  LOCATIONS: { 0: 'Locations', 1: 'Location', n: 'Locations' },
  GEOLOCATIONS: { 0: 'Geographic Locations', 1: 'Geographic Location', n: 'Geographic Locations' },
  TRANSPORTS: 'Transports',
  I18n: {
    editRepeat: '',
    createRepeat: '',
    deleteItem: '',
    agree: '',
    disagree: '',
    pickOne: '',
    pickOneOrMore: '',
    cancel: '',
    save: '',
  },
  OTHER: 'Other',
};
