from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional

class ClinicalMeasurementsSchema(BaseModel):
    hba1c: Optional[float] = None
    fasting_glucose: Optional[float] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    bmi: Optional[float] = None
    egfr: Optional[float] = None
    creatinine: Optional[float] = None
    platelets: Optional[int] = None

class PatientConsentSchema(BaseModel):
    status: str
    consent_type: str
    signed_at: str
    revoked_at: Optional[str] = None
    consent_hash: str

class BlockchainCommitmentSchema(BaseModel):
    data_digest: str
    tx_id: str
    block_number: int
    channel: str = "clinical-trials"
    chaincode: str = "patient-recruitment-contract"
    registered_at: str
    msp_id: str
    is_verified: bool = True

class PatientSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    age: int
    gender: str
    ethnicity: str
    primary_diagnosis: str
    icd10: str
    secondary_diagnoses: List[str] = []
    measurements: Dict[str, Any]
    medications: List[str] = []
    institution: str
    institution_msp: str
    consent: Optional[PatientConsentSchema] = None
    blockchain: Optional[BlockchainCommitmentSchema] = None

class TrialCreateSchema(BaseModel):
    title: str = Field(..., min_length=5)
    phase: str
    sponsor: str
    description: str
    target_diagnosis: str
    target_icd10: Optional[str] = None
    age_min: int = Field(18, ge=0, le=120)
    age_max: int = Field(85, ge=0, le=120)
    required_consent_type: str = "GENERAL_RECRUITMENT"
    measurement_ranges: Dict[str, Any] = {}
    inclusion_criteria: List[str] = []
    exclusion_criteria: List[str] = []
    target_enrollment: int = 100

class TrialSchema(TrialCreateSchema):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str = "RECRUITING"

class RecruitmentEvaluateRequest(BaseModel):
    trial_id: str
    researcher_id: Optional[str] = "USR-PI-01"
    researcher_name: Optional[str] = "Dr. Evelyn Vance"
    researcher_role: Optional[str] = "Principal Investigator"

class CriterionEvaluationSchema(BaseModel):
    id: str
    name: str
    category: str
    requirement: str
    actual_value: str
    status: str
    explanation: str

class EligibilityResultSchema(BaseModel):
    patient_id: str
    status: str
    match_score: int
    criteria_evaluations: List[CriterionEvaluationSchema]
    summary: str
    evaluated_at: str

class RecruitmentSummarySchema(BaseModel):
    total_evaluated: int
    potentially_eligible: int
    borderline_review: int
    ineligible: int
    consent_disqualified: int
    match_rate_pct: float

class RecruitmentEvaluateResponse(BaseModel):
    trial_id: str
    summary: RecruitmentSummarySchema
    results: List[EligibilityResultSchema]

class ConsentUpdateRequest(BaseModel):
    patient_id: str
    new_status: str # GRANTED, WITHDRAWN, RESTRICTED, EXPIRED
    actor_role: Optional[str] = "Compliance Officer"

class IntegrityVerifyRequest(BaseModel):
    patient_id: str

class IntegrityVerifyResponse(BaseModel):
    patient_id: str
    is_valid: bool
    computed_digest: str
    on_chain_digest: str
    tx_id: str
    block_number: int
    details: str
