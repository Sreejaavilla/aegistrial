"""
Synthetic Patient Record and Clinical Trial Generator
Generates reproducible, realistic clinical datasets with cryptographic integrity hashes.
All patient data is purely synthetic and pseudonymized.
"""

import json
import hashlib
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

RANDOM_SEED = 42

DIAGNOSES = [
    {
        "name": "Type 2 Diabetes Mellitus",
        "icd10": "E11.9",
        "hba1c_mean": 8.2, "hba1c_std": 1.2,
        "glucose_mean": 165.0, "glucose_std": 35.0,
        "sbp_mean": 138, "sbp_std": 14,
        "egfr_mean": 72.0, "egfr_std": 20.0,
        "bmi_mean": 31.5, "bmi_std": 4.5,
        "meds": ["Metformin", "Glipizide", "Empagliflozin", "Semaglutide", "Lisinopril", "Atorvastatin"]
    },
    {
        "name": "Essential (Primary) Hypertension",
        "icd10": "I10",
        "hba1c_mean": 5.7, "hba1c_std": 0.5,
        "glucose_mean": 98.0, "glucose_std": 12.0,
        "sbp_mean": 152, "sbp_std": 12,
        "egfr_mean": 78.0, "egfr_std": 18.0,
        "bmi_mean": 28.5, "bmi_std": 3.8,
        "meds": ["Amlodipine", "Lisinopril", "Losartan", "Hydrochlorothiazide", "Metoprolol"]
    },
    {
        "name": "Non-Small Cell Lung Cancer",
        "icd10": "C34.9",
        "hba1c_mean": 5.6, "hba1c_std": 0.6,
        "glucose_mean": 102.0, "glucose_std": 15.0,
        "sbp_mean": 125, "sbp_std": 12,
        "egfr_mean": 82.0, "egfr_std": 15.0,
        "bmi_mean": 23.8, "bmi_std": 3.2,
        "meds": ["Carboplatin", "Pemetrexed", "Osimertinib", "Pembrolizumab", "Ondansetron"]
    },
    {
        "name": "Moderate-to-Severe Asthma",
        "icd10": "J45.9",
        "hba1c_mean": 5.5, "hba1c_std": 0.4,
        "glucose_mean": 94.0, "glucose_std": 10.0,
        "sbp_mean": 122, "sbp_std": 10,
        "egfr_mean": 90.0, "egfr_std": 12.0,
        "bmi_mean": 26.2, "bmi_std": 4.1,
        "meds": ["Albuterol", "Fluticasone/Salmeterol", "Montelukast", "Budesonide", "Dupilumab"]
    },
    {
        "name": "Heart Failure with Reduced Ejection Fraction",
        "icd10": "I50.2",
        "hba1c_mean": 6.2, "hba1c_std": 0.9,
        "glucose_mean": 115.0, "glucose_std": 25.0,
        "sbp_mean": 118, "sbp_std": 15,
        "egfr_mean": 54.0, "egfr_std": 18.0,
        "bmi_mean": 29.0, "bmi_std": 4.0,
        "meds": ["Sacubitril/Valsartan", "Carvedilol", "Spironolactone", "Dapagliflozin", "Furosemide"]
    },
    {
        "name": "Chronic Kidney Disease Stage 3",
        "icd10": "N18.3",
        "hba1c_mean": 6.5, "hba1c_std": 1.1,
        "glucose_mean": 120.0, "glucose_std": 28.0,
        "sbp_mean": 142, "sbp_std": 14,
        "egfr_mean": 42.0, "egfr_std": 8.0,
        "bmi_mean": 28.0, "bmi_std": 4.2,
        "meds": ["Losartan", "Atorvastatin", "Sodium Bicarbonate", "Furosemide"]
    },
    {
        "name": "Healthy Control / Low Risk",
        "icd10": "Z00.0",
        "hba1c_mean": 5.3, "hba1c_std": 0.3,
        "glucose_mean": 88.0, "glucose_std": 8.0,
        "sbp_mean": 118, "sbp_std": 8,
        "egfr_mean": 95.0, "egfr_std": 10.0,
        "bmi_mean": 24.1, "bmi_std": 2.5,
        "meds": ["Multivitamin"]
    }
]

