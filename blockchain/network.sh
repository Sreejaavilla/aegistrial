#!/usr/bin/env bash
# ==============================================================================
# Hyperledger Fabric Deployment Script for AegisTrial Recruitment System
# Requires: Docker, Docker Compose, Go 1.22+, curl, jq (Linux / WSL2 environment)
# ==============================================================================

set -euo pipefail

CHANNEL_NAME="clinical-trials"
CHAINCODE_NAME="patient-recruitment-contract"
CHAINCODE_PATH="../blockchain/chaincode"
CHAINCODE_VERSION="1.0"
CHAINCODE_SEQUENCE="1"

echo "=================================================================="
echo " Starting Hyperledger Fabric Network for AegisTrial"
echo " Channel: ${CHANNEL_NAME}"
echo " Chaincode: ${CHAINCODE_NAME}"
echo "=================================================================="

# 1. Check Prerequisites
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed. Hyperledger Fabric peers require container runtime."
    echo "To run Fabric locally, install Docker Desktop or run inside WSL2 / Linux VM."
    exit 1
fi

if ! command -v go &> /dev/null; then
    echo "ERROR: Go compiler not found. Required to package Go chaincode."
    exit 1
fi

# 2. Clone Fabric Samples if not present
if [ ! -d "fabric-samples" ]; then
    echo "Downloading Fabric test-network binaries and docker images..."
    curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
    chmod +x install-fabric.sh
    ./install-fabric.sh docker binary
fi

cd fabric-samples/test-network

# 3. Bring up network with CA and create channel
echo "Bringing up test network with Certificate Authorities..."
./network.sh down
./network.sh up createChannel -c ${CHANNEL_NAME} -ca

# 4. Deploy Go Chaincode
echo "Deploying Go chaincode ${CHAINCODE_NAME} to channel ${CHANNEL_NAME}..."
./network.sh deployCC \
    -c ${CHANNEL_NAME} \
    -ccn ${CHAINCODE_NAME} \
    -ccp ../${CHAINCODE_PATH} \
    -ccl go \
    -ccv ${CHAINCODE_VERSION} \
    -ccs ${CHAINCODE_SEQUENCE}

echo "=================================================================="
echo " Chaincode successfully deployed to Hyperledger Fabric!"
echo " Testing Ledger Transactions:"
echo "=================================================================="

# 5. Test Registering a Patient Record Commitment
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

echo "Submitting RegisterPatientRecord transaction..."
peer chaincode invoke \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
    -C ${CHANNEL_NAME} \
    -n ${CHAINCODE_NAME} \
    --peerAddresses localhost:7051 --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
    -c '{"function":"RegisterPatientRecord","Args":["PT-10001","9a3b2c1d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b","Org1MSP","GENERAL_RECRUITMENT","agree_hash_123"]}'

echo "Querying GetPatientLedgerRecord..."
peer chaincode query \
    -C ${CHANNEL_NAME} \
    -n ${CHAINCODE_NAME} \
    -c '{"function":"GetPatientLedgerRecord","Args":["PT-10001"]}'

echo "=================================================================="
echo " Fabric Network and Ledger Verification Complete!"
echo "=================================================================="
