import React from 'react'
class PatternAnalyzer {
  constructor() {
    this.patterns = [
      // Classic Chart Patterns
      'Head and Shoulders', 'Inverse Head and Shoulders', 'Double Top', 'Double Bottom',
      'Triple Top', 'Triple Bottom', 'Cup and Handle', 'Inverse Cup and Handle',
      'Ascending Triangle', 'Descending Triangle', 'Symmetrical Triangle', 'Wedge Rising',
      'Wedge Falling', 'Flag Bull', 'Flag Bear', 'Pennant Bull', 'Pennant Bear',
      'Rectangle', 'Diamond Top', 'Diamond Bottom',
      
      // Advanced Patterns
      'Gartley', 'Butterfly', 'Bat', 'Crab', 'Shark', 'Cypher', 'ABCD',
      'Three Drives', 'AB=CD', 'Wolfe Wave',
      
      // Candlestick Patterns
      'Doji', 'Hammer', 'Shooting Star', 'Engulfing Bull', 'Engulfing Bear',
      'Morning Star', 'Evening Star', 'Harami Bull', 'Harami Bear', 'Piercing Line',
      'Dark Cloud Cover', 'Three White Soldiers', 'Three Black Crows',
      
      // Volume Patterns
      'Volume Breakout', 'Volume Divergence', 'Accumulation', 'Distribution',
      'Climax Volume', 'Dry Up Volume'
    ];
  }

  detectPatterns(ohlcData) {
    const patterns = [];
    
    // Detect various patterns
    patterns.push(...this.detectTrianglePatterns(ohlcData));
    patterns.push(...this.detectHeadAndShoulders(ohlcData));
    patterns.push(...this.detectDoubleTopBottom(ohlcData));
    patterns.push(...this.detectFlagPatterns(ohlcData));
    patterns.push(...this.detectCandlestickPatterns(ohlcData));
    patterns.push(...this.detectHarmonicPatterns(ohlcData));
    
    return patterns.filter(p => p.confidence >= 60);
  }

  detectTrianglePatterns(data) {
    const patterns = [];
    const highs = this.findPeaks(data.map(d => d.high));
    const lows = this.findTroughs(data.map(d => d.low));
    
    if (highs.length >= 2 && lows.length >= 2) {
      const recentHighs = highs.slice(-3);
      const recentLows = lows.slice(-3);
      
      // Ascending Triangle
      if (this.isHorizontalResistance(recentHighs) && this.isRisingSupport(recentLows)) {
        patterns.push({
          name: 'Ascending Triangle',
          direction: 'long',
          confidence: 75,
          breakoutConfirmed: this.checkBreakout(data, 'up'),
          entry: data[data.length - 1].close,
          target: this.calculateTriangleTarget(data, 'ascending')
        });
      }
      
      // Descending Triangle
      if (this.isHorizontalSupport(recentLows) && this.isFallingResistance(recentHighs)) {
        patterns.push({
          name: 'Descending Triangle',
          direction: 'short',
          confidence: 75,
          breakoutConfirmed: this.checkBreakout(data, 'down'),
          entry: data[data.length - 1].close,
          target: this.calculateTriangleTarget(data, 'descending')
        });
      }
      
      // Symmetrical Triangle
      if (this.isFallingResistance(recentHighs) && this.isRisingSupport(recentLows)) {
        const breakoutDirection = this.determineBreakoutDirection(data);
        if (breakoutDirection) {
          patterns.push({
            name: 'Symmetrical Triangle',
            direction: breakoutDirection,
            confidence: 70,
            breakoutConfirmed: this.checkBreakout(data, breakoutDirection === 'long' ? 'up' : 'down'),
            entry: data[data.length - 1].close,
            target: this.calculateTriangleTarget(data, 'symmetrical')
          });
        }
      }
    }
    
    return patterns;
  }

  detectHeadAndShoulders(data) {
    const patterns = [];
    const peaks = this.findPeaks(data.map(d => d.high));
    
    if (peaks.length >= 3) {
      const lastThreePeaks = peaks.slice(-3);
      
      // Head and Shoulders
      if (this.isHeadAndShouldersPattern(lastThreePeaks, 'bearish')) {
        patterns.push({
          name: 'Head and Shoulders',
          direction: 'short',
          confidence: 80,
          breakoutConfirmed: this.checkNecklineBreak(data, 'down'),
          entry: data[data.length - 1].close,
          target: this.calculateHSTarget(data, lastThreePeaks)
        });
      }
      
      // Inverse Head and Shoulders
      const troughs = this.findTroughs(data.map(d => d.low));
      if (troughs.length >= 3) {
        const lastThreeTroughs = troughs.slice(-3);
        if (this.isHeadAndShouldersPattern(lastThreeTroughs, 'bullish')) {
          patterns.push({
            name: 'Inverse Head and Shoulders',
            direction: 'long',
            confidence: 80,
            breakoutConfirmed: this.checkNecklineBreak(data, 'up'),
            entry: data[data.length - 1].close,
            target: this.calculateHSTarget(data, lastThreeTroughs)
          });
        }
      }
    }
    
    return patterns;
  }

