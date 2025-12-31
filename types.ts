
export interface TripData {
  distance: number;
  consumption: number;
  price: number;
}

export interface CalculationResult {
  totalCost: number;
  totalLiters: number;
  costPerKm: number;
}

export interface AiInsight {
  tip: string;
  impact: 'low' | 'medium' | 'high';
  title: string;
}

export type HelperType = 'distance' | 'consumption' | 'price';
