export interface GeneralInfo {
  companyName: string;
  industry: string;
  valuationDate: string;
  currency: string;
  year0Ppe: number;
}

export interface IndustryMultiples {
  evEbitda: [number, number];
  pe: [number, number];
}

export interface ValueAdjustments {
  cashAndEquivalents: number;
  nonOperatingAssets: number;
  totalDebt: number;
  underfundedSeverance: number;
  unpaidWages: number;
  contingentLiabilities: number;
}

export interface HistoricalYear {
  year: number;
  revenue: number;
  cogs: number;
  sga: number;
  da: number;
  taxes: number;
  currentAssets: number;
  cash: number;
  currentLiabilities: number;
  shortTermDebt: number;
  totalDebt: number;
  totalEquity: number;
  ppe: number;
}

export interface ProjectionAssumptions {
  revenueGrowthRate: number; // %
  operatingMargin: number; // % (EBIT Margin)
  daPercentOfRevenue: number; // %
  capexPercentOfRevenue: number; // %
  nwcPercentOfRevenue: number; // %
  terminalGrowthRate: number; // %
  taxRate: number; // %
}

export interface WaccAssumptions {
  riskFreeRate: number; // %
  beta: number;
  marketRiskPremium: number; // %
  costOfDebt: number; // %
  debtToEquityRatio: number; // %
}

export interface ValuationState {
  generalInfo: GeneralInfo;
  industryMultiples: IndustryMultiples;
  valueAdjustments: ValueAdjustments;
  historicalData: HistoricalYear[];
  projections: ProjectionAssumptions;
  wacc: WaccAssumptions;
}

export interface CalculatedYear {
  year: number;
  revenue: number;
  ebit: number;
  taxes: number;
  nopat: number;
  da: number;
  capex: number;
  nwc: number;
  changeInNwc: number;
  fcff: number;
  pvOfFcff: number;
}
