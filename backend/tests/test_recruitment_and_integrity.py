import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import PatientModel, TrialModel, ConsentModel, AuditLogModel
from app.recruitment_engine import evaluate_patient_for_trial
from app.blockchain_gateway import calculate_canonical_record_digest, fabric_client

# Test SQLite in-memory database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_clinical_trial.db"
test_engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    # Seed 2 test patients and 1 test trial
    p1 = PatientModel(
        id="PT-10001",
        age=52,
        gender="Male",
        ethnicity="Caucasian",
        primary_diagnosis="Type 2 Diabetes Mellitus",
        icd10="E11.9",
        secondary_diagnoses=[],
        measurements={"hba1c": 8.4, "egfr": 75.0, "systolic_bp": 135, "bmi": 29.0},
        medications=["Metformin"],
        institution="Mayo Clinic Research Node",
        institution_msp="Org1MSP",
        data_digest="a1b2c3d4e5f6",
        tx_id="0x1111111111111111111111111111111111111111",
        block_number=1401
    )
    # compute genuine digest for p1
    p1_dict = {
        "id": p1.id,
        "age": p1.age,
        "gender": p1.gender,
        "primary_diagnosis": p1.primary_diagnosis,
        "icd10": p1.icd10,
        "measurements": p1.measurements,
        "medications": p1.medications
    }
    p1.data_digest = calculate_canonical_record_digest(p1_dict)

    c1 = ConsentModel(
        patient_id="PT-10001",
        status="GRANTED",
        consent_type="GENERAL_RECRUITMENT",
        signed_at="2026-01-10T10:00:00Z",
        consent_hash="hash-01",
        tx_id=p1.tx_id,
        block_number=p1.block_number
    )

    t1 = TrialModel(
        id="TR-2026-001",
        title="Diabetes Evaluation Trial",
        phase="Phase III",
        sponsor="Consortium",
        description="Study of Type 2 Diabetes",
        target_diagnosis="Type 2 Diabetes Mellitus",
        target_icd10="E11.9",
        age_min=35,
        age_max=75,
        required_consent_type="GENERAL_RECRUITMENT",
        measurement_ranges={"hba1c_min": 7.5, "hba1c_max": 10.5, "egfr_min": 50.0},
        inclusion_criteria=["T2D confirmed", "Age 35-75"],
        exclusion_criteria=["eGFR < 30"],
        target_enrollment=100,
        status="RECRUITING"
    )

    db.add(p1)
    db.add(c1)
    db.add(t1)
    db.commit()
    db.close()

    yield
    Base.metadata.drop_all(bind=test_engine)

# ========================
# UNIT TESTS: ELIGIBILITY ENGINE
# ========================

def test_eligibility_inclusion_match():
    patient = {
        "id": "PT-TEST-01",
        "age": 52,
        "gender": "Female",
        "primary_diagnosis": "Type 2 Diabetes Mellitus",
        "icd10": "E11.9",
        "secondary_diagnoses": [],
        "measurements": {
            "hba1c": 8.4,
            "egfr": 75.0,
            "systolic_bp": 132,
            "bmi": 28.5
        },
        "consent": {
            "status": "GRANTED",
            "consent_type": "GENERAL_RECRUITMENT"
        }
    }

    trial = {
        "id": "TR-TEST-01",
        "target_diagnosis": "Type 2 Diabetes Mellitus",
        "target_icd10": "E11",
        "age_min": 35,
        "age_max": 75,
        "required_consent_type": "GENERAL_RECRUITMENT",
        "measurement_ranges": {
            "hba1c_min": 7.5,
            "hba1c_max": 10.5,
            "egfr_min": 50.0,
            "systolic_bp_max": 160
        }
    }

    res = evaluate_patient_for_trial(patient, trial)
    assert res.status == "POTENTIALLY_ELIGIBLE"
    assert res.match_score == 100
    assert "Pending secondary in-person clinical screening" in res.summary

def test_eligibility_consent_withdrawal_blocks_recruitment():
    patient = {
        "id": "PT-TEST-02",
        "age": 45,
        "gender": "Male",
        "primary_diagnosis": "Type 2 Diabetes Mellitus",
        "icd10": "E11.9",
        "measurements": {"hba1c": 8.0, "egfr": 80.0},
        "consent": {
            "status": "WITHDRAWN",
            "consent_type": "GENERAL_RECRUITMENT"
        }
    }

    trial = {
        "id": "TR-TEST-01",
        "target_diagnosis": "Type 2 Diabetes Mellitus",
        "age_min": 18,
        "age_max": 80,
        "required_consent_type": "GENERAL_RECRUITMENT",
        "measurement_ranges": {"hba1c_min": 7.0}
    }

    res = evaluate_patient_for_trial(patient, trial)
    assert res.status == "DISQUALIFIED_CONSENT_REVOKED"
    assert res.match_score == 0
    assert "withdrawn" in res.summary.lower()

