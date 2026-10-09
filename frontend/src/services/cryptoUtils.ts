/**
 * Cryptographic utility for computing canonical SHA-256 digests
 * matches backend and Hyperledger Fabric chaincode deterministic serialization.
 */
import { Patient } from '../types/clinical';

export async function sha256Hex(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function createCanonicalPatientString(patient: Patient): string {
  // Sort measurements and round floats identically to backend
  const cleanMeasurements: Record<string, number> = {};
  const mKeys = Object.keys(patient.measurements).sort();
  for (const k of mKeys) {
    const val = patient.measurements[k];
    if (val !== null && val !== undefined) {
      cleanMeasurements[k] = typeof val === 'number' && !Number.isInteger(val) 
        ? Math.round(val * 100) / 100 
        : val;
    }
  }

  const canonicalObj = {
    id: patient.id,
    age: patient.age,
    gender: patient.gender,
    primary_diagnosis: patient.primary_diagnosis,
    icd10: patient.icd10,
    measurements: cleanMeasurements,
    medications: [...patient.medications].sort()
  };

  return JSON.stringify(canonicalObj);
}

export async function computePatientDigest(patient: Patient): Promise<string> {
  const canonical = createCanonicalPatientString(patient);
  return sha256Hex(canonical);
}
