from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON, Text
from datetime import datetime
from .database import Base

class PatientModel(Base):
    __tablename__ = "patients"

    id = Column(String(32), primary_key=True, index=True)
    age = Column(Integer, nullable=False, index=True)
    gender = Column(String(16), nullable=False)
    ethnicity = Column(String(64), nullable=False)
    primary_diagnosis = Column(String(128), nullable=False, index=True)
    icd10 = Column(String(16), nullable=False, index=True)
    secondary_diagnoses = Column(JSON, default=list)
    measurements = Column(JSON, default=dict)
    medications = Column(JSON, default=list)
    institution = Column(String(128), nullable=False)
    institution_msp = Column(String(32), nullable=False)
    
    # Blockchain Anchor
    data_digest = Column(String(64), nullable=False, index=True)
    tx_id = Column(String(66), nullable=False)
    block_number = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class TrialModel(Base):
    __tablename__ = "clinical_trials"

    id = Column(String(32), primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    phase = Column(String(32), nullable=False)
    sponsor = Column(String(128), nullable=False)
    description = Column(Text, nullable=False)
    target_diagnosis = Column(String(128), nullable=False, index=True)
    target_icd10 = Column(String(16), nullable=True)
    age_min = Column(Integer, default=18)
    age_max = Column(Integer, default=85)
    required_consent_type = Column(String(64), default="GENERAL_RECRUITMENT")
    measurement_ranges = Column(JSON, default=dict)
    inclusion_criteria = Column(JSON, default=list)
    exclusion_criteria = Column(JSON, default=list)
    target_enrollment = Column(Integer, default=100)
    status = Column(String(32), default="RECRUITING")
    created_at = Column(DateTime, default=datetime.utcnow)

class ConsentModel(Base):
    __tablename__ = "patient_consents"

    patient_id = Column(String(32), primary_key=True, index=True)
    status = Column(String(32), nullable=False, default="GRANTED") # GRANTED, WITHDRAWN, RESTRICTED, EXPIRED
    consent_type = Column(String(64), nullable=False, default="GENERAL_RECRUITMENT")
    signed_at = Column(String(64), nullable=False)
    revoked_at = Column(String(64), nullable=True)
    consent_hash = Column(String(64), nullable=False)
    tx_id = Column(String(66), nullable=True)
    block_number = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AuditLogModel(Base):
    __tablename__ = "audit_events"

    id = Column(String(64), primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    actor_id = Column(String(64), nullable=False)
    actor_name = Column(String(128), nullable=False)
    actor_role = Column(String(64), nullable=False)
    institution_msp = Column(String(32), nullable=False)
    details = Column(Text, nullable=False)
    tx_id = Column(String(66), nullable=True)
    block_number = Column(Integer, nullable=True)
    is_blockchain_tx = Column(Boolean, default=False)
    status = Column(String(32), default="COMMITTED")
