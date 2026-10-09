export type ConsentStatus = 'GRANTED' | 'WITHDRAWN' | 'RESTRICTED' | 'EXPIRED';
export type ConsentType = 'GENERAL_RECRUITMENT' | 'CARDIOMETABOLIC_ONLY' | 'ONCOLOGY_ONLY';

export interface ClinicalMeasurements {
  hba1c?: number | null;
  fasting_glucose?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  bmi?: number | null;
  egfr?: number | null;
  creatinine?: number | null;
  platelets?: number | null;
  [key: string]: number | null | undefined;
}

export interface PatientConsent {
  status: ConsentStatus;
  consent_type: ConsentType;
  signed_at: string;
  revoked_at?: string | null;
  consent_hash: string;
}

export interface BlockchainCommitment {
  data_digest: string;
  tx_id: string;
  block_number: number;
  channel: string;
  chaincode: string;
  registered_at: string;
  msp_id: string;
  is_verified?: boolean;
  tampered_field?: string | null;
}

export interface Patient {
  id: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  ethnicity: string;
  primary_diagnosis: string;
  icd10: string;
  secondary_diagnoses: string[];
  measurements: ClinicalMeasurements;
  medications: string[];
  institution: string;
  institution_msp: string;
  consent: PatientConsent;
  blockchain: BlockchainCommitment;
}

export interface MeasurementRanges {
  hba1c_min?: number;
  hba1c_max?: number;
  fasting_glucose_min?: number;
  fasting_glucose_max?: number;
  systolic_bp_min?: number;
  systolic_bp_max?: number;
  diastolic_bp_min?: number;
  diastolic_bp_max?: number;
  bmi_min?: number;
  bmi_max?: number;
  egfr_min?: number;
  egfr_max?: number;
  creatinine_min?: number;
  creatinine_max?: number;
  platelets_min?: number;
  platelets_max?: number;
}

export interface ClinicalTrial {
  id: string;
  title: string;
  phase: string;
  sponsor: string;
  description: string;
  target_diagnosis: string;
  target_icd10?: string;
  age_min: number;
  age_max: number;
  required_consent_type: ConsentType;
  measurement_ranges: MeasurementRanges;
  inclusion_criteria: string[];
  exclusion_criteria: string[];
  target_enrollment: number;
  status: 'RECRUITING' | 'ACTIVE' | 'COMPLETED' | 'DRAFT';
}

export type CriterionStatus = 'PASS' | 'FAIL' | 'MISSING_DATA';
export type EligibilityStatus = 
  | 'POTENTIALLY_ELIGIBLE' 
  | 'BORDERLINE_REVIEW_REQUIRED' 
  | 'INELIGIBLE' 
  | 'DISQUALIFIED_CONSENT_REVOKED';

export interface CriterionEvaluation {
  id: string;
  name: string;
  category: 'CONSENT' | 'DIAGNOSIS' | 'DEMOGRAPHIC' | 'MEASUREMENT' | 'EXCLUSION';
  requirement: string;
  actual_value: string;
  status: CriterionStatus;
  explanation: string;
}

export interface EligibilityResult {
  patient_id: string;
  patient: Patient;
  status: EligibilityStatus;
  match_score: number; // 0 - 100%
  criteria_evaluations: CriterionEvaluation[];
  summary: string;
  evaluated_at: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  event_type: 
    | 'RECORD_REGISTERED_ON_CHAIN'
    | 'RECRUITMENT_SEARCH_EXECUTED'
    | 'CONSENT_GRANTED'
    | 'CONSENT_WITHDRAWN'
    | 'RECORD_INTEGRITY_VERIFIED'
    | 'INTEGRITY_VIOLATION_DETECTED'
    | 'TRIAL_CREATED';
  actor_id: string;
  actor_name: string;
  actor_role: string;
  institution_msp: string;
  details: string;
  tx_id?: string;
  block_number?: number;
  is_blockchain_tx: boolean;
  status: 'COMMITTED' | 'RECORDED' | 'ALERT';
}

export type UserRole = 
  | 'PI'          // Principal Investigator
  | 'COORDINATOR' // Clinical Research Coordinator
  | 'COMPLIANCE'  // Data Privacy & Compliance Officer
  | 'AUDITOR';    // Independent Auditor
