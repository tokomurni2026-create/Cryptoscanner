import React from 'react'
class ElliottWaveAnalyzer {
  constructor() {
    this.waveTypes = ['1', '2', '3', '4', '5', 'A', 'B', 'C'];
    this.fibonacciRatios = [0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618, 2.618];
  }

  analyzeWave(ohlcData) {
    const swingPoints = this.identifySwingPoints(ohlcData);
    
    if (swingPoints.length < 5) {
      return {
        isValid: false,
        currentWave: null,
        confidence: 0,
        waveStructure: null
      };
    }

    const waveStructure = this.identifyWaveStructure(swingPoints);
    const currentWave = this.determineCurrentWave(waveStructure, ohlcData);
    const confidence = this.calculateWaveConfidence(waveStructure);

    return {
      isValid: confidence >= 60,
      currentWave,
      confidence,
      waveStructure,
      projections: this.calculateWaveProjections(waveStructure, ohlcData)
    };
  }

  identifySwingPoints(data) {
    const swings = [];
    const lookback = 5;
    
    for (let i = lookback; i < data.length - lookback; i++) {
      const segment = data.slice(i - lookback, i + lookback + 1);
      const current = segment[lookback];
      
      // Check for swing high
      if (current.high === Math.max(...segment.map(d => d.high))) {
        swings.push({
          index: i,
          price: current.high,
          type: 'high',
          time: current.time
        });
      }
      
      // Check for swing low
      if (current.low === Math.min(...segment.map(d => d.low))) {
        swings.push({
          index: i,
          price: current.low,
          type: 'low',
          time: current.time
        });
      }
    }
    
    return this.filterSignificantSwings(swings);
  }

  filterSignificantSwings(swings) {
    const filtered = [];
    const minSwingSize = 0.02; // 2% minimum swing
    
    for (let i = 0; i < swings.length; i++) {
      const current = swings[i];
      
      if (filtered.length === 0) {
        filtered.push(current);
        continue;
      }
      
      const last = filtered[filtered.length - 1];
      const priceChange = Math.abs(current.price - last.price) / last.price;
      
      // Only add swing if it's significant and alternates type
      if (priceChange >= minSwingSize && current.type !== last.type) {
        filtered.push(current);
      } else if (current.type === last.type) {
        // Update the swing if it's more extreme
        if ((current.type === 'high' && current.price > last.price) ||
            (current.type === 'low' && current.price < last.price)) {
          filtered[filtered.length - 1] = current;
        }
      }
    }
    
    return filtered;
  }

  identifyWaveStructure(swings) {
    if (swings.length < 5) return null;
    
    const structures = [];
    
    // Look for 5-wave impulse patterns
    for (let i = 0; i <= swings.length - 5; i++) {
      const fiveWaves = swings.slice(i, i + 5);
      const impulseStructure = this.analyzeImpulseWave(fiveWaves);
      
      if (impulseStructure.isValid) {
        structures.push({
          type: 'impulse',
          waves: fiveWaves,
          direction: impulseStructure.direction,
          confidence: impulseStructure.confidence,
          startIndex: i,
          endIndex: i + 4
        });
      }
    }
    
    // Look for 3-wave corrective patterns
    for (let i = 0; i <= swings.length - 3; i++) {
      const threeWaves = swings.slice(i, i + 3);
      const correctiveStructure = this.analyzeCorrectiveWave(threeWaves);
      
      if (correctiveStructure.isValid) {
        structures.push({
          type: 'corrective',
          waves: threeWaves,
          direction: correctiveStructure.direction,
          confidence: correctiveStructure.confidence,
          startIndex: i,
          endIndex: i + 2
        });
      }
    }
    
    // Return the most recent and confident structure
    return structures.length > 0 ? 
           structures.sort((a, b) => b.confidence - a.confidence)[0] : null;
  }

  analyzeImpulseWave(waves) {
    if (waves.length !== 5) return { isValid: false };
    
    const [w1, w2, w3, w4, w5] = waves;
    let confidence = 0;
    
    // Check basic alternation (high-low-high-low-high or low-high-low-high-low)
    const alternationCorrect = (
      (w1.type !== w2.type && w2.type !== w3.type && w3.type !== w4.type && w4.type !== w5.type) &&
      (w1.type === w3.type && w3.type === w5.type) &&
      (w2.type === w4.type)
    );
    
    if (!alternationCorrect) return { isValid: false };
    
    confidence += 20;
    
    // Determine direction
    const direction = w1.type === 'low' ? 'bullish' : 'bearish';
    
    // Elliott Wave Rules Validation
    const rules = this.validateElliottRules(waves, direction);
    confidence += rules.score;
    
    // Fibonacci relationships
    const fibRelations = this.checkFibonacciRelationships(waves);
    confidence += fibRelations.score;
    
    return {
      isValid: confidence >= 60,
      direction,
      confidence: Math.min(confidence, 95),
      rules: rules.details,
      fibonacci: fibRelations.details
    };
  }

