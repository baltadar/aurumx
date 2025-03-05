import { restClient } from '@polygon.io/client-js';
import { format } from 'date-fns';
import { PriceData } from '../types/trading';

const POLYGON_API_KEY = import.meta.env.VITE_POLYGON_API_KEY;
if (!POLYGON_API_KEY) {
  throw new Error('Polygon.io API key is required. Please set VITE_POLYGON_API_KEY in your .env file.');
}

const rest = restClient(POLYGON_API_KEY);

export class MarketDataService {
  private static instance: MarketDataService;
  private subscribers: ((data: PriceData) => void)[] = [];
  private pollingInterval: number | null = null;
  private lastKnownPrice: PriceData | null = null;
  
  private constructor() {
    this.initializeLastPrice().then(() => this.startPolling());
  }

  static getInstance(): MarketDataService {
    if (!this.instance) {
      this.instance = new MarketDataService();
    }
    return this.instance;
  }

  private async initializeLastPrice() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    try {
      const response = await rest.forex.aggregates(
        'C:XAUUSD', // Correct ticker for Gold/USD
        1, // Multiplier
        'minute', // Timespan
        format(oneDayAgo, 'yyyy-MM-dd'),
        format(now, 'yyyy-MM-dd'),
        { limit: 1, sort: 'desc' }
      );

      if (response.results && response.results.length > 0) {
        const latestBar = response.results[0];
        this.lastKnownPrice = {
          timestamp: latestBar.t,
          open: latestBar.o,
          high: latestBar.h,
          low: latestBar.l,
          close: latestBar.c,
          volume: latestBar.v
        };
        this.notifySubscribers(this.lastKnownPrice);
      }
    } catch (error) {
      console.error('Error initializing last price:', error);
    }
  }

  private async startPolling() {
    // Poll every 5 seconds for new data
    this.pollingInterval = window.setInterval(async () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      try {
        const response = await rest.forex.aggregates(
          'C:XAUUSD', // Correct ticker for Gold/USD
          1, // Multiplier
          'minute', // Timespan
          format(fiveMinutesAgo, 'yyyy-MM-dd'),
          format(now, 'yyyy-MM-dd'),
          { limit: 1, sort: 'desc' }
        );

        if (response.results && response.results.length > 0) {
          const latestBar = response.results[0];
          const priceData: PriceData = {
            timestamp: latestBar.t,
            open: latestBar.o,
            high: latestBar.h,
            low: latestBar.l,
            close: latestBar.c,
            volume: latestBar.v
          };
          
          // Only notify if we have new data
          if (!this.lastKnownPrice || this.lastKnownPrice.timestamp !== priceData.timestamp) {
            this.lastKnownPrice = priceData;
            this.notifySubscribers(priceData);
          }
        }
      } catch (error) {
        console.error('Error polling data:', error);
      }
    }, 5000);
  }

  async getHistoricalData(from: Date, to: Date): Promise<PriceData[]> {
    try {
      const response = await rest.forex.aggregates(
        'C:XAUUSD', // Correct ticker for Gold/USD
        5, // 5-minute intervals
        'minute', // Timespan
        format(from, 'yyyy-MM-dd'),
        format(to, 'yyyy-MM-dd'),
        { limit: 50000, sort: 'desc' }
      );

      if (!response.results) {
        console.error('No results from Polygon API');
        return [];
      }

      return response.results.map(bar => ({
        timestamp: bar.t,
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v
      }));
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  }

  subscribe(callback: (data: PriceData) => void) {
    this.subscribers.push(callback);
    // If we have a last known price, immediately send it to the new subscriber
    if (this.lastKnownPrice) {
      callback(this.lastKnownPrice);
    }
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notifySubscribers(data: PriceData) {
    this.subscribers.forEach(callback => callback(data));
  }

  disconnect() {
    if (this.pollingInterval !== null) {
      window.clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
