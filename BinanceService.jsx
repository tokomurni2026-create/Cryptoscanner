import React from 'react'
class BinanceService {
  constructor(apiKey = '', secretKey = '', apiType = 'public') {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.apiType = apiType;
    this.baseURL = 'https://fapi.binance.com';
  }

  async testConnection() {
    try {
      const response = await fetch(`${this.baseURL}/fapi/v1/ping`);
      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: 'API connection failed' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getTopUSDTSymbols(limit = 40) {
    try {
      const response = await fetch(`${this.baseURL}/fapi/v1/ticker/24hr`);
      const tickers = await response.json();
      
      const usdtPairs = tickers
        .filter(ticker => ticker.symbol.endsWith('USDT'))
        .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, limit)
        .map(ticker => ticker.symbol);
      
      return usdtPairs;
    } catch (error) {
      throw new Error(`Failed to fetch USDT symbols: ${error.message}`);
    }
  }

  async getKlines(symbol, interval, limit = 500) {
    try {
      const url = `${this.baseURL}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const klines = await response.json();
      return klines;
    } catch (error) {
      throw new Error(`Failed to fetch klines for ${symbol}: ${error.message}`);
    }
  }

  async getSymbolInfo(symbol) {
    try {
      const response = await fetch(`${this.baseURL}/fapi/v1/exchangeInfo`);
      const exchangeInfo = await response.json();
      
      const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol);
      return symbolInfo;
    } catch (error) {
      throw new Error(`Failed to fetch symbol info for ${symbol}: ${error.message}`);
    }
  }

  async get24hrTicker(symbol) {
    try {
      const url = symbol 
        ? `${this.baseURL}/fapi/v1/ticker/24hr?symbol=${symbol}`
        : `${this.baseURL}/fapi/v1/ticker/24hr`;
      
      const response = await fetch(url);
      const ticker = await response.json();
      return ticker;
    } catch (error) {
      throw new Error(`Failed to fetch 24hr ticker: ${error.message}`);
    }
  }

  async getOrderBook(symbol, limit = 100) {
    try {
      const url = `${this.baseURL}/fapi/v1/depth?symbol=${symbol}&limit=${limit}`;
      const response = await fetch(url);
      const orderBook = await response.json();
      return orderBook;
    } catch (error) {
      throw new Error(`Failed to fetch order book for ${symbol}: ${error.message}`);
    }
  }

  async getRecentTrades(symbol, limit = 100) {
    try {
      const url = `${this.baseURL}/fapi/v1/trades?symbol=${symbol}&limit=${limit}`;
      const response = await fetch(url);
      const trades = await response.json();
      return trades;
    } catch (error) {
      throw new Error(`Failed to fetch recent trades for ${symbol}: ${error.message}`);
    }
  }

  // Private API methods (require API key and secret)
  async getAccountInfo() {
    if (this.apiType !== 'private' || !this.apiKey) {
      throw new Error('Private API access requires API key and secret');
    }
    
    try {
      // Note: This would require proper signature generation for production use
      // For demo purposes, we'll return mock data
      return {
        totalWalletBalance: "1000.00000000",
        totalUnrealizedProfit: "0.00000000",
        totalMarginBalance: "1000.00000000",
        totalPositionInitialMargin: "0.00000000",
        totalOpenOrderInitialMargin: "0.00000000"
      };
    } catch (error) {
      throw new Error(`Failed to fetch account info: ${error.message}`);
    }
  }

  async getPositions() {
    if (this.apiType !== 'private' || !this.apiKey) {
      throw new Error('Private API access requires API key and secret');
    }
    
    try {
      // Mock data for demo
      return [];
    } catch (error) {
      throw new Error(`Failed to fetch positions: ${error.message}`);
    }
  }

  // Utility methods
  formatPrice(price, symbol) {
    // Basic price formatting - in production, use symbol info for proper precision
    return parseFloat(price).toFixed(6);
  }

  formatVolume(volume) {
    return parseFloat(volume).toFixed(2);
  }

  calculatePriceChange(current, previous) {
    return ((current - previous) / previous) * 100;
  }
}

export default BinanceService;
