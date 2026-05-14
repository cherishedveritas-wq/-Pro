import { useState, useMemo } from 'react';
import { ValuationState, CalculatedYear } from './types';

const currentYear = new Date().getFullYear();

export const calculateHistoricalAverages = (hd: ValuationState['historicalData'], year0Ppe: number) => {
  if (hd.length < 2) return { revenueGrowthRate: 2.9, operatingMargin: 15, daPercentOfRevenue: 5, capexPercentOfRevenue: 10, nwcPercentOfRevenue: 12, taxRate: 20.9, terminalGrowthRate: 2 };
  
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
  
  if (avgCapexPercent < 0) {
    avgCapexPercent = avgDaPercent;
  }
  
  if (avgNwcPercent < 0) {
    avgNwcPercent = 0;
  }

  const recentYear = hd[hd.length - 1];
  const recentEbit = recentYear.revenue - recentYear.cogs - recentYear.sga;
  let calculatedTaxRate = 20.9;

  if (recentEbit > 0) {
    let normalizedEbit = recentEbit;
    if (recentYear.revenue > 0) {
      if (recentYear.revenue < 100_000) {
        normalizedEbit = recentEbit * 1_000_000;
      } else if (recentYear.revenue < 100_000_000) {
        normalizedEbit = recentEbit * 1_000;
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
    
    const localTax = taxAmount * 0.1;
    calculatedTaxRate = ((taxAmount + localTax) / normalizedEbit) * 100;
  }
  
  return {
    revenueGrowthRate: Number(projectedRevenueGrowthRate.toFixed(2)),
    operatingMargin: Number((sumOpMargin / divisor).toFixed(2)),
    daPercentOfRevenue: Number(avgDaPercent.toFixed(2)),
    capexPercentOfRevenue: Number(avgCapexPercent.toFixed(2)),
    nwcPercentOfRevenue: Number(avgNwcPercent.toFixed(2)),
    taxRate: Number(calculatedTaxRate.toFixed(2)),
    terminalGrowthRate: 2,
  };
};

const initialHistoricalData = [
  { year: currentYear - 3, revenue: 0, cogs: 0, sga: 0, da: 0, taxes: 0, currentAssets: 0, cash: 0, currentLiabilities: 0, shortTermDebt: 0, totalDebt: 0, totalEquity: 0, ppe: 0 },
  { year: currentYear - 2, revenue: 0, cogs: 0, sga: 0, da: 0, taxes: 0, currentAssets: 0, cash: 0, currentLiabilities: 0, shortTermDebt: 0, totalDebt: 0, totalEquity: 0, ppe: 0 },
  { year: currentYear - 1, revenue: 0, cogs: 0, sga: 0, da: 0, taxes: 0, currentAssets: 0, cash: 0, currentLiabilities: 0, shortTermDebt: 0, totalDebt: 0, totalEquity: 0, ppe: 0 },
];

const baseAverages = calculateHistoricalAverages(initialHistoricalData, 0);

const initialState: ValuationState = {
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
  projections: { ...baseAverages },
  wacc: { riskFreeRate: 3, beta: 1.0, marketRiskPremium: 5, costOfDebt: 4, debtToEquityRatio: 40 },
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

  const updateAllHistoricalData = (data: ValuationState['historicalData']) => {
    setState(s => ({ ...s, historicalData: data }));
  };

  const updateProjection = (key: keyof ValuationState['projections'], value: number) => {
    setState(s => ({
      ...s,
      projections: { ...s.projections, [key]: value }
    }));
  };

  const updateWacc = (key: keyof ValuationState['wacc'], value: number) => {
    setState(s => ({
      ...s,
      wacc: { ...s.wacc, [key]: value }
    }));
  };

  const resetWaccToDefault = () => {
    setState(s => ({
      ...s,
      wacc: initialState.wacc
    }));
  };

  const applyHistoricalAverages = () => {
    const avgs = calculateHistoricalAverages(state.historicalData, state.generalInfo.year0Ppe);
    setState(s => ({
      ...s,
      projections: { ...s.projections, ...avgs }
    }));
  };

  const calculatedResults = useMemo(() => {
    const proj = state.projections;
    const w = state.wacc;

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
      current: {
        calculatedWacc,
        years,
        sumPvFcff,
        terminalValue,
        pvOfTerminalValue,
        enterpriseValue,
        equityValue,
        totalAdjustments
      }
    };
  }, [state]);

  return {
    state,
    updateGeneralInfo,
    updateIndustryMultiples,
    updateValueAdjustments,
    updateHistoricalYear,
    updateAllHistoricalData,
    updateProjection,
    updateWacc,
    resetWaccToDefault,
    applyHistoricalAverages,
    calculatedResults
  };
}
