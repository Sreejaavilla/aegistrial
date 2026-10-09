import React from 'react';
import { 
  Users, 
  FlaskConical, 
  UserCheck2, 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  FileCheck, 
  Activity,
  Database,
  ExternalLink
} from 'lucide-react';
import { Patient, ClinicalTrial, AuditEvent, UserRole } from '../types/clinical';
import { NavTab } from '../components/Navigation';

interface DashboardOverviewProps {
  patients: Patient[];
  trials: ClinicalTrial[];
  auditLogs: AuditEvent[];
  activeRole: UserRole;
  onNavigate: (tab: NavTab) => void;
  onSelectTrialForRecruitment: (trialId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  patients,
  trials,
  auditLogs,
  activeRole,
  onNavigate,
  onSelectTrialForRecruitment
}) => {
  // Compute metrics
  const totalPatients = patients.length;
  const activeTrials = trials.filter(t => t.status === 'RECRUITING' || t.status === 'ACTIVE').length;
  const grantedConsentCount = patients.filter(p => p.consent.status === 'GRANTED').length;
  const consentRate = Math.round((grantedConsentCount / (totalPatients || 1)) * 100);

  // Disease breakdown
  const diagnosisCounts: Record<string, number> = {};
  for (const p of patients) {
    diagnosisCounts[p.primary_diagnosis] = (diagnosisCounts[p.primary_diagnosis] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Regulatory & Medical Screening Distinction */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-blue-800">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/20 border border-cyan-400/30 text-cyan-200 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
            Consortium Clinical Trial Platform
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Privacy-Preserving Clinical Recruitment & Ledger Integrity
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed">
            Authorized investigators can define multi-criteria clinical eligibility parameters, execute deterministic 
            pre-screening across 1,200 synthetic EHR records, and cryptographically verify patient record integrity 
            against Hyperledger Fabric immutability proofs.
          </p>

          {/* Important Regulatory distinction alert */}
          <div className="mt-4 p-3.5 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-start gap-3 text-amber-200 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-100 font-semibold">Regulatory Notice (ICH-GCP E6 R2):</strong>{' '}
              Algorithmic matching identifies <span className="underline decoration-amber-400">potentially eligible</span> candidates based on available EHR structured observations. 
              This does NOT constitute a final medical screening or binding recruitment decision. Physical investigator assessment, protocol-specific laboratory testing, and formal informed consent execution are mandatory before clinical enrollment.
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Synthetic EHR Dataset</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalPatients.toLocaleString()}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-medium">100% Pseudonymized</span> fictional records
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Protocols</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{activeTrials}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-cyan-700 font-medium">{trials.length} Total</span> protocols defined
            </p>
          </div>
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
            <FlaskConical className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Research Consent</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{consentRate}%</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-medium">{grantedConsentCount.toLocaleString()}</span> granted / {totalPatients - grantedConsentCount} withdrawn
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck2 className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ledger Commitments</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">1,200 Anchors</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-indigo-600 font-medium">Channel:</span> clinical-trials (Block #1400+)
            </p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Lock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Active Trials & Diagnostic Cohorts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Active Clinical Trials */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900 text-base">Active Clinical Trial Protocols</h2>
                <p className="text-xs text-slate-500 mt-0.5">Ready for automated eligibility matching against cohort</p>
              </div>
              <button
                onClick={() => onNavigate('trials')}
                className="text-xs font-medium text-cyan-700 hover:text-cyan-800 flex items-center gap-1"
              >
                Create Protocol <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {trials.map((trial) => (
                <div key={trial.id} className="p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-cyan-800 bg-cyan-100/70 px-2 py-0.5 rounded-sm">
                          {trial.id}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {trial.phase}
                        </span>
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {trial.status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 text-sm">{trial.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-1">{trial.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onSelectTrialForRecruitment(trial.id);
                          onNavigate('recruitment');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-700 hover:bg-cyan-800 text-white flex items-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        Run Recruitment
                      </button>
                    </div>
                  </div>

                  {/* Summary badges */}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                      <strong>Target:</strong> {trial.target_diagnosis}
                    </span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                      <strong>Age:</strong> {trial.age_min}–{trial.age_max} yrs
                    </span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                      <strong>Rules:</strong> {trial.inclusion_criteria.length} inclusion, {trial.exclusion_criteria.length} exclusion
                    </span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                      <strong>Consent:</strong> {trial.required_consent_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div 
              onClick={() => onNavigate('recruitment')}
              className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 p-4 rounded-xl cursor-pointer hover:border-cyan-300 transition-all shadow-2xs group"
            >
              <div className="flex items-center justify-between">
                <Activity className="w-5 h-5 text-cyan-700" />
                <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="font-semibold text-slate-900 text-sm mt-3">Recruitment Engine</h4>
              <p className="text-xs text-slate-600 mt-1">Execute eligibility criteria matching with missing data handling.</p>
            </div>

            <div 
              onClick={() => onNavigate('patients')}
              className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-xl cursor-pointer hover:border-emerald-300 transition-all shadow-2xs group"
            >
              <div className="flex items-center justify-between">
                <Users className="w-5 h-5 text-emerald-700" />
                <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="font-semibold text-slate-900 text-sm mt-3">Patient Registry</h4>
              <p className="text-xs text-slate-600 mt-1">Explore 1,200 pseudonymized synthetic records & clinical labs.</p>
            </div>

            <div 
              onClick={() => onNavigate('audit')}
              className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 p-4 rounded-xl cursor-pointer hover:border-purple-300 transition-all shadow-2xs group"
            >
              <div className="flex items-center justify-between">
                <Lock className="w-5 h-5 text-purple-700" />
                <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="font-semibold text-slate-900 text-sm mt-3">Blockchain Integrity</h4>
              <p className="text-xs text-slate-600 mt-1">Verify SHA-256 digests against Fabric ledger & simulate tampering.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Diagnostic Distribution & Recent Activity */}
        <div className="space-y-6">
          {/* Cohort Disease Breakdown */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center justify-between">
              <span>Cohort Diagnosis Breakdown</span>
              <span className="text-xs font-normal text-slate-500">1,200 Patients</span>
            </h3>
            <div className="space-y-2.5">
              {Object.entries(diagnosisCounts).map(([diagnosis, count]) => {
                const pct = Math.round((count / totalPatients) * 100);
                return (
                  <div key={diagnosis} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-medium truncate max-w-[200px]" title={diagnosis}>{diagnosis}</span>
                      <span className="text-slate-500 font-mono">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-600 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Audit & Ledger Activity Stream */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 text-sm">Recent Ledger & Audit Events</h3>
              <button
                onClick={() => onNavigate('audit')}
                className="text-xs text-cyan-700 hover:text-cyan-800 font-medium"
              >
                View all
              </button>
            </div>

            <div className="space-y-3">
              {auditLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="text-xs border-l-2 border-slate-200 pl-3 py-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{log.event_type.replace(/_/g, ' ')}</span>
                    {log.is_blockchain_tx && (
                      <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-mono font-medium">
                        Block #{log.block_number}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-[11px] line-clamp-2">{log.details}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Actor: {log.actor_name} • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
