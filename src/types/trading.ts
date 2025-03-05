export interface PriceData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradingSignal {
  type: 'ENTRY' | 'EXIT';
  strategy: 'DEEP_VALUE' | 'MONTHLY_INCOME' | 'REVERSAL';
  price: number;
  stopLoss: number;
  takeProfit1: number; // 1:1 Risk:Reward
  takeProfit2: number; // Higher Risk:Reward
  timestamp: number;
  reason: string;
}