ETHNICITIES = [
    "Caucasian", "African American", "Hispanic/Latino", "Asian", "Native American", "Multiracial", "Not Disclosed"
]

ORGS = [
    {"name": "Mayo Clinic Research Node", "msp": "Org1MSP"},
    {"name": "Mount Sinai Health System Node", "msp": "Org2MSP"},
    {"name": "Johns Hopkins Medicine Node", "msp": "Org3MSP"},
    {"name": "Cleveland Clinic Consortium", "msp": "Org4MSP"}
]

def calculate_record_digest(patient_dict: Dict[str, Any]) -> str:
    """Computes deterministic canonical SHA-256 hash of patient clinical attributes."""
    canonical_obj = {
        "id": patient_dict["id"],
        "age": patient_dict["age"],
        "gender": patient_dict["gender"],
        "primary_diagnosis": patient_dict["primary_diagnosis"],
        "icd10": patient_dict["icd10"],
        "measurements": {
            k: round(v, 2) if isinstance(v, float) else v
            for k, v in sorted(patient_dict["measurements"].items())
            if v is not None
        },
        "medications": sorted(patient_dict["medications"])
    }
    encoded = json.dumps(canonical_obj, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()

def generate_patients(count: int = 1200, seed: int = RANDOM_SEED) -> List[Dict[str, Any]]:
    random.seed(seed)
    patients = []
    
    # Base timestamp
    base_date = datetime(2026, 1, 15, 9, 0, 0)
    
    for i in range(1, count + 1):
        pid = f"PT-{10000 + i}"
        diag_choice = random.choices(
            DIAGNOSES,
            weights=[30, 22, 10, 12, 10, 8, 8],
            k=1
        )[0]
        
        age = int(random.gauss(56, 14))
        age = max(19, min(84, age))
        gender = random.choice(["Male", "Female", "Other"])
        ethnicity = random.choice(ETHNICITIES)
        
        # Clinical measurements
        hba1c = round(max(4.5, min(14.0, random.gauss(diag_choice["hba1c_mean"], diag_choice["hba1c_std"]))), 1)
        glucose = round(max(65.0, min(350.0, random.gauss(diag_choice["glucose_mean"], diag_choice["glucose_std"]))), 1)
        sbp = int(max(90, min(200, random.gauss(diag_choice["sbp_mean"], diag_choice["sbp_std"]))))
        dbp = int(max(55, min(120, sbp * 0.62 + random.gauss(0, 5))))
        bmi = round(max(17.5, min(48.0, random.gauss(diag_choice["bmi_mean"], diag_choice["bmi_std"]))), 1)
        egfr = round(max(15.0, min(120.0, random.gauss(diag_choice["egfr_mean"], diag_choice["egfr_std"]))), 1)
        creatinine = round(max(0.5, min(3.5, 120.0 / (egfr + 1e-4) * 0.8)), 2)
        platelets = int(random.gauss(260, 55))
        
        measurements: Dict[str, Any] = {
            "hba1c": hba1c,
            "fasting_glucose": glucose,
            "systolic_bp": sbp,
            "diastolic_bp": dbp,
            "bmi": bmi,
            "egfr": egfr,
            "creatinine": creatinine,
            "platelets": platelets
        }
        
        # Introduce realistic missing data in 4% of records to test conservative recruitment engine
        missing_flag = random.random()
        if missing_flag < 0.02:
            measurements["egfr"] = None
        elif missing_flag < 0.04:
            measurements["fasting_glucose"] = None
        elif missing_flag < 0.05:
            measurements["hba1c"] = None
            
        # Select medications
        num_meds = random.randint(1, min(4, len(diag_choice["meds"])))
        meds = random.sample(diag_choice["meds"], num_meds)
        
        # Secondary diagnoses
        secondary = []
        if diag_choice["name"] == "Type 2 Diabetes Mellitus" and random.random() < 0.65:
            secondary.append("Essential (Primary) Hypertension")
        if diag_choice["name"] == "Type 2 Diabetes Mellitus" and egfr < 60:
            secondary.append("Diabetic Nephropathy")
        if sbp > 145 and "Essential (Primary) Hypertension" not in secondary and diag_choice["name"] != "Essential (Primary) Hypertension":
            secondary.append("Essential (Primary) Hypertension")
            
        # Consent status distribution
        consent_rand = random.random()
        signed_offset = timedelta(days=random.randint(10, 200), hours=random.randint(1, 12))
        consent_signed_at = (base_date - signed_offset).isoformat() + "Z"
        consent_revoked_at = None
        
        if consent_rand < 0.84:
            consent_status = "GRANTED"
        elif consent_rand < 0.92:
            consent_status = "WITHDRAWN"
            revoked_offset = timedelta(days=random.randint(1, 20))
            consent_revoked_at = (datetime.fromisoformat(consent_signed_at[:-1]) + revoked_offset).isoformat() + "Z"
        elif consent_rand < 0.97:
            consent_status = "RESTRICTED"
        else:
            consent_status = "EXPIRED"
            
        consent_type = random.choice([
            "GENERAL_RECRUITMENT",
            "GENERAL_RECRUITMENT",
            "CARDIOMETABOLIC_ONLY",
            "ONCOLOGY_ONLY"
        ])
        
        # Organization
        org = random.choice(ORGS)
        
        record_base = {
            "id": pid,
            "age": age,
            "gender": gender,
            "ethnicity": ethnicity,
            "primary_diagnosis": diag_choice["name"],
            "icd10": diag_choice["icd10"],
            "secondary_diagnoses": secondary,
            "measurements": measurements,
            "medications": meds,
            "institution": org["name"],
            "institution_msp": org["msp"]
        }
        
        # Cryptographic SHA-256 Digest of canonical data
        digest = calculate_record_digest(record_base)
        
        # Blockchain commitment info
        block_height = 1400 + (i // 5)
        tx_hash = hashlib.sha256(f"fabric-{pid}-{block_height}-{digest}".encode()).hexdigest()
        
        patient_record = {
            **record_base,
            "consent": {
                "status": consent_status,
                "consent_type": consent_type,
                "signed_at": consent_signed_at,
                "revoked_at": consent_revoked_at,
                "consent_hash": hashlib.sha256(f"consent-{pid}-{consent_status}".encode()).hexdigest()[:32]
            },
            "blockchain": {
                "data_digest": digest,
                "tx_id": f"0x{tx_hash[:40]}",
                "block_number": block_height,
                "channel": "clinical-trials",
                "chaincode": "patient-recruitment-contract",
                "registered_at": consent_signed_at,
                "msp_id": org["msp"],
                "is_verified": True
            }
        }
        patients.append(patient_record)
        
    return patients

def generate_trials() -> List[Dict[str, Any]]:
    return [
        {
            "id": "TR-2026-001",
            "title": "Phase III Trial of SGLT2i + GLP-1RA Dual Incretin Therapy in Type 2 Diabetes with Preserved Renal Function",
            "phase": "Phase III",
            "sponsor": "Metabolic Therapeutics Research Consortium",
            "description": "Multi-center randomized study evaluating glycemic stability, cardio-renal outcomes, and weight trajectory in adult patients with established Type 2 Diabetes Mellitus with baseline HbA1c >= 7.5% and preserved renal capacity (eGFR >= 50 mL/min/1.73m²).",
            "target_diagnosis": "Type 2 Diabetes Mellitus",
            "target_icd10": "E11.9",
            "age_min": 35,
            "age_max": 75,
            "required_consent_type": "GENERAL_RECRUITMENT",
            "measurement_ranges": {
                "hba1c_min": 7.5,
                "hba1c_max": 10.5,
                "egfr_min": 50.0,
                "egfr_max": 120.0,
                "systolic_bp_min": 110,
                "systolic_bp_max": 160,
                "bmi_min": 25.0,
                "bmi_max": 42.0
            },
            "inclusion_criteria": [
                "Diagnosed with Type 2 Diabetes Mellitus (ICD-10 E11)",
                "Age between 35 and 75 years at time of pre-screening",
                "Glycated Hemoglobin (HbA1c) between 7.5% and 10.5% inclusive",
                "Preserved Renal Function: eGFR >= 50.0 mL/min/1.73m²",
                "Active Signed General Research Consent"
            ],
            "exclusion_criteria": [
                "Severe Renal Impairment (eGFR < 45.0 mL/min/1.73m²)",
                "Severe Malignant Hypertension (Systolic BP > 175 mmHg)",
                "Documented End-Stage Heart Failure",
                "Known Hypersensitivity to SGLT2 inhibitors or GLP-1 receptor agonists"
            ],
            "target_enrollment": 150,
            "status": "RECRUITING"
        },
        {
            "id": "TR-2026-002",
            "title": "Phase II Evaluation of Dual ARB-Neprilysin Inhibition in Resistant Essential Hypertension",
            "phase": "Phase II",
            "sponsor": "Cardiovascular Innovation Network",
            "description": "Evaluating hemodynamic control and 24-hour ambulatory arterial pressure reduction in patients diagnosed with uncontrolled Essential Hypertension despite 2 or more antihypertensive medications.",
            "target_diagnosis": "Essential (Primary) Hypertension",
            "target_icd10": "I10",
            "age_min": 40,
            "age_max": 80,
            "required_consent_type": "GENERAL_RECRUITMENT",
            "measurement_ranges": {
                "systolic_bp_min": 145,
                "systolic_bp_max": 185,
                "diastolic_bp_min": 85,
                "diastolic_bp_max": 115,
                "egfr_min": 45.0,
                "egfr_max": 120.0,
                "bmi_min": 22.0,
                "bmi_max": 38.0
            },
            "inclusion_criteria": [
                "Confirmed Essential Primary Hypertension (ICD-10 I10)",
                "Age 40 to 80 years old",
                "Elevated Systolic Blood Pressure: >= 145 mmHg and <= 185 mmHg",
                "Serum Potassium <= 5.2 mEq/L and eGFR >= 45.0 mL/min/1.73m²"
            ],
            "exclusion_criteria": [
                "Secondary hypertension due to renal artery stenosis or pheochromocytoma",
                "Systolic BP > 190 mmHg requiring emergency intervention",
                "Severe renal failure (eGFR < 30 mL/min/1.73m²)"
            ],
            "target_enrollment": 100,
            "status": "RECRUITING"
        },
        {
            "id": "TR-2026-003",
            "title": "Phase Ib Targeted EGFR Tyrosine Kinase Inhibitor in Advanced Non-Small Cell Lung Cancer",
            "phase": "Phase I",
            "sponsor": "Oncology Precision Alliance",
            "description": "Investigating pharmacokinetic tolerability and objective response rate of a novel third-generation selective EGFR TKI in adult NSCLC candidates.",
            "target_diagnosis": "Non-Small Cell Lung Cancer",
            "target_icd10": "C34.9",
            "age_min": 25,
            "age_max": 82,
            "required_consent_type": "ONCOLOGY_ONLY",
            "measurement_ranges": {
                "egfr_min": 45.0,
                "egfr_max": 120.0,
                "platelets_min": 100,
                "platelets_max": 500,
                "creatinine_max": 2.0
            },
            "inclusion_criteria": [
                "Histologically documented Non-Small Cell Lung Cancer (ICD-10 C34)",
                "Adequate hematologic reserve (Platelet count >= 100 x10^9/L)",
                "Adequate renal clearance (eGFR >= 45 mL/min/1.73m²)",
                "Specialized Oncology Clinical Trial Consent"
            ],
            "exclusion_criteria": [
                "Severe baseline thrombocytopenia (< 90 x10^9/L)",
                "Uncontrolled central nervous system metastases",
                "Active cardiac arrhythmia requiring acute therapy"
            ],
            "target_enrollment": 45,
            "status": "RECRUITING"
        },
        {
            "id": "TR-2026-004",
            "title": "Phase III Monoclonal Interleukin-4/13 Blocker in Moderate-to-Severe Eosinophilic Asthma",
            "phase": "Phase III",
            "sponsor": "Pulmonary & Immunology Global Institute",
            "description": "Double-blind, placebo-controlled trial assessing annualized severe asthma exacerbation rate and FEV1 improvements in symptomatic moderate-to-severe asthma patients.",
            "target_diagnosis": "Moderate-to-Severe Asthma",
            "target_icd10": "J45.9",
            "age_min": 18,
            "age_max": 70,
            "required_consent_type": "GENERAL_RECRUITMENT",
            "measurement_ranges": {
                "bmi_min": 18.5,
                "bmi_max": 36.0,
                "systolic_bp_max": 150
            },
            "inclusion_criteria": [
                "Physician-diagnosed Moderate-to-Severe Asthma for >= 12 months",
                "Age 18 to 70 years",
                "Currently receiving maintenance inhaled corticosteroids (ICS)",
                "Documented history of at least one acute exacerbation in past year"
            ],
            "exclusion_criteria": [
                "Concomitant diagnosis of active COPD or cystic fibrosis",
                "Active systemic immunosuppressive therapy for other autoimmune disorders",
                "Current cigarette smoking >= 10 pack-years"
            ],
            "target_enrollment": 220,
            "status": "ACTIVE"
        },
        {
            "id": "TR-2026-005",
            "title": "Phase II SGLT2 Inhibition and Mineralocorticoid Receptor Antagonist in HFpEF",
            "phase": "Phase II",
            "sponsor": "National Heart & Lung Consortium",
            "description": "Assessing 12-week changes in Kansas City Cardiomyopathy Questionnaire (KCCQ) clinical summary score and NT-proBNP in symptomatic Heart Failure patients with Preserved Ejection Fraction.",
            "target_diagnosis": "Heart Failure with Reduced Ejection Fraction",
            "target_icd10": "I50.2",
            "age_min": 45,
            "age_max": 85,
            "required_consent_type": "CARDIOMETABOLIC_ONLY",
            "measurement_ranges": {
                "systolic_bp_min": 100,
                "systolic_bp_max": 150,
                "egfr_min": 35.0,
                "egfr_max": 110.0,
                "creatinine_max": 2.2
            },
            "inclusion_criteria": [
                "Documented Heart Failure Diagnosis with baseline symptoms",
                "Age 45 to 85 years",
                "Stable medical management with beta-blockers and ACEi/ARB",
                "eGFR >= 35 mL/min/1.73m²"
            ],
            "exclusion_criteria": [
                "Severe hypotension (Systolic BP < 95 mmHg)",
                "Hyperkalemia (Serum K+ > 5.4 mmol/L)",
                "Severe end-stage renal disease on dialysis"
            ],
            "target_enrollment": 120,
            "status": "RECRUITING"
        }
    ]

def save_datasets(dest_backend: str = "backend/data", dest_frontend: str = "frontend/src/data"):
    patients = generate_patients(count=1200)
    trials = generate_trials()
    
    # Write to backend
    with open(f"{dest_backend}/patients.json", "w", encoding="utf-8") as f:
        json.dump(patients, f, indent=2)
    with open(f"{dest_backend}/trials.json", "w", encoding="utf-8") as f:
        json.dump(trials, f, indent=2)
        
    # Write to frontend
    with open(f"{dest_frontend}/patients.json", "w", encoding="utf-8") as f:
        json.dump(patients, f, indent=2)
    with open(f"{dest_frontend}/trials.json", "w", encoding="utf-8") as f:
        json.dump(trials, f, indent=2)
        
    print(f"Generated {len(patients)} synthetic patients and {len(trials)} trials successfully.")

if __name__ == "__main__":
    save_datasets()
