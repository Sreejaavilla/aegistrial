import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FlaskConical, 
  SearchCode, 
  ShieldCheck, 
  FileCheck2,
  Lock
} from 'lucide-react';

export type NavTab = 'overview' | 'patients' | 'trials' | 'recruitment' | 'consent' | 'audit';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  counts: {
    patients: number;
    trials: number;
    eligibleCandidates: number;
  };
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  counts
}) => {
  const tabs = [
    {
      id: 'overview' as NavTab,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'patients' as NavTab,
      label: 'Patient Registry',
      icon: Users,
      badge: counts.patients.toLocaleString()
    },
    {
      id: 'trials' as NavTab,
      label: 'Trial Builder',
      icon: FlaskConical,
      badge: counts.trials
    },
    {
      id: 'recruitment' as NavTab,
      label: 'Recruitment Engine',
      icon: SearchCode,
      badge: 'Evaluation Engine',
      highlight: true
    },
    {
      id: 'consent' as NavTab,
      label: 'Consent Tracking',
      icon: ShieldCheck,
      badge: null
    },
    {
      id: 'audit' as NavTab,
      label: 'Audit & Blockchain',
      icon: Lock,
      badge: 'Ledger Proofs'
    }
  ];

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-50 text-cyan-900 border border-cyan-300/80 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-700' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full font-semibold ${
                      isActive
                        ? 'bg-cyan-200/70 text-cyan-900'
                        : tab.highlight
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