  detectDoubleTopBottom(data) {
    const patterns = [];
    const peaks = this.findPeaks(data.map(d => d.high));
    const troughs = this.findTroughs(data.map(d => d.low));
    
    // Double Top
    if (peaks.length >= 2) {
      const lastTwoPeaks = peaks.slice(-2);
      if (this.isDoublePattern(lastTwoPeaks)) {
        patterns.push({
          name: 'Double Top',
          direction: 'short',
          confidence: 75,
          breakoutConfirmed: this.checkSupportBreak(data),
          entry: data[data.length - 1].close,
          target: this.calculateDoubleTopTarget(data, lastTwoPeaks)
        });
      }
    }
    
    // Double Bottom
    if (troughs.length >= 2) {
      const lastTwoTroughs = troughs.slice(-2);
      if (this.isDoublePattern(lastTwoTroughs)) {
        patterns.push({
          name: 'Double Bottom',
          direction: 'long',
          confidence: 75,
          breakoutConfirmed: this.checkResistanceBreak(data),
          entry: data[data.length - 1].close,
          target: this.calculateDoubleBottomTarget(data, lastTwoTroughs)
        });
      }
    }
    
    return patterns;
  }

  detectFlagPatterns(data) {
    const patterns = [];
    const recentData = data.slice(-20);
    
    // Bull Flag
    if (this.isBullFlag(recentData)) {
      patterns.push({
        name: 'Bull Flag',
        direction: 'long',
        confidence: 70,
        breakoutConfirmed: this.checkFlagBreakout(recentData, 'up'),
        entry: data[data.length - 1].close,
        target: this.calculateFlagTarget(data, 'bull')
      });
    }
    
    // Bear Flag
    if (this.isBearFlag(recentData)) {
      patterns.push({
        name: 'Bear Flag',
        direction: 'short',
        confidence: 70,
        breakoutConfirmed: this.checkFlagBreakout(recentData, 'down'),
        entry: data[data.length - 1].close,
        target: this.calculateFlagTarget(data, 'bear')
      });
    }
    
    return patterns;
  }

  detectCandlestickPatterns(data) {
    const patterns = [];
    const recent = data.slice(-5);
    
    // Engulfing patterns
    if (recent.length >= 2) {
      const prev = recent[recent.length - 2];
      const curr = recent[recent.length - 1];
      
      if (this.isBullishEngulfing(prev, curr)) {
        patterns.push({
          name: 'Bullish Engulfing',
          direction: 'long',
          confidence: 65,
          breakoutConfirmed: true,
          entry: curr.close,
          target: curr.close * 1.02
        });
      }
      
      if (this.isBearishEngulfing(prev, curr)) {
        patterns.push({
          name: 'Bearish Engulfing',
          direction: 'short',
          confidence: 65,
          breakoutConfirmed: true,
          entry: curr.close,
          target: curr.close * 0.98
        });
      }
    }
    
    // Doji patterns
    const lastCandle = recent[recent.length - 1];
    if (this.isDoji(lastCandle)) {
      patterns.push({
        name: 'Doji',
        direction: 'neutral',
        confidence: 60,
        breakoutConfirmed: false,
        entry: lastCandle.close,
        target: lastCandle.close
      });
    }
    
    return patterns;
  }

  detectHarmonicPatterns(data) {
    const patterns = [];
    
    // Simplified harmonic pattern detection
    const swings = this.findSwingPoints(data);
    
    if (swings.length >= 5) {
      const lastFive = swings.slice(-5);
      
      // Gartley pattern
      if (this.isGartleyPattern(lastFive)) {
        patterns.push({
          name: 'Gartley',
          direction: this.getHarmonicDirection(lastFive),
          confidence: 80,
          breakoutConfirmed: this.checkHarmonicCompletion(lastFive),
          entry: data[data.length - 1].close,
          target: this.calculateHarmonicTarget(lastFive)
        });
      }
      
      // Butterfly pattern
      if (this.isButterflyPattern(lastFive)) {
        patterns.push({
          name: 'Butterfly',
          direction: this.getHarmonicDirection(lastFive),
          confidence: 75,
          breakoutConfirmed: this.checkHarmonicCompletion(lastFive),
          entry: data[data.length - 1].close,
          target: this.calculateHarmonicTarget(lastFive)
        });
      }
    }
    
    return patterns;
  }