  validateElliottRules(waves, direction) {
    const [w1, w2, w3, w4, w5] = waves;
    let score = 0;
    const details = [];
    
    if (direction === 'bullish') {
      // Rule 1: Wave 2 never retraces more than 100% of wave 1
      if (w2.price > w1.price) {
        score += 15;
        details.push('Wave 2 retracement valid');
      }
      
      // Rule 2: Wave 3 is never the shortest wave
      const wave1Length = w2.price - w1.price;
      const wave3Length = w4.price - w3.price;
      const wave5Length = w5.price - w4.price;
      
      if (wave3Length >= wave1Length && wave3Length >= wave5Length) {
        score += 20;
        details.push('Wave 3 is not shortest');
      }
      
      // Rule 3: Wave 4 never enters the price territory of wave 1
      if (w4.price > w2.price) {
        score += 15;
        details.push('Wave 4 does not overlap wave 1');
      }
      
      // Guideline: Wave 3 often extends to 1.618 of wave 1
      const ratio = wave3Length / wave1Length;
      if (ratio >= 1.5 && ratio <= 1.7) {
        score += 10;
        details.push('Wave 3 shows proper extension');
      }
      
    } else {
      // Bearish wave rules (inverted)
      if (w2.price < w1.price) {
        score += 15;
        details.push('Wave 2 retracement valid');
      }
      
      const wave1Length = w1.price - w2.price;
      const wave3Length = w3.price - w4.price;
      const wave5Length = w4.price - w5.price;
      
      if (wave3Length >= wave1Length && wave3Length >= wave5Length) {
        score += 20;
        details.push('Wave 3 is not shortest');
      }
      
      if (w4.price < w2.price) {
        score += 15;
        details.push('Wave 4 does not overlap wave 1');
      }
      
      const ratio = wave3Length / wave1Length;
      if (ratio >= 1.5 && ratio <= 1.7) {
        score += 10;
        details.push('Wave 3 shows proper extension');
      }
    }
    
    return { score, details };
  }

  checkFibonacciRelationships(waves) {
    let score = 0;
    const details = [];
    
    // Check common Fibonacci relationships between waves
    const ratios = this.calculateWaveRatios(waves);
    
    // Wave 2 typically retraces 50%, 61.8%, or 78.6% of wave 1
    if (this.isNearFibRatio(ratios.wave2Retracement, [0.5, 0.618, 0.786])) {
      score += 10;
      details.push(`Wave 2 retracement: ${(ratios.wave2Retracement * 100).toFixed(1)}%`);
    }
    
    // Wave 3 often extends to 161.8% or 261.8% of wave 1
    if (this.isNearFibRatio(ratios.wave3Extension, [1.618, 2.618])) {
      score += 15;
      details.push(`Wave 3 extension: ${(ratios.wave3Extension * 100).toFixed(1)}%`);
    }
    
    // Wave 4 typically retraces 23.6%, 38.2%, or 50% of wave 3
    if (this.isNearFibRatio(ratios.wave4Retracement, [0.236, 0.382, 0.5])) {
      score += 10;
      details.push(`Wave 4 retracement: ${(ratios.wave4Retracement * 100).toFixed(1)}%`);
    }
    
    // Wave 5 often equals wave 1 or extends to 61.8% of waves 1-3
    if (this.isNearFibRatio(ratios.wave5Ratio, [1.0, 0.618])) {
      score += 10;
      details.push(`Wave 5 ratio: ${(ratios.wave5Ratio * 100).toFixed(1)}%`);
    }
    
    return { score, details };
  }

  calculateWaveRatios(waves) {
    const [w1, w2, w3, w4, w5] = waves;
    
    const wave1Length = Math.abs(w2.price - w1.price);
    const wave2Length = Math.abs(w3.price - w2.price);
    const wave3Length = Math.abs(w4.price - w3.price);
    const wave4Length = Math.abs(w5.price - w4.price);
    const wave5Length = Math.abs(w5.price - w4.price);
    
    return {
      wave2Retracement: wave2Length / wave1Length,
      wave3Extension: wave3Length / wave1Length,
      wave4Retracement: wave4Length / wave3Length,
      wave5Ratio: wave5Length / wave1Length
    };
  }

  isNearFibRatio(value, targets, tolerance = 0.1) {
    return targets.some(target => Math.abs(value - target) <= tolerance);
  }

