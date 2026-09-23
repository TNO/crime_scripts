import type {
  ConditionType,
  ContentLanguage,
  DataModel,
  ID,
  LITERATURE_TYPE,
  ScriptClassification,
  TaxonomyName,
} from '@crime-script/core';

export const WORKSPACE_SCHEMA_VERSION = 1;
export const BRIEF_SCHEMA_VERSION = 1;
export const CANDIDATE_SCHEMA_VERSION = 1;
export const EVIDENCE_SCHEMA_VERSION = 1;
export const RESEARCH_LOG_SCHEMA_VERSION = 1;

export type SourceSensitivity = 'public' | 'restricted';
export type DetailLevel = 'orienting' | 'practical' | 'operational';
export type EvidenceState = 'valid' | 'needs-review' | 'orphaned' | 'invalid';

export type GeneratorBrief = {
  schemaVersion: 1;
  bundlePath: string;
  scriptId: ID;
  subject: string;
  purpose: string;
  geography: string;
  contentLanguage: ContentLanguage;
  classification: ScriptClassification;
  sourceSensitivity: SourceSensitivity;
  detail: DetailLevel;
  scriptIcon: string;
  focus?: string[];
  exclusions?: string[];
  materialDirectory?: string;
  recursiveMaterials?: boolean;
  existingScriptId?: ID;
};

export type CandidateTaxonomyItem = {
  key: string;
  id?: ID;
  label: string;
  description?: string;
  synonyms?: string[];
  parentKeys?: string[];
};

export type CandidateTaxonomies = Record<TaxonomyName, CandidateTaxonomyItem[]>;

export type CandidateActivity = {
  key: string;
  existingId?: ID;
  event: string;
  observableTraces: string[];
  decisionPoint?: string;
  parentKey?: string;
  castKeys?: string[];
  attributeKeys?: string[];
  transportKeys?: string[];
};

export type CandidateIndicator = {
  key: string;
  existingId?: ID;
  observation: string;
  corroboration: string[];
  alternativeExplanations: string[];
  relevance: string;
};

export type CandidateMeasure = {
  key: string;
  existingId?: ID;
  label: string;
  category: string;
  partnerKeys: string[];
  decisionMoment: string;
  intendedEffect: string;
};

export type CandidateCondition = {
  key: string;
  existingId?: ID;
  label: string;
  description?: string;
  type: ConditionType;
};

export type CandidateVariant = {
  key: string;
  existingId?: ID;
  label: string;
  description?: string;
  locationKeys?: string[];
  activities: CandidateActivity[];
  indicators?: CandidateIndicator[];
  measures?: CandidateMeasure[];
  conditions?: CandidateCondition[];
};

export type CandidateStage = {
  key: string;
  existingId?: ID;
  label: string;
  description: string;
  core?: boolean;
  variants: CandidateVariant[];
};

export type CandidateFile = {
  schemaVersion: 1;
  script: {
    label: string;
    description: string;
    owner?: string;
    productKeys?: string[];
    geoLocationKeys?: string[];
    stages: CandidateStage[];
    removeIds?: ID[];
  };
  taxonomies: CandidateTaxonomies;
  safetyReview: {
    containsStepByStepInstructions: false;
    containsExploitableParameters: false;
    containsEvasionTactics: false;
    notes: string;
  };
};

export type EvidencePassage = {
  text: string;
  locator?: string;
};

export type EvidenceSource = {
  key: string;
  existingId?: ID;
  title: string;
  kind: 'web' | 'local';
  state: EvidenceState;
  url?: string;
  filename?: string;
  publisher?: string;
  authors?: string;
  literatureType?: LITERATURE_TYPE;
  publicationDate?: string;
  accessedAt?: string;
  contentHash: string;
  reliability: string;
  secondaryHistorical?: boolean;
  passages: EvidencePassage[];
};

export type EvidenceClaim = {
  nodeKey: string;
  sourceKeys: string[];
  note?: string;
  state?: EvidenceState | 'unsubstantiated-after-human-edit';
};

export type EvidenceFile = {
  schemaVersion: 1;
  sources: EvidenceSource[];
  claims: EvidenceClaim[];
};

export type ResearchLogFile = {
  schemaVersion: 1;
  entries: Array<{
    query?: string;
    url?: string;
    visitedAt: string;
    decision: 'accepted' | 'rejected';
    reason: string;
  }>;
  contradictionSearchCompleted: boolean;
  missingPerspectiveSearchCompleted: boolean;
};

export type PreparedSource = {
  sourcePath: string;
  markdownPath: string;
  sourceHash: string;
  markdownHash: string;
  converter: 'direct' | 'docling';
  converterVersion?: string;
};

export type WorkspaceState = {
  schemaVersion: 1;
  bundleHash: string;
  targetScriptHash?: string;
  briefHash: string;
  preparedAt: string;
  normalizedBundlePath: string;
  contextPath: string;
  materials: PreparedSource[];
  evidenceInputHashes: Record<string, string>;
};

export type GeneratorContext = {
  schemaVersion: 1;
  brief: GeneratorBrief;
  taxonomies: CandidateTaxonomies;
  existingScript?: DataModel['crimeScripts'][number];
  sourceSummary: {
    scriptCount: number;
    classificationCounts: Record<ScriptClassification, number>;
  };
};

export type GeneratorIssue = {
  code: string;
  path: string;
  message: string;
  severity: 'error' | 'warning';
};

export type StatusResult = {
  ok: boolean;
  issues: GeneratorIssue[];
  nextAction: 'prepare' | 'write-candidate' | 'add-evidence' | 'fix-candidate' | 'build' | 'review' | 'merge';
  artifacts: Record<string, string>;
};
