import { useState, useMemo } from 'react';
import { ValuationState, Scenario, CalculatedYear } from './types';

const currentYear = new Date().getFullYear();

export const calculateHistoricalAverages = (hd: ValuationState['historicalData'], year0Ppe: number) => {
  if (hd.length < 2) return { revenueGrowthRate: 2.9, operatingMargin: 15, daPercentOfRevenue: 5, capexPercentOfRevenue: 10, nwcPercentOfRevenue: 12, taxRate: 20.9 };
  
  const revenueCagr = hd[0].revenue > 0 && hd[hd.length - 1].revenue > 0
    ? (Math.pow(hd[hd.length - 1].revenue / hd[0].revenue, 1 / (hd.length - 1)) - 1) * 100
    : 0;
  
  const MINIMUM_WAGE_INCREASE_RATE = 2.9; // 2026년 최저임금 인상률 (2.9%)
  let projectedRevenueGrowthRate = MINIMUM_WAGE_INCREASE_RATE;
  
  if (revenueCagr > 30) {
    projectedRevenueGrowthRate = revenueCagr * 0.20;
  } else if (revenueCagr > 20) {
    projectedRevenueGrowthRate = revenueCagr * 0.30;
  } else if (revenueCagr > 10) {
    projectedRevenueGrowthRate = revenueCagr * 0.50;
  } else {
    projectedRevenueGrowthRate = MINIMUM_WAGE_INCREASE_RATE;
  }
  
  let sumOpMargin = 0;
  let sumDaPercent = 0;
  let sumCapexPercent = 0;
  let sumNwcPercent = 0;
  let validYears = 0;
  
  hd.forEach((year, index) => {
    const ebit = year.revenue - year.cogs - year.sga;
    const nwc = (year.currentAssets - year.cash) - (year.currentLiabilities - year.shortTermDebt);
    const prevPpe = index === 0 ? year0Ppe : hd[index - 1].ppe;
    const capex = year.ppe - prevPpe + year.da;

    if (year.revenue > 0) {
      sumOpMargin += (ebit / year.revenue) * 100;
      sumDaPercent += (year.da / year.revenue) * 100;
      sumCapexPercent += (capex / year.revenue) * 100;
      sumNwcPercent += (nwc / year.revenue) * 100;
      validYears++;
    }
  });
  
  const divisor = validYears > 0 ? validYears : hd.length;
  
  let avgCapexPercent = sumCapexPercent / divisor;
  let avgDaPercent = sumDaPercent / divisor;
  let avgNwcPercent = sumNwcPercent / divisor;
  
  // CAPEX가 음수(자산매각이 더 많음)인 경우, 영구적으로 자산을 매각할 수는 없으므로
  // 보수적 추정을 위해 최소한 감가상각비(D&A)만큼은 재투자(Maintenance CAPEX)한다고 가정
  if (avgCapexPercent < 0) {
    avgCapexPercent = avgDaPercent;
  }
  
  // 순운전자본이 음수인 경우(매입채무가 매우 큰 경우 등),
  // 미래에도 계속 음수 폭이 커지면 무한히 현금이 창출되는 오류가 발생하므로 0%로 보정
  if (avgNwcPercent < 0) {
    avgNwcPercent = 0;
  }

  // 법인세율 자동 산출 (최근 연도 영업이익 기준, 2023년 개정 법인세율 적용)
  const recentYear = hd[hd.length - 1];
  const recentEbit = recentYear.revenue - recentYear.cogs - recentYear.sga;
  let calculatedTaxRate = 20.9; // 기본값 (지방소득세 포함)

  if (recentEbit > 0) {
    // 입력 단위 추정: 매출액이 1억 미만이면 백만원 단위, 1000억 미만이면 천원 단위로 가정하여 과세표준(원 단위) 환산
    let normalizedEbit = recentEbit;
    if (recentYear.revenue > 0) {
      if (recentYear.revenue < 100_000) {
        normalizedEbit = recentEbit * 1_000_000; // 백만원 단위로 가정
      } else if (recentYear.revenue < 100_000_000) {
        normalizedEbit = recentEbit * 1_000; // 천원 단위로 가정
      }
    }

    let taxAmount = 0;
    if (normalizedEbit <= 200_000_000) {
      taxAmount = normalizedEbit * 0.09;
    } else if (normalizedEbit <= 20_000_000_000) {
      taxAmount = 200_000_000 * 0.09 + (normalizedEbit - 200_000_000) * 0.19;
    } else if (normalizedEbit <= 300_000_000_000) {
      taxAmount = 200_000_000 * 0.09 + 19_800_000_000 * 0.19 + (normalizedEbit - 20_000_000_000) * 0.21;
    } else {
      taxAmount = 200_000_000 * 0.09 + 19_800_000_000 * 0.19 + 280_000_000_000 * 0.21 + (normalizedEbit - 300_000_000_000) * 0.24;
    }
    
    const localTax = taxAmount * 0.1; // 지방소득세 10%
    calculatedTaxRate = ((taxAmount + localTax) / normalizedEbit) * 100;
  }
  
  return {
    revenueGrowthRate: Number(projectedRevenueGrowthRate.toFixed(2)),
    operatingMargin: Number((sumOpMargin / divisor).toFixed(2)),
    daPercentOfRevenue: Number(avgDaPercent.toFixed(2)),
    capexPercentOfRevenue: Number(avgCapexPercent.toFixed(2)),
    nwcPercentOfRevenue: Number(avgNwcPercent.toFixed(2)),
    taxRate: Number(calculatedTaxRate.toFixed(2)),
  };
};

