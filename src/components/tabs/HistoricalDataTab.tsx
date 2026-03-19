import React from 'react';
import { useValuation } from '../../store';
import { Input } from '../ui/Input';
import { FormattedNumberInput } from '../ui/FormattedNumberInput';
import { Info } from 'lucide-react';

export function HistoricalDataTab({ valuation }: { valuation: ReturnType<typeof useValuation> }) {
  const { state, updateHistoricalYear, updateGeneralInfo } = valuation;
  const { historicalData, generalInfo } = state;

  const calculateCagr = (start: number, end: number, years: number) => {
    if (start <= 0 || end <= 0) return 0;
    return (Math.pow(end / start, 1 / years) - 1) * 100;
  };

  const revenueCagr = calculateCagr(
    historicalData[0].revenue,
    historicalData[historicalData.length - 1].revenue,
    historicalData.length - 1
  );

  const derivedData = historicalData.map((data, idx) => {
    const ebit = data.revenue - data.cogs - data.sga;
    const ebitda = ebit + data.da;
    const nwc = (data.currentAssets - data.cash) - (data.currentLiabilities - data.shortTermDebt);
    const prevPpe = idx === 0 ? generalInfo.year0Ppe : historicalData[idx - 1].ppe;
    const capex = data.ppe - prevPpe + data.da;
    return { ebit, ebitda, nwc, capex };
  });

  const ebitdaMargin = (derivedData[derivedData.length - 1].ebitda / historicalData[historicalData.length - 1].revenue) * 100;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">과거 재무 데이터</h2>
          <p className="text-slate-500 text-sm">최근 3개년의 재무 실적을 입력합니다.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex gap-6">
            <div>
              <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider">매출액 CAGR</p>
              <p className="text-xl font-bold text-indigo-900">{revenueCagr.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider">최근 EBITDA 이익률</p>
              <p className="text-xl font-bold text-indigo-900">{ebitdaMargin.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-slate-900">최초 연도 CAPEX 계산을 위한 기초 데이터</h3>
          <p className="text-xs text-slate-500">1차년도 자본적지출(CAPEX) 계산을 위해 그 전년도의 유형자산 값이 필요합니다.</p>
        </div>
        <div className="w-48">
          <FormattedNumberInput
            label={`전기(${historicalData[0].year - 1}년) 유형자산`}
            value={generalInfo.year0Ppe}
            onChange={(val) => updateGeneralInfo('year0Ppe', val)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="p-3 border-b-2 border-slate-200 font-semibold text-slate-700">항목 ({generalInfo.currency})</th>
              {historicalData.map((data, idx) => (
                <th key={idx} className="p-3 border-b-2 border-slate-200 font-semibold text-slate-700">
                  <Input
                    label=""
                    type="number"
                    value={data.year}
                    onChange={(e) => updateHistoricalYear(idx, 'year', Number(e.target.value))}
                    className="w-24 font-semibold"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-100"><td colSpan={historicalData.length + 1} className="p-2 font-semibold text-slate-700">손익계산서 (Income Statement)</td></tr>
            {[
              { key: 'revenue', label: '매출액 (Revenue)' },
              { key: 'cogs', label: '매출원가 (COGS)' },
              { key: 'sga', label: '판매비와 관리비 (SG&A)' },
              { key: 'da', label: '감가상각비 (D&A)' },
              { key: 'taxes', label: '법인세 납부액 (Taxes)' },
            ].map((row) => (
              <tr key={row.key} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 border-b border-slate-100 font-medium text-slate-600">{row.label}</td>
                {historicalData.map((data, idx) => (
                  <td key={idx} className="p-3 border-b border-slate-100">
                    <FormattedNumberInput
                      label=""
                      value={data[row.key as keyof typeof data]}
                      onChange={(val) => updateHistoricalYear(idx, row.key as any, val)}
                    />
                  </td>
                ))}
              </tr>
            ))}
            
            <tr className="bg-slate-100"><td colSpan={historicalData.length + 1} className="p-2 font-semibold text-slate-700">재무상태표 (Balance Sheet)</td></tr>
            {[
              { key: 'currentAssets', label: '유동자산 (Current Assets)' },
              { key: 'cash', label: '현금 및 현금성 자산 (Cash)' },
              { key: 'currentLiabilities', label: '유동부채 (Current Liabilities)' },
              { key: 'shortTermDebt', label: '단기차입금 (Short-term Debt)' },
              { key: 'totalDebt', label: '총차입금 (Total Debt)' },
              { key: 'totalEquity', label: '총자본 (Total Equity)' },
              { key: 'ppe', label: '유형자산 (PP&E)' },
            ].map((row) => (
              <tr key={row.key} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 border-b border-slate-100 font-medium text-slate-600">{row.label}</td>
                {historicalData.map((data, idx) => (
                  <td key={idx} className="p-3 border-b border-slate-100">
                    <FormattedNumberInput
                      label=""
                      value={data[row.key as keyof typeof data]}
                      onChange={(val) => updateHistoricalYear(idx, row.key as any, val)}
                    />
                  </td>
                ))}
              </tr>
            ))}

            <tr className="bg-indigo-50"><td colSpan={historicalData.length + 1} className="p-2 font-semibold text-indigo-900">자동 계산 항목 (Calculated)</td></tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="p-3 border-b border-slate-100 font-medium text-slate-600">영업이익 (EBIT)</td>
              {derivedData.map((d, idx) => <td key={idx} className="p-3 border-b border-slate-100 font-mono text-slate-700">{Math.round(d.ebit).toLocaleString()}</td>)}
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="p-3 border-b border-slate-100 font-medium text-slate-600">상각전영업이익 (EBITDA)</td>
              {derivedData.map((d, idx) => <td key={idx} className="p-3 border-b border-slate-100 font-mono text-slate-700">{Math.round(d.ebitda).toLocaleString()}</td>)}
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="p-3 border-b border-slate-100 font-medium text-slate-600">순운전자본 (NWC)</td>
              {derivedData.map((d, idx) => <td key={idx} className="p-3 border-b border-slate-100 font-mono text-slate-700">{Math.round(d.nwc).toLocaleString()}</td>)}
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="p-3 border-b border-slate-100 font-medium text-slate-600">자본적지출 (CAPEX)</td>
              {derivedData.map((d, idx) => <td key={idx} className="p-3 border-b border-slate-100 font-mono text-slate-700">{Math.round(d.capex).toLocaleString()}</td>)}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Guide Section */}
      <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-indigo-600" />
          주요 용어 및 수치 입력 가이드
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm text-slate-600">
          <div>
            <strong className="text-slate-800 block mb-1">매출원가 (COGS) & 판관비 (SG&A)</strong>
            매출액에서 이 두 항목을 차감하여 영업이익(EBIT)을 산출합니다. 과거 손익계산서를 참고하여 양수(+)로 입력하세요.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">감가상각비 (D&A)</strong>
            현금 유출이 없는 비용이므로 잉여현금흐름(FCFF) 산출 시 영업이익에 다시 가산됩니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">자본적 지출 (CapEx)</strong>
            유무형 자산 취득에 사용된 현금입니다. 현금흐름표의 '투자활동으로 인한 현금흐름'을 참고하여 양수(+)로 입력하세요.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">순운전자본 증감 (ΔNWC)</strong>
            (유동자산-유동부채)의 전년 대비 증감액입니다. 운전자본이 증가하면 현금이 묶인 것이므로 현금흐름에서 차감됩니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">법인세 (Taxes)</strong>
            실제 납부한 법인세액을 입력합니다. (영업이익 × 유효세율)로 추정할 수도 있습니다.
          </div>
        </div>
      </div>
    </div>
  );
}
