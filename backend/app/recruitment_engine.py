"""
Server-side deterministic Recruitment & Eligibility Evaluation Engine.
Enforces ICH-GCP informed consent gates, conservative missing lab handling,
and itemized criteria explanations.
"""
from typing import Dict, Any, List, Tuple
from datetime import datetime, timezone
from .schemas import CriterionEvaluationSchema, EligibilityResultSchema

def evaluate_patient_for_trial(patient_data: Dict[str, Any], trial_data: Dict[str, Any]) -> EligibilityResultSchema:
    evaluations: List[CriterionEvaluationSchema] = []
    
    consent = patient_data.get("consent", {})
    consent_status = consent.get("status", "WITHDRAWN")
    consent_type = consent.get("consent_type", "GENERAL_RECRUITMENT")
    required_consent = trial_data.get("required_consent_type", "GENERAL_RECRUITMENT")

    # 1. CONSENT GATE
    consent_pass = True
    explanation = "Active informed research consent verified on ledger."
    if consent_status != "GRANTED":
        consent_pass = False
        explanation = f"Consent status is {consent_status}. Recruitment access legally barred."
    elif required_consent != "GENERAL_RECRUITMENT" and consent_type not in (required_consent, "GENERAL_RECRUITMENT"):
        consent_pass = False
        explanation = f"Required consent type is {required_consent}, but patient authorized {consent_type}."

    evaluations.append(CriterionEvaluationSchema(
        id="crit-consent",
        name="Informed Consent Authorization",
        category="CONSENT",
        requirement=f"Status: GRANTED, Scope: {required_consent}",
        actual_value=f"{consent_status} ({consent_type})",
        status="PASS" if consent_pass else "FAIL",
        explanation=explanation
    ))

    if not consent_pass:
        return EligibilityResultSchema(
            patient_id=patient_data["id"],
            status="DISQUALIFIED_CONSENT_REVOKED",
            match_score=0,
            criteria_evaluations=evaluations,
            summary="Candidate disqualified: Active research consent is not present or has been withdrawn.",
            evaluated_at=datetime.now(timezone.utc).isoformat()
        )

    # 2. DIAGNOSIS MATCH
    target_diag = trial_data.get("target_diagnosis", "").lower()
    patient_diag = patient_data.get("primary_diagnosis", "").lower()
    secondary_diags = [d.lower() for d in patient_data.get("secondary_diagnoses", [])]
    target_icd = trial_data.get("target_icd10", "")
    patient_icd = patient_data.get("icd10", "")

    diag_pass = (
        target_diag in patient_diag or
        any(target_diag in s for s in secondary_diags) or
        (target_icd and patient_icd.startswith(target_icd[:3]))
    )

    evaluations.append(CriterionEvaluationSchema(
        id="crit-diag",
        name="Primary / Target Diagnosis",
        category="DIAGNOSIS",
        requirement=trial_data.get("target_diagnosis", ""),
        actual_value=f"{patient_data.get('primary_diagnosis')} ({patient_icd})",
        status="PASS" if diag_pass else "FAIL",
        explanation="Patient medical record indicates matching clinical indication." if diag_pass else f"Diagnosis does not match protocol requirement '{trial_data.get('target_diagnosis')}'."
    ))

    # 3. AGE WINDOW
    age = patient_data.get("age", 0)
    age_min = trial_data.get("age_min", 18)
    age_max = trial_data.get("age_max", 85)
    age_pass = age_min <= age <= age_max

    evaluations.append(CriterionEvaluationSchema(
        id="crit-age",
        name="Age Eligibility Window",
        category="DEMOGRAPHIC",
        requirement=f"{age_min} - {age_max} years",
        actual_value=f"{age} years",
        status="PASS" if age_pass else "FAIL",
        explanation="Patient age falls within target protocol enrollment window." if age_pass else f"Age ({age}) is outside required range ({age_min}-{age_max})."
    ))

    # 4. MEASUREMENTS & CONSERVATIVE MISSING DATA HANDLING
    measurements = patient_data.get("measurements", {})
    ranges = trial_data.get("measurement_ranges", {})
    missing_count = 0

    # HbA1c
    if "hba1c_min" in ranges or "hba1c_max" in ranges:
        val = measurements.get("hba1c")
        min_v = ranges.get("hba1c_min")
        max_v = ranges.get("hba1c_max")
        req_str = f"{min_v or 0}% - {max_v or 15}%"
        if val is None:
            missing_count += 1
            evaluations.append(CriterionEvaluationSchema(
                id="crit-hba1c",
                name="Glycated Hemoglobin (HbA1c)",
                category="MEASUREMENT",
                requirement=req_str,
                actual_value="NOT DOCUMENTED / MISSING",
                status="MISSING_DATA",
                explanation="Lab result not recorded in EHR. Conservative protocol: candidate flagged for confirmatory lab draw."
            ))
        else:
            pass_v = (min_v is None or val >= min_v) and (max_v is None or val <= max_v)
            evaluations.append(CriterionEvaluationSchema(
                id="crit-hba1c",
                name="Glycated Hemoglobin (HbA1c)",
                category="MEASUREMENT",
                requirement=req_str,
                actual_value=f"{val}%",
                status="PASS" if pass_v else "FAIL",
                explanation="HbA1c within therapeutic range." if pass_v else f"HbA1c {val}% is out of bounds ({req_str})."
            ))

    # eGFR
    if "egfr_min" in ranges or "egfr_max" in ranges:
        val = measurements.get("egfr")
        min_v = ranges.get("egfr_min")
        max_v = ranges.get("egfr_max")
        req_str = f"{min_v or 0} - {max_v or 150} mL/min/1.73m²"
        if val is None:
            missing_count += 1
            evaluations.append(CriterionEvaluationSchema(
                id="crit-egfr",
                name="Estimated GFR (eGFR)",
                category="MEASUREMENT",
                requirement=req_str,
                actual_value="NOT DOCUMENTED / MISSING",
                status="MISSING_DATA",
                explanation="Renal function panel missing. Candidate requires baseline metabolic panel before screening."
            ))
        else:
            pass_v = (min_v is None or val >= min_v) and (max_v is None or val <= max_v)
            evaluations.append(CriterionEvaluationSchema(
                id="crit-egfr",
                name="Estimated GFR (eGFR)",
                category="MEASUREMENT",
                requirement=req_str,
                actual_value=f"{val} mL/min/1.73m²",
                status="PASS" if pass_v else "FAIL",
                explanation="Renal clearance meets protocol safety threshold." if pass_v else f"eGFR {val} fails renal threshold ({req_str})."
            ))

    # Systolic BP
    if "systolic_bp_min" in ranges or "systolic_bp_max" in ranges:
        val = measurements.get("systolic_bp")
        min_v = ranges.get("systolic_bp_min")
        max_v = ranges.get("systolic_bp_max")
        req_str = f"{min_v or 80} - {max_v or 200} mmHg"
        if val is None:
            missing_count += 1
            evaluations.append(CriterionEvaluationSchema(
                id="crit-sbp",
                name="Systolic Blood Pressure",
                category="MEASUREMENT",
                requirement=req_str,
                actual_value="NOT DOCUMENTED",
                status="MISSING_DATA",
                explanation="Blood pressure reading missing from recent clinic encounter."
            ))
        else:
            pass_v = (min_v is None or val >= min_v) and (max_v is None or val <= max_v)
            evaluations.append(CriterionEvaluationSchema(
                id="crit-sbp",
                name="Systolic Blood Pressure",
                category="MEASUREMENT",
                requirement=req_str,
                actual_value=f"{val} mmHg",
                status="PASS" if pass_v else "FAIL",
                explanation="Systolic BP in protocol window." if pass_v else f"Systolic BP {val} mmHg outside target range."
            ))

    # 5. SAFETY EXCLUSIONS
    egfr_val = measurements.get("egfr")
    if egfr_val is not None and egfr_val < 30:
        evaluations.append(CriterionEvaluationSchema(
            id="crit-excl-renal",
            name="Exclusion: Severe Renal Failure (eGFR < 30)",
            category="EXCLUSION",
            requirement="Must NOT have stage 4/5 renal failure",
            actual_value=f"eGFR: {egfr_val} mL/min",
            status="FAIL",
            explanation="Critical exclusion triggered: High risk of nephrotoxicity."
        ))

    # SYNTHESIS
    total_crits = len(evaluations)
    pass_crits = sum(1 for e in evaluations if e.status == "PASS")
    fail_crits = sum(1 for e in evaluations if e.status == "FAIL")
    score = int((pass_crits / total_crits) * 100) if total_crits > 0 else 0

    if fail_crits == 0 and missing_count == 0:
        final_status = "POTENTIALLY_ELIGIBLE"
        summary = f"Candidate meets all {pass_crits} documented protocol inclusion criteria with active consent. Pending secondary in-person clinical screening."
    elif fail_crits == 0 and missing_count > 0:
        final_status = "BORDERLINE_REVIEW_REQUIRED"
        summary = f"Candidate satisfies primary indication and demographics, but has {missing_count} missing lab measurement(s). Requires screening laboratory test."
    else:
        final_status = "INELIGIBLE"
        failed_names = ", ".join(e.name for e in evaluations if e.status == "FAIL")
        summary = f"Candidate does not meet protocol criteria: Failed on {failed_names}."

    return EligibilityResultSchema(
        patient_id=patient_data["id"],
        status=final_status,
        match_score=score,
        criteria_evaluations=evaluations,
        summary=summary,
        evaluated_at=datetime.now(timezone.utc).isoformat()
    )
