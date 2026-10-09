import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Users, 
  ShieldCheck, 
  FileText, 
  Activity, 
  Lock, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Patient, ConsentStatus } from '../types/clinical';
import { apiService } from '../services/api';

interface PatientRegistryProps {
  patients: Patient[];
  onVerifyIntegrity: (patientId: string) => Promise<any>;
}

export const PatientRegistry: React.FC<PatientRegistryProps> = ({
  patients,
  onVerifyIntegrity
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string>('ALL');
  const [selectedConsent, setSelectedConsent] = useState<string>('ALL');
  const [selectedGender, setSelectedGender] = useState<string>('ALL');
  const [minAge, setMinAge] = useState<number>(18);
  const [maxAge, setMaxAge] = useState<number>(85);
  const [minHba1c, setMinHba1c] = useState<string>('');
  const [maxHba1c, setMaxHba1c] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Selected patient for modal view
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);

  // Unique diagnoses list
  const diagnoses = useMemo(() => {
    const set = new Set<string>();
    patients.forEach(p => set.add(p.primary_diagnosis));
    return Array.from(set).sort();
  }, [patients]);

  // Filtering logic
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      // Search term: ID, Diagnosis, Medication, ICD10
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesId = p.id.toLowerCase().includes(query);
        const matchesDiag = p.primary_diagnosis.toLowerCase().includes(query);
        const matchesIcd = p.icd10.toLowerCase().includes(query);
        const matchesMed = p.medications.some(m => m.toLowerCase().includes(query));
        if (!matchesId && !matchesDiag && !matchesIcd && !matchesMed) return false;
      }

      // Diagnosis filter
      if (selectedDiagnosis !== 'ALL' && p.primary_diagnosis !== selectedDiagnosis) {
        return false;
      }

      // Consent filter
      if (selectedConsent !== 'ALL' && p.consent.status !== selectedConsent) {
        return false;
      }

      // Gender filter
      if (selectedGender !== 'ALL' && p.gender !== selectedGender) {
        return false;
      }

      // Age filter
      if (p.age < minAge || p.age > maxAge) {
        return false;
      }

      // HbA1c filter
      if (minHba1c && (p.measurements.hba1c === null || p.measurements.hba1c === undefined || p.measurements.hba1c < parseFloat(minHba1c))) {
        return false;
      }
      if (maxHba1c && (p.measurements.hba1c === null || p.measurements.hba1c === undefined || p.measurements.hba1c > parseFloat(maxHba1c))) {
        return false;
      }

      return true;
    });
  }, [patients, searchTerm, selectedDiagnosis, selectedConsent, selectedGender, minAge, maxAge, minHba1c, maxHba1c]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredPatients.length / pageSize) || 1;
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, currentPage, pageSize]);

  const handleVerify = async (patient: Patient) => {
    setVerifyingId(patient.id);
    try {
      const res = await onVerifyIntegrity(patient.id);
      setVerifyResult(res);
    } finally {
      setVerifyingId(null);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedDiagnosis('ALL');
    setSelectedConsent('ALL');
    setSelectedGender('ALL');
    setMinAge(18);
    setMaxAge(85);
    setMinHba1c('');
    setMaxHba1c('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Synthetic Patient Cohort Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse {patients.length.toLocaleString()} pseudonymized fictional records with standardized EHR labs and SHA-256 ledger digests.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-mono">
            Filtered: {filteredPatients.length.toLocaleString()} of {patients.length.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Bar */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by Patient ID (e.g. PT-10042), diagnosis, ICD-10, or medication (e.g. Metformin)..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>

          {/* Diagnosis Dropdown */}
          <div>
            <select
              value={selectedDiagnosis}
              onChange={(e) => { setSelectedDiagnosis(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-cyan-500"
            >
              <option value="ALL">All Diagnoses ({diagnoses.length})</option>
              {diagnoses.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Multi-parameter Subfilters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Consent Status */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Consent Status</label>
            <select
              value={selectedConsent}
              onChange={(e) => { setSelectedConsent(e.target.value); setCurrentPage(1); }}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="GRANTED">GRANTED (Active)</option>
              <option value="WITHDRAWN">WITHDRAWN (Blocked)</option>
              <option value="RESTRICTED">RESTRICTED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Gender</label>
            <select
              value={selectedGender}
              onChange={(e) => { setSelectedGender(e.target.value); setCurrentPage(1); }}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden"
            >
              <option value="ALL">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Age Min/Max */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Min Age ({minAge})</label>
            <input
              type="number"
              min={18}
              max={maxAge}
              value={minAge}
              onChange={(e) => { setMinAge(Number(e.target.value)); setCurrentPage(1); }}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-slate-500 font-medium mb-1">Max Age ({maxAge})</label>
            <input
              type="number"
              min={minAge}
              max={85}
              value={maxAge}
              onChange={(e) => { setMaxAge(Number(e.target.value)); setCurrentPage(1); }}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden"
            />
          </div>

          {/* HbA1c Min/Max */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Min HbA1c (%)</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 7.0"
              value={minHba1c}
              onChange={(e) => { setMinHba1c(e.target.value); setCurrentPage(1); }}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden"
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-slate-500 font-medium mb-1">Max HbA1c (%)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 10.0"
                value={maxHba1c}
                onChange={(e) => { setMaxHba1c(e.target.value); setCurrentPage(1); }}
                className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden"
              />
            </div>
            <button
              onClick={resetFilters}
              title="Reset all filters"
              className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Patient ID</th>
                <th className="py-3 px-4">Demographics</th>
                <th className="py-3 px-4">Primary Diagnosis</th>
                <th className="py-3 px-4">Key Clinical Labs</th>
                <th className="py-3 px-4">Medications</th>
                <th className="py-3 px-4">Consent Status</th>
                <th className="py-3 px-4">Ledger Commitment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No matching patient records found</p>
                    <p className="text-slate-400 mt-1">Try adjusting your diagnosis, lab ranges, or search filters.</p>
                    <button
                      onClick={resetFilters}
                      className="mt-3 text-cyan-700 hover:underline font-medium text-xs"
                    >
                      Reset All Filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedPatients.map((patient) => {
                  const isTampered = patient.blockchain.tampered_field;
                  return (
                    <tr 
                      key={patient.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isTampered ? 'bg-red-50/50' : ''
                      }`}
                    >
                      {/* ID */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{patient.id}</span>
                          {isTampered && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-sans font-bold">
                              ALTERED
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Demographics */}
                      <td className="py-3 px-4 text-slate-700">
                        <div>{patient.age} yrs • {patient.gender}</div>
                        <div className="text-[10px] text-slate-400">{patient.ethnicity}</div>
                      </td>

                      {/* Primary Diagnosis */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{patient.primary_diagnosis}</div>
                        <div className="text-[10px] font-mono text-slate-400">ICD-10: {patient.icd10}</div>
                      </td>

                      {/* Key Labs */}
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px] space-y-0.5">
                        <div>
                          HbA1c:{' '}
                          <span className={patient.measurements.hba1c ? 'font-semibold text-slate-800' : 'text-amber-600 italic font-sans'}>
                            {patient.measurements.hba1c !== null && patient.measurements.hba1c !== undefined ? `${patient.measurements.hba1c}%` : 'Missing'}
                          </span>
                        </div>
                        <div>
                          BP:{' '}
                          <span>{patient.measurements.systolic_bp}/{patient.measurements.diastolic_bp} mmHg</span>
                        </div>
                        <div>
                          eGFR:{' '}
                          <span className={patient.measurements.egfr ? '' : 'text-amber-600 italic font-sans'}>
                            {patient.measurements.egfr ? `${patient.measurements.egfr} mL/min` : 'Missing'}
                          </span>
                        </div>
                      </td>

                      {/* Medications */}
                      <td className="py-3 px-4 max-w-[160px]">
                        <div className="truncate text-slate-600" title={patient.medications.join(', ')}>
                          {patient.medications.slice(0, 2).join(', ')}
                          {patient.medications.length > 2 && ` +${patient.medications.length - 2}`}
                        </div>
                      </td>

                      {/* Consent Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          patient.consent.status === 'GRANTED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : patient.consent.status === 'WITHDRAWN'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {patient.consent.status === 'GRANTED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {patient.consent.status === 'WITHDRAWN' && <XCircle className="w-3 h-3 text-red-600" />}
                          {patient.consent.status}
                        </span>
                      </td>

                      {/* Ledger Commitment */}
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <Lock className="w-3 h-3 text-purple-600 shrink-0" />
                          <span className="truncate max-w-[90px]" title={patient.blockchain.data_digest}>
                            {patient.blockchain.data_digest.slice(0, 8)}...
                          </span>
                        </div>
                        <div className="text-slate-400">Block #{patient.blockchain.block_number}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => { setSelectedPatient(patient); setVerifyResult(null); }}
                          className="px-2.5 py-1 text-slate-700 hover:text-cyan-800 hover:bg-cyan-50 rounded-md border border-slate-200 transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="py-3 px-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Showing {paginatedPatients.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredPatients.length)} of {filteredPatients.length} entries</span>
            <span className="text-slate-300">|</span>
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:outline-hidden"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{selectedPatient.id}</h2>
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-mono text-slate-600">
                    Pseudonymized EHR Record
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Node: {selectedPatient.institution} ({selectedPatient.institution_msp})
                </p>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Demographics & Clinical Profile */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[11px]">Age / Gender</span>
                  <span className="font-semibold text-slate-800 text-sm">{selectedPatient.age} yrs • {selectedPatient.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Ethnicity</span>
                  <span className="font-semibold text-slate-800 text-sm">{selectedPatient.ethnicity}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[11px]">Primary Indication</span>
                  <span className="font-semibold text-slate-800 text-sm">{selectedPatient.primary_diagnosis} ({selectedPatient.icd10})</span>
                </div>
              </div>

              {/* Clinical Measurements */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-2.5 text-sm flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-600" />
                  EHR Clinical Measurements
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {Object.entries(selectedPatient.measurements).map(([k, v]) => (
                    <div key={k} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                      <span className="text-slate-400 block uppercase text-[10px] tracking-wider">{k.replace(/_/g, ' ')}</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {v !== null && v !== undefined ? v : <span className="text-amber-600 italic font-sans font-normal">Missing</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Medications */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 text-sm">Active Prescriptions</h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPatient.medications.map(med => (
                    <span key={med} className="px-2.5 py-1 bg-slate-100 rounded-md text-slate-700 font-medium">
                      {med}
                    </span>
                  ))}
                </div>
              </div>

              {/* Consent Information */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 flex items-center gap-1.5 text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Consent Authorization
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    selectedPatient.consent.status === 'GRANTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedPatient.consent.status}
                  </span>
                </div>
                <div className="text-slate-600 space-y-1">
                  <div>Scope: <strong>{selectedPatient.consent.consent_type}</strong></div>
                  <div>Executed: {new Date(selectedPatient.consent.signed_at).toLocaleString()}</div>
                  {selectedPatient.consent.revoked_at && (
                    <div className="text-red-600 font-medium">
                      Revocation Logged: {new Date(selectedPatient.consent.revoked_at).toLocaleString()}
                    </div>
                  )}
                  <div className="font-mono text-[10px] text-slate-400 truncate">
                    Agreement Hash: {selectedPatient.consent.consent_hash}
                  </div>
                </div>
              </div>

              {/* Blockchain Commitment & Instant Integrity Proof */}
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-950 flex items-center gap-1.5 text-sm">
                    <Lock className="w-4 h-4 text-purple-600" />
                    Hyperledger Fabric Commitment
                  </span>
                  <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-semibold">
                    Block #{selectedPatient.blockchain.block_number}
                  </span>
                </div>

                <div className="space-y-1 text-slate-600 font-mono text-[11px]">
                  <div className="break-all">
                    <span className="text-slate-400 font-sans">Ledger Digest: </span>
                    {selectedPatient.blockchain.data_digest}
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400 font-sans">Tx ID: </span>
                    {selectedPatient.blockchain.tx_id}
                  </div>
                </div>

                {/* Instant Verification Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-purple-200">
                  <button
                    onClick={() => handleVerify(selectedPatient)}
                    disabled={verifyingId !== null}
                    className="w-full sm:w-auto px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-medium text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {verifyingId === selectedPatient.id ? 'Recomputing SHA-256...' : 'Verify Cryptographic Digest'}
                  </button>

                  {verifyResult && (
                    <div className={`text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                      verifyResult.is_valid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {verifyResult.is_valid ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Ledger Match Verified</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span>INTEGRITY MISMATCH</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 font-medium text-xs"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
