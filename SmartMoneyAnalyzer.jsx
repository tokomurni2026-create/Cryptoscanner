import React from 'react'
class SmartMoneyAnalyzer {
  constructor() {
    this.orderBlockMinSize = 0.02; // 2% minimum size for order blocks
    this.fvgMinSize = 0.005; // 0.5% minimum size for fair value gaps
    this.liquidityThreshold = 1.5; // Volume threshold for liquidity zones
  }

  analyze(ohlcData) {
    const analysis = {
      bias: 'neutral',
      confidence: 0,
      orderBlocks: [],
      fairValueGaps: [],
      liquidityZones: [],
      marketStructure: null,
      keyLevels: []
    };

    // Analyze market structure
    analysis.marketStructure = this.analyzeMarketStructure(ohlcData);
    
    // Find order blocks
    analysis.orderBlocks = this.findOrderBlocks(ohlcData);
    
    // Find fair value gaps
    analysis.fairValueGaps = this.findFairValueGaps(ohlcData);
    
    // Find liquidity zones
    analysis.liquidityZones = this.findLiquidityZones(ohlcData);
    
    // Determine overall bias
    analysis.bias = this.determineBias(analysis);
    
    // Calculate confidence
    analysis.confidence = this.calculateConfidence(analysis);
    
    // Identify key levels
    analysis.keyLevels = this.identifyKeyLevels(analysis);

    return analysis;
  }

  analyzeMarketStructure(data) {
    const swingHighs = this.findSwingHighs(data);
    const swingLows = this.findSwingLows(data);
    
    const structure = {
      trend: 'neutral',
      higherHighs: 0,
      higherLows: 0,
      lowerHighs: 0,
      lowerLows: 0,
      breakOfStructure: null,
      changeOfCharacter: null
    };

    // Analyze swing patterns
    if (swingHighs.length >= 2) {
      for (let i = 1; i < swingHighs.length; i++) {
        if (swingHighs[i].price > swingHighs[i - 1].price) {
          structure.higherHighs++;
        } else {
          structure.lowerHighs++;
        }
      }
    }

    if (swingLows.length >= 2) {
      for (let i = 1; i < swingLows.length; i++) {
        if (swingLows[i].price > swingLows[i - 1].price) {
          structure.higherLows++;
        } else {
          structure.lowerLows++;
        }
      }
    }

    // Determine trend
    if (structure.higherHighs > structure.lowerHighs && structure.higherLows > structure.lowerLows) {
      structure.trend = 'bullish';
    } else if (structure.lowerHighs > structure.higherHighs && structure.lowerLows > structure.higherLows) {
      structure.trend = 'bearish';
    }

    // Check for break of structure (BOS)
    structure.breakOfStructure = this.detectBreakOfStructure(data, swingHighs, swingLows);
    
    // Check for change of character (CHoCH)
    structure.changeOfCharacter = this.detectChangeOfCharacter(data, swingHighs, swingLows);

    return structure;
  }

  findSwingHighs(data, lookback = 5) {
    const swings = [];
    
    for (let i = lookback; i < data.length - lookback; i++) {
      const segment = data.slice(i - lookback, i + lookback + 1);
      const current = segment[lookback];
      
      if (current.high === Math.max(...segment.map(d => d.high))) {
        swings.push({
          index: i,
          price: current.high,
          time: current.time,
          volume: current.volume
        });
      }
    }
    
    return swings;
  }

  findSwingLows(data, lookback = 5) {
    const swings = [];
    
    for (let i = lookback; i < data.length - lookback; i++) {
      const segment = data.slice(i - lookback, i + lookback + 1);
      const current = segment[lookback];
      
      if (current.low === Math.min(...segment.map(d => d.low))) {
        swings.push({
          index: i,
          price: current.low,
          time: current.time,
          volume: current.volume
        });
      }
    }
    
    return swings;
  }