const initialHistoricalData = [
  { year: currentYear - 3, revenue: 0, cogs: 0, sga: 0, da: 0, taxes: 0, currentAssets: 0, cash: 0, currentLiabilities: 0, shortTermDebt: 0, ppe: 0 },
  { year: currentYear - 2, revenue: 0, cogs: 0, sga: 0, da: 0, taxes: 0, currentAssets: 0, cash: 0, currentLiabilities: 0, shortTermDebt: 0, ppe: 0 },
  { year: currentYear - 1, revenue: 0, cogs: 0, sga: 0, da: 0, taxes: 0, currentAssets: 0, cash: 0, currentLiabilities: 0, shortTermDebt: 0, ppe: 0 },
];

const baseAverages = calculateHistoricalAverages(initialHistoricalData, 0);

const initialState: ValuationState = {
  scenario: '단순노무서비스',
  generalInfo: {
    companyName: '',
    industry: '서비스업',
    valuationDate: new Date().toISOString().split('T')[0],
    currency: 'KRW',
    year0Ppe: 0,
  },
  industryMultiples: {
    evEbitda: [6, 10],
    pe: [10, 15],
  },
  valueAdjustments: {
    cashAndEquivalents: 0,
    nonOperatingAssets: 0,
    totalDebt: 0,
    underfundedSeverance: 0,
    unpaidWages: 0,
    contingentLiabilities: 0,
  },
  historicalData: initialHistoricalData,
  projections: {
    '기술집약': { ...baseAverages, revenueGrowthRate: baseAverages.revenueGrowthRate + 5, operatingMargin: baseAverages.operatingMargin + 5, terminalGrowthRate: 3 },
    '노동집약': { ...baseAverages, terminalGrowthRate: 2 },
    '단순노무서비스': { ...baseAverages, revenueGrowthRate: baseAverages.revenueGrowthRate - 5, operatingMargin: baseAverages.operatingMargin - 5, terminalGrowthRate: 1 },
  },
  wacc: {
    '기술집약': { riskFreeRate: 3, beta: 1.0, marketRiskPremium: 5, costOfDebt: 4, debtToEquityRatio: 30 },
    '노동집약': { riskFreeRate: 4, beta: 1.2, marketRiskPremium: 6, costOfDebt: 5, debtToEquityRatio: 40 },
    '단순노무서비스': { riskFreeRate: 5, beta: 1.5, marketRiskPremium: 7, costOfDebt: 6, debtToEquityRatio: 50 },
  },
};

