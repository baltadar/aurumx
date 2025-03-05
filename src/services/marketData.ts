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
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  private constructor() {
    this.initializeLastPrice()
      .then(() => this.startPolling())
      .catch(error => {
        console.error('Failed to initialize market data service:', error);
        this.scheduleRetry();
      });
  }

  static getInstance(): MarketDataService {
    if (!this.instance) {
      this.instance = new MarketDataService();
    }
    return this.instance;
  }

  private scheduleRetry() {
    if (this.retryCount < this.MAX_RETRIES) {
      this.retryCount++;
      setTimeout(() => {
        this.initializeLastPrice()
          .then(() => this.startPolling())
          .catch(error => {
            console.error(`Retry ${this.retryCount} failed:`, error);
            this.scheduleRetry();
          });
      }, this.RETRY_DELAY * this.retryCount);
    } else {
      console.error('Max retries reached. Unable to initialize market data service.');
    }
  }

  private async initializeLastPrice() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const response = await rest.forex.aggregates(
      'C:XAUUSD', 
      1, 
      'minute', 
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
  }

  private async startPolling() {
    // Reduce polling frequency to avoid rate limits
    this.pollingInterval = window.setInterval(async () => {
      try {
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        
        const response = await rest.forex.aggregates(
          'C:XAUUSD', 
          1, 
          'minute', 
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
          
          if (!this.lastKnownPrice || this.lastKnownPrice.timestamp !== priceData.timestamp) {
            this.lastKnownPrice = priceData;
            this.notifySubscribers(priceData);
          }
        }
      } catch (error) {
        console.error('Error polling data:', error);
        this.scheduleRetry();
      }
    }, 15000); // Increased to 15 seconds to reduce API calls
  }

  // Rest of the methods remain the same...
}