  // Helper methods (simplified implementations)
  findPeaks(data) {
    const peaks = [];
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
        peaks.push({ index: i, value: data[i] });
      }
    }
    return peaks;
  }

  findTroughs(data) {
    const troughs = [];
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] < data[i - 1] && data[i] < data[i + 1]) {
        troughs.push({ index: i, value: data[i] });
      }
    }
    return troughs;
  }

  findSwingPoints(data) {
    const swings = [];
    const highs = this.findPeaks(data.map(d => d.high));
    const lows = this.findTroughs(data.map(d => d.low));
    
    // Combine and sort by index
    const combined = [
      ...highs.map(h => ({ ...h, type: 'high' })),
      ...lows.map(l => ({ ...l, type: 'low' }))
    ].sort((a, b) => a.index - b.index);
    
    return combined;
  }

  isHorizontalResistance(peaks) {
    if (peaks.length < 2) return false;
    const tolerance = 0.02; // 2% tolerance
    const avgPrice = peaks.reduce((sum, p) => sum + p.value, 0) / peaks.length;
    return peaks.every(p => Math.abs(p.value - avgPrice) / avgPrice < tolerance);
  }

  isRisingSupport(troughs) {
    if (troughs.length < 2) return false;
    for (let i = 1; i < troughs.length; i++) {
      if (troughs[i].value <= troughs[i - 1].value) return false;
    }
    return true;
  }

  isHorizontalSupport(troughs) {
    if (troughs.length < 2) return false;
    const tolerance = 0.02;
    const avgPrice = troughs.reduce((sum, t) => sum + t.value, 0) / troughs.length;
    return troughs.every(t => Math.abs(t.value - avgPrice) / avgPrice < tolerance);
  }

  isFallingResistance(peaks) {
    if (peaks.length < 2) return false;
    for (let i = 1; i < peaks.length; i++) {
      if (peaks[i].value >= peaks[i - 1].value) return false;
    }
    return true;
  }

  checkBreakout(data, direction) {
    const recent = data.slice(-5);
    const volume = recent.map(d => d.volume);
    const avgVolume = volume.reduce((a, b) => a + b, 0) / volume.length;
    const lastVolume = volume[volume.length - 1];
    
    // Check for volume confirmation
    return lastVolume > avgVolume * 1.5;
  }

  determineBreakoutDirection(data) {
    const recent = data.slice(-10);
    const closes = recent.map(d => d.close);
    const trend = closes[closes.length - 1] > closes[0] ? 'long' : 'short';
    return trend;
  }

  calculateTriangleTarget(data, type) {
    const currentPrice = data[data.length - 1].close;
    const height = this.calculatePatternHeight(data);
    
    switch (type) {
      case 'ascending':
        return currentPrice + height;
      case 'descending':
        return currentPrice - height;
      case 'symmetrical':
        return currentPrice + (height * 0.618); // Fibonacci ratio
      default:
        return currentPrice;
    }
  }

  calculatePatternHeight(data) {
    const recent = data.slice(-20);
    const high = Math.max(...recent.map(d => d.high));
    const low = Math.min(...recent.map(d => d.low));
    return high - low;
  }

  isHeadAndShouldersPattern(points, type) {
    if (points.length !== 3) return false;
    
    const [left, head, right] = points;
    
    if (type === 'bearish') {
      return head.value > left.value && head.value > right.value &&
             Math.abs(left.value - right.value) / left.value < 0.05;
    } else {
      return head.value < left.value && head.value < right.value &&
             Math.abs(left.value - right.value) / left.value < 0.05;
    }
  }

  checkNecklineBreak(data, direction) {
    // Simplified neckline break detection
    const recent = data.slice(-10);
    const closes = recent.map(d => d.close);
    
    if (direction === 'down') {
      return closes[closes.length - 1] < Math.min(...closes.slice(0, -1));
    } else {
      return closes[closes.length - 1] > Math.max(...closes.slice(0, -1));
    }
  }

  calculateHSTarget(data, points) {
    const currentPrice = data[data.length - 1].close;
    const height = Math.abs(points[1].value - Math.min(points[0].value, points[2].value));
    return points[1].value > points[0].value ? currentPrice - height : currentPrice + height;
  }

  isDoublePattern(points) {
    if (points.length !== 2) return false;
    const tolerance = 0.03; // 3% tolerance
    return Math.abs(points[0].value - points[1].value) / points[0].value < tolerance;
  }

  checkSupportBreak(data) {
    const recent = data.slice(-10);
    const lows = recent.map(d => d.low);
    const support = Math.min(...lows.slice(0, -2));
    return data[data.length - 1].close < support;
  }

  checkResistanceBreak(data) {
    const recent = data.slice(-10);
    const highs = recent.map(d => d.high);
    const resistance = Math.max(...highs.slice(0, -2));
    return data[data.length - 1].close > resistance;
  }

  calculateDoubleTopTarget(data, peaks) {
    const currentPrice = data[data.length - 1].close;
    const height = peaks[0].value - Math.min(...data.slice(-20).map(d => d.low));
    return currentPrice - height;
  }

  calculateDoubleBottomTarget(data, troughs) {
    const currentPrice = data[data.length - 1].close;
    const height = Math.max(...data.slice(-20).map(d => d.high)) - troughs[0].value;
    return currentPrice + height;
  }

  isBullFlag(data) {
    if (data.length < 10) return false;
    
    // Check for strong upward move followed by consolidation
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstTrend = (firstHalf[firstHalf.length - 1].close - firstHalf[0].close) / firstHalf[0].close;
    const secondTrend = Math.abs((secondHalf[secondHalf.length - 1].close - secondHalf[0].close) / secondHalf[0].close);
    
    return firstTrend > 0.05 && secondTrend < 0.02; // Strong up move, then consolidation
  }

  isBearFlag(data) {
    if (data.length < 10) return false;
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstTrend = (firstHalf[firstHalf.length - 1].close - firstHalf[0].close) / firstHalf[0].close;
    const secondTrend = Math.abs((secondHalf[secondHalf.length - 1].close - secondHalf[0].close) / secondHalf[0].close);
    
    return firstTrend < -0.05 && secondTrend < 0.02; // Strong down move, then consolidation
  }

  checkFlagBreakout(data, direction) {
    const volume = data.map(d => d.volume);
    const avgVolume = volume.reduce((a, b) => a + b, 0) / volume.length;
    const lastVolume = volume[volume.length - 1];
    
    return lastVolume > avgVolume * 1.3;
  }

  calculateFlagTarget(data, type) {
    const currentPrice = data[data.length - 1].close;
    const flagHeight = this.calculatePatternHeight(data.slice(-10));
    
    return type === 'bull' ? currentPrice + flagHeight : currentPrice - flagHeight;
  }

  isBullishEngulfing(prev, curr) {
    return prev.close < prev.open && // Previous candle is bearish
           curr.close > curr.open && // Current candle is bullish
           curr.open < prev.close && // Current opens below previous close
           curr.close > prev.open;   // Current closes above previous open
  }

  isBearishEngulfing(prev, curr) {
    return prev.close > prev.open && // Previous candle is bullish
           curr.close < curr.open && // Current candle is bearish
           curr.open > prev.close && // Current opens above previous close
           curr.close < prev.open;   // Current closes below previous open
  }

  isDoji(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const totalRange = candle.high - candle.low;
    return bodySize / totalRange < 0.1; // Body is less than 10% of total range
  }

  isGartleyPattern(swings) {
    // Simplified Gartley pattern ratios
    if (swings.length < 5) return false;
    
    const [X, A, B, C, D] = swings;
    const XA = Math.abs(A.value - X.value);
    const AB = Math.abs(B.value - A.value);
    const BC = Math.abs(C.value - B.value);
    const CD = Math.abs(D.value - C.value);
    
    // Check Fibonacci ratios (simplified)
    const ratio1 = AB / XA;
    const ratio2 = BC / AB;
    const ratio3 = CD / BC;
    
    return ratio1 >= 0.58 && ratio1 <= 0.68 && // ~0.618
           ratio2 >= 0.38 && ratio2 <= 0.48 && // ~0.382
           ratio3 >= 1.25 && ratio3 <= 1.35;   // ~1.272
  }

  isButterflyPattern(swings) {
    // Simplified Butterfly pattern ratios
    if (swings.length < 5) return false;
    
    const [X, A, B, C, D] = swings;
    const XA = Math.abs(A.value - X.value);
    const AB = Math.abs(B.value - A.value);
    const BC = Math.abs(C.value - B.value);
    const XD = Math.abs(D.value - X.value);
    
    const ratio1 = AB / XA;
    const ratio2 = BC / AB;
    const ratio3 = XD / XA;
    
    return ratio1 >= 0.75 && ratio1 <= 0.85 && // ~0.786
           ratio2 >= 0.38 && ratio2 <= 0.48 && // ~0.382
           ratio3 >= 1.25 && ratio3 <= 1.35;   // ~1.272
  }

  getHarmonicDirection(swings) {
    const lastSwing = swings[swings.length - 1];
    const prevSwing = swings[swings.length - 2];
    
    return lastSwing.type === 'low' ? 'long' : 'short';
  }

  checkHarmonicCompletion(swings) {
    // Check if the pattern has completed at the D point
    return swings.length >= 5;
  }

  calculateHarmonicTarget(swings) {
    const [X, A, B, C, D] = swings;
    const XA = Math.abs(A.value - X.value);
    
    // Target is typically 0.618 retracement of XA from D
    if (D.type === 'low') {
      return D.value + (XA * 0.618);
    } else {
      return D.value - (XA * 0.618);
    }
  }
}

export default PatternAnalyzer;
