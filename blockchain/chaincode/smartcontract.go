package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// SmartContract provides functions for managing clinical trial ledger commitments
type SmartContract struct {
	contractapi.Contract
}

// ConsentState records the patient's current research authorization
type ConsentState struct {
	Status        string `json:"status"`        // GRANTED, WITHDRAWN, RESTRICTED, EXPIRED
	ConsentType   string `json:"consent_type"`  // GENERAL_RECRUITMENT, CARDIOMETABOLIC_ONLY, ONCOLOGY_ONLY
	SignedAt      string `json:"signed_at"`
	RevokedAt     string `json:"revoked_at,omitempty"`
	AgreementHash string `json:"agreement_hash"`
	SignerMSP     string `json:"signer_msp"`
}

// PatientLedgerRecord stores privacy-preserving commitment on the shared ledger
type PatientLedgerRecord struct {
	PatientID             string       `json:"patient_id"`
	DataDigest            string       `json:"data_digest"` // SHA-256 hash of canonical EHR fields
	InstitutionMSP        string       `json:"institution_msp"`
	RegistrationTimestamp string       `json:"registration_timestamp"`
	TxID                  string       `json:"tx_id"`
	Consent               ConsentState `json:"consent"`
}

// RecruitmentAccessAudit records privacy-compliant query access on chain
type RecruitmentAccessAudit struct {
	AuditID        string `json:"audit_id"`
	ResearcherID   string `json:"researcher_id"`
	TrialID        string `json:"trial_id"`
	QueryTimestamp string `json:"query_timestamp"`
	CandidateCount int    `json:"candidate_count"`
	QueryHash      string `json:"query_hash"`
	ResearcherMSP  string `json:"researcher_msp"`
}

// IntegrityVerificationResult returned when checking off-chain data against ledger
type IntegrityVerificationResult struct {
	PatientID      string `json:"patient_id"`
	IsValid        bool   `json:"is_valid"`
	ComputedDigest string `json:"computed_digest"`
	OnChainDigest  string `json:"on_chain_digest"`
	TxID           string `json:"tx_id"`
	Timestamp      string `json:"timestamp"`
	Message        string `json:"message"`
}

// HistoryQueryResult structure for ledger key history
type HistoryQueryResult struct {
	TxID      string      `json:"tx_id"`
	Timestamp string      `json:"timestamp"`
	IsDelete  bool        `json:"is_delete"`
	Value     interface{} `json:"value"`
}

// InitLedger initializes the chaincode
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("AegisTrial Clinical Recruitment Chaincode Initialized.")
	return nil
}

