import React, { useState } from 'react';
import { useValuation } from '../../store';
import { Input } from '../ui/Input';
import { RefreshCw, Info, RotateCcw, Calculator } from 'lucide-react';

export function WaccTab({ valuation }: { valuation: ReturnType<typeof useValuation> }) {
  const { state, updateWacc, resetWaccToDefault } = valuation;
  const { scenario, wacc, historicalData } = state;
  const currentWacc = wacc[scenario];
  const [isFetching, setIsFetching] = useState(false);

  const calculatedWacc = valuation.calculatedResults.current.calculatedWacc * 100;

  const handleFetchMarketData = () => {
    setIsFetching(true);
    setTimeout(() => {
      // 1. 무위험 이자율 (Risk-Free Rate): 국고채 10년물 최근 금리 수준 (약 3.5%)
      updateWacc(scenario, 'riskFreeRate', 3.5);
      
      // 2. 시장위험프리미엄 (MRP): Damodaran 교수 한국 ERP 데이터 참고 (약 5.5%)
      updateWacc(scenario, 'marketRiskPremium', 5.5);

      // 3. 베타 (Beta): 선택된 산업군에 따른 평균 베타 적용
      let industryBeta = 1.0;
      switch (valuation.state.generalInfo.industry) {
        case 'IT/기술': industryBeta = 1.2; break;
        case '서비스업': industryBeta = 0.9; break;
        case '헬스케어': industryBeta = 1.3; break;
        case '금융': industryBeta = 0.8; break;
        case '자유소비재': industryBeta = 1.1; break;
        case '산업재': industryBeta = 1.0; break;
        case '에너지': industryBeta = 0.9; break;
        default: industryBeta = 1.0;
      }
      updateWacc(scenario, 'beta', industryBeta);

      setIsFetching(false);
      alert(`시장 데이터를 업데이트했습니다.\n\n- 무위험 이자율: 3.5% (국고채 10년물 기준)\n- 시장위험프리미엄: 5.5% (Damodaran ERP 기준)\n- 베타: ${industryBeta} (${valuation.state.generalInfo.industry} 평균)`);
    }, 1000);
  };

  const handleCalculateDebtRatio = () => {
    if (historicalData && historicalData.length > 0) {
      const lastYearData = historicalData[historicalData.length - 1];
      // 자본 = 자산 - 부채
      // 자산은 유동자산 + 비유동자산(유형자산 등)으로 추정해야 하나, 
      // 입력된 데이터 한계상 (유동자산 + 유형자산)을 최소 자산으로 가정
      const estimatedAssets = lastYearData.currentAssets + lastYearData.ppe;
      const estimatedEquity = estimatedAssets - lastYearData.currentLiabilities;
      
      if (estimatedEquity > 0 && lastYearData.shortTermDebt >= 0) {
        // 부채비율 = (총차입금 / 자본) * 100
        // 여기서는 입력된 단기차입금을 총차입금의 대용치로 사용
        const calculatedRatio = (lastYearData.shortTermDebt / estimatedEquity) * 100;
        updateWacc(scenario, 'debtToEquityRatio', Number(calculatedRatio.toFixed(1)));
        alert(`가장 최근 연도(${lastYearData.year}년) 데이터를 기반으로 부채비율을 계산했습니다.\n\n- 추정 자본: ${estimatedEquity.toLocaleString()}\n- 차입금: ${lastYearData.shortTermDebt.toLocaleString()}\n- 산출된 부채비율: ${calculatedRatio.toFixed(1)}%`);
      } else {
        alert("자본이 0 이하이거나 부채 데이터가 부족하여 부채비율을 계산할 수 없습니다.");
      }
    } else {
      alert("과거 재무 데이터가 없습니다.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">할인율 (WACC; 자본비용)</h2>
          <p className="text-slate-500 text-sm"><strong className="text-indigo-600">{scenario}</strong> 시나리오에 대한 가중평균자본비용(WACC)을 산출합니다.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={resetWaccToDefault}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            디폴트 값으로 돌아가기
          </button>
          <button 
            onClick={handleFetchMarketData}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            시장 데이터 불러오기
          </button>
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center min-w-[150px]">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">산출된 WACC</p>
            <p className="text-3xl font-bold text-emerald-900">{calculatedWacc.toFixed(2)}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">자기자본비용 (Ke)</h3>
          <Input
            label="무위험 이자율"
            type="number"
            step="0.1"
            value={currentWacc.riskFreeRate}
            onChange={(e) => updateWacc(scenario, 'riskFreeRate', Number(e.target.value))}
            suffix="%"
            tooltip="장기 국채 수익률입니다."
          />
          <Input
            label="베타 (β)"
            type="number"
            step="0.01"
            value={currentWacc.beta}
            onChange={(e) => updateWacc(scenario, 'beta', Number(e.target.value))}
            tooltip="전체 시장 대비 해당 기업 주식의 변동성 지표입니다."
          />
          <Input
            label="시장위험프리미엄 (MRP)"
            type="number"
            step="0.1"
            value={currentWacc.marketRiskPremium}
            onChange={(e) => updateWacc(scenario, 'marketRiskPremium', Number(e.target.value))}
            suffix="%"
            tooltip="무위험 이자율을 초과하는 시장의 기대 수익률입니다."
          />
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-lg font-medium text-slate-900">타인자본비용 (Kd) 및 자본 구조</h3>
            <button
              onClick={handleCalculateDebtRatio}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
            >
              <Calculator className="w-3.5 h-3.5" />
              과거 데이터로 부채비율 계산
            </button>
          </div>
          <Input
            label="타인자본비용 (Kd)"
            type="number"
            step="0.1"
            value={currentWacc.costOfDebt}
            onChange={(e) => updateWacc(scenario, 'costOfDebt', Number(e.target.value))}
            suffix="%"
            tooltip="기업이 차입금에 대해 지불하는 이자율입니다."
          />
          <Input
            label="부채비율 (D/E Ratio)"
            type="number"
            step="1"
            value={currentWacc.debtToEquityRatio}
            onChange={(e) => updateWacc(scenario, 'debtToEquityRatio', Number(e.target.value))}
            suffix="%"
            tooltip="목표 자본 구조입니다."
          />
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
            <strong className="text-slate-800 block mb-1">가중평균자본비용 (WACC)</strong>
            기업이 자본을 조달하는 데 드는 평균 비용이자, 미래 현금흐름을 현재가치로 할인하는 '할인율'입니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">무위험 이자율 (Risk-Free Rate)</strong>
            위험이 없는 투자의 수익률로, 보통 10년 만기 국채 수익률을 사용합니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">시장위험프리미엄 (MRP)</strong>
            투자자가 무위험 자산 대신 주식 시장에 투자할 때 요구하는 추가 수익률입니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">베타 (Beta)</strong>
            시장 전체의 변동 대비 해당 기업 주가의 변동성을 나타냅니다. 1보다 크면 시장보다 민감하게 움직임을 의미합니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">타인자본비용 (Cost of Debt)</strong>
            기업이 돈을 빌릴 때 지불하는 이자율입니다. 회사채 수익률이나 실제 대출 금리를 참고합니다.
          </div>
        </div>
      </div>
    </div>
  );
}
