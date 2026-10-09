"""
Hyperledger Fabric Gateway & Cryptographic Verification Service.
Provides cryptographic digest generation, off-chain integrity verification,
and Fabric Gateway smart contract invocation interfaces.
"""
import json
import hashlib
from typing import Dict, Any, Tuple, Optional
from datetime import datetime, timezone
from .config import settings

def calculate_canonical_record_digest(patient_dict: Dict[str, Any]) -> str:
    """Computes deterministic canonical SHA-256 hash of patient clinical attributes."""
    measurements = patient_dict.get("measurements", {})
    clean_measurements = {}
    for k in sorted(measurements.keys()):
        val = measurements[k]
        if val is not None:
            clean_measurements[k] = round(val, 2) if isinstance(val, float) else val

    canonical_obj = {
        "id": patient_dict["id"],
        "age": patient_dict["age"],
        "gender": patient_dict["gender"],
        "primary_diagnosis": patient_dict["primary_diagnosis"],
        "icd10": patient_dict["icd10"],
        "measurements": clean_measurements,
        "medications": sorted(patient_dict.get("medications", []))
    }
    encoded = json.dumps(canonical_obj, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()

class FabricGatewayClient:
    """
    Fabric Gateway Client managing transactions against the 'clinical-trials' channel
    and 'patient-recruitment-contract' chaincode.
    """
    def __init__(self):
        self.channel_name = settings.FABRIC_CHANNEL
        self.chaincode_name = settings.FABRIC_CHAINCODE
        self.msp_id = settings.FABRIC_MSP_ID
        self.endpoint = settings.FABRIC_PEER_ENDPOINT
        self.is_connected = False

    def verify_integrity(self, patient_dict: Dict[str, Any], on_chain_digest: str, block_number: int, tx_id: str) -> Dict[str, Any]:
        """
        Recomputes off-chain record SHA-256 digest and compares with immutable ledger commitment.
        """
        computed_digest = calculate_canonical_record_digest(patient_dict)
        is_valid = (computed_digest == on_chain_digest)

        return {
            "patient_id": patient_dict["id"],
            "is_valid": is_valid,
            "computed_digest": computed_digest,
            "on_chain_digest": on_chain_digest,
            "tx_id": tx_id,
            "block_number": block_number,
            "channel": self.channel_name,
            "chaincode": self.chaincode_name,
            "details": "Verified: Off-chain EHR fields exactly match on-chain SHA-256 cryptographic commitment." if is_valid else "Integrity Violation: Off-chain record has been modified or tampered with since on-chain registration!"
        }

    def generate_transaction_commitment(self, patient_id: str, digest: str, block_number: int) -> Tuple[str, str]:
        """
        Creates a deterministic ledger transaction hash for anchor verification.
        """
        tx_data = f"fabric-{patient_id}-{block_number}-{digest}".encode("utf-8")
        tx_hash = hashlib.sha256(tx_data).hexdigest()
        return f"0x{tx_hash[:40]}", datetime.now(timezone.utc).isoformat()

fabric_client = FabricGatewayClient()
