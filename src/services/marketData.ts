import { restClient, websocket } from '@polygon.io/client-js';
import { format } from 'date-fns';
import { PriceData } from '../types/trading';

const POLYGON_API_KEY = import.meta.env.VITE_POLYGON_API_KEY;
const rest = restClient(POLYGON_API_KEY);
const ws = websocket.stocks(POLYGON_API_KEY);

export class MarketDataService {
  private static instance: MarketDataService;
  private subscribers: ((data: PriceData) => void)[] = [];
  
  private constructor() {
    this.initializeWebSocket();
  }

  static getInstance(): MarketDataService {
    if (!this.instance) {
      this.instance = new MarketDataService();
    }
    return this.instance;
  }

  private initializeWebSocket() {
    ws.subscribe('XAU/USD');
    
    ws.on('message', (data: any) => {
      if (data.ev === 'A') { // Aggregate event
        const priceData: PriceData = {
          timestamp: data.t,
          open: data.o,
          high: data.h,
          low: data.l,
          close: data.c,
          volume: data.v
        };
        
        this.notifySubscribers(priceData);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
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
    ws.disconnect();
  }
}