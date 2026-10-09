"""
Main FastAPI Application for AegisTrial Recruitment System.
"""
import json
import os
from contextlib import asynccontextmanager
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from .config import settings
from .database import engine, Base, get_db
from .models import PatientModel, TrialModel, ConsentModel, AuditLogModel
from .schemas import (
    PatientSchema,
    TrialSchema,
    TrialCreateSchema,
    RecruitmentEvaluateRequest,
    RecruitmentEvaluateResponse,
    RecruitmentSummarySchema,
    ConsentUpdateRequest,
    IntegrityVerifyRequest,
    IntegrityVerifyResponse
)
from .recruitment_engine import evaluate_patient_for_trial
from .blockchain_gateway import fabric_client, calculate_canonical_record_digest
from .synthetic_data import generate_patients, generate_trials

def get_utc_now():
    return datetime.now(timezone.utc)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables
    Base.metadata.create_all(bind=engine)
    
    # Check if database is empty, seed 1,200 synthetic patients and 5 trials
    from .database import SessionLocal
    db = SessionLocal()
    try:
        count = db.query(PatientModel).count()
        if count == 0:
            print(f"[AegisTrial] Seeding 1,200 synthetic EHR records and trials into database...")
            data_file = os.path.join(os.path.dirname(__file__), "..", "data", "patients.json")
            if os.path.exists(data_file):
                with open(data_file, "r", encoding="utf-8") as f:
                    patients_data = json.load(f)
            else:
                patients_data = generate_patients(1200)

            for p in patients_data:
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
                    created_at=get_utc_now()
                )
                db.add(p_model)

                c_data = p.get("consent", {})
                c_model = ConsentModel(
                    patient_id=p["id"],
                    status=c_data.get("status", "GRANTED"),
                    consent_type=c_data.get("consent_type", "GENERAL_RECRUITMENT"),
                    signed_at=c_data.get("signed_at", get_utc_now().isoformat()),
                    revoked_at=c_data.get("revoked_at"),
                    consent_hash=c_data.get("consent_hash", "hash"),
                    tx_id=p["blockchain"]["tx_id"],
                    block_number=p["blockchain"]["block_number"]
                )
                db.add(c_model)

            # Seed trials
            trial_file = os.path.join(os.path.dirname(__file__), "..", "data", "trials.json")
            if os.path.exists(trial_file):
                with open(trial_file, "r", encoding="utf-8") as f:
                    trials_data = json.load(f)
            else:
                trials_data = generate_trials()

            for t in trials_data:
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
                    created_at=get_utc_now()
                )
                db.add(t_model)

            # Genesis Audit Log
            genesis_audit = AuditLogModel(
                id="AUD-GENESIS-01",
                timestamp=get_utc_now(),
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
            print("[AegisTrial] Database seeded successfully.")
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Backend API for Clinical Trial Recruitment with Hyperledger Fabric Cryptographic Digest Anchoring",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "fabric_channel": settings.FABRIC_CHANNEL,
        "fabric_chaincode": settings.FABRIC_CHAINCODE,
        "timestamp": get_utc_now().isoformat()
    }

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    total_patients = db.query(PatientModel).count()
    active_trials = db.query(TrialModel).filter(TrialModel.status.in_(["RECRUITING", "ACTIVE"])).count()
    granted_consent = db.query(ConsentModel).filter(ConsentModel.status == "GRANTED").count()
    withdrawn_consent = db.query(ConsentModel).filter(ConsentModel.status == "WITHDRAWN").count()
    
    return {
        "total_patients": total_patients,
        "active_trials": active_trials,
        "granted_consent": granted_consent,
        "withdrawn_consent": withdrawn_consent,
        "consent_rate_pct": round((granted_consent / (total_patients or 1)) * 100, 1),
        "ledger_anchors": total_patients,
        "channel": settings.FABRIC_CHANNEL
    }

