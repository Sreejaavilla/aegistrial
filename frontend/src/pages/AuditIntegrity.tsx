import React, { useState } from 'react';
import { 
  Lock, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  FileCheck, 
  Activity, 
  Search, 
  Database,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { Patient, AuditEvent, UserRole } from '../types/clinical';
import { apiService } from '../services/api';

interface AuditIntegrityProps {
  patients: Patient[];
  auditLogs: AuditEvent[];
  activeRole: UserRole;
  onRefreshData: () => void;
}

export const AuditIntegrity: React.FC<AuditIntegrityProps> = ({
  patients,
  auditLogs,
  activeRole,
  onRefreshData
}) => {
  // Tamper Demo State
  const [targetPatientId, setTargetPatientId] = useState<string>('PT-10001');
  const [tamperField, setTamperField] = useState<'hba1c' | 'primary_diagnosis' | 'age'>('hba1c');
  const [tamperValue, setTamperValue] = useState<string>('5.5');
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Audit filter state
  const [logFilter, setLogFilter] = useState<'ALL' | 'BLOCKCHAIN_ONLY' | 'DATABASE_ONLY'>('ALL');
  const [logSearch, setLogSearch] = useState('');

  const targetPatient = patients.find(p => p.id === targetPatientId) || patients[0];

  const handleSimulateTamper = () => {
    if (!targetPatient) return;
    apiService.tamperPatientRecord(targetPatient.id, tamperField, tamperValue);
    setVerificationResult(null);
    onRefreshData();
  };

  const handleRestoreRecord = () => {
    if (!targetPatient) return;
    apiService.resetTamperedPatient(targetPatient.id);
    setVerificationResult(null);
    onRefreshData();
  };

  const handleRunVerification = async () => {
    if (!targetPatient) return;
    setIsVerifying(true);
    try {
      const res = await apiService.verifyPatientIntegrity(targetPatient.id);
      setVerificationResult(res);
      onRefreshData();
    } finally {
      setIsVerifying(false);
    }
  };

  // Filtered audit events
  const filteredLogs = auditLogs.filter(log => {
    if (logFilter === 'BLOCKCHAIN_ONLY' && !log.is_blockchain_tx) return false;
    if (logFilter === 'DATABASE_ONLY' && log.is_blockchain_tx) return false;
    if (logSearch) {
      const q = logSearch.toLowerCase();
      if (!log.details.toLowerCase().includes(q) && !log.event_type.toLowerCase().includes(q) && !log.actor_name.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const blockchainTxCount = auditLogs.filter(l => l.is_blockchain_tx).length;
  const dbEventCount = auditLogs.filter(l => !l.is_blockchain_tx).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Lock className="w-6 h-6 text-purple-600" />
          Audit & Blockchain Cryptographic Integrity Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Immutable Hyperledger Fabric commitments, off-chain data consistency verification, and tamper detection.
        </p>
      </div>

      {/* Architecture Explainer Card */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-slate-800 shadow-md">
        <div className="max-w-4xl space-y-3">
          <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold uppercase tracking-wider">
            <Activity className="w-4 h-4" />
            Hyperledger Fabric Consortium Architecture
          </div>
          <h2 className="text-lg font-bold">Privacy-Preserving Anchoring Model</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Raw patient EHR records and sensitive protected health information (PHI) are stored <strong>strictly off-chain</strong> in local relational databases. 
            Only deterministic <strong>SHA-256 cryptographic digests</strong>, consent transition events, and recruitment query audit proofs are committed to the distributed shared ledger on Hyperledger Fabric channel <code className="text-cyan-300">clinical-trials</code>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="font-bold text-cyan-300 block">Off-Chain EHR Database</span>
              <span className="text-slate-300 text-[11px]">Stores clinical labs, demographics, and diagnoses. Never exposed on the distributed ledger.</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="font-bold text-purple-300 block">On-Chain Ledger Digest</span>
              <span className="text-slate-300 text-[11px]">Stores SHA-256(canonical_EHR), timestamp, MSP ID, and cryptographic signatures across peers.</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="font-bold text-emerald-300 block">Cryptographic Verification</span>
              <span className="text-slate-300 text-[11px]">Proves off-chain data has not been silently altered or fabricated since ledger genesis.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tamper & Verification Demonstration */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-purple-600" />
              Live Record Tampering & Cryptographic Verification Lab
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate an unauthorized change to a candidate's off-chain record and watch the verification engine detect it immediately.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-500 font-medium">Select Candidate:</span>
            <select
              value={targetPatientId}
              onChange={(e) => {
                setTargetPatientId(e.target.value);
                setVerificationResult(null);
              }}
              className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-hidden"
            >
              {patients.slice(0, 20).map(p => (
                <option key={p.id} value={p.id}>{p.id} ({p.primary_diagnosis.slice(0, 25)})</option>
              ))}
            </select>
          </div>
        </div>

        {targetPatient && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Current Record State & Tamper Controls */}
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">{targetPatient.id} EHR Values</span>
                  {targetPatient.blockchain.tampered_field ? (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold text-[10px] rounded-full">
                      RECORD MODIFIED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                      AUTHENTIC GENESIS RECORD
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-sans">HbA1c</span>
                    <span className="font-bold text-slate-800">{targetPatient.measurements.hba1c}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-sans">Age</span>
                    <span className="font-bold text-slate-800">{targetPatient.age} yrs</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-sans">eGFR</span>
                    <span className="font-bold text-slate-800">{targetPatient.measurements.egfr} mL/min</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 font-mono text-[10px] text-slate-500 break-all">
                  <span className="font-sans font-semibold text-purple-900 block">Ledger Committed SHA-256 Digest:</span>
                  {targetPatient.blockchain.data_digest}
                </div>
              </div>

              {/* Tamper Simulation Inputs */}
              <div className="p-4 bg-red-50/50 rounded-xl border border-red-200 space-y-3">
                <span className="font-bold text-red-950 block text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Simulate Database Tampering
                </span>
                <p className="text-[11px] text-red-900/80">
                  Alter an off-chain EHR field without obtaining Hyperledger Fabric consortium consensus:
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 text-[10px] font-medium mb-1">Target Field</label>
                    <select
                      value={tamperField}
                      onChange={(e) => setTamperField(e.target.value as any)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-md text-xs"
                    >
                      <option value="hba1c">HbA1c (alter lab result)</option>
                      <option value="age">Age (alter patient age)</option>
                      <option value="primary_diagnosis">Primary Diagnosis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[10px] font-medium mb-1">Injected Malicious Value</label>
                    <input
                      type="text"
                      value={tamperValue}
                      onChange={(e) => setTamperValue(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-md text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSimulateTamper}
                    className="flex-1 px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-semibold text-xs transition-colors shadow-2xs"
                  >
                    Inject Unauthorized Edit
                  </button>
                  {targetPatient.blockchain.tampered_field && (
                    <button
                      onClick={handleRestoreRecord}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Cryptographic Verification Execution & Proof Display */}
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-purple-700" />
                    Ledger Consistency Verification
                  </span>
                  <span className="text-[10px] font-mono text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md font-semibold">
                    Fabric Block #{targetPatient.blockchain.block_number}
                  </span>
                </div>

                <p className="text-[11px] text-purple-900/80 leading-relaxed">
                  The verification daemon deterministically re-serializes the candidate's off-chain clinical values into canonical JSON format, computes the SHA-256 cryptographic hash, and performs a byte-by-byte comparison against the on-chain ledger commitment.
                </p>

                <button
                  onClick={handleRunVerification}
                  disabled={isVerifying}
                  className="w-full px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                  {isVerifying ? 'Recomputing SHA-256...' : 'Run Cryptographic Verification Against Ledger'}
                </button>
              </div>

              {/* Verification Output Box */}
              {verificationResult && (
                <div className={`p-4 rounded-xl border space-y-2.5 ${
                  verificationResult.is_valid
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-red-50 border-red-300 text-red-950'
                }`}>
                  <div className="flex items-center gap-2">
                    {verificationResult.is_valid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                    )}
                    <span className="font-bold text-sm">
                      {verificationResult.is_valid ? 'Cryptographic Integrity Confirmed' : 'CRITICAL INTEGRITY VIOLATION DETECTED'}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed font-medium">
                    {verificationResult.details}
                  </p>

                  <div className="space-y-1 font-mono text-[10px] pt-2 border-t border-current/20 break-all">
                    <div>
                      <span className="font-sans font-semibold">Computed Off-Chain Hash: </span>
                      {verificationResult.computed_digest}
                    </div>
                    <div>
                      <span className="font-sans font-semibold">On-Chain Ledger Anchor: </span>
                      {verificationResult.on_chain_digest}
                    </div>
                    <div>
                      <span className="font-sans font-semibold">Transaction Reference: </span>
                      {verificationResult.tx_id}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transaction & Audit Stream Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Auditable Transaction & Event History</h3>
            <p className="text-slate-500 mt-0.5">
              Clear distinction between genuine Hyperledger Fabric ledger transactions and application database logs.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] ${
                logFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              All Events ({auditLogs.length})
            </button>
            <button
              onClick={() => setLogFilter('BLOCKCHAIN_ONLY')}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] flex items-center gap-1 ${
                logFilter === 'BLOCKCHAIN_ONLY' ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-700'
              }`}
            >
              <Lock className="w-3 h-3" />
              Fabric Ledger Tx ({blockchainTxCount})
            </button>
            <button
              onClick={() => setLogFilter('DATABASE_ONLY')}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] ${
                logFilter === 'DATABASE_ONLY' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Database Logs ({dbEventCount})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Channel / Ledger Ref</th>
                <th className="py-2.5 px-3">Actor & Organization</th>
                <th className="py-2.5 px-3">Event Summary</th>
                <th className="py-2.5 px-3 text-right">Ledger Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>

                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      {log.is_blockchain_tx ? (
                        <Lock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      ) : (
                        <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span>{log.event_type.replace(/_/g, ' ')}</span>
                    </span>
                  </td>

                  <td className="py-2.5 px-3 font-mono text-[10px]">
                    {log.is_blockchain_tx ? (
                      <div>
                        <span className="text-purple-700 font-semibold">Block #{log.block_number}</span>
                        <div className="text-slate-400 truncate max-w-[120px]" title={log.tx_id}>
                          Tx: {log.tx_id?.slice(0, 14)}...
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Off-chain DB event</span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-slate-600">
                    <div className="font-medium text-slate-800">{log.actor_name}</div>
                    <div className="text-[10px] text-slate-400">{log.institution_msp} ({log.actor_role})</div>
                  </td>

                  <td className="py-2.5 px-3 text-slate-600 max-w-sm">
                    <p className="line-clamp-2">{log.details}</p>
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.status === 'COMMITTED'
                        ? 'bg-purple-100 text-purple-800'
                        : log.status === 'ALERT'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
