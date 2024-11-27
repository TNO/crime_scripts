import { ICONS } from './icons';

export type DataModel = {
  version: number;
  lastUpdate: number;
  crimeScripts: CrimeScript[];
  cast: Cast[];
  attributes: CrimeScriptAttributes[];
  locations: CrimeLocation[];
  geoLocations: GeographicLocation[];
  products: Product[];
  transports: Transport[];
  opportunities: Opportunity[];
  indicators: Indicator[];
  partners: Partner[];
  serviceProviders: ServiceProvider[];
  acts: Act[];
};

export const defaultModel: DataModel = {
  version: 1,
  lastUpdate: new Date().valueOf(),
  crimeScripts: [],
  cast: [],
  attributes: [],
  locations: [],
  geoLocations: [],
  products: [],
  transports: [],
  opportunities: [],
  indicators: [],
  partners: [],
  serviceProviders: [],
  acts: [],
};

export enum STATUS {
  FIRST_DRAFT = 1,
  READY_FOR_REVIEW,
  UNDER_REVIEW,
  REVIEWED,
  FINISHED,
}

export enum LITERATURE_TYPE {
  CASE_STUDY = 1,
  THESIS,
  REPORT,
  TECHNICAL_REPORT,
  PRODUCER_WEBSITE,
  WHITE_PAPER,
  CONFERENCE_PROCEEDING,
  PATENT,
  POPULAR_MEDIA,
  CONSENSUS_STATEMENT,
  EMPERICAL_PR,
  REVIEW_PR,
  SYSTEMATIC_REVIEW_PR,
  META_ANALYSIS_PR,
}

export type SearchResult = {
  crimeScriptIdx: number;
  totalScore: number;
  acts: {
    actIdx: number;
    phaseIdx: number;
    score: number;
  }[];
};

export enum SearchScore {
  EXACT_MATCH = 3,
  PARENT_MATCH = 2,
  OTHER_MATCH = 1,
}

export type FlexSearchResult = [crimeScriptIdx: number, actIdx: number, phaseIdx: number, score: number, desc?: string];

export type CrimeScriptFilter = {
  productIds: ID[];
  geoLocationIds: ID[];
  locationIds: ID[];
  roleIds: ID[];
  attributeIds: ID[];
  transportIds: ID[];
};

export type ID = string;

export type Labeled = {
  id: ID;
  label: string;
  description?: string;
  /** If true, has a description */
  hasDesc?: boolean;
  /** Abbreviation */
  abbrev?: string;
  /** Data image, base64 encoded */
  url?: string;
  /** Icon */
  icon?: ICONS;
};

export type Literature = Labeled & {
  authors?: string;
  type?: LITERATURE_TYPE;
};

export type CrimeScript = Labeled & {
  owner: ID;
  /** Epoch time when last updated */
  updated: number;
  reviewer: ID[];
  status: STATUS;
  /** Literature referred to in this article */
  literature: Literature[];
  /** Stages in the crime script */
  stages: Stage[];
  productIds: ID[];
  /** Geographic locations on the map */
  geoLocationIds?: ID[];
};

export type Measure = Labeled & {
  /** Category the measure belongs to, e.g. situational crime prevention or other */
  cat: string;
  partners: ID[];
};

export enum ATTRIBUTE_TYPE {
  /**
   * A set of tools, machinery, or apparatus used for a specific purpose.
   * Examples: Computers, laboratory equipment, gym machines.
   */
  EQUIPMENT = 1,
  /**
   * Handheld devices or instruments used to perform specific tasks.
   * Examples: Hammer, screwdriver, pliers.
   */
  TOOLS,
  /**
   * Wearable items or personal apparatus designed for specific functions, protection, or performance enhancement.
   * Examples: Diving suit, overalls, helmet, safety harness, sports gear.
   */
  GEAR,
  /**
   * Electronic items designed for communication, computing, and multimedia purposes.
   * Examples: Smartphones, tablets, laptops, smartwatches.
   */
  DEVICES,
  /** Supplementary items that add functionality or compliance to a primary item or system (e.g., license plates, phone cases). */
  ACCESSORIES,
  /** Official documents and records used for legal, financial, and administrative purposes (e.g., accounting books, contracts, manuals) */
  DOCUMENTATION,
  CYBER,
  OTHER,
}

