import { restClient } from '@polygon.io/client-js';
import { format } from 'date-fns';
import { PriceData } from '../types/trading';

const POLYGON_API_KEY = import.meta.env.VITE_POLYGON_API_KEY;
if (!POLYGON_API_KEY) {
  throw new Error('Polygon.io API key is required');
}

export class MarketDataService {
  private static instance: MarketDataService;
  private rest = restClient(POLYGON_API_KEY);
  private subscribers: ((data: PriceData) => void)[] = [];
  private pollingInterval: number | null = null;
  private lastKnownPrice: PriceData | null = null;

  private readonly POLLING_INTERVAL = 30000; // 30 seconds
  private readonly RETRY_INTERVALS = [5000, 10000, 30000]; // Exponential backoff

  private constructor() {
    this.initializeDataStream();
  }

  static getInstance(): MarketDataService {
    return this.instance || (this.instance = new MarketDataService());
  }

  private async initializeDataStream(retryIndex = 0) {
    try {
      await this.fetchLatestPrice();
      this.startPolling();
    } catch (error) {
      console.error('Data stream initialization failed:', error);
      
      if (retryIndex < this.RETRY_INTERVALS.length) {
        setTimeout(() => {
          this.initializeDataStream(retryIndex + 1);
        }, this.RETRY_INTERVALS[retryIndex]);
      }
    }
  }

  private async fetchLatestPrice() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const response = await this.rest.forex.aggregates(
      'C:XAUUSD', 
      1, 
      'minute', 
      format(oneDayAgo, 'yyyy-MM-dd'),
      format(now, 'yyyy-MM-dd'),
      { limit: 1, sort: 'desc' }
    );

    if (response.results?.length) {
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
  }

  private startPolling() {
    this.stopPolling(); // Ensure no duplicate intervals
    this.pollingInterval = window.setInterval(async () => {
      try {
        await this.fetchLatestPrice();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, this.POLLING_INTERVAL);
  }

  private stopPolling() {
    if (this.pollingInterval) {
      window.clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private notifySubscribers(data: PriceData) {
    this.subscribers.forEach(callback => callback(data));
  }

  subscribe(callback: (data: PriceData) => void) {
    this.subscribers.push(callback);
    if (this.lastKnownPrice) {
      callback(this.lastKnownPrice);
    }
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  disconnect() {
    this.stopPolling();
    this.subscribers = [];
  }
}