  detectBreakOfStructure(data, swingHighs, swingLows) {
    const recentData = data.slice(-20);
    const currentPrice = data[data.length - 1].close;
    
    // Check for bullish BOS (break above recent swing high)
    const recentHigh = swingHighs.length > 0 ? swingHighs[swingHighs.length - 1] : null;
    if (recentHigh && currentPrice > recentHigh.price) {
      return {
        type: 'bullish',
        level: recentHigh.price,
        confirmed: true
      };
    }
    
    // Check for bearish BOS (break below recent swing low)
    const recentLow = swingLows.length > 0 ? swingLows[swingLows.length - 1] : null;
    if (recentLow && currentPrice < recentLow.price) {
      return {
        type: 'bearish',
        level: recentLow.price,
        confirmed: true
      };
    }
    
    return null;
  }

  detectChangeOfCharacter(data, swingHighs, swingLows) {
    if (swingHighs.length < 2 || swingLows.length < 2) return null;
    
    const lastTwoHighs = swingHighs.slice(-2);
    const lastTwoLows = swingLows.slice(-2);
    const currentPrice = data[data.length - 1].close;
    
    // Bullish CHoCH: Price breaks above previous lower high
    if (lastTwoHighs[1].price < lastTwoHighs[0].price && currentPrice > lastTwoHighs[0].price) {
      return {
        type: 'bullish',
        level: lastTwoHighs[0].price,
        confirmed: true
      };
    }
    
    // Bearish CHoCH: Price breaks below previous higher low
    if (lastTwoLows[1].price > lastTwoLows[0].price && currentPrice < lastTwoLows[0].price) {
      return {
        type: 'bearish',
        level: lastTwoLows[0].price,
        confirmed: true
      };
    }
    
    return null;
  }

  findOrderBlocks(data) {
    const orderBlocks = [];
    const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
    
    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const current = data[i];
      const next = data[i + 1];
      
      // Bullish order block: Strong bullish candle followed by continuation
      if (this.isBullishOrderBlock(prev, current, next, avgVolume)) {
        orderBlocks.push({
          type: 'bullish',
          high: current.high,
          low: current.low,
          index: i,
          time: current.time,
          volume: current.volume,
          strength: this.calculateOrderBlockStrength(current, avgVolume),
          tested: false
        });
      }
      
      // Bearish order block: Strong bearish candle followed by continuation
      if (this.isBearishOrderBlock(prev, current, next, avgVolume)) {
        orderBlocks.push({
          type: 'bearish',
          high: current.high,
          low: current.low,
          index: i,
          time: current.time,
          volume: current.volume,
          strength: this.calculateOrderBlockStrength(current, avgVolume),
          tested: false
        });
      }
    }
    
