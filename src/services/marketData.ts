import { restClient } from '@polygon.io/client-js';
import { format } from 'date-fns';
import { PriceData } from '../types/trading';

const POLYGON_API_KEY = import.meta.env.VITE_POLYGON_API_KEY;
const rest = restClient(POLYGON_API_KEY);

export class MarketDataService {
  private static instance: MarketDataService;
  private subscribers: ((data: PriceData) => void)[] = [];
  private pollingInterval: number | null = null;
  
  private constructor() {
    this.startPolling();
  }

  static getInstance(): MarketDataService {
    if (!this.instance) {
      this.instance = new MarketDataService();
    }
    return this.instance;
  }

  private async startPolling() {
    // Poll every 5 seconds for new data
    this.pollingInterval = window.setInterval(async () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      try {
        const response = await rest.forex.aggregates(
          'XAU',
          'USD',
          1, // 1-minute intervals for more granular updates
          format(fiveMinutesAgo, 'yyyy-MM-dd'),
          format(now, 'yyyy-MM-dd'),
          { limit: 5 }
        );

        if (response.results && response.results.length > 0) {
          const latestBar = response.results[response.results.length - 1];
          const priceData: PriceData = {
            timestamp: latestBar.t,
            open: latestBar.o,
            high: latestBar.h,
            low: latestBar.l,
            close: latestBar.c,
            volume: latestBar.v
          };
          
          this.notifySubscribers(priceData);
        }
      } catch (error) {
        console.error('Error polling data:', error);
      }
    }, 5000);
  }

  async getHistoricalData(from: Date, to: Date): Promise<PriceData[]> {
    try {
      const response = await rest.forex.aggregates(
        'XAU',
        'USD',
        5, // 5-minute intervals
        format(from, 'yyyy-MM-dd'),
        format(to, 'yyyy-MM-dd'),
        { limit: 50000 }
      );

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
