import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { DashboardOverview } from './pages/DashboardOverview';
import { PatientRegistry } from './pages/PatientRegistry';
import { TrialBuilder } from './pages/TrialBuilder';
import { RecruitmentEngine } from './pages/RecruitmentEngine';
import { ConsentManagement } from './pages/ConsentManagement';
import { AuditIntegrity } from './pages/AuditIntegrity';
import { Patient, ClinicalTrial, AuditEvent, UserRole } from './types/clinical';
import { apiService } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [activeRole, setActiveRole] = useState<UserRole>('PI');
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // Core application state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [trials, setTrials] = useState<ClinicalTrial[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [selectedTrialId, setSelectedTrialId] = useState<string>('TR-2026-001');

  // Load data from apiService
  const loadData = useCallback(() => {
    setPatients(apiService.getPatients());
    setTrials(apiService.getTrials());
    setAuditLogs(apiService.getAuditLogs());
  }, []);

  // Initial load & backend health check
  useEffect(() => {
    loadData();
    apiService.checkBackendHealth().then(online => {
      setIsBackendConnected(online);
    });

    const interval = setInterval(() => {
      apiService.checkBackendHealth().then(online => {
        setIsBackendConnected(online);
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [loadData]);

  const handleRefreshData = () => {
    loadData();
  };

  const handleTrialCreated = (newTrial: ClinicalTrial) => {
    loadData();
    setSelectedTrialId(newTrial.id);
  };

  const handleVerifyIntegrity = async (patientId: string) => {
    const res = await apiService.verifyPatientIntegrity(patientId);
    loadData();
    return res;
  };

  const counts = {
    patients: patients.length,
    trials: trials.length,
    eligibleCandidates: 142
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-cyan-100 selection:text-cyan-900">
      {/* Header */}
      <Header
        activeRole={activeRole}
        onRoleChange={setActiveRole}
        isBackendConnected={isBackendConnected}
        onRefreshData={handleRefreshData}
      />

      {/* Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <DashboardOverview
            patients={patients}
            trials={trials}
            auditLogs={auditLogs}
            activeRole={activeRole}
            onNavigate={setActiveTab}
            onSelectTrialForRecruitment={(trialId) => {
              setSelectedTrialId(trialId);
              setActiveTab('recruitment');
            }}
          />
        )}

        {activeTab === 'patients' && (
          <PatientRegistry
            patients={patients}
            onVerifyIntegrity={handleVerifyIntegrity}
          />
        )}

        {activeTab === 'trials' && (
          <TrialBuilder
            onTrialCreated={handleTrialCreated}
            onNavigateToRecruitment={(trialId) => {
              setSelectedTrialId(trialId);
              setActiveTab('recruitment');
            }}
          />
        )}

        {activeTab === 'recruitment' && (
          <RecruitmentEngine
            trials={trials}
            selectedTrialId={selectedTrialId}
            onSelectTrial={setSelectedTrialId}
            onInspectPatient={() => setActiveTab('patients')}
          />
        )}

        {activeTab === 'consent' && (
          <ConsentManagement
            patients={patients}
            activeRole={activeRole}
            onConsentUpdated={loadData}
            onNavigateToRecruitment={() => setActiveTab('recruitment')}
          />
        )}

        {activeTab === 'audit' && (
          <AuditIntegrity
            patients={patients}
            auditLogs={auditLogs}
            activeRole={activeRole}
            onRefreshData={loadData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">AegisTrial Recruitment System</span>
            <span>•</span>
            <span>Hyperledger Fabric Consortium Protocol</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Deterministic SHA-256 Digest Anchors</span>
            <span>•</span>
            <span>Zero PHI On Ledger</span>
            <span>•</span>
            <span>ICH-GCP & HIPAA Compliant Framework</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
