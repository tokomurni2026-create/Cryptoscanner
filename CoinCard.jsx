import React from 'react';

const CoinCard = ({ analysis }) => {
  const openTradingView = () => {
    const url = `https://www.tradingview.com/chart/?symbol=BINANCE:${analysis.symbol}`;
    window.open(url, '_blank');
  };

  const openBinance = () => {
    const url = `https://www.binance.com/en/futures/${analysis.symbol}`;
    window.open(url, '_blank');
  };

  const openCustomChart = () => {
    // This would open a custom chart component with the analysis data
    console.log('Opening custom chart for', analysis.symbol);
  };

  return (
    <div className="coin-card">
      <div className="coin-header">
        <div className="coin-symbol">{analysis.symbol}</div>
        <div className={`signal-badge signal-${analysis.signal}`}>
          {analysis.signal} {analysis.confidence}%
        </div>
      </div>

      <div className="pattern-info">
        <div className="pattern-name">
          {analysis.patterns[0]?.name || 'Multiple Patterns'}
        </div>
        <div className="pattern-description">
          Elliott Wave: {analysis.elliottWave?.currentWave || 'N/A'} | 
          SMC Bias: {analysis.smartMoney?.bias || 'Neutral'}
        </div>
      </div>

      <div className="trading-levels">
        <div className="level-item level-entry">
          <div className="level-label">Entry</div>
          <div className="level-value">{analysis.levels.entry}</div>
        </div>
        <div className="level-item level-sl">
          <div className="level-label">Stop Loss</div>
          <div className="level-value">{analysis.levels.stopLoss}</div>
        </div>
        <div className="level-item level-tp">
          <div className="level-label">Take Profit</div>
          <div className="level-value">{analysis.levels.takeProfit1}</div>
        </div>
      </div>

      <div className="trading-levels">
        <div className="level-item level-tp">
          <div className="level-label">TP2</div>
          <div className="level-value">{analysis.levels.takeProfit2}</div>
        </div>
        <div className="level-item level-tp">
          <div className="level-label">TP3</div>
          <div className="level-value">{analysis.levels.takeProfit3}</div>
        </div>
        <div className="level-item">
          <div className="level-label">R:R</div>
          <div className="level-value">1:{analysis.levels.riskReward}</div>
        </div>
      </div>

      <div className="chart-actions">
        <button className="btn btn-secondary btn-chart" onClick={openTradingView}>
          📈 TradingView
        </button>
        <button className="btn btn-secondary btn-chart" onClick={openBinance}>
          🟡 Binance
        </button>
        <button className="btn btn-secondary btn-chart" onClick={openCustomChart}>
          📊 Custom Chart
        </button>
      </div>

      <div className="analysis-reason">
        <div className="reason-title">Analysis Reason</div>
        <div className="reason-text">{analysis.reason}</div>
      </div>
    </div>
  );
};

export default CoinCard;
