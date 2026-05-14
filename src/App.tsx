import React, { useState } from 'react';
import { useValuation } from './store';
import { motion, AnimatePresence } from 'motion/react';
import { GeneralInfoTab } from './components/tabs/GeneralInfoTab';
import { HistoricalDataTab } from './components/tabs/HistoricalDataTab';
import { ProjectionTab } from './components/tabs/ProjectionTab';
import { WaccTab } from './components/tabs/WaccTab';
import { ValueAdjustmentTab } from './components/tabs/ValueAdjustmentTab';
import { ValuationSummaryTab } from './components/tabs/ValuationSummaryTab';
import { Calculator, History, TrendingUp, Percent, BarChart3, Lock, ShieldAlert } from 'lucide-react';

export default function App() {
  const valuation = useValuation();
  const [activeTab, setActiveTab] = useState('general');
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleUnlock = () => {
    if (password === '8949!!') {
      setIsLocked(false);
      setError('');
      setPassword('');
    } else {
      setError('비밀번호가 일치하지 않습니다.');
    }
  };

  const tabs = [
    { id: 'general', label: '기본 정보', icon: Calculator },
    { id: 'historical', label: '과거 재무 데이터', icon: History },
    { id: 'projection', label: '재무 추정', icon: TrendingUp },
    { id: 'wacc', label: '할인율 (WACC; 자본비용)', icon: Percent },
    { id: 'value_adjustment', label: '가치 조정 및 리스크', icon: ShieldAlert },
    { id: 'summary', label: '가치평가 요약', icon: BarChart3 },
  ];

  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-6">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">앱 잠금</h2>
            <p className="text-slate-500 mt-2 text-sm">가치평가 데이터에 접근하려면 PIN을 입력하세요.</p>
          </div>
          <input 
            type="password" 
            placeholder="비밀번호 입력" 
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            className={`w-full text-center text-xl tracking-widest p-4 rounded-xl border outline-none transition-colors ${
              error ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500' : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500'
            }`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUnlock();
            }}
          />
          {error && <p className="text-rose-500 text-sm">{error}</p>}
          <button 
            onClick={handleUnlock}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            잠금 해제
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 md:p-2 rounded-lg">
              <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <h1 className="text-lg md:text-xl font-semibold text-slate-900 truncate">기업가치평가 Pro</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsLocked(true)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="앱 잠금"
            >
              <Lock className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Scrollable Navigation on Mobile, Sidebar on Desktop */}
          <nav className="w-full md:w-64 shrink-0 overflow-hidden sticky top-16 md:top-24 z-10 bg-slate-50 py-2 -mx-4 px-4 md:mx-0 md:px-0 md:bg-transparent">
            <div className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide no-scrollbar flex-nowrap items-center">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-white md:bg-transparent border border-slate-200 md:border-transparent text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? 'text-indigo-100' : 'text-slate-400'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Main Content Area */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="p-6 md:p-8 h-full"
              >
                {activeTab === 'general' && <GeneralInfoTab valuation={valuation} />}
                {activeTab === 'historical' && <HistoricalDataTab valuation={valuation} />}
                {activeTab === 'projection' && <ProjectionTab valuation={valuation} />}
                {activeTab === 'wacc' && <WaccTab valuation={valuation} />}
                {activeTab === 'value_adjustment' && <ValueAdjustmentTab valuation={valuation} />}
                {activeTab === 'summary' && <ValuationSummaryTab valuation={valuation} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
