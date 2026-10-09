# Hyperledger Fabric Blockchain Integration

## 1. Architecture Overview

AegisTrial uses a **privacy-preserving consortium blockchain architecture** built on **Hyperledger Fabric v2.5+**:

* **Off-Chain EHR Storage**: Full clinical data (demographics, diagnoses, lab measurements, medications) is stored in the local relational database (PostgreSQL/SQLite) behind institutional firewalls and role-based access control. No sensitive Protected Health Information (PHI) is ever transmitted to or stored on the blockchain ledger.
* **On-Chain Ledger Commitments**: Only cryptographic commitments and consent state transitions are committed to the shared Fabric ledger:
  1. `data_digest`: Deterministic SHA-256 hash of canonical EHR fields.
  2. `institution_msp`: Identity of the healthcare institution node certifying the record.
  3. `consent_state`: Status (`GRANTED`, `WITHDRAWN`, `RESTRICTED`), scope, and signed agreement hash.
  4. `recruitment_audits`: Query audits recording researcher access without storing query results on-chain.
* **Channel**: `clinical-trials`
* **Chaincode**: `patient-recruitment-contract` (written in Go using `fabric-contract-api-go/v2`).

## 2. Chaincode Smart Contract Functions

The Go smart contract located at `blockchain/chaincode/smartcontract.go` implements:

| Function | Type | Description |
| :--- | :--- | :--- |
| `InitLedger` | Init | Initializes the world state. |
| `RegisterPatientRecord` | Invoke | Commits a new patient's SHA-256 digest and initial consent state to the ledger. |
| `UpdateConsent` | Invoke | Updates consent status (e.g. withdrawal); records revocation timestamp and emits `ConsentUpdated` event. |
| `VerifyRecordIntegrity` | Query | Compares an off-chain record's recomputed SHA-256 digest against the on-chain digest, returning verification proof. |
| `RecordRecruitmentAccess` | Invoke | Records an audit trail entry for a recruitment engine evaluation without leaking patient identities. |
| `GetPatientLedgerRecord` | Query | Retrieves the latest commitment and consent state for a given patient identifier. |

## 3. Local Environment Status & Prerequisites

* **Current Machine**: Windows 11 without Docker Desktop or Go compiler installed on system PATH.
* **Fabric Execution Requirement**: Hyperledger Fabric orderers and peer nodes run as Linux container processes requiring Docker Engine or a Linux/WSL2 instance.
* **Dual-Mode Gateway**: The application includes a fully verified Python Fabric Gateway service (`backend/app/blockchain_gateway.py`) that uses the exact same deterministic canonical serialization and cryptographic SHA-256 hash algorithms. When a live Fabric peer network is available, it connects via gRPC and submits real transactions.

## 4. How to Deploy to a Genuine Fabric Network (Linux / WSL2)

When running on Linux or Windows WSL2 with Docker installed:

```bash
# 1. Navigate to blockchain directory
cd blockchain

# 2. Make deployment script executable
chmod +x network.sh

# 3. Launch test-network, create channel 'clinical-trials', and deploy Go chaincode
./network.sh
```

### Manual Step-by-Step Commands:

```bash
# Clone fabric-samples
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
chmod +x install-fabric.sh
./install-fabric.sh docker binary

# Start network with CA
cd fabric-samples/test-network
./network.sh up createChannel -c clinical-trials -ca

# Deploy chaincode
./network.sh deployCC \
  -c clinical-trials \
  -ccn patient-recruitment-contract \
  -ccp ../../blockchain/chaincode \
  -ccl go

# Connect FastAPI backend to Fabric
export FABRIC_ENABLE_REAL_NETWORK=true
export FABRIC_CHANNEL=clinical-trials
export FABRIC_CHAINCODE=patient-recruitment-contract
export FABRIC_PEER_ENDPOINT=localhost:7051
```
