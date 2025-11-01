import React, { useState, useEffect, useRef } from 'react';
import PatternAnalyzer from './components/PatternAnalyzer';
import ElliottWaveAnalyzer from './components/ElliottWaveAnalyzer';
import SupportResistanceAnalyzer from './components/SupportResistanceAnalyzer';
import SmartMoneyAnalyzer from './components/SmartMoneyAnalyzer';
import TelegramService from './services/TelegramService';
import BinanceService from './services/BinanceService';
import CoinCard from './components/CoinCard';
import LogPanel from './components/LogPanel';

function App() {
  const [config, setConfig] = useState({
    apiType: 'public',
    apiKey: '',
    secretKey: '',
    telegramToken: '',
    chatId: '',
    maxCoins: 40,
    timeframe: '1h',
    enabledTimeframes: ['5m', '15m', '1h', '4h'],
    minConfidence: 75
  });

  const [scanning, setScanning] = useState(false);
  const [apiStatus, setApiStatus] = useState('disconnected');
  const [results, setResults] = useState([]);
  const [logs, setLogs] = useState([]);
  const logRef = useRef(null);

  const binanceService = new BinanceService(config.apiKey, config.secretKey, config.apiType);
  const telegramService = new TelegramService(config.telegramToken);
  const patternAnalyzer = new PatternAnalyzer();
  const elliottWaveAnalyzer = new ElliottWaveAnalyzer();
  const supportResistanceAnalyzer = new SupportResistanceAnalyzer();
  const smartMoneyAnalyzer = new SmartMoneyAnalyzer();

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = { timestamp, message, type };
    setLogs(prev => [newLog, ...prev.slice(0, 99)]);
  };

  const testApiConnection = async () => {
    try {
      addLog('Testing API connection...', 'info');
      const result = await binanceService.testConnection();
      if (result.success) {
        setApiStatus('connected');
        addLog('API connection successful', 'success');
      } else {
        setApiStatus('disconnected');
        addLog(`API connection failed: ${result.error}`, 'error');
      }
    } catch (error) {
      setApiStatus('disconnected');
      addLog(`API connection error: ${error.message}`, 'error');
    }
  };

  const startScanning = async () => {
    if (scanning) return;
    
    setScanning(true);
    setResults([]);
    addLog('Starting comprehensive pattern scan...', 'info');

    try {
      // Get top USDT pairs
      const symbols = await binanceService.getTopUSDTSymbols(config.maxCoins);
      addLog(`Found ${symbols.length} USDT pairs to analyze`, 'info');

      // Get BTC trend for market context
      const btcTrend = await analyzeBTCTrend();
      addLog(`BTC trend: ${btcTrend}`, 'info');

      const scanResults = [];

      for (let i = 0; i < symbols.length; i++) {
        if (!scanning) break;

        const symbol = symbols[i];
        addLog(`Analyzing ${symbol} (${i + 1}/${symbols.length})...`, 'info');

        try {
          const analysis = await analyzeSymbol(symbol, btcTrend);
          if (analysis && analysis.confidence >= config.minConfidence) {
            scanResults.push(analysis);
            addLog(`✓ Signal found for ${symbol}: ${analysis.signal} (${analysis.confidence}%)`, 'success');
            
            // Send to Telegram if configured
            if (config.telegramToken && config.chatId) {
              await sendTelegramSignal(analysis);
            }
          }
        } catch (error) {
          addLog(`Error analyzing ${symbol}: ${error.message}`, 'error');
        }

        // Update results progressively
        setResults([...scanResults]);
        
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      addLog(`Scan completed. Found ${scanResults.length} signals.`, 'success');
    } catch (error) {
      addLog(`Scan error: ${error.message}`, 'error');
    } finally {
      setScanning(false);
    }
  };

  const stopScanning = () => {
    setScanning(false);
    addLog('Scan stopped by user', 'info');
  };

  const analyzeBTCTrend = async () => {
    try {
      const klines = await binanceService.getKlines('BTCUSDT', config.timeframe, 100);
      const closes = klines.map(k => parseFloat(k[4]));
      
      // Simple trend analysis using EMAs
      const ema20 = calculateEMA(closes, 20);
      const ema50 = calculateEMA(closes, 50);
      
      if (ema20[ema20.length - 1] > ema50[ema50.length - 1]) {
        return 'bullish';
      } else if (ema20[ema20.length - 1] < ema50[ema50.length - 1]) {
        return 'bearish';
      }
      return 'neutral';
    } catch (error) {
      addLog(`Error analyzing BTC trend: ${error.message}`, 'error');
      return 'neutral';
    }
  };

  const analyzeSymbol = async (symbol, btcTrend) => {
    const klines = await binanceService.getKlines(symbol, config.timeframe, 500);
    const ohlcData = klines.map(k => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));

    // Multi-timeframe analysis
    const multiTfAnalysis = {};
    for (const tf of config.enabledTimeframes) {
      const tfKlines = await binanceService.getKlines(symbol, tf, 200);
      const tfData = tfKlines.map(k => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }));
      multiTfAnalysis[tf] = tfData;
    }

    // Pattern Analysis
    const patterns = patternAnalyzer.detectPatterns(ohlcData);
    const validPatterns = patterns.filter(p => p.confidence >= 70 && p.breakoutConfirmed);

    if (validPatterns.length === 0) return null;

    // Elliott Wave Analysis
    const elliottWave = elliottWaveAnalyzer.analyzeWave(ohlcData);
    if (!elliottWave.isValid) return null;

    // Support/Resistance Analysis
    const srLevels = supportResistanceAnalyzer.findLevels(ohlcData);
    
    // Smart Money Concepts
    const smcAnalysis = smartMoneyAnalyzer.analyze(ohlcData);

    // Determine signal direction based on BTC trend alignment
    const primaryPattern = validPatterns[0];
    let signal = primaryPattern.direction;
    
    // Filter signals based on BTC trend
    if (btcTrend === 'bearish' && signal === 'long') return null;
    if (btcTrend === 'bullish' && signal === 'short') return null;

    // Calculate entry, SL, TP levels
    const currentPrice = ohlcData[ohlcData.length - 1].close;
    const levels = calculateTradingLevels(currentPrice, signal, srLevels, smcAnalysis);

    // Calculate overall confidence
    const confidence = Math.min(95, Math.round(
      (primaryPattern.confidence * 0.4) +
      (elliottWave.confidence * 0.3) +
      (smcAnalysis.confidence * 0.3)
    ));

    return {
      symbol,
      signal,
      confidence,
      patterns: validPatterns,
      elliottWave,
      supportResistance: srLevels,
      smartMoney: smcAnalysis,
      levels,
      timeframe: config.timeframe,
      multiTimeframe: multiTfAnalysis,
      reason: generateAnalysisReason(primaryPattern, elliottWave, smcAnalysis, btcTrend)
    };
  };

  const calculateTradingLevels = (currentPrice, signal, srLevels, smcAnalysis) => {
    const atr = calculateATR(srLevels.ohlcData || [], 14);
    
    let entry, stopLoss, takeProfit1, takeProfit2, takeProfit3;

    if (signal === 'long') {
      entry = currentPrice;
      
      // Find nearest support for SL
      const supportBelow = srLevels.support.filter(s => s < currentPrice).sort((a, b) => b - a)[0];
      stopLoss = supportBelow ? Math.min(supportBelow * 0.995, currentPrice - atr) : currentPrice - atr;
      
      // Find resistance levels for TP
      const resistanceAbove = srLevels.resistance.filter(r => r > currentPrice).sort((a, b) => a - b);
      takeProfit1 = resistanceAbove[0] || currentPrice + (atr * 2);
      takeProfit2 = resistanceAbove[1] || currentPrice + (atr * 3);
      takeProfit3 = resistanceAbove[2] || currentPrice + (atr * 4);
    } else {
      entry = currentPrice;
      
      // Find nearest resistance for SL
      const resistanceAbove = srLevels.resistance.filter(r => r > currentPrice).sort((a, b) => a - b)[0];
      stopLoss = resistanceAbove ? Math.max(resistanceAbove * 1.005, currentPrice + atr) : currentPrice + atr;
      
      // Find support levels for TP
      const supportBelow = srLevels.support.filter(s => s < currentPrice).sort((a, b) => b - a);
      takeProfit1 = supportBelow[0] || currentPrice - (atr * 2);
      takeProfit2 = supportBelow[1] || currentPrice - (atr * 3);
      takeProfit3 = supportBelow[2] || currentPrice - (atr * 4);
    }

    return {
      entry: parseFloat(entry.toFixed(6)),
      stopLoss: parseFloat(stopLoss.toFixed(6)),
      takeProfit1: parseFloat(takeProfit1.toFixed(6)),
      takeProfit2: parseFloat(takeProfit2.toFixed(6)),
      takeProfit3: parseFloat(takeProfit3.toFixed(6)),
      riskReward: parseFloat(((Math.abs(takeProfit1 - entry)) / Math.abs(entry - stopLoss)).toFixed(2))
    };
  };

  const generateAnalysisReason = (pattern, elliottWave, smcAnalysis, btcTrend) => {
    let reason = `${pattern.name} pattern detected with ${pattern.confidence}% confidence. `;
    reason += `Elliott Wave analysis shows ${elliottWave.currentWave} wave formation. `;
    reason += `Smart Money Concepts indicate ${smcAnalysis.bias} bias. `;
    reason += `Market context: BTC trend is ${btcTrend}. `;
    reason += `Pattern breakout confirmed with volume confirmation.`;
    return reason;
  };

  const sendTelegramSignal = async (analysis) => {
    try {
      const message = formatTelegramMessage(analysis);
      await telegramService.sendMessage(config.chatId, message);
      addLog(`Signal sent to Telegram for ${analysis.symbol}`, 'success');
    } catch (error) {
      addLog(`Failed to send Telegram message: ${error.message}`, 'error');
    }
  };

  const formatTelegramMessage = (analysis) => {
    return `
🚨 *${analysis.signal.toUpperCase()} SIGNAL* 🚨

💰 *Symbol:* ${analysis.symbol}
📊 *Pattern:* ${analysis.patterns[0].name}
⚡ *Confidence:* ${analysis.confidence}%
📈 *Timeframe:* ${analysis.timeframe}

💵 *Entry:* ${analysis.levels.entry}
🛑 *Stop Loss:* ${analysis.levels.stopLoss}
🎯 *TP1:* ${analysis.levels.takeProfit1}
🎯 *TP2:* ${analysis.levels.takeProfit2}
🎯 *TP3:* ${analysis.levels.takeProfit3}
📊 *R:R:* 1:${analysis.levels.riskReward}

📝 *Analysis:* ${analysis.reason}

⏰ ${new Date().toLocaleString()}
    `.trim();
  };

  // Utility functions
  const calculateEMA = (data, period) => {
    const k = 2 / (period + 1);
    const ema = [data[0]];
    for (let i = 1; i < data.length; i++) {
      ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
  };

  const calculateATR = (ohlcData, period = 14) => {
    if (ohlcData.length < period) return 0;
    
    const trueRanges = [];
    for (let i = 1; i < ohlcData.length; i++) {
      const high = ohlcData[i].high;
      const low = ohlcData[i].low;
      const prevClose = ohlcData[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }
    
    return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Professional Crypto Pattern Scanner</h1>
        <p>Advanced pattern recognition with Elliott Wave analysis, Smart Money Concepts, and multi-timeframe confirmation</p>
      </header>

      <div className="controls-grid">
        <div className="control-card">
          <h3>API Configuration</h3>
          <div className="form-group">
            <label className="form-label">API Type</label>
            <select 
              className="form-select"
              value={config.apiType}
              onChange={(e) => setConfig(prev => ({ ...prev, apiType: e.target.value }))}
            >
              <option value="public">Public API</option>
              <option value="private">Private API</option>
            </select>
          </div>
          
          {config.apiType === 'private' && (
            <>
              <div className="form-group">
                <label className="form-label">API Key</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your Binance API Key"
                  value={config.apiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Secret Key</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter your Binance Secret Key"
                  value={config.secretKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, secretKey: e.target.value }))}
                />
              </div>
            </>
          )}
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={testApiConnection}>
              Test Connection
            </button>
            <div className={`status-indicator ${apiStatus === 'connected' ? 'status-connected' : 'status-disconnected'}`}>
              {apiStatus === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
          </div>
        </div>

        <div className="control-card">
          <h3>Telegram Notifications</h3>
          <div className="form-group">
            <label className="form-label">Bot Token</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter Telegram Bot Token"
              value={config.telegramToken}
              onChange={(e) => setConfig(prev => ({ ...prev, telegramToken: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Chat ID</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter Chat ID"
              value={config.chatId}
              onChange={(e) => setConfig(prev => ({ ...prev, chatId: e.target.value }))}
            />
          </div>
        </div>

        <div className="control-card">
          <h3>Scan Settings</h3>
          <div className="form-group">
            <label className="form-label">Max Coins to Scan</label>
            <input
              type="number"
              className="form-input"
              min="10"
              max="500"
              value={config.maxCoins}
              onChange={(e) => setConfig(prev => ({ ...prev, maxCoins: parseInt(e.target.value) }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Primary Timeframe</label>
            <select 
              className="form-select"
              value={config.timeframe}
              onChange={(e) => setConfig(prev => ({ ...prev, timeframe: e.target.value }))}
            >
              <option value="5m">5 minutes</option>
              <option value="15m">15 minutes</option>
              <option value="30m">30 minutes</option>
              <option value="1h">1 hour</option>
              <option value="2h">2 hours</option>
              <option value="4h">4 hours</option>
              <option value="6h">6 hours</option>
              <option value="12h">12 hours</option>
              <option value="1d">1 day</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Minimum Confidence (%)</label>
            <input
              type="number"
              className="form-input"
              min="50"
              max="95"
              value={config.minConfidence}
              onChange={(e) => setConfig(prev => ({ ...prev, minConfidence: parseInt(e.target.value) }))}
            />
          </div>
        </div>

        <div className="control-card">
          <h3>Multi-Timeframe Analysis</h3>
          <div className="form-group">
            <label className="form-label">Enable Timeframes</label>
            <div className="checkbox-group">
              {['5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d'].map(tf => (
                <label key={tf} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={config.enabledTimeframes.includes(tf)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setConfig(prev => ({ 
                          ...prev, 
                          enabledTimeframes: [...prev.enabledTimeframes, tf] 
                        }));
                      } else {
                        setConfig(prev => ({ 
                          ...prev, 
                          enabledTimeframes: prev.enabledTimeframes.filter(t => t !== tf) 
                        }));
                      }
                    }}
                  />
                  {tf}
                </label>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-primary" 
              onClick={startScanning}
              disabled={scanning || apiStatus !== 'connected'}
            >
              {scanning ? (
                <>
                  <div className="loading-spinner"></div>
                  Scanning...
                </>
              ) : (
                '🔍 Start Scan'
              )}
            </button>
            <button 
              className="btn btn-danger" 
              onClick={stopScanning}
              disabled={!scanning}
            >
              Stop Scan
            </button>
          </div>
        </div>
      </div>

      <div className="results-section">
        <div className="results-main">
          <h2 style={{ marginBottom: '20px', color: '#f1f5f9' }}>
            Scan Results ({results.length} signals found)
          </h2>
          
          {results.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-title">No signals found</div>
              <div className="empty-state-description">
                Start a scan to find trading opportunities based on advanced pattern analysis
              </div>
            </div>
          ) : (
            results.map((result, index) => (
              <CoinCard key={`${result.symbol}-${index}`} analysis={result} />
            ))
          )}
        </div>

        <div className="results-sidebar">
          <LogPanel logs={logs} />
          
          <div className="control-card">
            <h3>Pattern Statistics</h3>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>
              <div>Total Patterns: 40+ supported</div>
              <div>Elliott Wave: Advanced 5-wave analysis</div>
              <div>SMC: Order blocks, FVG, liquidity</div>
              <div>Multi-TF: Up to 9 timeframes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
