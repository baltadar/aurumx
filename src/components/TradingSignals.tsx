import React from 'react';
import { TradingSignal } from '../types/trading';
import { ArrowUpCircle, ArrowDownCircle, AlertTriangle } from 'lucide-react';

interface Props {
  signals: TradingSignal[];
}

export function TradingSignals({ signals }: Props) {
  return (
    <div className="space-y-4">
      {signals.map((signal, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg border ${
            signal.type === 'ENTRY'
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }`}
        >
          <div className="flex items-center gap-2">
            {signal.type === 'ENTRY' ? (
              <ArrowUpCircle className="w-6 h-6 text-green-600" />
            ) : (
              <ArrowDownCircle className="w-6 h-6 text-red-600" />
            )}
            <h3 className="text-lg font-semibold">
              {signal.strategy.replace('_', ' ')} Strategy
            </h3>
          </div>
          
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="font-medium">Entry Price:</span> ${signal.price.toFixed(2)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Stop Loss:</span> ${signal.stopLoss.toFixed(2)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Take Profit (1:1):</span> ${signal.takeProfit1.toFixed(2)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Take Profit (Extended):</span> ${signal.takeProfit2.toFixed(2)}
            </p>
            <p className="text-sm mt-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-gray-600">{signal.reason}</span>
            </p>
          </div>
        </div>
      ))}
      
      {signals.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No trading signals available at the moment
        </div>
      )}
    </div>
  );
}