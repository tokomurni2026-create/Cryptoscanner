import React from 'react'
class SupportResistanceAnalyzer {
  constructor() {
    this.minTouchCount = 2;
    this.priceTolerancePercent = 0.5; // 0.5% tolerance for level clustering
    this.volumeWeightFactor = 0.3;
  }

  findLevels(ohlcData) {
    const levels = {
      support: [],
      resistance: [],
      pivotPoints: [],
      keyLevels: []
    };

    // Find pivot points
    const pivots = this.findPivotPoints(ohlcData);
    levels.pivotPoints = pivots;

    // Identify support and resistance from pivots
    const supportLevels = this.identifySupportLevels(pivots.lows, ohlcData);
    const resistanceLevels = this.identifyResistanceLevels(pivots.highs, ohlcData);

    levels.support = supportLevels;
    levels.resistance = resistanceLevels;

    // Find psychological levels (round numbers)
    const psychLevels = this.findPsychologicalLevels(ohlcData);
    levels.keyLevels.push(...psychLevels);

    // Find volume-based levels
    const volumeLevels = this.findVolumeLevels(ohlcData);
    levels.keyLevels.push(...volumeLevels);

    // Calculate level strength
    levels.support = this.calculateLevelStrength(levels.support, ohlcData);
    levels.resistance = this.calculateLevelStrength(levels.resistance, ohlcData);

    return levels;
  }

  findPivotPoints(data) {
    const highs = [];
    const lows = [];
    const lookback = 5;

    for (let i = lookback; i < data.length - lookback; i++) {
      const segment = data.slice(i - lookback, i + lookback + 1);
      const current = segment[lookback];

      // Check for pivot high
      const isHigh = segment.every((candle, idx) => 
        idx === lookback || candle.high <= current.high
      );
      
      if (isHigh) {
        highs.push({
          index: i,
          price: current.high,
          time: current.time,
          volume: current.volume
        });
      }

      // Check for pivot low
      const isLow = segment.every((candle, idx) => 
        idx === lookback || candle.low >= current.low
      );
      
      if (isLow) {
        lows.push({
          index: i,
          price: current.low,
          time: current.time,
          volume: current.volume
        });
      }
    }

    return { highs, lows };
  }

  identifySupportLevels(pivotLows, ohlcData) {
    const supportLevels = [];
    const clusteredLows = this.clusterPivotPoints(pivotLows);

    for (const cluster of clusteredLows) {
      if (cluster.points.length >= this.minTouchCount) {
        const level = {
          price: cluster.avgPrice,
          touches: cluster.points.length,
          strength: 0,
          firstTouch: Math.min(...cluster.points.map(p => p.time)),
          lastTouch: Math.max(...cluster.points.map(p => p.time)),
          volume: cluster.points.reduce((sum, p) => sum + p.volume, 0) / cluster.points.length,
          type: 'support'
        };

        // Check if level has been tested recently
        level.isRecent = this.isRecentLevel(level, ohlcData);
        
        // Check if level is currently relevant
        level.isRelevant = this.isRelevantLevel(level, ohlcData);

        supportLevels.push(level);
      }
    }

    return supportLevels.sort((a, b) => b.strength - a.strength);
  }

  identifyResistanceLevels(pivotHighs, ohlcData) {
    const resistanceLevels = [];
    const clusteredHighs = this.clusterPivotPoints(pivotHighs);

    for (const cluster of clusteredHighs) {
      if (cluster.points.length >= this.minTouchCount) {
        const level = {
          price: cluster.avgPrice,
          touches: cluster.points.length,
          strength: 0,
          firstTouch: Math.min(...cluster.points.map(p => p.time)),
          lastTouch: Math.max(...cluster.points.map(p => p.time)),
          volume: cluster.points.reduce((sum, p) => sum + p.volume, 0) / cluster.points.length,
          type: 'resistance'
        };

        level.isRecent = this.isRecentLevel(level, ohlcData);
        level.isRelevant = this.isRelevantLevel(level, ohlcData);

        resistanceLevels.push(level);
      }
    }

    return resistanceLevels.sort((a, b) => b.strength - a.strength);
  }

  clusterPivotPoints(pivots) {
    const clusters = [];
    const tolerance = this.priceTolerancePercent / 100;

    for (const pivot of pivots) {
      let addedToCluster = false;

      for (const cluster of clusters) {
        const priceDiff = Math.abs(pivot.price - cluster.avgPrice) / cluster.avgPrice;
        
        if (priceDiff <= tolerance) {
          cluster.points.push(pivot);
          cluster.avgPrice = cluster.points.reduce((sum, p) => sum + p.price, 0) / cluster.points.length;
          addedToCluster = true;
          break;
        }
      }

      if (!addedToCluster) {
        clusters.push({
          avgPrice: pivot.price,
          points: [pivot]
        });
      }
    }

    return clusters;
  }

  findPsychologicalLevels(data) {
    const currentPrice = data[data.length - 1].close;
    const levels = [];
    
    // Find round numbers near current price
    const priceRange = currentPrice * 0.2; // 20% range around current price
    const minPrice = currentPrice - priceRange;
    const maxPrice = currentPrice + priceRange;

    // Generate round numbers
    const roundNumbers = this.generateRoundNumbers(minPrice, maxPrice);
    
    for (const roundPrice of roundNumbers) {
      const touchCount = this.countTouches(roundPrice, data);
      
      if (touchCount >= 2) {
        levels.push({
          price: roundPrice,
          touches: touchCount,
          strength: touchCount * 10, // Psychological levels get base strength
          type: 'psychological',
          isRecent: true,
          isRelevant: true
        });
      }
    }

    return levels;
  }

