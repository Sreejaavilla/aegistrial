import React, { useState, useMemo } from 'react';
import { 
  SearchCode, 
  Play, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  Filter, 
  Info,
  Clock,
  Lock,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ClinicalTrial, 
  Patient, 
  EligibilityResult, 
  EligibilityStatus,
  CriterionEvaluation 
} from '../types/clinical';
import { apiService } from '../services/api';

interface RecruitmentEngineProps {
  trials: ClinicalTrial[];
  selectedTrialId: string;
  onSelectTrial: (trialId: string) => void;
  onInspectPatient: (patient: Patient) => void;
}

export const RecruitmentEngine: React.FC<RecruitmentEngineProps> = ({
  trials,
  selectedTrialId,
  onSelectTrial,
  onInspectPatient
}) => {
  const [evaluationResults, setEvaluationResults] = useState<{
    results: EligibilityResult[];
    summary: {
      total_evaluated: number;
      potentially_eligible: number;
      borderline_review: number;
      ineligible: number;
      consent_disqualified: number;
      match_rate_pct: number;
    };
  } | null>(null);

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Active trial object
  const currentTrial = useMemo(() => {
    return trials.find(t => t.id === selectedTrialId) || trials[0];
  }, [trials, selectedTrialId]);

  // Execute evaluation
  const handleRunEvaluation = () => {
    if (!currentTrial) return;
    setIsEvaluating(true);
    setTimeout(() => {
      try {
        const res = apiService.executeRecruitmentSearch(currentTrial.id, 'Dr. Evelyn Vance (PI)');
        setEvaluationResults(res);
      } finally {
        setIsEvaluating(false);
      }
    }, 250); // slight delay for smooth visual feedback
  };

  // Filter evaluation results
  const filteredResults = useMemo(() => {
    if (!evaluationResults) return [];
    return evaluationResults.results.filter(r => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesId = r.patient_id.toLowerCase().includes(q);
        const matchesDiag = r.patient.primary_diagnosis.toLowerCase().includes(q);
        if (!matchesId && !matchesDiag) return false;
      }
      return true;
    });
  }, [evaluationResults, statusFilter, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    if (!evaluationResults) return;
    const rows = [
      ['Candidate ID', 'Eligibility Status', 'Match Score (%)', 'Age', 'Gender', 'Primary Diagnosis', 'Consent Status', 'Summary Explanation'],
      ...evaluationResults.results.map(r => [
        r.patient_id,
        r.status,
        `${r.match_score}%`,
        r.patient.age,
        r.patient.gender,
        `"${r.patient.primary_diagnosis}"`,
        r.patient.consent.status,
        `"${r.summary.replace(/"/g, '""')}"`
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `recruitment_${currentTrial.id}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <SearchCode className="w-6 h-6 text-cyan-600" />
            Clinical Recruitment & Eligibility Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Algorithmic pre-screening with conservative missing lab handling and privacy-first consent enforcement.
          </p>
        </div>

        {/* Trial Selector Dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Target Protocol:</span>
          <select
            value={currentTrial?.id}
            onChange={(e) => {
              onSelectTrial(e.target.value);
              setEvaluationResults(null);
            }}
            className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs focus:outline-hidden focus:border-cyan-500"
          >
            {trials.map(t => (
              <option key={t.id} value={t.id}>{t.id} - {t.title.slice(0, 45)}...</option>
            ))}
          </select>
        </div>
      </div>

      {/* Prominent Mandatory Regulatory Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-950 text-xs flex items-start gap-3 shadow-2xs">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-amber-900 font-bold block text-sm">
            Regulatory Pre-Screening Disclaimer (ICH-GCP E6 Section 4.8)
          </strong>
          <p className="text-amber-900/90 leading-relaxed">
            Candidates designated as <strong>POTENTIALLY ELIGIBLE</strong> satisfy structured EHR inclusion/exclusion rules and active research consent. 
            This does NOT constitute formal trial enrollment or a binding medical recruitment determination. 
            Final enrollment mandates secondary physical screening, investigator consultation, protocol lab confirmation, and protocol-specific informed consent execution.
          </p>
        </div>
      </div>

      {/* Protocol Configuration & Criteria Summary Card */}
      {currentTrial && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-sm">
                  {currentTrial.id}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {currentTrial.phase}
                </span>
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Target: {currentTrial.target_enrollment} participants
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1">{currentTrial.title}</h2>
              <p className="text-xs text-slate-600 mt-0.5">{currentTrial.description}</p>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              {isEvaluating ? 'Evaluating 1,200 Records...' : 'Execute Eligibility Evaluation'}
            </button>
          </div>

          {/* Criteria Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Diagnosis</span>
              <span className="font-semibold text-slate-800">{currentTrial.target_diagnosis}</span>
              <span className="text-[10px] text-slate-400 block font-mono">ICD-10: {currentTrial.target_icd10 || 'All'}</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Age Criteria</span>
              <span className="font-semibold text-slate-800">{currentTrial.age_min} to {currentTrial.age_max} years</span>
              <span className="text-[10px] text-slate-400 block">Baseline cohort window</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Lab Ranges</span>
              <span className="font-semibold text-slate-800 font-mono text-[11px]">
                {currentTrial.measurement_ranges.hba1c_min ? `HbA1c: ${currentTrial.measurement_ranges.hba1c_min}-${currentTrial.measurement_ranges.hba1c_max}% ` : ''}
                {currentTrial.measurement_ranges.egfr_min ? `eGFR: ≥${currentTrial.measurement_ranges.egfr_min} ` : ''}
                {currentTrial.measurement_ranges.systolic_bp_max ? `SBP: ≤${currentTrial.measurement_ranges.systolic_bp_max} ` : ''}
              </span>
              <span className="text-[10px] text-slate-400 block">Missing values conservatively held</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Required Consent</span>
              <span className="font-semibold text-slate-800">{currentTrial.required_consent_type}</span>
              <span className="text-[10px] text-emerald-600 block font-medium">Strict ledger enforcement</span>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Results Section */}
      {evaluationResults && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[11px] uppercase font-medium">Evaluated</span>
              <span className="text-xl font-bold text-slate-900 mt-0.5 block">{evaluationResults.summary.total_evaluated}</span>
              <span className="text-[11px] text-slate-500">100% of cohort</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
              <span className="text-emerald-700 block text-[11px] uppercase font-medium">Potentially Eligible</span>
              <span className="text-xl font-bold text-emerald-700 mt-0.5 block">{evaluationResults.summary.potentially_eligible}</span>
              <span className="text-[11px] text-emerald-600 font-medium">{evaluationResults.summary.match_rate_pct}% match rate</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs bg-amber-50/20">
              <span className="text-amber-700 block text-[11px] uppercase font-medium">Borderline / Missing Lab</span>
              <span className="text-xl font-bold text-amber-700 mt-0.5 block">{evaluationResults.summary.borderline_review}</span>
              <span className="text-[11px] text-amber-600">Requires screening draw</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-red-200 shadow-2xs bg-red-50/20">
              <span className="text-red-700 block text-[11px] uppercase font-medium">Consent Blocked</span>
              <span className="text-xl font-bold text-red-700 mt-0.5 block">{evaluationResults.summary.consent_disqualified}</span>
              <span className="text-[11px] text-red-600 font-medium">Withdrawn / Restricted</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[11px] uppercase font-medium">Ineligible</span>
              <span className="text-xl font-bold text-slate-700 mt-0.5 block">{evaluationResults.summary.ineligible}</span>
              <span className="text-[11px] text-slate-500">Criteria mismatch</span>
            </div>
          </div>

          {/* Filtering & Export Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-500 font-medium">Filter Status:</span>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({evaluationResults.results.length})
              </button>
              <button
                onClick={() => setStatusFilter('POTENTIALLY_ELIGIBLE')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'POTENTIALLY_ELIGIBLE' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Potentially Eligible ({evaluationResults.summary.potentially_eligible})
              </button>
              <button
                onClick={() => setStatusFilter('BORDERLINE_REVIEW_REQUIRED')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'BORDERLINE_REVIEW_REQUIRED' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Borderline ({evaluationResults.summary.borderline_review})
              </button>
              <button
                onClick={() => setStatusFilter('DISQUALIFIED_CONSENT_REVOKED')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'DISQUALIFIED_CONSENT_REVOKED' ? 'bg-red-700 text-white' : 'bg-red-50 text-red-800 hover:bg-red-100'
                }`}
              >
                Consent Blocked ({evaluationResults.summary.consent_disqualified})
              </button>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg flex items-center gap-1.5 border border-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Match Roster (CSV)
              </button>
            </div>
          </div>

          {/* Candidates Match Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Candidate ID</th>
                    <th className="py-3 px-4">Eligibility Determination</th>
                    <th className="py-3 px-4">Match Score</th>
                    <th className="py-3 px-4">Diagnosis & Age</th>
                    <th className="py-3 px-4">Key Criteria Status</th>
                    <th className="py-3 px-4">Consent Status</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResults.slice(0, 30).map((result) => {
                    const isExpanded = expandedId === result.patient_id;
                    const statusBadgeClass = {
                      POTENTIALLY_ELIGIBLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      BORDERLINE_REVIEW_REQUIRED: 'bg-amber-50 text-amber-700 border-amber-200',
                      INELIGIBLE: 'bg-slate-100 text-slate-700 border-slate-200',
                      DISQUALIFIED_CONSENT_REVOKED: 'bg-red-50 text-red-700 border-red-200'
                    }[result.status];

                    return (
                      <React.Fragment key={result.patient_id}>
                        <tr className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                            {result.patient_id}
                          </td>

                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadgeClass}`}>
                              {result.status === 'POTENTIALLY_ELIGIBLE' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {result.status === 'BORDERLINE_REVIEW_REQUIRED' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                              {result.status === 'INELIGIBLE' && <XCircle className="w-3 h-3 text-slate-500" />}
                              {result.status === 'DISQUALIFIED_CONSENT_REVOKED' && <ShieldAlert className="w-3 h-3 text-red-600" />}
                              {result.status.replace(/_/g, ' ')}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-800">{result.match_score}%</span>
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    result.match_score >= 80 ? 'bg-emerald-500' : result.match_score >= 50 ? 'bg-amber-500' : 'bg-slate-400'
                                  }`}
                                  style={{ width: `${result.match_score}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{result.patient.primary_diagnosis}</div>
                            <div className="text-[10px] text-slate-400">{result.patient.age} yrs • {result.patient.gender}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-[11px]">
                              {result.criteria_evaluations.map((c, i) => (
                                <span
                                  key={i}
                                  title={`${c.name}: ${c.status}`}
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    c.status === 'PASS' 
                                      ? 'bg-emerald-500' 
                                      : c.status === 'MISSING_DATA' 
                                      ? 'bg-amber-500' 
                                      : 'bg-red-500'
                                  }`}
                                />
                              ))}
                              <span className="text-[10px] text-slate-400 ml-1">
                                {result.criteria_evaluations.filter(c => c.status === 'PASS').length}/{result.criteria_evaluations.length} passed
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              result.patient.consent.status === 'GRANTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {result.patient.consent.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : result.patient_id)}
                              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Itemized Criteria Breakdown */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-b border-slate-200">
                            <td colSpan={7} className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-slate-900 text-xs">
                                    Algorithmic Eligibility Breakdown for {result.patient_id}
                                  </h4>
                                  <button
                                    onClick={() => onInspectPatient(result.patient)}
                                    className="text-xs text-cyan-700 hover:underline font-medium flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> View Full EHR & Ledger Digest
                                  </button>
                                </div>

                                <p className="text-slate-600 text-xs italic bg-white p-2.5 rounded-md border border-slate-200">
                                  "{result.summary}"
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                  {result.criteria_evaluations.map((crit) => (
                                    <div 
                                      key={crit.id} 
                                      className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                                        crit.status === 'PASS'
                                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                                          : crit.status === 'MISSING_DATA'
                                          ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                                          : 'bg-red-50/50 border-red-200 text-red-950'
                                      }`}
                                    >
                                      {crit.status === 'PASS' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                                      {crit.status === 'MISSING_DATA' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                                      {crit.status === 'FAIL' && <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                                      
                                      <div className="space-y-0.5 flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="font-semibold">{crit.name}</span>
                                          <span className="text-[10px] font-bold uppercase tracking-wider">{crit.status}</span>
                                        </div>
                                        <div className="text-[11px] text-slate-600">
                                          Required: <span className="font-mono">{crit.requirement}</span> | Observed: <span className="font-mono font-medium">{crit.actual_value}</span>
                                        </div>
                                        <div className="text-[11px] text-slate-500">{crit.explanation}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredResults.length > 30 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
                Displaying first 30 of {filteredResults.length} matching candidate records. Use CSV export above to retrieve complete cohort roster.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Initial Empty State before evaluation */}
      {!evaluationResults && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 bg-cyan-50 text-cyan-700 rounded-2xl flex items-center justify-center mx-auto">
            <SearchCode className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Ready to Pre-Screen Cohort</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click <strong>"Execute Eligibility Evaluation"</strong> above to test all 1,200 synthetic EHR records against protocol criteria, verify active consent states, and inspect itemized reasoning.
          </p>
          <button
            onClick={handleRunEvaluation}
            className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            Run Pre-Screening Now
          </button>
        </div>
      )}
    </div>
  );
};
