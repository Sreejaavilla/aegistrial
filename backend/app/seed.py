import os
import json
from datetime import datetime, timezone
from app.database import engine, Base, SessionLocal
from app.models import PatientModel, TrialModel, ConsentModel, AuditLogModel
from app.synthetic_data import generate_patients, generate_trials

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        count = db.query(PatientModel).count()
        if count == 0:
            print("[AegisTrial] Populating database with 1,200 synthetic patients...")
            patients_file = os.path.join(os.path.dirname(__file__), "..", "data", "patients.json")
            if os.path.exists(patients_file):
                with open(patients_file, "r", encoding="utf-8") as f:
                    patients = json.load(f)
            else:
                patients = generate_patients(1200)

            for p in patients:
                p_model = PatientModel(
                    id=p["id"],
                    age=p["age"],
                    gender=p["gender"],
                    ethnicity=p["ethnicity"],
                    primary_diagnosis=p["primary_diagnosis"],
                    icd10=p["icd10"],
                    secondary_diagnoses=p.get("secondary_diagnoses", []),
                    measurements=p.get("measurements", {}),
                    medications=p.get("medications", []),
                    institution=p["institution"],
                    institution_msp=p["institution_msp"],
                    data_digest=p["blockchain"]["data_digest"],
                    tx_id=p["blockchain"]["tx_id"],
                    block_number=p["blockchain"]["block_number"],
                    created_at=datetime.now(timezone.utc)
                )
                db.add(p_model)

                c_data = p.get("consent", {})
                c_model = ConsentModel(
                    patient_id=p["id"],
                    status=c_data.get("status", "GRANTED"),
                    consent_type=c_data.get("consent_type", "GENERAL_RECRUITMENT"),
                    signed_at=c_data.get("signed_at", datetime.now(timezone.utc).isoformat()),
                    revoked_at=c_data.get("revoked_at"),
                    consent_hash=c_data.get("consent_hash", "hash"),
                    tx_id=p["blockchain"]["tx_id"],
                    block_number=p["blockchain"]["block_number"]
                )
                db.add(c_model)

            trials_file = os.path.join(os.path.dirname(__file__), "..", "data", "trials.json")
            if os.path.exists(trials_file):
                with open(trials_file, "r", encoding="utf-8") as f:
                    trials = json.load(f)
            else:
                trials = generate_trials()

            for t in trials:
                t_model = TrialModel(
                    id=t["id"],
                    title=t["title"],
                    phase=t["phase"],
                    sponsor=t["sponsor"],
                    description=t["description"],
                    target_diagnosis=t["target_diagnosis"],
                    target_icd10=t.get("target_icd10"),
                    age_min=t.get("age_min", 18),
                    age_max=t.get("age_max", 85),
                    required_consent_type=t.get("required_consent_type", "GENERAL_RECRUITMENT"),
                    measurement_ranges=t.get("measurement_ranges", {}),
                    inclusion_criteria=t.get("inclusion_criteria", []),
                    exclusion_criteria=t.get("exclusion_criteria", []),
                    target_enrollment=t.get("target_enrollment", 100),
                    status=t.get("status", "RECRUITING"),
                    created_at=datetime.now(timezone.utc)
                )
                db.add(t_model)

            genesis_audit = AuditLogModel(
                id="AUD-GENESIS-01",
                timestamp=datetime.now(timezone.utc),
                event_type="RECORD_REGISTERED_ON_CHAIN",
                actor_id="SYSTEM_INIT",
                actor_name="Fabric Peer node0.org1.clinical.network",
                actor_role="CONSORTIUM_NODE",
                institution_msp="Org1MSP",
                details="Consortium genesis commitment: 1,200 pseudonymized EHR records anchored to channel clinical-trials at Block #1400.",
                tx_id="0x8f4d92a104cb1782e9b04f7c2299d4538e91024b",
                block_number=1400,
                is_blockchain_tx=True,
                status="COMMITTED"
            )
            db.add(genesis_audit)

            db.commit()
            print(f"[AegisTrial] Successfully seeded {len(patients)} patients and {len(trials)} trials into SQLite database.")
        else:
            print(f"[AegisTrial] Database already populated with {count} patient records.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
