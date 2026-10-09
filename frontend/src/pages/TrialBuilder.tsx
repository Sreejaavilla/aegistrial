import React, { useState } from 'react';
import { 
  FlaskConical, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  Info, 
  ArrowRight,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { ClinicalTrial, ConsentType } from '../types/clinical';
import { apiService } from '../services/api';

interface TrialBuilderProps {
  onTrialCreated: (trial: ClinicalTrial) => void;
  onNavigateToRecruitment: (trialId: string) => void;
}

export const TrialBuilder: React.FC<TrialBuilderProps> = ({
  onTrialCreated,
  onNavigateToRecruitment
}) => {
  // Form fields
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState('Phase II');
  const [sponsor, setSponsor] = useState('Academic Medical Research Network');
  const [description, setDescription] = useState('');
  const [targetDiagnosis, setTargetDiagnosis] = useState('Type 2 Diabetes Mellitus');
  const [targetIcd10, setTargetIcd10] = useState('E11.9');
  const [ageMin, setAgeMin] = useState(30);
  const [ageMax, setAgeMax] = useState(75);
  const [requiredConsentType, setRequiredConsentType] = useState<ConsentType>('GENERAL_RECRUITMENT');
  const [targetEnrollment, setTargetEnrollment] = useState(100);

  // Measurements ranges
  const [hba1cMin, setHba1cMin] = useState<string>('7.5');
  const [hba1cMax, setHba1cMax] = useState<string>('10.5');
  const [egfrMin, setEgfrMin] = useState<string>('45.0');
  const [egfrMax, setEgfrMax] = useState<string>('');
  const [sbpMin, setSbpMin] = useState<string>('');
  const [sbpMax, setSbpMax] = useState<string>('165');
  const [bmiMin, setBmiMin] = useState<string>('24.0');
  const [bmiMax, setBmiMax] = useState<string>('42.0');

  // Dynamic Inclusion / Exclusion criteria lists
  const [inclusionCriteria, setInclusionCriteria] = useState<string[]>([
    'Confirmed clinical diagnosis of target condition',
    'Laboratory measurements within defined baseline protocol limits',
    'Active signed clinical research consent on file'
  ]);
  const [exclusionCriteria, setExclusionCriteria] = useState<string[]>([
    'End-stage organ failure or active severe renal insufficiency',
    'Concomitant participation in an investigational medicinal trial within 30 days'
  ]);

  const [newInclusion, setNewInclusion] = useState('');
  const [newExclusion, setNewExclusion] = useState('');
  const [createdTrial, setCreatedTrial] = useState<ClinicalTrial | null>(null);

  const handleAddInclusion = () => {
    if (newInclusion.trim()) {
      setInclusionCriteria([...inclusionCriteria, newInclusion.trim()]);
      setNewInclusion('');
    }
  };

  const handleRemoveInclusion = (index: number) => {
    setInclusionCriteria(inclusionCriteria.filter((_, i) => i !== index));
  };

  const handleAddExclusion = () => {
    if (newExclusion.trim()) {
      setExclusionCriteria([...exclusionCriteria, newExclusion.trim()]);
      setNewExclusion('');
    }
  };

  const handleRemoveExclusion = (index: number) => {
    setExclusionCriteria(exclusionCriteria.filter((_, i) => i !== index));
  };

  const handleApplyTemplate = (type: 'DIABETES' | 'HYPERTENSION' | 'ONCOLOGY') => {
    if (type === 'DIABETES') {
      setTitle('Phase III Evaluation of Incretin-Mimetic Co-Agonist in Uncontrolled Type 2 Diabetes');
      setPhase('Phase III');
      setTargetDiagnosis('Type 2 Diabetes Mellitus');
      setTargetIcd10('E11.9');
      setAgeMin(35);
      setAgeMax(75);
      setRequiredConsentType('GENERAL_RECRUITMENT');
      setHba1cMin('7.5');
      setHba1cMax('10.5');
      setEgfrMin('50.0');
      setEgfrMax('');
      setSbpMin('');
      setSbpMax('160');
      setBmiMin('25.0');
      setBmiMax('42.0');
      setDescription('Multicenter trial assessing glycemic durability, body weight loss, and cardio-metabolic markers in adult type 2 diabetics with preserved kidney function.');
    } else if (type === 'HYPERTENSION') {
      setTitle('Phase IIb Aldosterone Synthase Inhibitor for Resistant Arterial Hypertension');
      setPhase('Phase II');
      setTargetDiagnosis('Essential (Primary) Hypertension');
      setTargetIcd10('I10');
      setAgeMin(40);
      setAgeMax(80);
      setRequiredConsentType('GENERAL_RECRUITMENT');
      setHba1cMin('');
      setHba1cMax('');
      setEgfrMin('45.0');
      setEgfrMax('');
      setSbpMin('145');
      setSbpMax('185');
      setBmiMin('');
      setBmiMax('38.0');
      setDescription('Randomized placebo-controlled trial evaluating sustained seated systolic BP reduction across resistant hypertension cohorts.');
    } else if (type === 'ONCOLOGY') {
      setTitle('Phase I/II Next-Generation Tyrosine Kinase Inhibitor in Advanced NSCLC');
      setPhase('Phase II');
      setTargetDiagnosis('Non-Small Cell Lung Cancer');
      setTargetIcd10('C34.9');
      setAgeMin(21);
      setAgeMax(82);
      setRequiredConsentType('ONCOLOGY_ONLY');
      setHba1cMin('');
      setHba1cMax('');
      setEgfrMin('45.0');
      setEgfrMax('');
      setSbpMin('');
      setSbpMax('150');
      setBmiMin('');
      setBmiMax('');
      setDescription('Open-label multicenter study assessing safety, pharmacokinetic profile, and progression-free survival in non-small cell lung cancer candidates.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetDiagnosis.trim()) return;

    const newTrialId = `TR-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newTrial: ClinicalTrial = {
      id: newTrialId,
      title: title.trim(),
      phase,
      sponsor,
      description: description.trim() || `Clinical trial investigating therapeutic efficacy in ${targetDiagnosis}.`,
      target_diagnosis: targetDiagnosis.trim(),
      target_icd10: targetIcd10.trim(),
      age_min: ageMin,
      age_max: ageMax,
      required_consent_type: requiredConsentType,
      measurement_ranges: {
        ...(hba1cMin ? { hba1c_min: parseFloat(hba1cMin) } : {}),
        ...(hba1cMax ? { hba1c_max: parseFloat(hba1cMax) } : {}),
        ...(egfrMin ? { egfr_min: parseFloat(egfrMin) } : {}),
        ...(egfrMax ? { egfr_max: parseFloat(egfrMax) } : {}),
        ...(sbpMin ? { systolic_bp_min: parseInt(sbpMin) } : {}),
        ...(sbpMax ? { systolic_bp_max: parseInt(sbpMax) } : {}),
        ...(bmiMin ? { bmi_min: parseFloat(bmiMin) } : {}),
        ...(bmiMax ? { bmi_max: parseFloat(bmiMax) } : {})
      },
      inclusion_criteria: inclusionCriteria,
      exclusion_criteria: exclusionCriteria,
      target_enrollment: targetEnrollment,
      status: 'RECRUITING'
    };

    apiService.addTrial(newTrial);
    onTrialCreated(newTrial);
    setCreatedTrial(newTrial);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Clinical Trial Protocol Builder
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Specify clinical criteria, laboratory ranges, inclusion/exclusion rules, and legal consent scopes for candidate pre-screening.
          </p>
        </div>

        {/* Quick Protocol Presets */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-lg text-xs">
          <span className="text-slate-500 text-[11px] px-1.5 font-medium">Presets:</span>
          <button
            type="button"
            onClick={() => handleApplyTemplate('DIABETES')}
            className="px-2 py-1 bg-white hover:bg-slate-50 rounded-md font-medium text-slate-700 border border-slate-200 transition-colors"
          >
            Diabetes
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('HYPERTENSION')}
            className="px-2 py-1 bg-white hover:bg-slate-50 rounded-md font-medium text-slate-700 border border-slate-200 transition-colors"
          >
            Hypertension
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('ONCOLOGY')}
            className="px-2 py-1 bg-white hover:bg-slate-50 rounded-md font-medium text-slate-700 border border-slate-200 transition-colors"
          >
            Oncology
          </button>
        </div>
      </div>

      {/* Success Notification if Trial Created */}
      {createdTrial && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-sm block">Protocol {createdTrial.id} Successfully Registered</span>
              <span>Trial parameters saved to system state and audit event recorded.</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateToRecruitment(createdTrial.id)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            Launch Recruitment Engine <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6 text-xs sm:text-sm">
        {/* Section 1: Basic Protocol Metadata */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <FlaskConical className="w-4 h-4 text-cyan-600" />
            1. Protocol Identification & Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="block text-slate-700 font-medium text-xs">Trial Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Phase III Trial of Dual SGLT2i + GLP-1RA Therapy in Type 2 Diabetes"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-medium text-xs">Phase</label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-hidden"
              >
                <option value="Phase I">Phase I (Safety & Tolerability)</option>
                <option value="Phase II">Phase II (Efficacy Exploration)</option>
                <option value="Phase III">Phase III (Confirmatory Multi-Center)</option>
                <option value="Phase IV">Phase IV (Post-Marketing Surveillance)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-medium text-xs">Sponsor / Research Consortium</label>
              <input
                type="text"
                value={sponsor}
                onChange={(e) => setSponsor(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-medium text-xs">Target Enrollment (N)</label>
              <input
                type="number"
                min={10}
                max={5000}
                value={targetEnrollment}
                onChange={(e) => setTargetEnrollment(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-medium text-xs">Required Legal Consent Scope *</label>
              <select
                value={requiredConsentType}
                onChange={(e) => setRequiredConsentType(e.target.value as ConsentType)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-hidden"
              >
                <option value="GENERAL_RECRUITMENT">General Clinical Research Consent</option>
                <option value="CARDIOMETABOLIC_ONLY">Specialized Cardiometabolic Scope Only</option>
                <option value="ONCOLOGY_ONLY">Specialized Oncology Trial Scope Only</option>
              </select>
            </div>

            <div className="md:col-span-3 space-y-1">
              <label className="block text-slate-700 font-medium text-xs">Protocol Clinical Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of protocol goals, mechanistic rationale, and cohort requirements..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Clinical Target Indication & Demographics */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <Activity className="w-4 h-4 text-cyan-600" />
            2. Primary Indication & Age Window
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-slate-700 font-medium text-xs">Target Primary Diagnosis *</label>
              <input
                type="text"
                required
                value={targetDiagnosis}
                onChange={(e) => setTargetDiagnosis(e.target.value)}
                placeholder="e.g. Type 2 Diabetes Mellitus"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-medium text-xs">ICD-10 Prefix</label>
              <input
                type="text"
                value={targetIcd10}
                onChange={(e) => setTargetIcd10(e.target.value)}
                placeholder="e.g. E11"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-hidden font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-medium text-xs">Age Window (Years)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={18}
                  max={ageMax}
                  value={ageMin}
                  onChange={(e) => setAgeMin(Number(e.target.value))}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50"
                  placeholder="Min"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="number"
                  min={ageMin}
                  max={95}
                  value={ageMax}
                  onChange={(e) => setAgeMax(Number(e.target.value))}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Clinical Laboratory Thresholds */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <Activity className="w-4 h-4 text-cyan-600" />
            3. Required Clinical Measurement Ranges
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Leave blank if a parameter is unconstrained. Missing observations in EHR are conservatively flagged by the engine.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* HbA1c */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-800 text-xs block">HbA1c (%)</span>
              <div className="flex items-center gap-1.5 text-xs">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Min"
                  value={hba1cMin}
                  onChange={(e) => setHba1cMin(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-md"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Max"
                  value={hba1cMax}
                  onChange={(e) => setHba1cMax(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-md"
                />
              </div>
            </div>

            {/* eGFR */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-800 text-xs block">eGFR (mL/min/1.73m²)</span>
              <div className="flex items-center gap-1.5 text-xs">
                <input
                  type="number"
                  step="1"
                  placeholder="Min"
                  value={egfrMin}
                  onChange={(e) => setEgfrMin(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-md"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  step="1"
                  placeholder="Max"
                  value={egfrMax}
                  onChange={(e) => setEgfrMax(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-md"
                />
              </div>
            </div>

            {/* Systolic BP */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-800 text-xs block">Systolic BP (mmHg)</span>
              <div className="flex items-center gap-1.5 text-xs">
                <input
                  type="number"
                  placeholder="Min"
                  value={sbpMin}
                  onChange={(e) => setSbpMin(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-md"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={sbpMax}
                  onChange={(e) => setSbpMax(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-md"
                />
              </div>
            </div>

            {/* BMI */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-800 text-xs block">BMI (kg/m²)</span>
              <div className="flex items-center gap-1.5 text-xs">
                <input
                  type="number"
                  step="0.5"
                  placeholder="Min"
                  value={bmiMin}
                  onChange={(e) => setBmiMin(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-md"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Max"
                  value={bmiMax}
                  onChange={(e) => setBmiMax(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Inclusion & Exclusion Criteria */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inclusion */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between">
              <span>Inclusion Criteria ({inclusionCriteria.length})</span>
            </h3>
            <div className="space-y-1.5">
              {inclusionCriteria.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-emerald-50/60 border border-emerald-200/80 rounded-lg text-xs text-emerald-950">
                  <span className="flex-1">{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInclusion(idx)}
                    className="text-slate-400 hover:text-red-600 p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add protocol inclusion criterion..."
                value={newInclusion}
                onChange={(e) => setNewInclusion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddInclusion(); } }}
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50"
              />
              <button
                type="button"
                onClick={handleAddInclusion}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs hover:bg-slate-900"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Exclusion */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between">
              <span>Exclusion Criteria ({exclusionCriteria.length})</span>
            </h3>
            <div className="space-y-1.5">
              {exclusionCriteria.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-red-50/60 border border-red-200/80 rounded-lg text-xs text-red-950">
                  <span className="flex-1">{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveExclusion(idx)}
                    className="text-slate-400 hover:text-red-600 p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add protocol exclusion criterion..."
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddExclusion(); } }}
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50"
              />
              <button
                type="button"
                onClick={handleAddExclusion}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs hover:bg-slate-900"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-700" />
            <span>Protocol will be recorded in audit log with unique identifier.</span>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <FlaskConical className="w-4 h-4" />
            Save & Publish Protocol
          </button>
        </div>
      </form>
    </div>
  );
};