@app.get("/api/patients")
def list_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    diagnosis: Optional[str] = None,
    consent_status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(PatientModel, ConsentModel).join(ConsentModel, PatientModel.id == ConsentModel.patient_id)
    
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (PatientModel.id.ilike(search_fmt)) |
            (PatientModel.primary_diagnosis.ilike(search_fmt)) |
            (PatientModel.icd10.ilike(search_fmt))
        )
    if diagnosis and diagnosis != "ALL":
        query = query.filter(PatientModel.primary_diagnosis == diagnosis)
    if consent_status and consent_status != "ALL":
        query = query.filter(ConsentModel.status == consent_status)
        
    total = query.count()
    rows = query.offset(skip).limit(limit).all()
    
    results = []
    for p_model, c_model in rows:
        results.append({
            "id": p_model.id,
            "age": p_model.age,
            "gender": p_model.gender,
            "ethnicity": p_model.ethnicity,
            "primary_diagnosis": p_model.primary_diagnosis,
            "icd10": p_model.icd10,
            "secondary_diagnoses": p_model.secondary_diagnoses,
            "measurements": p_model.measurements,
            "medications": p_model.medications,
            "institution": p_model.institution,
            "institution_msp": p_model.institution_msp,
            "consent": {
                "status": c_model.status,
                "consent_type": c_model.consent_type,
                "signed_at": c_model.signed_at,
                "revoked_at": c_model.revoked_at,
                "consent_hash": c_model.consent_hash
            },
            "blockchain": {
                "data_digest": p_model.data_digest,
                "tx_id": p_model.tx_id,
                "block_number": p_model.block_number,
                "channel": settings.FABRIC_CHANNEL,
                "chaincode": settings.FABRIC_CHAINCODE,
                "registered_at": c_model.signed_at,
                "msp_id": p_model.institution_msp,
                "is_verified": True
            }
        })
        
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "patients": results
    }

