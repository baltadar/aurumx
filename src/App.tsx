import React, { useState, useEffect } from 'react';
import { TradingSignals } from './components/TradingSignals';
import { PriceData, TradingSignal } from './types/trading';
import { analyzeDeepValue, analyzeBreakout, analyzeReversal } from './utils/tradingStrategies';
import { MarketDataService } from './services/marketData';
import { Coins } from 'lucide-react';

function App() {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [signals, setSignals] = useState<TradingSignal[]>([]);

  useEffect(() => {
    const marketData = MarketDataService.getInstance();
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Load historical data
    marketData.getHistoricalData(twentyFourHoursAgo, now).then(historicalData => {
      setPriceData(historicalData);
    });

    // Subscribe to real-time updates
    const unsubscribe = marketData.subscribe(newData => {
      setPriceData(prev => {
        const updated = [...prev.slice(1), newData];
        
        // Analyze for new signals
        const newSignals: TradingSignal[] = [];
        
        const deepValueSignal = analyzeDeepValue(updated);
        if (deepValueSignal) newSignals.push(deepValueSignal);
        
        const breakoutSignal = analyzeBreakout(updated);
        if (breakoutSignal) newSignals.push(breakoutSignal);
        
        const reversalSignal = analyzeReversal(updated);
        if (reversalSignal) newSignals.push(reversalSignal);
        
        if (newSignals.length > 0) {
          setSignals(prev => [...newSignals, ...prev].slice(0, 5));
        }
        
        return updated;
      });
    });

    return () => {
      unsubscribe();
      marketData.disconnect();
    };
  }, []);

  const latestPrice = priceData[priceData.length - 1]?.close || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Coins className="w-8 h-8 text-yellow-500" />
            <h1 className="text-2xl font-bold">AurumX Algo</h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Gold Price (XAU/USD)</p>
            <p className="text-xl font-bold">${latestPrice.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Trading Signals</h2>
          <TradingSignals signals={signals} />
        </div>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">Deep Value Strategy</h3>
            <p className="text-sm text-gray-600">
              Buys gold after significant drops with strong recovery signals
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">Monthly Income Strategy</h3>
            <p className="text-sm text-gray-600">
              Trades breakouts with volume confirmation
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">Reversal Strategy</h3>
            <p className="text-sm text-gray-600">
              Identifies failed breakouts and potential reversals
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;