def test_conservative_missing_measurement_handling():
    patient = {
        "id": "PT-TEST-03",
        "age": 55,
        "gender": "Male",
        "primary_diagnosis": "Type 2 Diabetes Mellitus",
        "icd10": "E11.9",
        "measurements": {
            "hba1c": 8.2,
            "egfr": None,
            "systolic_bp": 130
        },
        "consent": {
            "status": "GRANTED",
            "consent_type": "GENERAL_RECRUITMENT"
        }
    }

    trial = {
        "id": "TR-TEST-01",
        "target_diagnosis": "Type 2 Diabetes Mellitus",
        "age_min": 35,
        "age_max": 75,
        "required_consent_type": "GENERAL_RECRUITMENT",
        "measurement_ranges": {
            "hba1c_min": 7.0,
            "egfr_min": 50.0
        }
    }

    res = evaluate_patient_for_trial(patient, trial)
    assert res.status == "BORDERLINE_REVIEW_REQUIRED"
    missing_crits = [c for c in res.criteria_evaluations if c.status == "MISSING_DATA"]
    assert len(missing_crits) == 1
    assert missing_crits[0].name == "Estimated GFR (eGFR)"

def test_exclusion_criteria_renal_failure():
    patient = {
        "id": "PT-TEST-04",
        "age": 60,
        "gender": "Female",
        "primary_diagnosis": "Type 2 Diabetes Mellitus",
        "icd10": "E11.9",
        "measurements": {
            "hba1c": 8.0,
            "egfr": 22.0
        },
        "consent": {
            "status": "GRANTED",
            "consent_type": "GENERAL_RECRUITMENT"
        }
    }

    trial = {
        "id": "TR-TEST-01",
        "target_diagnosis": "Type 2 Diabetes Mellitus",
        "age_min": 35,
        "age_max": 75,
        "required_consent_type": "GENERAL_RECRUITMENT",
        "measurement_ranges": {"hba1c_min": 7.0}
    }

    res = evaluate_patient_for_trial(patient, trial)
    assert res.status == "INELIGIBLE"
    assert any(c.category == "EXCLUSION" and c.status == "FAIL" for c in res.criteria_evaluations)

# ========================
# CRYPTOGRAPHIC INTEGRITY TESTS
# ========================

def test_canonical_digest_and_tamper_detection():
    patient = {
        "id": "PT-10042",
        "age": 58,
        "gender": "Male",
        "primary_diagnosis": "Essential (Primary) Hypertension",
        "icd10": "I10",
        "measurements": {
            "systolic_bp": 155,
            "diastolic_bp": 92,
            "hba1c": 5.8
        },
        "medications": ["Amlodipine", "Lisinopril"]
    }

    original_digest = calculate_canonical_record_digest(patient)
    assert len(original_digest) == 64

    verification = fabric_client.verify_integrity(patient, original_digest, 1420, "0xtx123")
    assert verification["is_valid"] is True

    tampered_patient = dict(patient)
    tampered_patient["measurements"] = dict(patient["measurements"])
    tampered_patient["measurements"]["systolic_bp"] = 120

    tampered_verification = fabric_client.verify_integrity(tampered_patient, original_digest, 1420, "0xtx123")
    assert tampered_verification["is_valid"] is False
    assert tampered_verification["computed_digest"] != original_digest

# ========================
# API ENDPOINT WORKFLOW TESTS
# ========================

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["fabric_channel"] == "clinical-trials"

def test_api_patients_list():
    res = client.get("/api/patients")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert data["patients"][0]["id"] == "PT-10001"

def test_api_recruitment_evaluation_workflow():
    payload = {
        "trial_id": "TR-2026-001",
        "researcher_id": "USR-PI-01",
        "researcher_name": "Dr. Evelyn Vance"
    }
    res = client.post("/api/recruitment/evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["trial_id"] == "TR-2026-001"
    assert data["summary"]["total_evaluated"] >= 1
    assert data["summary"]["potentially_eligible"] >= 1

def test_api_consent_update_and_revocation():
    # 1. Candidate is eligible initially
    res1 = client.post("/api/recruitment/evaluate", json={"trial_id": "TR-2026-001"})
    assert res1.json()["summary"]["potentially_eligible"] == 1

    # 2. Update consent to WITHDRAWN
    withdraw_payload = {
        "patient_id": "PT-10001",
        "new_status": "WITHDRAWN",
        "actor_role": "Compliance Officer"
    }
    up_res = client.post("/api/consent/update", json=withdraw_payload)
    assert up_res.status_code == 200
    assert up_res.json()["new_status"] == "WITHDRAWN"
    assert "tx_id" in up_res.json()

    # 3. Candidate is now blocked from recruitment!
    res2 = client.post("/api/recruitment/evaluate", json={"trial_id": "TR-2026-001"})
    assert res2.json()["summary"]["potentially_eligible"] == 0
    assert res2.json()["summary"]["consent_disqualified"] == 1

def test_api_record_integrity_verification():
    res = client.post("/api/integrity/verify", json={"patient_id": "PT-10001"})
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is True
    assert data["computed_digest"] == data["on_chain_digest"]
    assert "Verified" in data["details"]

def test_api_audit_log_stream():
    # Trigger an action that writes an audit event
    client.post("/api/recruitment/evaluate", json={"trial_id": "TR-2026-001"})
    res = client.get("/api/audit")
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) >= 1
    assert any(log["event_type"] == "RECRUITMENT_SEARCH_EXECUTED" for log in logs)
