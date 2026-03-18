import React from 'react';
import { useValuation } from '../../store';
import { Input } from '../ui/Input';
import { RefreshCw, Info } from 'lucide-react';

export function ProjectionTab({ valuation }: { valuation: ReturnType<typeof useValuation> }) {
  const { state, updateProjection, applyHistoricalAverages } = valuation;
  const { scenario, projections } = state;
  const currentProj = projections[scenario];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">재무 추정</h2>
          <p className="text-slate-500 text-sm"><strong className="text-indigo-600">{scenario}</strong> 시나리오에 대한 향후 5개년 재무 추정 가정을 설정합니다.</p>
        </div>
        <button 
          onClick={applyHistoricalAverages}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          과거 3개년 평균 적용
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Input
          label="매출액 성장률"
          type="number"
          step="0.1"
          value={currentProj.revenueGrowthRate}
          onChange={(e) => updateProjection(scenario, 'revenueGrowthRate', Number(e.target.value))}
          suffix="%"
          tooltip="향후 5년간의 연평균 매출액 성장률입니다. (기본값: 당해년도 최저임금 인상률 2.9%. 단, 과거 3개년 평균이 10% 초과시 50%, 20% 초과시 30%, 30% 초과시 20%만 반영)"
        />
        <Input
          label="영업이익률 (EBIT Margin)"
          type="number"
          step="0.1"
          value={currentProj.operatingMargin}
          onChange={(e) => updateProjection(scenario, 'operatingMargin', Number(e.target.value))}
          suffix="%"
          tooltip="매출액 대비 영업이익 비율입니다."
        />
        <Input
          label="매출액 대비 D&A (%)"
          type="number"
          step="0.1"
          value={currentProj.daPercentOfRevenue}
          onChange={(e) => updateProjection(scenario, 'daPercentOfRevenue', Number(e.target.value))}
          suffix="%"
          tooltip="매출액 대비 감가상각비 및 무형자산상각비 비율입니다."
        />
        <Input
          label="매출액 대비 CAPEX (%)"
          type="number"
          step="0.1"
          value={currentProj.capexPercentOfRevenue}
          onChange={(e) => updateProjection(scenario, 'capexPercentOfRevenue', Number(e.target.value))}
          suffix="%"
          tooltip="매출액 대비 자본적지출 비율입니다. (과거 평균이 음수일 경우, 보수적 추정을 위해 감가상각비 비율로 대체됩니다)"
        />
        <Input
          label="매출액 대비 순운전자본(NWC) (%)"
          type="number"
          step="0.1"
          value={currentProj.nwcPercentOfRevenue}
          onChange={(e) => updateProjection(scenario, 'nwcPercentOfRevenue', Number(e.target.value))}
          suffix="%"
          tooltip="매출액 대비 요구되는 순운전자본 비율입니다. (과거 평균이 음수일 경우, 무한한 현금 창출 오류를 막기 위해 0%로 보정됩니다)"
        />
        <Input
          label="유효 법인세율"
          type="number"
          step="0.1"
          value={currentProj.taxRate}
          onChange={(e) => updateProjection(scenario, 'taxRate', Number(e.target.value))}
          suffix="%"
          tooltip="영업이익에 적용되는 법인세율입니다. (최근 연도 영업이익 규모에 따라 2023년 개정 법인세율 9.9%~26.4% 구간이 자동 적용됩니다)"
        />
        <Input
          label="영구 성장률"
          type="number"
          step="0.1"
          value={currentProj.terminalGrowthRate}
          onChange={(e) => updateProjection(scenario, 'terminalGrowthRate', Number(e.target.value))}
          suffix="%"
          tooltip="추정 기간(5년) 이후의 영구적인 성장률입니다. 일반적으로 0%에서 3% 사이를 적용합니다."
        />
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-8">
        <h3 className="text-lg font-medium text-slate-900 mb-4">추정 잉여현금흐름 (FCFF)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 text-slate-500 font-medium">항목</th>
                {valuation.calculatedResults.current.years.map((y) => (
                  <th key={y.year} className="py-2 text-slate-500 font-medium text-right">{y.year}년</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 text-slate-700">매출액</td>
                {valuation.calculatedResults.current.years.map((y) => (
                  <td key={y.year} className="py-3 text-right font-mono text-slate-600">{Math.round(y.revenue).toLocaleString()}</td>
                ))}
              </tr>
              <tr>
                <td className="py-3 text-slate-700">영업이익 (EBIT)</td>
                {valuation.calculatedResults.current.years.map((y) => (
                  <td key={y.year} className="py-3 text-right font-mono text-slate-600">{Math.round(y.ebit).toLocaleString()}</td>
                ))}
              </tr>
              <tr>
                <td className="py-3 text-slate-700">세후영업이익 (NOPAT)</td>
                {valuation.calculatedResults.current.years.map((y) => (
                  <td key={y.year} className="py-3 text-right font-mono text-slate-600">{Math.round(y.nopat).toLocaleString()}</td>
                ))}
              </tr>
              <tr>
                <td className="py-3 text-slate-700">+ 상각비 (D&A)</td>
                {valuation.calculatedResults.current.years.map((y) => (
                  <td key={y.year} className="py-3 text-right font-mono text-slate-600">{Math.round(y.da).toLocaleString()}</td>
                ))}
              </tr>
              <tr>
                <td className="py-3 text-slate-700">- 자본적지출 (CAPEX)</td>
                {valuation.calculatedResults.current.years.map((y) => (
                  <td key={y.year} className="py-3 text-right font-mono text-slate-600 text-rose-600">({Math.round(y.capex).toLocaleString()})</td>
                ))}
              </tr>
              <tr>
                <td className="py-3 text-slate-700">- 순운전자본 증감</td>
                {valuation.calculatedResults.current.years.map((y) => (
                  <td key={y.year} className="py-3 text-right font-mono text-slate-600 text-rose-600">({Math.round(y.changeInNwc).toLocaleString()})</td>
                ))}
              </tr>
              <tr className="bg-indigo-50/50">
                <td className="py-3 font-semibold text-indigo-900">잉여현금흐름 (FCFF)</td>
                {valuation.calculatedResults.current.years.map((y) => (
                  <td key={y.year} className="py-3 text-right font-mono font-bold text-indigo-700">{Math.round(y.fcff).toLocaleString()}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Guide Section */}
      <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-indigo-600" />
          주요 용어 및 수치 입력 가이드
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm text-slate-600">
          <div>
            <strong className="text-slate-800 block mb-1">매출 성장률 (Revenue Growth)</strong>
            전년 대비 매출액이 얼마나 증가할지 예상하는 비율입니다. 과거 평균이나 산업 전망을 참고하여 입력합니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">영업이익률 (EBIT Margin)</strong>
            매출액 대비 영업이익의 비율입니다. 회사의 수익성을 나타내며, 과거 추이나 목표 수익률을 반영합니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">영구성장률 (Terminal Growth Rate)</strong>
            추정 기간(5년) 이후 기업이 영구적으로 성장할 것으로 기대되는 연평균 성장률입니다. 보통 장기 경제성장률(1~3%) 수준으로 가정합니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">시나리오 (Scenarios)</strong>
            노동집약, 기술집약, 단순노무서비스 상황을 가정하여 변수들의 변화에 따른 가치 변동을 분석할 수 있습니다.
          </div>
        </div>
      </div>
    </div>
  );
}
