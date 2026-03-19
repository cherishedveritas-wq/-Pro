import React from 'react';
import { useValuation } from '../../store';
import { FormattedNumberInput } from '../ui/FormattedNumberInput';
import { ShieldAlert, Database, Info, Plus, Minus, Calculator } from 'lucide-react';

export function ValueAdjustmentTab({ valuation }: { valuation: ReturnType<typeof useValuation> }) {
  const { state, updateValueAdjustments } = valuation;
  const { valueAdjustments, generalInfo, historicalData } = state;
  const currencyPrefix = generalInfo.currency === 'USD' ? '$' : generalInfo.currency === 'KRW' ? '₩' : generalInfo.currency === 'EUR' ? '€' : generalInfo.currency === 'JPY' ? '¥' : '';

  const totalAdditions = valueAdjustments.cashAndEquivalents + valueAdjustments.nonOperatingAssets;
  const totalDeductions = valueAdjustments.totalDebt + valueAdjustments.underfundedSeverance + valueAdjustments.unpaidWages + valueAdjustments.contingentLiabilities;
  const netAdjustment = totalAdditions - totalDeductions;

  const handleFetchFromHistorical = () => {
    if (historicalData && historicalData.length > 0) {
      const lastYearData = historicalData[historicalData.length - 1];
      updateValueAdjustments('cashAndEquivalents', lastYearData.cash);
      updateValueAdjustments('totalDebt', lastYearData.totalDebt);
      alert(`가장 최근 연도(${lastYearData.year}년)의 재무데이터를 성공적으로 불러왔습니다.\n\n- 현금 및 현금성 자산: ${lastYearData.cash.toLocaleString()}\n- 총 차입금: ${lastYearData.totalDebt.toLocaleString()}`);
    } else {
      alert('불러올 과거 재무데이터가 없습니다.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">가치 조정 및 리스크</h2>
          <p className="text-slate-500 text-sm">영업가치(Enterprise Value)에서 주주가치(Equity Value)를 산출하기 위한 가산/차감 항목을 입력합니다.</p>
        </div>
        <button 
          onClick={handleFetchFromHistorical}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm whitespace-nowrap"
        >
          <Database className="w-4 h-4" />
          최근 재무데이터 연동
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 w-full flex items-center justify-start gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Plus className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500 font-medium mb-1 whitespace-nowrap">가산 항목 합계</p>
            <p className="text-2xl font-bold text-emerald-600 truncate">+{totalAdditions.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="hidden md:block w-px h-16 bg-slate-100 shrink-0"></div>
        <div className="md:hidden h-px w-full bg-slate-100"></div>
        
        <div className="flex-1 w-full flex items-center justify-start gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <Minus className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500 font-medium mb-1 whitespace-nowrap">차감 항목 합계</p>
            <p className="text-2xl font-bold text-rose-600 truncate">-{totalDeductions.toLocaleString()}</p>
          </div>
        </div>

        <div className="hidden md:block w-px h-16 bg-slate-100 shrink-0"></div>
        <div className="md:hidden h-px w-full bg-slate-100"></div>

        <div className="flex-1 w-full flex items-center justify-start gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${netAdjustment >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
            <Calculator className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500 font-medium mb-1 whitespace-nowrap">순 가치 조정액</p>
            <p className={`text-2xl font-bold truncate ${netAdjustment >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              {netAdjustment >= 0 ? '+' : ''}{netAdjustment.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Additions */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-emerald-800 border-b border-emerald-200 pb-2 flex items-center gap-2">
            가산 항목 (+)
          </h3>
          <p className="text-sm text-slate-500 mb-4">영업활동에 사용되지 않으나 기업이 보유한 자산입니다.</p>
          
          <FormattedNumberInput
            label="현금 및 현금성 자산"
            value={valueAdjustments.cashAndEquivalents}
            onChange={(val) => updateValueAdjustments('cashAndEquivalents', val)}
            prefix={currencyPrefix}
            tooltip="즉시 현금화가 가능한 자산으로, 차입금 상환 등에 사용될 수 있습니다."
          />
          <FormattedNumberInput
            label="기타 비영업자산"
            value={valueAdjustments.nonOperatingAssets}
            onChange={(val) => updateValueAdjustments('nonOperatingAssets', val)}
            prefix={currencyPrefix}
            tooltip="투자부동산, 매도가능증권 등 영업활동과 무관하게 가치를 지닌 자산입니다."
          />
        </div>

        {/* Deductions & Risks */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-rose-800 border-b border-rose-200 pb-2 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            차감 및 리스크 항목 (-)
          </h3>
          <p className="text-sm text-slate-500 mb-4">주주에게 귀속되기 전 우선적으로 변제되어야 할 부채 및 잠재적 손실입니다.</p>
          
          <FormattedNumberInput
            label="총 차입금"
            value={valueAdjustments.totalDebt}
            onChange={(val) => updateValueAdjustments('totalDebt', val)}
            prefix={currencyPrefix}
            tooltip="단기 및 장기 이자부 부채의 총합입니다."
          />
          <FormattedNumberInput
            label="퇴직급여충당금 부족액"
            value={valueAdjustments.underfundedSeverance}
            onChange={(val) => updateValueAdjustments('underfundedSeverance', val)}
            prefix={currencyPrefix}
            tooltip="사외적립자산으로 커버되지 않는 퇴직급여 예상액입니다. 부채성 항목으로 차감됩니다."
          />
          <FormattedNumberInput
            label="미지급 인건비"
            value={valueAdjustments.unpaidWages}
            onChange={(val) => updateValueAdjustments('unpaidWages', val)}
            prefix={currencyPrefix}
            tooltip="체불 임금, 미지급 상여금 등 즉시 지급 의무가 있는 부채입니다."
          />
          <FormattedNumberInput
            label="우발부채 (중대재해/소송 등)"
            value={valueAdjustments.contingentLiabilities}
            onChange={(val) => updateValueAdjustments('contingentLiabilities', val)}
            prefix={currencyPrefix}
            tooltip="중대재해처벌법 관련 예상 벌금, 진행 중인 소송의 패소 예상액 등 잠재적 리스크를 금액으로 환산하여 입력합니다."
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
            <strong className="text-slate-800 block mb-1">현금 및 현금성 자산</strong>
            기업이 즉시 사용할 수 있는 현금입니다. 영업활동에 필요하지 않은 잉여 현금은 주주가치에 가산됩니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">비영업자산 (Non-operating Assets)</strong>
            영업활동과 무관하게 보유한 투자부동산, 유가증권 등입니다. 매각하여 현금화할 수 있으므로 가산 항목입니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">총 차입금 (Total Debt)</strong>
            은행 대출, 회사채 등 이자를 발생시키는 부채입니다. 기업가치에서 차감되어 주주가치를 낮춥니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">퇴직급여충당금 부족액</strong>
            임직원 퇴직 시 지급해야 할 금액 중 사외에 적립되지 않은 부족분입니다. 잠재적 부채로 보아 차감합니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">우발부채 (Contingent Liabilities)</strong>
            소송 패소, 중대재해처벌법 관련 벌금 등 미래에 발생할 가능성이 있는 부채를 추정하여 차감합니다.
          </div>
        </div>
      </div>
    </div>
  );
}
