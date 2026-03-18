import React, { useMemo, useState, useRef } from 'react';
import { useValuation } from '../../store';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { FileText, SlidersHorizontal, Info, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const lines = payload.value.split('\n');
  return (
    <g>
      {lines.map((line: string, index: number) => (
        <text 
          key={index}
          x={x - 8} 
          y={y + (index === 0 ? -6 : 10)} 
          textAnchor="end" 
          fill="#475569" 
          fontSize={12}
        >
          {line}
        </text>
      ))}
    </g>
  );
};

export function ValuationSummaryTab({ valuation }: { valuation: ReturnType<typeof useValuation> }) {
  const { state, calculatedResults } = valuation;
  const { generalInfo, scenario, industryMultiples } = state;
  const currentCalc = calculatedResults.current;

  const [waccOffset, setWaccOffset] = useState(0);
  const [growthOffset, setGrowthOffset] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (value: number) => {
    if (generalInfo.currency === 'KRW') {
      const eok = Math.round(value / 100000000);
      return `${eok.toLocaleString()}억원`;
    }
    
    const locale = generalInfo.currency === 'KRW' ? 'ko-KR' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: generalInfo.currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompact = (val: number) => {
    if (val === 0) return '0';
    if (generalInfo.currency === 'KRW') {
      const eok = Math.round(val / 100000000);
      return `${eok.toLocaleString()}억원`;
    }
    const prefix = generalInfo.currency === 'USD' ? '$' : generalInfo.currency === 'EUR' ? '€' : generalInfo.currency === 'JPY' ? '¥' : '';
    if (Math.abs(val) >= 1000000) return `${prefix}${(val / 1000000).toFixed(1)}M`;
    if (Math.abs(val) >= 1000) return `${prefix}${(val / 1000).toFixed(0)}k`;
    return `${prefix}${val}`;
  };

  const handleExport = async () => {
    if (!reportRef.current) return;
    
    try {
      setIsExporting(true);
      
      // Add a delay to ensure UI is ready and Recharts animations are disabled
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const element = reportRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas dimensions are zero.');
      }

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const filename = `가치평가리포트_${generalInfo.companyName || '기업'}.pdf`;
      
      try {
        pdf.save(filename);
      } catch (saveError) {
        console.warn('Standard save failed, trying fallback', saveError);
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      // If we are in an iframe (like AI Studio preview), downloads might be blocked silently
      if (window !== window.parent) {
        setTimeout(() => {
          alert('다운로드가 시작되지 않았나요?\n\n미리보기 창에서는 브라우저 보안 정책으로 인해 다운로드가 차단될 수 있습니다. 우측 상단의 [새 탭에서 열기] 버튼을 눌러 새 창에서 앱을 실행한 후 다시 시도해주세요.');
        }, 1000);
      }
      
    } catch (error: any) {
      console.error('PDF export failed:', error);
      alert(`PDF 생성 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const chartData = currentCalc.years.map(y => ({
    name: y.year.toString() + '년',
    FCFF: Math.round(y.fcff),
    '매출액': Math.round(y.revenue),
    '영업이익': Math.round(y.ebit),
  }));

  // Football Field Chart Data
  const footballFieldData = useMemo(() => {
    const lastYear = state.historicalData[state.historicalData.length - 1];
    const ebit = lastYear.revenue - lastYear.cogs - lastYear.sga;
    const ebitda = ebit + lastYear.da;
    const netIncome = ebit - lastYear.taxes;

    return [
      { 
        name: `현금흐름할인법\n(DCF) ${scenario}`, 
        range: [
          calculatedResults.all[scenario].equityValue * 0.9, 
          calculatedResults.all[scenario].equityValue * 1.1
        ] 
      },
      { 
        name: `기업가치배수\n(EV/EBITDA) ${industryMultiples.evEbitda[0]}x - ${industryMultiples.evEbitda[1]}x`, 
        range: [
          (ebitda * industryMultiples.evEbitda[0]) + currentCalc.totalAdjustments, 
          (ebitda * industryMultiples.evEbitda[1]) + currentCalc.totalAdjustments
        ] 
      },
      { 
        name: `주가수익비율\n(P/E) ${industryMultiples.pe[0]}x - ${industryMultiples.pe[1]}x`, 
        range: [
          netIncome * industryMultiples.pe[0], 
          netIncome * industryMultiples.pe[1]
        ] 
      },
    ];
  }, [calculatedResults, state.historicalData, generalInfo, scenario, industryMultiples, currentCalc.totalAdjustments]);

  // Simulated Equity Value based on sliders
  const simulatedEquityValue = useMemo(() => {
    const w = currentCalc.calculatedWacc + (waccOffset / 100);
    const g = (state.projections[scenario].terminalGrowthRate / 100) + (growthOffset / 100);
    
    const terminalYearFcff = currentCalc.years[currentCalc.years.length - 1].fcff * (1 + g);
    const tv = terminalYearFcff / (w - g);
    const pvTv = tv / Math.pow(1 + w, 5);
    
    let sumPv = 0;
    currentCalc.years.forEach((yr, i) => {
      sumPv += yr.fcff / Math.pow(1 + w, i + 1);
    });

    const ev = sumPv + pvTv;
    return ev + currentCalc.totalAdjustments;
  }, [currentCalc, state.projections, scenario, waccOffset, growthOffset]);

  return (
    <div className="space-y-8" ref={reportRef}>
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">가치평가 요약</h2>
          <p className="text-slate-500 text-sm"><strong className="text-indigo-600">{scenario}</strong> 시나리오에 대한 최종 DCF 산출 결과 및 민감도 분석입니다.</p>
        </div>
        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed print-hide"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          {isExporting ? '생성 중...' : '리포트 내보내기 (PDF)'}
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">잉여현금흐름 현재가치<br/>(PV of FCFF)</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(currentCalc.sumPvFcff)}</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">영구가치 현재가치<br/>(PV of TV)</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(currentCalc.pvOfTerminalValue)}</p>
        </div>
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
          <p className="text-sm font-medium text-indigo-600 mb-1">기업가치<br/>(Enterprise Value)</p>
          <p className="text-3xl font-bold text-indigo-900">{formatCurrency(currentCalc.enterpriseValue)}</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-sm font-medium text-emerald-600 mb-1">내재 주주가치<br/>(Equity Value)</p>
          <p className="text-3xl font-bold text-emerald-900">{formatCurrency(currentCalc.equityValue)}</p>
        </div>
      </div>

      {/* Real-time Simulation */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-medium text-slate-900">실시간 민감도 시뮬레이션</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="space-y-6 lg:col-span-2">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">금리변동 조정</label>
                <span className="text-sm font-mono text-indigo-600">{waccOffset > 0 ? '+' : ''}{waccOffset.toFixed(1)}%</span>
              </div>
              <input 
                type="range" 
                min="-5" max="5" step="0.1" 
                value={waccOffset} 
                onChange={(e) => setWaccOffset(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between mt-1 text-xs text-slate-400">
                <span>-5%</span>
                <span>0%</span>
                <span>+5%</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">영구성장률 조정</label>
                <span className="text-sm font-mono text-indigo-600">{growthOffset > 0 ? '+' : ''}{growthOffset.toFixed(1)}%</span>
              </div>
              <input 
                type="range" 
                min="-2" max="2" step="0.1" 
                value={growthOffset} 
                onChange={(e) => setGrowthOffset(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between mt-1 text-xs text-slate-400">
                <span>-2%</span>
                <span>0%</span>
                <span>+2%</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center h-full flex flex-col justify-center">
            <p className="text-sm font-medium text-slate-500 mb-2">시뮬레이션 주주가치</p>
            <p className={`text-3xl font-bold transition-colors ${
              simulatedEquityValue > currentCalc.equityValue ? 'text-emerald-600' : 
              simulatedEquityValue < currentCalc.equityValue ? 'text-rose-600' : 'text-slate-900'
            }`}>
              {formatCurrency(simulatedEquityValue)}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              {simulatedEquityValue > currentCalc.equityValue ? '+' : ''}
              {(((simulatedEquityValue / currentCalc.equityValue) - 1) * 100).toFixed(1)}% (현재 시나리오 대비)
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-medium text-slate-900 mb-6">잉여현금흐름 (FCFF) 추이</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height={isExporting ? 288 : "100%"}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis width={65} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={formatCompact} />
                <RechartsTooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="FCFF" fill="#4f46e5" radius={[4, 4, 0, 0]} isAnimationActive={!isExporting} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-medium text-slate-900 mb-6">매출액 및 영업이익 성장 추이</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height={isExporting ? 288 : "100%"}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis width={65} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={formatCompact} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="매출액" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={!isExporting} />
                <Line type="monotone" dataKey="영업이익" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={!isExporting} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Football Field Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-medium text-slate-900 mb-2">가치평가 요약 (Football Field Chart)</h3>
        <p className="text-sm text-slate-500 mb-6">다양한 가치평가 방법론에 따른 주주가치 비교입니다.</p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height={isExporting ? 320 : "100%"}>
            <BarChart layout="vertical" data={footballFieldData} margin={{ top: 5, right: 30, bottom: 5, left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={formatCompact} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={<CustomYAxisTick />} width={180} />
              <RechartsTooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => {
                  if (Array.isArray(value)) {
                    return `${formatCurrency(value[0])} - ${formatCurrency(value[1])}`;
                  }
                  return formatCurrency(value);
                }}
              />
              <Bar dataKey="range" fill="#10b981" radius={[4, 4, 4, 4]} barSize={32} isAnimationActive={!isExporting} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Guide Section */}
      <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-indigo-600" />
          주요 용어 안내
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm text-slate-600">
          <div>
            <strong className="text-slate-800 block mb-1">잉여현금흐름 (FCFF)</strong>
            기업이 영업활동을 통해 창출한 현금 중, 세금과 투자비용을 빼고 채권자와 주주에게 자유롭게 분배할 수 있는 현금입니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">영구가치 (Terminal Value)</strong>
            명시적 추정 기간(5년) 이후에 기업이 영구히 존속한다고 가정할 때 발생하는 모든 미래 현금흐름의 가치입니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">기업가치 (Enterprise Value)</strong>
            기업의 순수한 영업활동 가치입니다. (향후 5년간 FCFF의 현재가치 + 영구가치의 현재가치)로 계산됩니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">내재 주주가치 (Equity Value)</strong>
            최종적인 주주의 몫입니다. (기업가치 + 비영업자산 - 유이자부채)로 계산되며, 이를 발행주식수로 나누면 적정 주가가 됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}