    // Mark tested order blocks
    return this.markTestedOrderBlocks(orderBlocks, data);
  }

  isBullishOrderBlock(prev, current, next, avgVolume) {
    const bodySize = current.close - current.open;
    const candleRange = current.high - current.low;
    const bodyRatio = bodySize / candleRange;
    
    return current.close > current.open && // Bullish candle
           bodyRatio > 0.6 && // Strong body
           current.volume > avgVolume * 1.2 && // Above average volume
           next.close > current.close; // Continuation
  }

  isBearishOrderBlock(prev, current, next, avgVolume) {
    const bodySize = current.open - current.close;
    const candleRange = current.high - current.low;
    const bodyRatio = bodySize / candleRange;
    
    return current.close < current.open && // Bearish candle
           bodyRatio > 0.6 && // Strong body
           current.volume > avgVolume * 1.2 && // Above average volume
           next.close < current.close; // Continuation
  }

  calculateOrderBlockStrength(candle, avgVolume) {
    const volumeRatio = candle.volume / avgVolume;
    const bodySize = Math.abs(candle.close - candle.open);
    const candleRange = candle.high - candle.low;
    const bodyRatio = bodySize / candleRange;
    
    return Math.round((volumeRatio * 30) + (bodyRatio * 20));
  }

  markTestedOrderBlocks(orderBlocks, data) {
    return orderBlocks.map(ob => {
      let tested = false;
      
      // Check if price has returned to test the order block
      for (let i = ob.index + 1; i < data.length; i++) {
        const candle = data[i];
        
        if (ob.type === 'bullish') {
          // Test if price came back down to the order block
          if (candle.low <= ob.high && candle.low >= ob.low) {
            tested = true;
            break;
          }
        } else {
          // Test if price came back up to the order block
          if (candle.high >= ob.low && candle.high <= ob.high) {
            tested = true;
            break;
          }
        }
      }
      
      return { ...ob, tested };
    });
  }

  findFairValueGaps(data) {
    const fvgs = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const current = data[i];
      const next = data[i + 1];
      
      // Bullish FVG: Gap between previous high and next low
      if (prev.high < next.low) {
        const gapSize = (next.low - prev.high) / prev.high;
        if (gapSize >= this.fvgMinSize) {
          fvgs.push({
            type: 'bullish',
            high: next.low,
            low: prev.high,
            index: i,
            time: current.time,
            size: gapSize,
            filled: false
          });
        }
      }
      
      // Bearish FVG: Gap between previous low and next high
      if (prev.low > next.high) {
        const gapSize = (prev.low - next.high) / next.high;
        if (gapSize >= this.fvgMinSize) {
          fvgs.push({
            type: 'bearish',
            high: prev.low,
            low: next.high,
            index: i,
            time: current.time,
            size: gapSize,
            filled: false
          });
        }
      }
    }
    
    // Mark filled FVGs
    return this.markFilledFVGs(fvgs, data);
  }

  markFilledFVGs(fvgs, data) {
    return fvgs.map(fvg => {
      let filled = false;
      
      // Check if the gap has been filled
      for (let i = fvg.index + 1; i < data.length; i++) {
        const candle = data[i];
        
        if (fvg.type === 'bullish') {
          // FVG is filled if price comes back down into the gap
          if (candle.low <= fvg.high && candle.low >= fvg.low) {
            filled = true;
            break;
          }
        } else {
          // FVG is filled if price comes back up into the gap
          if (candle.high >= fvg.low && candle.high <= fvg.high) {
            filled = true;
            break;
          }
        }
      }
      
      return { ...fvg, filled };
    });
  }

  findLiquidityZones(data) {
    const liquidityZones = [];
    const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
    
    // Find equal highs and lows (liquidity pools)
    const swingHighs = this.findSwingHighs(data);
    const swingLows = this.findSwingLows(data);
    
    // Group equal highs
    const equalHighs = this.findEqualLevels(swingHighs);
    for (const group of equalHighs) {
      if (group.length >= 2) {
        liquidityZones.push({
          type: 'sell_side',
          level: group[0].price,
          count: group.length,
          strength: group.length * 15,
          swept: false
        });
      }
    }
    
    // Group equal lows
    const equalLows = this.findEqualLevels(swingLows);
    for (const group of equalLows) {
      if (group.length >= 2) {
        liquidityZones.push({
          type: 'buy_side',
          level: group[0].price,
          count: group.length,
          strength: group.length * 15,
          swept: false
        });
      }
    }
    
    // Mark swept liquidity
    return this.markSweptLiquidity(liquidityZones, data);
  }

  findEqualLevels(swings, tolerance = 0.005) {
    const groups = [];
    
    for (const swing of swings) {
      let addedToGroup = false;
      
      for (const group of groups) {
        const avgPrice = group.reduce((sum, s) => sum + s.price, 0) / group.length;
        const priceDiff = Math.abs(swing.price - avgPrice) / avgPrice;
        
        if (priceDiff <= tolerance) {
          group.push(swing);
          addedToGroup = true;
          break;
        }
      }
      
      if (!addedToGroup) {
        groups.push([swing]);
      }
    }
    
    return groups.filter(group => group.length >= 2);
  }

  markSweptLiquidity(liquidityZones, data) {
    const currentPrice = data[data.length - 1].close;
    
    return liquidityZones.map(zone => {
      let swept = false;
      
      if (zone.type === 'sell_side' && currentPrice > zone.level) {
        swept = true;
      } else if (zone.type === 'buy_side' && currentPrice < zone.level) {
        swept = true;
      }
      
      return { ...zone, swept };
    });
  }

  determineBias(analysis) {
    let bullishScore = 0;
    let bearishScore = 0;
    
    // Market structure bias
    if (analysis.marketStructure.trend === 'bullish') {
      bullishScore += 30;
    } else if (analysis.marketStructure.trend === 'bearish') {
      bearishScore += 30;
    }
    
    // Break of structure bias
    if (analysis.marketStructure.breakOfStructure) {
      if (analysis.marketStructure.breakOfStructure.type === 'bullish') {
        bullishScore += 25;
      } else {
        bearishScore += 25;
      }
    }
    
    // Change of character bias
    if (analysis.marketStructure.changeOfCharacter) {
      if (analysis.marketStructure.changeOfCharacter.type === 'bullish') {
        bullishScore += 20;
      } else {
        bearishScore += 20;
      }
    }
    
    // Order blocks bias
    const recentOrderBlocks = analysis.orderBlocks.slice(-3);
    for (const ob of recentOrderBlocks) {
      if (ob.type === 'bullish' && !ob.tested) {
        bullishScore += 10;
      } else if (ob.type === 'bearish' && !ob.tested) {
        bearishScore += 10;
      }
    }
    
    // Fair value gaps bias
    const unfilledFVGs = analysis.fairValueGaps.filter(fvg => !fvg.filled);
    for (const fvg of unfilledFVGs) {
      if (fvg.type === 'bullish') {
        bullishScore += 5;
      } else {
        bearishScore += 5;
      }
    }
    
    if (bullishScore > bearishScore + 10) {
      return 'bullish';
    } else if (bearishScore > bullishScore + 10) {
      return 'bearish';
    }
    
    return 'neutral';
  }

  calculateConfidence(analysis) {
    let confidence = 0;
    
    // Base confidence from market structure
    if (analysis.marketStructure.trend !== 'neutral') {
      confidence += 20;
    }
    
    // BOS/CHoCH confirmation
    if (analysis.marketStructure.breakOfStructure) {
      confidence += 25;
    }
    if (analysis.marketStructure.changeOfCharacter) {
      confidence += 20;
    }
    
    // Order blocks confirmation
    const validOrderBlocks = analysis.orderBlocks.filter(ob => ob.strength > 30);
    confidence += Math.min(validOrderBlocks.length * 10, 30);
    
    // FVG confirmation
    const significantFVGs = analysis.fairValueGaps.filter(fvg => fvg.size > 0.01);
    confidence += Math.min(significantFVGs.length * 5, 15);
    
    // Liquidity zones confirmation
    const activeLiquidity = analysis.liquidityZones.filter(lz => !lz.swept);
    confidence += Math.min(activeLiquidity.length * 5, 10);
    
    return Math.min(confidence, 95);
  }

  identifyKeyLevels(analysis) {
    const keyLevels = [];
    
    // Add untested order blocks as key levels
    const untestedOBs = analysis.orderBlocks.filter(ob => !ob.tested && ob.strength > 30);
    for (const ob of untestedOBs) {
      keyLevels.push({
        price: ob.type === 'bullish' ? ob.low : ob.high,
        type: 'order_block',
        direction: ob.type,
        strength: ob.strength
      });
    }
    
    // Add unfilled FVGs as key levels
    const unfilledFVGs = analysis.fairValueGaps.filter(fvg => !fvg.filled);
    for (const fvg of unfilledFVGs) {
      keyLevels.push({
        price: (fvg.high + fvg.low) / 2,
        type: 'fair_value_gap',
        direction: fvg.type,
        strength: fvg.size * 1000
      });
    }
    
    // Add unswept liquidity as key levels
    const unsweptLiquidity = analysis.liquidityZones.filter(lz => !lz.swept);
    for (const lz of unsweptLiquidity) {
      keyLevels.push({
        price: lz.level,
        type: 'liquidity',
        direction: lz.type === 'buy_side' ? 'bullish' : 'bearish',
        strength: lz.strength
      });
    }
    
    return keyLevels.sort((a, b) => b.strength - a.strength);
  }
}

export default SmartMoneyAnalyzer;