export function useValuation() {
  const [state, setState] = useState<ValuationState>(initialState);

  const updateGeneralInfo = (key: keyof ValuationState['generalInfo'], value: string | number) => {
    setState(s => ({ ...s, generalInfo: { ...s.generalInfo, [key]: value } }));
  };

  const updateValueAdjustments = (key: keyof ValuationState['valueAdjustments'], value: number) => {
    setState(s => ({ ...s, valueAdjustments: { ...s.valueAdjustments, [key]: value } }));
  };

  const updateIndustryMultiples = (multiples: ValuationState['industryMultiples']) => {
    setState(s => ({ ...s, industryMultiples: multiples }));
  };

  const updateHistoricalYear = (index: number, key: keyof ValuationState['historicalData'][0], value: number) => {
    setState(s => {
      const newData = [...s.historicalData];
      newData[index] = { ...newData[index], [key]: value };
      return { ...s, historicalData: newData };
    });
  };

  const updateProjection = (scenario: Scenario, key: keyof ValuationState['projections'][Scenario], value: number) => {
    setState(s => ({
      ...s,
      projections: { ...s.projections, [scenario]: { ...s.projections[scenario], [key]: value } }
    }));
  };

  const updateWacc = (scenario: Scenario, key: keyof ValuationState['wacc'][Scenario], value: number) => {
    setState(s => ({
      ...s,
      wacc: { ...s.wacc, [scenario]: { ...s.wacc[scenario], [key]: value } }
    }));
  };

  const resetWaccToDefault = () => {
    setState(s => ({
      ...s,
      wacc: initialState.wacc
    }));
  };

  const setScenario = (scenario: Scenario) => {
    setState(s => ({ ...s, scenario }));
  };

  const applyHistoricalAverages = () => {
    const avgs = calculateHistoricalAverages(state.historicalData, state.generalInfo.year0Ppe);
    setState(s => ({
      ...s,
      projections: {
        '기술집약': { ...s.projections['기술집약'], ...avgs, revenueGrowthRate: avgs.revenueGrowthRate + 5, operatingMargin: avgs.operatingMargin + 5 },
        '노동집약': { ...s.projections['노동집약'], ...avgs },
        '단순노무서비스': { ...s.projections['단순노무서비스'], ...avgs, revenueGrowthRate: avgs.revenueGrowthRate - 5, operatingMargin: avgs.operatingMargin - 5 },
      }
    }));
  };

  const calculatedResults = useMemo(() => {
    const calculateForScenario = (scen: Scenario) => {
      const proj = state.projections[scen];
      const w = state.wacc[scen];

      // WACC Calculation
      const taxRate = proj.taxRate / 100;
      const ke = (w.riskFreeRate + w.beta * w.marketRiskPremium) / 100;
      const kd = (w.costOfDebt / 100) * (1 - taxRate);
      const deRatio = w.debtToEquityRatio / 100;
      const we = 1 / (1 + deRatio);
      const wd = deRatio / (1 + deRatio);
      const calculatedWacc = we * ke + wd * kd;

      // Projections
      let currentRevenue = state.historicalData[state.historicalData.length - 1].revenue;
      let currentNwc = currentRevenue * (proj.nwcPercentOfRevenue / 100);
      const years: CalculatedYear[] = [];
      
      for (let i = 1; i <= 5; i++) {
        const revenue = currentRevenue * (1 + proj.revenueGrowthRate / 100);
        const ebit = revenue * (proj.operatingMargin / 100);
        const taxes = ebit * taxRate;
        const nopat = ebit - taxes;
        const da = revenue * (proj.daPercentOfRevenue / 100);
        const capex = revenue * (proj.capexPercentOfRevenue / 100);
        const nwc = revenue * (proj.nwcPercentOfRevenue / 100);
        const changeInNwc = nwc - currentNwc;
        const fcff = nopat + da - capex - changeInNwc;
        
        const discountFactor = Math.pow(1 + calculatedWacc, i);
        const pvOfFcff = fcff / discountFactor;

        years.push({
          year: currentYear + i - 1,
          revenue, ebit, taxes, nopat, da, capex, nwc, changeInNwc, fcff, pvOfFcff
        });

        currentRevenue = revenue;
        currentNwc = nwc;
      }

      const sumPvFcff = years.reduce((sum, y) => sum + y.pvOfFcff, 0);
      const terminalYearFcff = years[years.length - 1].fcff * (1 + proj.terminalGrowthRate / 100);
      const terminalValue = terminalYearFcff / (calculatedWacc - proj.terminalGrowthRate / 100);
      const pvOfTerminalValue = terminalValue / Math.pow(1 + calculatedWacc, 5);

      const enterpriseValue = sumPvFcff + pvOfTerminalValue;
      
      const { cashAndEquivalents, nonOperatingAssets, totalDebt, underfundedSeverance, unpaidWages, contingentLiabilities } = state.valueAdjustments;
      const totalAdjustments = cashAndEquivalents + nonOperatingAssets - totalDebt - underfundedSeverance - unpaidWages - contingentLiabilities;
      const equityValue = enterpriseValue + totalAdjustments;

      return {
        calculatedWacc,
        years,
        sumPvFcff,
        terminalValue,
        pvOfTerminalValue,
        enterpriseValue,
        equityValue,
        totalAdjustments
      };
    };

    return {
      current: calculateForScenario(state.scenario),
      all: {
        '기술집약': calculateForScenario('기술집약'),
        '노동집약': calculateForScenario('노동집약'),
        '단순노무서비스': calculateForScenario('단순노무서비스'),
      }
    };
  }, [state]);

  return {
    state,
    updateGeneralInfo,
    updateIndustryMultiples,
    updateValueAdjustments,
    updateHistoricalYear,
    updateProjection,
    updateWacc,
    resetWaccToDefault,
    setScenario,
    applyHistoricalAverages,
    calculatedResults
  };
}