export type Transport = Labeled & Hierarchical;

export type Product = Labeled & Hierarchical;

export type GeographicLocation = Labeled & Hierarchical;

export type Opportunity = Labeled & Hierarchical;

export type Indicator = Labeled & Hierarchical;

export type Partner = Labeled & Hierarchical;

export type ServiceProvider = Labeled & Hierarchical;

export type CrimeLocation = Labeled & Hierarchical;

export type CrimeScriptAttributes = Labeled & Hierarchical;

/**
 * A crime script consists of different stages, where a stage is a distinct segment
 * in a sequence where various activities (acts) occur, and it also suggests the
 * possibility of different approaches or methods being used to achieve similar
 * outcomes within that segment.
 */
export type Stage = {
  /** Currently selected Act ID */
  id: ID;
  /** Act IDs of all variants */
  ids: ID[];
};

export type Act = Labeled & {
  /** Overarching act, such as for financial dealings or generic stuff */
  isGeneric?: boolean;
  /** Locations to perform the activity */
  locationIds?: ID[];
  /** Barriers or measures to prevent or stop crime */
  measures: Measure[];
  /** Opportunities related to the act */
  opportunities: Opportunity[];
  /** Indicator of the act */
  indicators: Indicator[];
  /** A list of activities that takes place in this phase */
  activities: Activity[];
  // description: string[];
  conditions: Condition[];
};

export type ActivityPhase = {
  label: string;
  /** Locations to perform the activity */
  locationIds?: ID[];
  /** A list of activities that takes place in this phase */
  activities: Activity[];
  // description: string[];
  conditions: Condition[];
};

export enum ActivityType {
  NONE = 0,
  HAS_CAST = 1,
  HAS_ATTRIBUTES = 2,
  HAS_TRANSPORT = 4,
  HAS_SERVICE_PROVIDER = 8,
  // HAS_CAST_ATTRIBUTES = 4,
}

export type Activity = Labeled & {
  /** Header, purely to organize content into two levels */
  header?: boolean;
  type?: ActivityType | ActivityType[];
  cast?: ID[];
  attributes?: ID[];
  /** Service providers */
  sp: ID[];
  transports?: ID[];
};

export type Hierarchical = { synonyms?: string[]; parents?: ID[] };

export type Cast = Labeled & Hierarchical;

// export enum CastType {
//   Individual = 'Individual',
//   Organisation = 'Organisation',
//   Role = 'Role',
// }

// export const CastTypeOptions = [
//   { id: CastType.Individual, label: 'Individual' },
//   { id: CastType.Organisation, label: 'More than one or group' },
//   // { id: CastType.Role, label: 'Role' },
// ];

export type Condition = Labeled & {
  type: ConditionType;
};

export enum ConditionType {
  Prerequisite = 'Prerequisite',
  Facilitator = 'Facilitator',
  Enforcement = 'Enforcement',
}

export const ConditionTypeOptions = [
  { id: ConditionType.Prerequisite, label: 'Prerequisite' },
  { id: ConditionType.Facilitator, label: 'Facilitator' },
  { id: ConditionType.Enforcement, label: 'Enforcement' },
];

export type Skill = Labeled & {
  level: LevelType;
};

export enum LevelType {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Expert = 'Expert',
}

export const LevelTypeOptions = [
  { id: LevelType.Beginner, label: 'Beginner' },
  { id: LevelType.Intermediate, label: 'Intermediate' },
  { id: LevelType.Expert, label: 'Expert' },
];