// RegisterPatientRecord commits a patient's SHA-256 data digest and initial consent to the ledger
func (s *SmartContract) RegisterPatientRecord(
	ctx contractapi.TransactionContextInterface,
	patientID string,
	dataDigest string,
	institutionMSP string,
	consentType string,
	agreementHash string,
) (*PatientLedgerRecord, error) {
	exists, err := s.RecordExists(ctx, patientID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if exists {
		return nil, fmt.Errorf("patient record %s already registered on ledger", patientID)
	}

	txID := ctx.GetStub().GetTxID()
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	var timeStr string
	if err == nil && txTimestamp != nil {
		timeStr = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	} else {
		timeStr = time.Now().UTC().Format(time.RFC3339)
	}

	record := PatientLedgerRecord{
		PatientID:             patientID,
		DataDigest:            dataDigest,
		InstitutionMSP:        institutionMSP,
		RegistrationTimestamp: timeStr,
		TxID:                  txID,
		Consent: ConsentState{
			Status:        "GRANTED",
			ConsentType:   consentType,
			SignedAt:      timeStr,
			AgreementHash: agreementHash,
			SignerMSP:     institutionMSP,
		},
	}

	recordJSON, err := json.Marshal(record)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(patientID, recordJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to put state: %v", err)
	}

	// Emit Fabric event for subscriber nodes
	eventPayload := fmt.Sprintf(`{"patient_id":"%s","data_digest":"%s","status":"GRANTED"}`, patientID, dataDigest)
	ctx.GetStub().SetEvent("RecordRegistered", []byte(eventPayload))

	return &record, nil
}

// UpdateConsent modifies the consent state (e.g. withdrawal or restrictions)
func (s *SmartContract) UpdateConsent(
	ctx contractapi.TransactionContextInterface,
	patientID string,
	newStatus string,
	reason string,
) (*ConsentState, error) {
	record, err := s.GetPatientLedgerRecord(ctx, patientID)
	if err != nil {
		return nil, err
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	var timeStr string
	if err == nil && txTimestamp != nil {
		timeStr = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	} else {
		timeStr = time.Now().UTC().Format(time.RFC3339)
	}

	record.Consent.Status = newStatus
	if newStatus == "WITHDRAWN" {
		record.Consent.RevokedAt = timeStr
	}

	recordJSON, err := json.Marshal(record)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(patientID, recordJSON)
	if err != nil {
		return nil, err
	}

	// Emit Fabric event
	eventPayload := fmt.Sprintf(`{"patient_id":"%s","new_status":"%s","timestamp":"%s"}`, patientID, newStatus, timeStr)
	ctx.GetStub().SetEvent("ConsentUpdated", []byte(eventPayload))

	return &record.Consent, nil
}

// VerifyRecordIntegrity compares an off-chain calculated digest against the ledger state
func (s *SmartContract) VerifyRecordIntegrity(
	ctx contractapi.TransactionContextInterface,
	patientID string,
	currentOffChainDigest string,
) (*IntegrityVerificationResult, error) {
	record, err := s.GetPatientLedgerRecord(ctx, patientID)
	if err != nil {
		return nil, err
	}

	isValid := (record.DataDigest == currentOffChainDigest)
	msg := "Integrity Verified: Off-chain record matches ledger digest byte-for-byte."
	if !isValid {
		msg = "INTEGRITY VIOLATION DETECTED: Off-chain record has been altered without consortium consensus!"
	}

	result := &IntegrityVerificationResult{
		PatientID:      patientID,
		IsValid:        isValid,
		ComputedDigest: currentOffChainDigest,
		OnChainDigest:  record.DataDigest,
		TxID:           record.TxID,
		Timestamp:      time.Now().UTC().Format(time.RFC3339),
		Message:        msg,
	}

	return result, nil
}

// RecordRecruitmentAccess records authorized investigator query execution
func (s *SmartContract) RecordRecruitmentAccess(
	ctx contractapi.TransactionContextInterface,
	auditID string,
	researcherID string,
	trialID string,
	candidateCount int,
	queryHash string,
) error {
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	var timeStr string
	if err == nil && txTimestamp != nil {
		timeStr = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	} else {
		timeStr = time.Now().UTC().Format(time.RFC3339)
	}

	auditKey := fmt.Sprintf("AUDIT_%s", auditID)
	audit := RecruitmentAccessAudit{
		AuditID:        auditID,
		ResearcherID:   researcherID,
		TrialID:        trialID,
		QueryTimestamp: timeStr,
		CandidateCount: candidateCount,
		QueryHash:      queryHash,
		ResearcherMSP:  "Org1MSP",
	}

	auditJSON, err := json.Marshal(audit)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(auditKey, auditJSON)
}

// GetPatientLedgerRecord retrieves a patient's commitment by ID
func (s *SmartContract) GetPatientLedgerRecord(
	ctx contractapi.TransactionContextInterface,
	patientID string,
) (*PatientLedgerRecord, error) {
	recordJSON, err := ctx.GetStub().GetState(patientID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if recordJSON == nil {
		return nil, fmt.Errorf("patient record %s does not exist on ledger", patientID)
	}

	var record PatientLedgerRecord
	err = json.Unmarshal(recordJSON, &record)
	if err != nil {
		return nil, err
	}

	return &record, nil
}

// RecordExists checks if a key exists
func (s *SmartContract) RecordExists(
	ctx contractapi.TransactionContextInterface,
	patientID string,
) (bool, error) {
	recordJSON, err := ctx.GetStub().GetState(patientID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	return recordJSON != nil, nil
}
