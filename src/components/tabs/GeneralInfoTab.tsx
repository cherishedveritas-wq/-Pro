import React, { useRef, useState } from 'react';
import { Input } from '../ui/Input';
import { useValuation } from '../../store';
import { Database, Info, Upload, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import * as XLSX from 'xlsx';

export function GeneralInfoTab({ valuation }: { valuation: ReturnType<typeof useValuation> }) {
  const { state, updateGeneralInfo, updateIndustryMultiples, updateHistoricalYear } = valuation;
  const { generalInfo, industryMultiples, historicalData } = state;
  const [isFetching, setIsFetching] = useState(false);
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const lastYearData = historicalData[historicalData.length - 1];
  const lastHistoricalYear = lastYearData.year;
  
  const recentRevenue = lastYearData.revenue;
  const recentOperatingIncome = lastYearData.revenue - lastYearData.cogs - lastYearData.sga;
  const recentNetIncome = recentOperatingIncome - lastYearData.taxes;

  const formatCurrency = (value: number) => {
    const prefix = generalInfo.currency === 'USD' ? '$' : generalInfo.currency === 'KRW' ? '₩' : generalInfo.currency === 'EUR' ? '€' : generalInfo.currency === 'JPY' ? '¥' : '';
    return `${prefix}${Math.round(value).toLocaleString()}`;
  };

  const handleFetchMultiples = () => {
    setIsFetching(true);
    setFetchSuccess(false);
    setTimeout(() => {
      let newMultiples: { evEbitda: [number, number], pe: [number, number] };
      switch (generalInfo.industry) {
        case 'IT/기술': newMultiples = { evEbitda: [10, 15], pe: [20, 30] }; break;
        case '서비스업': newMultiples = { evEbitda: [6, 10], pe: [10, 15] }; break;
        case '헬스케어': newMultiples = { evEbitda: [12, 18], pe: [25, 35] }; break;
        case '금융': newMultiples = { evEbitda: [5, 8], pe: [8, 12] }; break;
        case '자유소비재': newMultiples = { evEbitda: [7, 11], pe: [12, 18] }; break;
        case '산업재': newMultiples = { evEbitda: [6, 9], pe: [10, 16] }; break;
        case '에너지': newMultiples = { evEbitda: [4, 7], pe: [7, 11] }; break;
        default: newMultiples = { evEbitda: [8, 12], pe: [15, 25] };
      }
      updateIndustryMultiples(newMultiples);
      setIsFetching(false);
      setFetchSuccess(true);
      setTimeout(() => setFetchSuccess(false), 3000);
    }, 1000);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsAnalyzing(true);
    try {
      const fileParts = await Promise.all(files.map(async (file) => {
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
          return new Promise<any>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                let csvText = '';
                workbook.SheetNames.forEach(sheetName => {
                  const worksheet = workbook.Sheets[sheetName];
                  csvText += `Sheet: ${sheetName}\n`;
                  csvText += XLSX.utils.sheet_to_csv(worksheet);
                  csvText += '\n\n';
                });
                resolve({
                  text: csvText
                });
              } catch (err) {
                reject(err);
              }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
          });
        } else {
          return new Promise<any>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Data = (reader.result as string).split(',')[1];
              resolve({
                inlineData: {
                  mimeType: file.type || 'application/pdf',
                  data: base64Data
                }
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }
      }));

      const rawApiKey = process.env.GEMINI_API_KEY;
      const apiKey = rawApiKey ? rawApiKey.trim() : '';
      
      if (!apiKey || apiKey === 'undefined') {
        throw new Error('Gemini API 키가 설정되지 않았거나 유효하지 않습니다. 설정에서 API 키를 확인해주세요.');
      }
      
      // Cache buster: 2026-03-18
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            ...fileParts,
            {
              text: `Extract the company name, industry, and financial data for the last 3 years from the provided document(s).
              If multiple documents are provided, combine the data to find the 3 most recent distinct years available.
              If there are still fewer than 3 years, extrapolate or leave as 0.
              Return an object containing:
              - companyName: The name of the company (기업명).
              - industry: The industry the company belongs to (산업군). Choose one of: "IT/기술", "서비스업", "헬스케어", "금융", "자유소비재", "산업재", "에너지". If unsure, default to "서비스업".
              - historicalData: A JSON array of exactly 3 objects, ordered from oldest year to most recent year.
              - year0Ppe: The property, plant, and equipment (유형자산) value for the year immediately preceding the oldest year in historicalData (i.e., Year - 4). If not available, leave as 0.
              
              Map the document's items to these fields for each year in historicalData:
              - year: The fiscal year
              - revenue: 매출액 (Revenue)
              - cogs: 매출원가 (COGS)
              - sga: 판매비와 관리비 (SG&A)
              - da: 감가상각비 (D&A)
              - taxes: 법인세 (Taxes)
              - currentAssets: 유동자산 (Current Assets)
              - cash: 현금 및 현금성 자산 (Cash)
              - currentLiabilities: 유동부채 (Current Liabilities)
              - shortTermDebt: 단기차입금 (Short-term Debt)
              - ppe: 유형자산 (PP&E)`
            }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              companyName: { type: Type.STRING },
              industry: { type: Type.STRING },
              historicalData: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    year: { type: Type.INTEGER },
                    revenue: { type: Type.NUMBER },
                    cogs: { type: Type.NUMBER },
                    sga: { type: Type.NUMBER },
                    da: { type: Type.NUMBER },
                    taxes: { type: Type.NUMBER },
                    currentAssets: { type: Type.NUMBER },
                    cash: { type: Type.NUMBER },
                    currentLiabilities: { type: Type.NUMBER },
                    shortTermDebt: { type: Type.NUMBER },
                    ppe: { type: Type.NUMBER },
                  },
                  required: ["year", "revenue", "cogs", "sga", "da", "taxes", "currentAssets", "cash", "currentLiabilities", "shortTermDebt", "ppe"]
                }
              },
              year0Ppe: { type: Type.NUMBER, description: "The PPE value for the year immediately preceding the oldest year in historicalData" }
            },
            required: ["historicalData", "year0Ppe"]
          }
        }
      });

      const jsonStr = response.text?.trim() || '{}';
      const parsedData = JSON.parse(jsonStr);

      if (parsedData.companyName) {
        updateGeneralInfo('companyName', parsedData.companyName);
      }
      if (parsedData.industry) {
        updateGeneralInfo('industry', parsedData.industry);
      }

      if (parsedData.historicalData && Array.isArray(parsedData.historicalData) && parsedData.historicalData.length === 3) {
        parsedData.historicalData.forEach((data: any, idx: number) => {
          Object.keys(data).forEach((key) => {
            if (key !== 'year') {
              updateHistoricalYear(idx, key as any, data[key]);
            } else {
              updateHistoricalYear(idx, 'year', data[key]);
            }
          });
        });
        
        if (parsedData.year0Ppe !== undefined) {
          updateGeneralInfo('year0Ppe', parsedData.year0Ppe);
        }
        
        alert('AI 분석이 완료되어 데이터가 자동 입력되었습니다.');
      } else {
        throw new Error('Invalid data format received from AI');
      }
    } catch (error: any) {
      console.error('Error analyzing file:', error);
      alert(`파일 분석 중 오류가 발생했습니다. 다시 시도해주세요.\n상세 오류: ${error?.message || error}`);
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">기본 정보</h2>
          <p className="text-slate-500 text-sm">대상 기업의 기본 정보 및 가치평가 기준을 입력합니다.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".pdf,.csv,.xlsx" 
              multiple
              className="hidden" 
            />
            <div className="flex flex-col items-end">
              <button 
                onClick={handleImportClick}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isAnalyzing ? 'AI 분석 중...' : 'Excel/PDF 불러오기'}
              </button>
              <span className="text-xs text-slate-500 mt-1">💡 2개 파일을 한 번에 등록할 수 있습니다.</span>
            </div>
            <button 
              onClick={handleFetchMultiples}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 h-[38px] self-start"
            >
              <Database className={`w-4 h-4 ${isFetching ? 'animate-pulse' : ''}`} />
              산업 평균 멀티플 불러오기
            </button>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 mt-2">
            <span className="font-medium text-slate-700">적용중인 멀티플:</span>
            <span>EV/EBITDA {industryMultiples.evEbitda[0]}x~{industryMultiples.evEbitda[1]}x</span>
            <span className="text-slate-300">|</span>
            <span>P/E {industryMultiples.pe[0]}x~{industryMultiples.pe[1]}x</span>
            {fetchSuccess && <span className="text-emerald-600 font-medium ml-1 animate-pulse">(업데이트 완료!)</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="기업명"
          value={generalInfo.companyName}
          onChange={(e) => updateGeneralInfo('companyName', e.target.value)}
          placeholder="기업명을 입력하세요"
        />
        
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">산업군</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            value={generalInfo.industry}
            onChange={(e) => updateGeneralInfo('industry', e.target.value)}
          >
            <option value="IT/기술">IT/기술</option>
            <option value="서비스업">서비스업</option>
            <option value="헬스케어">헬스케어</option>
            <option value="금융">금융</option>
            <option value="자유소비재">자유소비재</option>
            <option value="산업재">산업재</option>
            <option value="에너지">에너지</option>
          </select>
        </div>

        <Input
          label="평가 기준일"
          type="date"
          value={generalInfo.valuationDate}
          onChange={(e) => updateGeneralInfo('valuationDate', e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">통화</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            value={generalInfo.currency}
            onChange={(e) => updateGeneralInfo('currency', e.target.value)}
          >
            <option value="KRW">KRW (₩)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="JPY">JPY (¥)</option>
          </select>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-200">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-slate-900 mb-1">최근 재무 요약 ({lastHistoricalYear}년 기준)</h3>
          <p className="text-sm text-slate-500">
            아래 데이터는 <strong>[과거 재무 데이터]</strong> 탭에 입력된 가장 최근 연도({lastHistoricalYear}년)의 자료를 바탕으로 자동 계산되어 반영됩니다. 값을 수정하려면 과거 재무 데이터 탭을 업데이트해 주세요.
          </p>
        </div>

        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-slate-700">자동 연동 안내</h4>
            <p className="text-sm text-slate-600 mt-1">
              이 요약 데이터는 DCF(현금흐름할인법)의 미래 추정 기준점 및 P/E, EV/EBITDA 상대가치 평가에 직접적으로 사용됩니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-1">최근 매출액</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(recentRevenue)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-1">영업이익 (EBIT)</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(recentOperatingIncome)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-1">당기순이익 (추정)</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(recentNetIncome)}</p>
            <p className="text-xs text-slate-400 mt-1">* 영업이익 - 법인세</p>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-indigo-600" />
          주요 용어 및 입력 가이드
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-600">
          <div>
            <strong className="text-slate-800 block mb-1">평가 기준일 (Valuation Date)</strong>
            가치평가의 기준이 되는 시점입니다. 일반적으로 가장 최근 결산일이나 현재 날짜를 입력합니다.
          </div>
          <div>
            <strong className="text-slate-800 block mb-1">산업 분류 (Industry)</strong>
            기업이 속한 산업군입니다. 선택한 산업에 따라 상대가치평가(EV/EBITDA, P/E)에 사용되는 기본 멀티플(배수)이 자동으로 설정됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}
