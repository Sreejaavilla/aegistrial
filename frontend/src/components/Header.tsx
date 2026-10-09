import React from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  Activity, 
  Database, 
  FileText, 
  Lock, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { UserRole } from '../types/clinical';
import { apiService } from '../services/api';

interface HeaderProps {
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  isBackendConnected: boolean;
  onRefreshData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeRole,
  onRoleChange,
  isBackendConnected,
  onRefreshData
}) => {
  const roleNames: Record<UserRole, { label: string; desc: string; color: string }> = {
    PI: { label: 'Principal Investigator', desc: 'Full protocol creation & candidate review', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    COORDINATOR: { label: 'Research Coordinator', desc: 'Protocol query & pre-screening access', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    COMPLIANCE: { label: 'Compliance & Privacy Officer', desc: 'Consent lifecycle & audit verification', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    AUDITOR: { label: 'Consortium Auditor', desc: 'Read-only ledger & integrity inspector', color: 'bg-slate-100 text-slate-700 border-slate-300' }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Regulatory Notice Banner */}
      <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium text-emerald-400">HIPAA & ICH-GCP Privacy Protocol:</span>
          <span className="text-slate-300">
            Algorithmic pre-screening uses pseudonymized synthetic EHR datasets. Raw PHI remains strictly off-chain.
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400 text-[11px]">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-cyan-400" /> SHA-256 Ledger Anchors Active
          </span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline text-slate-400">Hyperledger Fabric Channel: <code className="text-cyan-300">clinical-trials</code></span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-sm ring-2 ring-cyan-500/20">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">AegisTrial</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                  Recruitment System
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Blockchain-Backed Clinical Trial Recruitment & Data Integrity
              </p>
            </div>
          </div>

          {/* Right Controls: Mode Badge, Role Selector, Refresh */}
          <div className="flex items-center gap-3">
            {/* Backend Connection Status Badge */}
            <div 
              className={`hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border ${
                isBackendConnected 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title={isBackendConnected ? "Connected to live FastAPI backend & Fabric gateway" : "Running in client-side high performance prototype mode with 1,200 synthetic records"}
            >
              <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{isBackendConnected ? 'Backend Connected' : 'Standalone Prototype (1,200 Records)'}</span>
            </div>

            {/* Role Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <UserCheck className="w-4 h-4 text-slate-500 ml-1.5" />
              <div className="text-xs">
                <span className="text-slate-400 hidden xl:inline">Role: </span>
                <select
                  value={activeRole}
                  onChange={(e) => onRoleChange(e.target.value as UserRole)}
                  className="bg-transparent font-medium text-slate-700 text-xs focus:outline-hidden cursor-pointer pr-1"
                >
                  <option value="PI">Principal Investigator (PI)</option>
                  <option value="COORDINATOR">Research Coordinator</option>
                  <option value="COMPLIANCE">Compliance Officer</option>
                  <option value="AUDITOR">Consortium Auditor</option>
                </select>
              </div>
            </div>

            {/* Reset / Reload Data Button */}
            <button
              onClick={onRefreshData}
              title="Reset synthetic data and ledger commitments to clean baseline"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
