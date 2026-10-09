import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Lock, 
  ArrowRight, 
  Clock, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { Patient, ConsentStatus, UserRole } from '../types/clinical';
import { apiService } from '../services/api';

interface ConsentManagementProps {
  patients: Patient[];
  activeRole: UserRole;
  onConsentUpdated: () => void;
  onNavigateToRecruitment: () => void;
}

export const ConsentManagement: React.FC<ConsentManagementProps> = ({
  patients,
  activeRole,
  onConsentUpdated,
  onNavigateToRecruitment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; tx_id?: string; block?: number } | null>(null);

  // Filtered patients
  const filtered = patients.filter(p => {
    if (statusFilter !== 'ALL' && p.consent.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!p.id.toLowerCase().includes(q) && !p.primary_diagnosis.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleToggleConsent = async (patient: Patient) => {
    setUpdatingId(patient.id);
    const newStatus: ConsentStatus = patient.consent.status === 'GRANTED' ? 'WITHDRAWN' : 'GRANTED';
    
    try {
      const res = apiService.updateConsentStatus(patient.id, newStatus, `${activeRole} Officer`);
      if (res.success) {
        setNotification({
          message: `Consent status for ${patient.id} updated to ${newStatus}. Blockchain transaction committed to channel 'clinical-trials'.`,
          tx_id: res.tx_id,
          block: res.block_number
        });
        onConsentUpdated();
      }
    } finally {
      setUpdatingId(null);
    }
  };

  // Metrics
  const granted = patients.filter(p => p.consent.status === 'GRANTED').length;
  const withdrawn = patients.filter(p => p.consent.status === 'WITHDRAWN').length;
  const restricted = patients.filter(p => p.consent.status === 'RESTRICTED').length;
  const expired = patients.filter(p => p.consent.status === 'EXPIRED').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Dynamic Patient Consent Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time consent tracking with cryptographic transaction anchoring. Withdrawal instantly halts recruitment queries.
          </p>
        </div>

        <button
          onClick={onNavigateToRecruitment}
          className="self-start sm:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          Verify in Recruitment Engine <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Transaction notification */}
      {notification && (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-purple-900 block">{notification.message}</span>
              {notification.tx_id && (
                <div className="mt-1 font-mono text-[11px] text-purple-700">
                  <span>Tx ID: {notification.tx_id}</span> • <span>Block #{notification.block}</span>
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-purple-400 hover:text-purple-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Granted (Active)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-bold text-emerald-700 mt-2">{granted.toLocaleString()}</h3>
          <p className="text-[11px] text-emerald-600 mt-1">Authorized for recruitment</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-2xs bg-red-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-800 uppercase tracking-wider">Withdrawn</span>
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          <h3 className="text-2xl font-bold text-red-700 mt-2">{withdrawn.toLocaleString()}</h3>
          <p className="text-[11px] text-red-600 mt-1">Recruitment locked out</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Restricted Scope</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="text-2xl font-bold text-amber-700 mt-2">{restricted.toLocaleString()}</h3>
          <p className="text-[11px] text-amber-600 mt-1">Specific trials only</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expired</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mt-2">{expired.toLocaleString()}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Re-authorization required</p>
        </div>
      </div>

      {/* Interactive Demonstration Panel */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-900 to-teal-950 text-white shadow-xs border border-emerald-800">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-700/60 rounded-lg text-emerald-300 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm">Interactive Consent Withdrawal Demonstration</h3>
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              Click <strong>"Withdraw Consent"</strong> on any candidate below. The application immediately commits a revocation transaction to the Fabric ledger, flags the patient's record, and proves that subsequent recruitment engine evaluations will automatically exclude the candidate from all research cohorts.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search candidate by ID or diagnosis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-hidden focus:border-cyan-500 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-slate-500 font-medium">Status:</span>
          {['ALL', 'GRANTED', 'WITHDRAWN', 'RESTRICTED', 'EXPIRED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                statusFilter === st 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Consent Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Candidate ID</th>
                <th className="py-3 px-4">Primary Diagnosis</th>
                <th className="py-3 px-4">Current Consent Status</th>
                <th className="py-3 px-4">Authorized Scope</th>
                <th className="py-3 px-4">Execution Date</th>
                <th className="py-3 px-4">Consent Agreement Hash</th>
                <th className="py-3 px-4 text-right">Instant Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.slice(0, 20).map((patient) => {
                const isGranted = patient.consent.status === 'GRANTED';
                const isWithdrawn = patient.consent.status === 'WITHDRAWN';

                return (
                  <tr key={patient.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {patient.id}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      {patient.primary_diagnosis}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        isGranted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isWithdrawn
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {isGranted && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {isWithdrawn && <XCircle className="w-3 h-3 text-red-600" />}
                        {patient.consent.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded-sm">
                        {patient.consent.consent_type}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(patient.consent.signed_at).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                      {patient.consent.consent_hash.slice(0, 16)}...
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleConsent(patient)}
                        disabled={updatingId === patient.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-2xs ${
                          isGranted
                            ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {updatingId === patient.id ? (
                          'Logging Tx...'
                        ) : isGranted ? (
                          'Withdraw Consent'
                        ) : (
                          'Grant Consent'
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
