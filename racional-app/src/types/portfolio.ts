import type { Timestamp } from 'firebase/firestore';

export interface EvolutionPoint {
  date: Timestamp;
  portfolioValue: number;
  portfolioIndex: number;
  contributions: number;
  dailyReturn: number;
}

export interface PortfolioEvolutionDocument {
  array: EvolutionPoint[];
}

export interface ChartPoint {
  date: string;
  value: number;
}