@app.get("/api/patients/{patient_id}")
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    row = db.query(PatientModel, ConsentModel).join(ConsentModel, PatientModel.id == ConsentModel.patient_id).filter(PatientModel.id == patient_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Patient record not found")
        
    p_model, c_model = row
    return {
        "id": p_model.id,
        "age": p_model.age,
        "gender": p_model.gender,
        "ethnicity": p_model.ethnicity,
        "primary_diagnosis": p_model.primary_diagnosis,
        "icd10": p_model.icd10,
        "secondary_diagnoses": p_model.secondary_diagnoses,
        "measurements": p_model.measurements,
        "medications": p_model.medications,
        "institution": p_model.institution,
        "institution_msp": p_model.institution_msp,
        "consent": {
            "status": c_model.status,
            "consent_type": c_model.consent_type,
            "signed_at": c_model.signed_at,
            "revoked_at": c_model.revoked_at,
            "consent_hash": c_model.consent_hash
        },
        "blockchain": {
            "data_digest": p_model.data_digest,
            "tx_id": p_model.tx_id,
            "block_number": p_model.block_number,
            "channel": settings.FABRIC_CHANNEL,
            "chaincode": settings.FABRIC_CHAINCODE,
            "registered_at": c_model.signed_at,
            "msp_id": p_model.institution_msp,
            "is_verified": True
        }
    }

@app.get("/api/trials")
def list_trials(db: Session = Depends(get_db)):
    trials = db.query(TrialModel).all()
    return trials

@app.post("/api/trials", status_code=status.HTTP_201_CREATED)
def create_trial(payload: TrialCreateSchema, db: Session = Depends(get_db)):
    trial_id = f"TR-2026-{db.query(TrialModel).count() + 101}"
    trial = TrialModel(
        id=trial_id,
        title=payload.title,
        phase=payload.phase,
        sponsor=payload.sponsor,
        description=payload.description,
        target_diagnosis=payload.target_diagnosis,
        target_icd10=payload.target_icd10,
        age_min=payload.age_min,
        age_max=payload.age_max,
        required_consent_type=payload.required_consent_type,
        measurement_ranges=payload.measurement_ranges,
        inclusion_criteria=payload.inclusion_criteria,
        exclusion_criteria=payload.exclusion_criteria,
        target_enrollment=payload.target_enrollment,
        status="RECRUITING",
        created_at=get_utc_now()
    )
    db.add(trial)
    
    # Audit event
    audit = AuditLogModel(
        id=f"AUD-{int(get_utc_now().timestamp() * 1000)}",
        timestamp=get_utc_now(),
        event_type="TRIAL_CREATED",
        actor_id="USR-PI-01",
        actor_name="Dr. Evelyn Vance",
        actor_role="Principal Investigator",
        institution_msp="Org1MSP",
        details=f"Clinical trial protocol {trial_id} ('{payload.title}') registered with {len(payload.inclusion_criteria)} inclusion criteria.",
        is_blockchain_tx=False,
        status="RECORDED"
    )
    db.add(audit)
    db.commit()
    db.refresh(trial)
    return trial

@app.post("/api/recruitment/evaluate", response_model=RecruitmentEvaluateResponse)
def evaluate_recruitment(req: RecruitmentEvaluateRequest, db: Session = Depends(get_db)):
    trial = db.query(TrialModel).filter(TrialModel.id == req.trial_id).first()
    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found")
        
    patients = db.query(PatientModel, ConsentModel).join(ConsentModel, PatientModel.id == ConsentModel.patient_id).all()
    
    trial_dict = {
        "id": trial.id,
        "title": trial.title,
        "target_diagnosis": trial.target_diagnosis,
        "target_icd10": trial.target_icd10,
        "age_min": trial.age_min,
        "age_max": trial.age_max,
        "required_consent_type": trial.required_consent_type,
        "measurement_ranges": trial.measurement_ranges or {},
        "inclusion_criteria": trial.inclusion_criteria or [],
        "exclusion_criteria": trial.exclusion_criteria or []
    }
    
    results = []
    potentially_eligible = 0
    borderline_review = 0
    consent_disqualified = 0
    ineligible = 0
    
    for p_model, c_model in patients:
        p_dict = {
            "id": p_model.id,
            "age": p_model.age,
            "gender": p_model.gender,
            "primary_diagnosis": p_model.primary_diagnosis,
            "icd10": p_model.icd10,
            "secondary_diagnoses": p_model.secondary_diagnoses or [],
            "measurements": p_model.measurements or {},
            "medications": p_model.medications or [],
            "consent": {
                "status": c_model.status,
                "consent_type": c_model.consent_type
            }
        }
        res = evaluate_patient_for_trial(p_dict, trial_dict)
        results.append(res)
        
        if res.status == "POTENTIALLY_ELIGIBLE":
            potentially_eligible += 1
        elif res.status == "BORDERLINE_REVIEW_REQUIRED":
            borderline_review += 1
        elif res.status == "DISQUALIFIED_CONSENT_REVOKED":
            consent_disqualified += 1
        else:
            ineligible += 1
            
    total = len(patients)
    match_pct = round((potentially_eligible / (total or 1)) * 100, 1)
    
    # Audit recruitment query
    audit = AuditLogModel(
        id=f"AUD-{int(get_utc_now().timestamp() * 1000)}",
        timestamp=get_utc_now(),
        event_type="RECRUITMENT_SEARCH_EXECUTED",
        actor_id=req.researcher_id or "USR-PI-01",
        actor_name=req.researcher_name or "Dr. Evelyn Vance",
        actor_role=req.researcher_role or "Principal Investigator",
        institution_msp="Org1MSP",
        details=f"Recruitment pre-screening evaluated {total} records for trial {trial.id}. Found {potentially_eligible} potentially eligible candidates.",
        is_blockchain_tx=False,
        status="RECORDED"
    )
    db.add(audit)
    db.commit()
    
    return RecruitmentEvaluateResponse(
        trial_id=trial.id,
        summary=RecruitmentSummarySchema(
            total_evaluated=total,
            potentially_eligible=potentially_eligible,
            borderline_review=borderline_review,
            ineligible=ineligible,
            consent_disqualified=consent_disqualified,
            match_rate_pct=match_pct
        ),
        results=results
    )

@app.post("/api/consent/update")
def update_consent(req: ConsentUpdateRequest, db: Session = Depends(get_db)):
    consent = db.query(ConsentModel).filter(ConsentModel.patient_id == req.patient_id).first()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent record not found")
        
    consent.status = req.new_status
    if req.new_status == "WITHDRAWN":
        consent.revoked_at = get_utc_now().isoformat()
    elif req.new_status == "GRANTED":
        consent.revoked_at = None
        consent.signed_at = get_utc_now().isoformat()
        
    tx_id, _ = fabric_client.generate_transaction_commitment(req.patient_id, consent.consent_hash, 1460)
    consent.tx_id = tx_id
    consent.block_number = 1460
    
    audit = AuditLogModel(
        id=f"AUD-{int(get_utc_now().timestamp() * 1000)}",
        timestamp=get_utc_now(),
        event_type="CONSENT_WITHDRAWN" if req.new_status == "WITHDRAWN" else "CONSENT_GRANTED",
        actor_id="SUBJ-PORTAL-SYNC",
        actor_name="Patient Consent Gateway",
        actor_role=req.actor_role or "Compliance Officer",
        institution_msp="Org1MSP",
        details=f"Consent updated to {req.new_status} for {req.patient_id}. Fabric ledger commitment anchored at Block #{consent.block_number}.",
        tx_id=tx_id,
        block_number=1460,
        is_blockchain_tx=True,
        status="COMMITTED"
    )
    db.add(audit)
    db.commit()
    
    return {
        "success": True,
        "patient_id": req.patient_id,
        "new_status": req.new_status,
        "tx_id": tx_id,
        "block_number": 1460
    }

@app.post("/api/integrity/verify", response_model=IntegrityVerifyResponse)
def verify_integrity(req: IntegrityVerifyRequest, db: Session = Depends(get_db)):
    patient = db.query(PatientModel).filter(PatientModel.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    p_dict = {
        "id": patient.id,
        "age": patient.age,
        "gender": patient.gender,
        "primary_diagnosis": patient.primary_diagnosis,
        "icd10": patient.icd10,
        "measurements": patient.measurements or {},
        "medications": patient.medications or []
    }
    
    result = fabric_client.verify_integrity(
        p_dict, 
        patient.data_digest, 
        patient.block_number, 
        patient.tx_id
    )
    
    # Audit log
    audit = AuditLogModel(
        id=f"AUD-{int(get_utc_now().timestamp() * 1000)}",
        timestamp=get_utc_now(),
        event_type="RECORD_INTEGRITY_VERIFIED" if result["is_valid"] else "INTEGRITY_VIOLATION_DETECTED",
        actor_id="SYSTEM_VERIFIER",
        actor_name="Consensus Verification Daemon",
        actor_role="Ledger Gateway",
        institution_msp=patient.institution_msp,
        details=result["details"],
        tx_id=patient.tx_id,
        block_number=patient.block_number,
        is_blockchain_tx=True,
        status="COMMITTED" if result["is_valid"] else "ALERT"
    )
    db.add(audit)
    db.commit()
    
    return IntegrityVerifyResponse(
        patient_id=result["patient_id"],
        is_valid=result["is_valid"],
        computed_digest=result["computed_digest"],
        on_chain_digest=result["on_chain_digest"],
        tx_id=result["tx_id"],
        block_number=result["block_number"],
        details=result["details"]
    )

@app.get("/api/audit")
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    blockchain_only: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(AuditLogModel)
    if blockchain_only:
        query = query.filter(AuditLogModel.is_blockchain_tx == True)
    logs = query.order_by(AuditLogModel.timestamp.desc()).limit(limit).all()
    return logs