  analyzeCorrectiveWave(waves) {
    if (waves.length !== 3) return { isValid: false };
    
    const [wA, wB, wC] = waves;
    let confidence = 0;
    
    // Check basic alternation
    const alternationCorrect = (
      wA.type !== wB.type && wB.type !== wC.type && wA.type === wC.type
    );
    
    if (!alternationCorrect) return { isValid: false };
    
    confidence += 20;
    
    // Determine direction
    const direction = wA.type === 'high' ? 'bearish' : 'bullish';
    
    // Check for ABC pattern characteristics
    const waveALength = Math.abs(wB.price - wA.price);
    const waveCLength = Math.abs(wC.price - wB.price);
    
    // Wave C often equals wave A or extends to 161.8% of wave A
    const cToARatio = waveCLength / waveALength;
    if (this.isNearFibRatio(cToARatio, [1.0, 1.618])) {
      confidence += 20;
    }
    
    // Wave B typically retraces 50% to 78.6% of wave A
    const bRetracement = Math.abs(wB.price - wA.price) / waveALength;
    if (this.isNearFibRatio(bRetracement, [0.5, 0.618, 0.786])) {
      confidence += 15;
    }
    
    return {
      isValid: confidence >= 40,
      direction,
      confidence: Math.min(confidence, 90)
    };
  }

  determineCurrentWave(structure, ohlcData) {
    if (!structure) return null;
    
    const currentPrice = ohlcData[ohlcData.length - 1].close;
    const lastWave = structure.waves[structure.waves.length - 1];
    
    if (structure.type === 'impulse') {
      // Determine which wave we're currently in
      const waveCount = structure.waves.length;
      
      if (waveCount === 5) {
        // Check if we're starting a corrective phase
        if (structure.direction === 'bullish' && currentPrice < lastWave.price) {
          return 'A (corrective)';
        } else if (structure.direction === 'bearish' && currentPrice > lastWave.price) {
          return 'A (corrective)';
        }
        return '5 (completing)';
      }
      
      return `${waveCount} (impulse)`;
    } else {
      // Corrective wave
      const waveCount = structure.waves.length;
      const waveLabels = ['A', 'B', 'C'];
      
      if (waveCount <= 3) {
        return `${waveLabels[waveCount - 1]} (corrective)`;
      }
      
      return 'C (completing)';
    }
  }

  calculateWaveConfidence(structure) {
    if (!structure) return 0;
    
    let confidence = structure.confidence;
    
    // Boost confidence for complete patterns
    if (structure.type === 'impulse' && structure.waves.length === 5) {
      confidence += 10;
    } else if (structure.type === 'corrective' && structure.waves.length === 3) {
      confidence += 10;
    }
    
    // Reduce confidence for incomplete patterns
    if (structure.waves.length < 3) {
      confidence -= 20;
    }
    
    return Math.max(0, Math.min(95, confidence));
  }

  calculateWaveProjections(structure, ohlcData) {
    if (!structure) return null;
    
    const currentPrice = ohlcData[ohlcData.length - 1].close;
    const projections = {};
    
    if (structure.type === 'impulse') {
      projections.impulse = this.calculateImpulseProjections(structure, currentPrice);
    } else {
      projections.corrective = this.calculateCorrectiveProjections(structure, currentPrice);
    }
    
    return projections;
  }

  calculateImpulseProjections(structure, currentPrice) {
    const waves = structure.waves;
    const projections = {};
    
    if (waves.length >= 3) {
      const wave1Length = Math.abs(waves[1].price - waves[0].price);
      const wave3Start = waves[2].price;
      
      // Wave 5 projection based on wave 1
      projections.wave5_equal = structure.direction === 'bullish' ?
        waves[4].price + wave1Length :
        waves[4].price - wave1Length;
      
      // Wave 5 projection based on 61.8% of wave 1-3 range
      const wave1to3Range = Math.abs(waves[2].price - waves[0].price);
      projections.wave5_618 = structure.direction === 'bullish' ?
        waves[4].price + (wave1to3Range * 0.618) :
        waves[4].price - (wave1to3Range * 0.618);
    }
    
    return projections;
  }

  calculateCorrectiveProjections(structure, currentPrice) {
    const waves = structure.waves;
    const projections = {};
    
    if (waves.length >= 2) {
      const waveALength = Math.abs(waves[1].price - waves[0].price);
      
      // Wave C equal to wave A
      projections.waveC_equal = structure.direction === 'bearish' ?
        waves[1].price - waveALength :
        waves[1].price + waveALength;
      
      // Wave C 161.8% extension of wave A
      projections.waveC_1618 = structure.direction === 'bearish' ?
        waves[1].price - (waveALength * 1.618) :
        waves[1].price + (waveALength * 1.618);
    }
    
    return projections;
  }
}

export default ElliottWaveAnalyzer;
