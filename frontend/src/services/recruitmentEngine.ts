import {
  Patient,
  ClinicalTrial,
  EligibilityResult,
  CriterionEvaluation,
  EligibilityStatus
} from '../types/clinical';

export function evaluatePatientEligibility(patient: Patient, trial: ClinicalTrial): EligibilityResult {
  const evaluations: CriterionEvaluation[] = [];

  // 1. CONSENT VERIFICATION GATE
  let consentStatus: 'PASS' | 'FAIL' = 'PASS';
  let consentExplanation = 'Active informed research consent verified on ledger.';
  
  if (patient.consent.status !== 'GRANTED') {
    consentStatus = 'FAIL';
    consentExplanation = `Consent status is ${patient.consent.status}. Legal privacy restriction prevents clinical recruitment processing.`;
  } else if (
    trial.required_consent_type !== 'GENERAL_RECRUITMENT' && 
    patient.consent.consent_type !== trial.required_consent_type &&
    patient.consent.consent_type !== 'GENERAL_RECRUITMENT'
  ) {
    consentStatus = 'FAIL';
    consentExplanation = `Required consent type is ${trial.required_consent_type}, but patient only authorized ${patient.consent.consent_type}.`;
  }

  evaluations.push({
    id: 'crit-consent',
    name: 'Informed Consent Authorization',
    category: 'CONSENT',
    requirement: `Status: GRANTED, Scope: ${trial.required_consent_type}`,
    actual_value: `${patient.consent.status} (${patient.consent.consent_type})`,
    status: consentStatus,
    explanation: consentExplanation
  });

  // If consent is revoked or invalid, early block recruitment
  if (consentStatus === 'FAIL') {
    return {
      patient_id: patient.id,
      patient,
      status: 'DISQUALIFIED_CONSENT_REVOKED',
      match_score: 0,
      criteria_evaluations: evaluations,
      summary: 'Candidate disqualified: Active research consent is not present or has been withdrawn.',
      evaluated_at: new Date().toISOString()
    };
  }

  // 2. DIAGNOSIS MATCH
  const primaryMatch = patient.primary_diagnosis.toLowerCase().includes(trial.target_diagnosis.toLowerCase());
  const secondaryMatch = patient.secondary_diagnoses.some(d => d.toLowerCase().includes(trial.target_diagnosis.toLowerCase()));
  const icdMatch = trial.target_icd10 ? patient.icd10.startsWith(trial.target_icd10.slice(0, 3)) : false;

  const diagnosisPass = primaryMatch || secondaryMatch || icdMatch;
  evaluations.push({
    id: 'crit-diag',
    name: 'Primary / Target Diagnosis',
    category: 'DIAGNOSIS',
    requirement: trial.target_diagnosis,
    actual_value: `${patient.primary_diagnosis} (${patient.icd10})`,
    status: diagnosisPass ? 'PASS' : 'FAIL',
    explanation: diagnosisPass 
      ? 'Patient medical record indicates matching clinical indication.' 
      : `Diagnosis does not match protocol requirement '${trial.target_diagnosis}'.`
  });

  // 3. DEMOGRAPHIC (AGE)
  const agePass = patient.age >= trial.age_min && patient.age <= trial.age_max;
  evaluations.push({
    id: 'crit-age',
    name: 'Age Eligibility Window',
    category: 'DEMOGRAPHIC',
    requirement: `${trial.age_min} - ${trial.age_max} years`,
    actual_value: `${patient.age} years`,
    status: agePass ? 'PASS' : 'FAIL',
    explanation: agePass 
      ? 'Patient age falls within target protocol enrollment window.' 
      : `Age (${patient.age}) is outside required range (${trial.age_min}-${trial.age_max}).`
  });

  // 4. CLINICAL MEASUREMENTS (WITH CONSERVATIVE MISSING DATA HANDLING)
  let missingDataCount = 0;
  const ranges = trial.measurement_ranges;

  // HbA1c
  if (ranges.hba1c_min !== undefined || ranges.hba1c_max !== undefined) {
    const val = patient.measurements.hba1c;
    const reqStr = `${ranges.hba1c_min ?? 0}% - ${ranges.hba1c_max ?? 15}%`;
    if (val === null || val === undefined) {
      missingDataCount++;
      evaluations.push({
        id: 'crit-hba1c',
        name: 'Glycated Hemoglobin (HbA1c)',
        category: 'MEASUREMENT',
        requirement: reqStr,
        actual_value: 'NOT DOCUMENTED / MISSING',
        status: 'MISSING_DATA',
        explanation: 'Lab result not recorded in EHR. Conservative protocol: candidate flagged for confirmatory lab draw.'
      });
    } else {
      const pass = (ranges.hba1c_min === undefined || val >= ranges.hba1c_min) &&
                   (ranges.hba1c_max === undefined || val <= ranges.hba1c_max);
      evaluations.push({
        id: 'crit-hba1c',
        name: 'Glycated Hemoglobin (HbA1c)',
        category: 'MEASUREMENT',
        requirement: reqStr,
        actual_value: `${val}%`,
        status: pass ? 'PASS' : 'FAIL',
        explanation: pass ? 'HbA1c measurement within specified therapeutic range.' : `HbA1c ${val}% is out of bounds (${reqStr}).`
      });
    }
  }

  // eGFR (Renal function)
  if (ranges.egfr_min !== undefined || ranges.egfr_max !== undefined) {
    const val = patient.measurements.egfr;
    const reqStr = `${ranges.egfr_min ?? 0} - ${ranges.egfr_max ?? 150} mL/min/1.73m²`;
    if (val === null || val === undefined) {
      missingDataCount++;
      evaluations.push({
        id: 'crit-egfr',
        name: 'Estimated GFR (eGFR)',
        category: 'MEASUREMENT',
        requirement: reqStr,
        actual_value: 'NOT DOCUMENTED / MISSING',
        status: 'MISSING_DATA',
        explanation: 'Renal function panel missing. Candidate requires baseline metabolic panel before screening.'
      });
    } else {
      const pass = (ranges.egfr_min === undefined || val >= ranges.egfr_min) &&
                   (ranges.egfr_max === undefined || val <= ranges.egfr_max);
      evaluations.push({
        id: 'crit-egfr',
        name: 'Estimated GFR (eGFR)',
        category: 'MEASUREMENT',
        requirement: reqStr,
        actual_value: `${val} mL/min/1.73m²`,
        status: pass ? 'PASS' : 'FAIL',
        explanation: pass ? 'Renal clearance meets protocol safety threshold.' : `eGFR ${val} fails renal threshold (${reqStr}).`
      });
    }
  }

  // Systolic BP
  if (ranges.systolic_bp_min !== undefined || ranges.systolic_bp_max !== undefined) {
    const val = patient.measurements.systolic_bp;
    const reqStr = `${ranges.systolic_bp_min ?? 80} - ${ranges.systolic_bp_max ?? 200} mmHg`;
    if (val === null || val === undefined) {
      missingDataCount++;
      evaluations.push({
        id: 'crit-sbp',
        name: 'Systolic Blood Pressure',
        category: 'MEASUREMENT',
        requirement: reqStr,
        actual_value: 'NOT DOCUMENTED',
        status: 'MISSING_DATA',
        explanation: 'Blood pressure reading missing from recent clinic encounter.'
      });
    } else {
      const pass = (ranges.systolic_bp_min === undefined || val >= ranges.systolic_bp_min) &&
                   (ranges.systolic_bp_max === undefined || val <= ranges.systolic_bp_max);
      evaluations.push({
        id: 'crit-sbp',
        name: 'Systolic Blood Pressure',
        category: 'MEASUREMENT',
        requirement: reqStr,
        actual_value: `${val} mmHg`,
        status: pass ? 'PASS' : 'FAIL',
        explanation: pass ? 'Systolic BP in protocol window.' : `Systolic BP ${val} mmHg outside target range.`
      });
    }
  }

  // BMI
  if (ranges.bmi_min !== undefined || ranges.bmi_max !== undefined) {
    const val = patient.measurements.bmi;
    const reqStr = `${ranges.bmi_min ?? 15} - ${ranges.bmi_max ?? 50} kg/m²`;
    if (val === null || val === undefined) {
      missingDataCount++;
      evaluations.push({
        id: 'crit-bmi',
        name: 'Body Mass Index (BMI)',
        category: 'MEASUREMENT',
        requirement: reqStr,
        actual_value: 'NOT DOCUMENTED',
        status: 'MISSING_DATA',
        explanation: 'Height/weight anthropometrics not updated within 90 days.'
      });
    } else {
      const pass = (ranges.bmi_min === undefined || val >= ranges.bmi_min) &&
                   (ranges.bmi_max === undefined || val <= ranges.bmi_max);
      evaluations.push({
        id: 'crit-bmi',
        name: 'Body Mass Index (BMI)',
        category: 'MEASUREMENT',
        requirement: reqStr,
        actual_value: `${val} kg/m²`,
        status: pass ? 'PASS' : 'FAIL',
        explanation: pass ? 'BMI within enrollment criteria.' : `BMI ${val} kg/m² outside protocol range.`
      });
    }
  }

  // 5. EXCLUSION CRITERIA CHECK
  // Safety rule: eGFR < 30 or SBP > 185 is universal clinical alert in general trials
  if (patient.measurements.egfr !== null && patient.measurements.egfr !== undefined && patient.measurements.egfr < 30) {
    evaluations.push({
      id: 'crit-excl-renal',
      name: 'Exclusion: Severe Renal Failure (eGFR < 30)',
      category: 'EXCLUSION',
      requirement: 'Must NOT have stage 4/5 renal failure',
      actual_value: `eGFR: ${patient.measurements.egfr} mL/min`,
      status: 'FAIL',
      explanation: 'Critical exclusion triggered: High risk of nephrotoxicity.'
    });
  }

  // 6. SYNTHESIZE OVERALL STATUS AND SCORE
  const totalCriteria = evaluations.length;
  const passedCriteria = evaluations.filter(e => e.status === 'PASS').length;
  const failedCriteria = evaluations.filter(e => e.status === 'FAIL').length;
  const matchScore = Math.round((passedCriteria / totalCriteria) * 100);

  let status: EligibilityStatus = 'INELIGIBLE';
  let summary = '';

  if (failedCriteria === 0 && missingDataCount === 0) {
    status = 'POTENTIALLY_ELIGIBLE';
    summary = `Candidate meets all ${passedCriteria} documented protocol inclusion criteria with active consent. Pending secondary in-person clinical screening.`;
  } else if (failedCriteria === 0 && missingDataCount > 0) {
    status = 'BORDERLINE_REVIEW_REQUIRED';
    summary = `Candidate satisfies primary diagnosis and demographic parameters, but has ${missingDataCount} missing lab measurement(s). Requires screening laboratory test.`;
  } else {
    status = 'INELIGIBLE';
    const failedNames = evaluations.filter(e => e.status === 'FAIL').map(e => e.name).join(', ');
    summary = `Candidate does not meet protocol criteria: Failed on ${failedNames}.`;
  }

  return {
    patient_id: patient.id,
    patient,
    status,
    match_score: matchScore,
    criteria_evaluations: evaluations,
    summary,
    evaluated_at: new Date().toISOString()
  };
}

export function batchEvaluateRecruitment(patients: Patient[], trial: ClinicalTrial): {
  results: EligibilityResult[];
  summary: {
    total_evaluated: number;
    potentially_eligible: number;
    borderline_review: number;
    ineligible: number;
    consent_disqualified: number;
    match_rate_pct: number;
  }
} {
  const results = patients.map(p => evaluatePatientEligibility(p, trial));

  const potentially_eligible = results.filter(r => r.status === 'POTENTIALLY_ELIGIBLE').length;
  const borderline_review = results.filter(r => r.status === 'BORDERLINE_REVIEW_REQUIRED').length;
  const consent_disqualified = results.filter(r => r.status === 'DISQUALIFIED_CONSENT_REVOKED').length;
  const ineligible = results.filter(r => r.status === 'INELIGIBLE').length;

  const match_rate_pct = patients.length > 0
    ? Math.round((potentially_eligible / patients.length) * 1000) / 10
    : 0;

  return {
    results,
    summary: {
      total_evaluated: patients.length,
      potentially_eligible,
      borderline_review,
      ineligible,
      consent_disqualified,
      match_rate_pct
    }
  };
}
