import { PriceData, TradingSignal } from '../types/trading';

// Deep Value Trading Strategy
export function analyzeDeepValue(
  priceData: PriceData[],
  lookbackPeriods: number = 12 // 1 hour in 5-min candles
): TradingSignal | null {
  if (priceData.length < lookbackPeriods) return null;
  
  const currentCandle = priceData[priceData.length - 1];
  const previousCandle = priceData[priceData.length - 2];
  
  // Check for significant drop
  const recentLow = Math.min(...priceData.slice(-lookbackPeriods).map(d => d.low));
  const significantDrop = (currentCandle.high - recentLow) / currentCandle.high > 0.005; // 0.5% drop
  
  // Check for recovery candle
  const recoveryStrength = (currentCandle.close - currentCandle.low) / (currentCandle.high - currentCandle.low);
  
  if (significantDrop && recoveryStrength > 0.7) {
    const stopLoss = Math.floor(recentLow * 100) / 100;
    const entry = currentCandle.close;
    const risk = entry - stopLoss;
    
    return {
      type: 'ENTRY',
      strategy: 'DEEP_VALUE',
      price: entry,
      stopLoss,
      takeProfit1: entry + risk, // 1:1
      takeProfit2: entry + risk * 1.5, // 1:1.5
      timestamp: currentCandle.timestamp,
      reason: 'Significant drop with strong recovery candle detected'
    };
  }
  
  return null;
}

// Monthly Income (Breakout) Strategy
export function analyzeBreakout(
  priceData: PriceData[],
  lookbackPeriods: number = 24 // 2 hours in 5-min candles
): TradingSignal | null {
  if (priceData.length < lookbackPeriods) return null;
  
  const currentCandle = priceData[priceData.length - 1];
  const previousCandles = priceData.slice(-lookbackPeriods, -1);
  
  // Find recent resistance level
  const recentHigh = Math.max(...previousCandles.map(d => d.high));
  
  // Check for breakout
  const breakoutStrength = (currentCandle.close - recentHigh) / recentHigh;
  const isStrongBreakout = breakoutStrength > 0.001 && // 0.1% breakout
                          currentCandle.close > currentCandle.open && // Bullish candle
                          currentCandle.volume > previousCandles[previousCandles.length - 1].volume; // Higher volume
  
  if (isStrongBreakout) {
    const entry = currentCandle.close;
    const stopLoss = Math.min(currentCandle.low, recentHigh);
    const risk = entry - stopLoss;
    
    return {
      type: 'ENTRY',
      strategy: 'MONTHLY_INCOME',
      price: entry,
      stopLoss,
      takeProfit1: entry + risk, // 1:1
      takeProfit2: entry + risk * 2, // 1:2
      timestamp: currentCandle.timestamp,
      reason: 'Strong breakout with volume confirmation'
    };
  }
  
  return null;
}

// Reversal Trading Strategy
export function analyzeReversal(
  priceData: PriceData[],
  lookbackPeriods: number = 12 // 1 hour in 5-min candles
): TradingSignal | null {
  if (priceData.length < lookbackPeriods) return null;
  
  const currentCandle = priceData[priceData.length - 1];
  const previousCandles = priceData.slice(-lookbackPeriods, -1);
  
  // Find recent swing high
  const recentHigh = Math.max(...previousCandles.map(d => d.high));
  
  // Check for failed breakout and reversal
  const falseBreakout = previousCandles[previousCandles.length - 1].high > recentHigh &&
                       currentCandle.close < previousCandles[previousCandles.length - 1].low;
  
  const reversalStrength = (previousCandles[previousCandles.length - 1].high - currentCandle.close) /
                          previousCandles[previousCandles.length - 1].high;
  
  if (falseBreakout && reversalStrength > 0.001) { // 0.1% reversal
    const entry = currentCandle.close;
    const stopLoss = Math.max(currentCandle.high, previousCandles[previousCandles.length - 1].high);
    const risk = stopLoss - entry;
    
    return {
      type: 'ENTRY',
      strategy: 'REVERSAL',
      price: entry,
      stopLoss,
      takeProfit1: entry - risk, // 1:1
      takeProfit2: entry - risk * 2, // 1:2
      timestamp: currentCandle.timestamp,
      reason: 'Failed breakout with strong reversal'
    };
  }
  
  return null;
}