  generateRoundNumbers(minPrice, maxPrice) {
    const roundNumbers = [];
    
    // Determine appropriate step size based on price range
    let step;
    if (maxPrice < 1) {
      step = 0.01; // For prices under $1
    } else if (maxPrice < 10) {
      step = 0.1; // For prices under $10
    } else if (maxPrice < 100) {
      step = 1; // For prices under $100
    } else if (maxPrice < 1000) {
      step = 10; // For prices under $1000
    } else {
      step = 100; // For higher prices
    }

    for (let price = Math.floor(minPrice / step) * step; price <= maxPrice; price += step) {
      if (price > 0) {
        roundNumbers.push(price);
      }
    }

    return roundNumbers;
  }

  findVolumeLevels(data) {
    const levels = [];
    const volumeProfile = this.calculateVolumeProfile(data);
    
    // Find high volume nodes (HVN) and low volume nodes (LVN)
    const sortedByVolume = [...volumeProfile].sort((a, b) => b.volume - a.volume);
    const highVolumeThreshold = sortedByVolume[Math.floor(sortedByVolume.length * 0.1)].volume;
    
    for (const node of volumeProfile) {
      if (node.volume >= highVolumeThreshold) {
        const touchCount = this.countTouches(node.price, data);
        
        levels.push({
          price: node.price,
          touches: touchCount,
          strength: node.volume / 1000, // Volume-based strength
          type: 'volume',
          volume: node.volume,
          isRecent: true,
          isRelevant: true
        });
      }
    }

    return levels;
  }

  calculateVolumeProfile(data, bins = 50) {
    const priceRange = Math.max(...data.map(d => d.high)) - Math.min(...data.map(d => d.low));
    const binSize = priceRange / bins;
    const minPrice = Math.min(...data.map(d => d.low));
    
    const profile = [];
    
    for (let i = 0; i < bins; i++) {
      const binLow = minPrice + (i * binSize);
      const binHigh = binLow + binSize;
      const binMid = (binLow + binHigh) / 2;
      
      let totalVolume = 0;
      
      for (const candle of data) {
        // Check if candle overlaps with this price bin
        if (candle.low <= binHigh && candle.high >= binLow) {
          // Distribute volume proportionally
          const overlap = Math.min(candle.high, binHigh) - Math.max(candle.low, binLow);
          const candleRange = candle.high - candle.low;
          const volumeRatio = candleRange > 0 ? overlap / candleRange : 1;
          totalVolume += candle.volume * volumeRatio;
        }
      }
      
      profile.push({
        price: binMid,
        volume: totalVolume,
        binLow,
        binHigh
      });
    }
    
    return profile;
  }

  countTouches(level, data, tolerance = 0.005) {
    let touches = 0;
    
    for (const candle of data) {
      const highDiff = Math.abs(candle.high - level) / level;
      const lowDiff = Math.abs(candle.low - level) / level;
      const closeDiff = Math.abs(candle.close - level) / level;
      
      if (highDiff <= tolerance || lowDiff <= tolerance || closeDiff <= tolerance) {
        touches++;
      }
    }
    
    return touches;
  }

  calculateLevelStrength(levels, ohlcData) {
    const currentPrice = ohlcData[ohlcData.length - 1].close;
    
    return levels.map(level => {
      let strength = 0;
      
      // Base strength from touch count
      strength += level.touches * 15;
      
      // Volume factor
      if (level.volume) {
        const avgVolume = ohlcData.reduce((sum, d) => sum + d.volume, 0) / ohlcData.length;
        const volumeRatio = level.volume / avgVolume;
        strength += volumeRatio * this.volumeWeightFactor * 20;
      }
      
      // Recency factor
      if (level.isRecent) {
        strength += 10;
      }
      
      // Distance factor (closer levels are more relevant)
      const distanceRatio = Math.abs(level.price - currentPrice) / currentPrice;
      if (distanceRatio < 0.05) { // Within 5%
        strength += 15;
      } else if (distanceRatio < 0.1) { // Within 10%
        strength += 10;
      }
      
      // Age factor (newer levels are stronger)
      const dataLength = ohlcData.length;
      const levelAge = dataLength - level.lastTouch;
      const ageFactor = Math.max(0, 1 - (levelAge / dataLength));
      strength += ageFactor * 10;
      
      // Psychological level bonus
      if (level.type === 'psychological') {
        strength += 5;
      }
      
      // Volume level bonus
      if (level.type === 'volume') {
        strength += 8;
      }
      
      return {
        ...level,
        strength: Math.round(strength)
      };
    });
  }

  isRecentLevel(level, data) {
    const recentPeriod = Math.min(50, data.length * 0.2); // Last 20% of data or 50 candles
    const recentData = data.slice(-recentPeriod);
    
    return recentData.some(candle => {
      const tolerance = 0.01; // 1% tolerance
      return Math.abs(candle.high - level.price) / level.price <= tolerance ||
             Math.abs(candle.low - level.price) / level.price <= tolerance;
    });
  }

  isRelevantLevel(level, data) {
    const currentPrice = data[data.length - 1].close;
    const distanceRatio = Math.abs(level.price - currentPrice) / currentPrice;
    
    // Level is relevant if it's within 15% of current price
    return distanceRatio <= 0.15;
  }

  findNearestLevels(price, levels, count = 3) {
    return levels
      .map(level => ({
        ...level,
        distance: Math.abs(level.price - price)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, count);
  }

  findLevelsInRange(minPrice, maxPrice, levels) {
    return levels.filter(level => 
      level.price >= minPrice && level.price <= maxPrice
    );
  }

  getStrongestLevels(levels, count = 5) {
    return levels
      .sort((a, b) => b.strength - a.strength)
      .slice(0, count);
  }
}

export default SupportResistanceAnalyzer;
