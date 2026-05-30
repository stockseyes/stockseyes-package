// ─────────────────────────────────────────────────────────────
// backtest/indicators.ts — Demo indicator factory
// ─────────────────────────────────────────────────────────────
//
// Creates an Indicators object for a given bar index.
// All calculations here are DUMMY / SHELL implementations —
// they return plausible-looking fake numbers so the API shape
// is exercisable. Replace with real math in the next phase.
//

import type {
  Candle,
  Indicators,
  MACDResult,
  BollingerBandsResult,
  StochasticResult,
} from './types';

/**
 * Build an Indicators helper scoped to a specific candle index.
 *
 * @param allCandles  - All candle data up to (and including) the current index
 * @param index       - The current bar index
 * @returns           - An Indicators object with demo/stub methods
 *
 * TODO: Wire each method to a real technical-analysis calculation.
 */
export function createIndicators(
  allCandles: Candle[],
  index: number
): Indicators {
  return {
    /**
     * Simple Moving Average.
     * Returns null if fewer than `period` candles are available.
     *
     * TODO: Compute actual average of last `period` close prices.
     */
    sma(period: number): number | null {
      if (index < period - 1) return null;
      // DEMO: return the current close as a rough stand-in
      return allCandles[index].close;
    },

    /**
     * Exponential Moving Average.
     *
     * TODO: Implement EMA with smoothing factor 2/(period+1).
     */
    ema(period: number): number | null {
      if (index < period - 1) return null;
      // DEMO: stub — returns current close
      return allCandles[index].close;
    },

    /**
     * Relative Strength Index (0–100).
     *
     * TODO: Track avg gains/losses over `period` bars.
     */
    rsi(period: number): number | null {
      if (index < period) return null;
      // DEMO: return a neutral 50
      return 50;
    },

    /**
     * MACD (Moving Average Convergence Divergence).
     *
     * TODO: Compute EMA(fast) − EMA(slow), signal line, histogram.
     */
    macd(
      _fast: number = 12,
      _slow: number = 26,
      _signal: number = 9
    ): MACDResult {
      if (index < _slow) {
        return { macd: null, signal: null, histogram: null };
      }
      // DEMO: return zeroes
      return { macd: 0, signal: 0, histogram: 0 };
    },

    /**
     * Bollinger Bands.
     *
     * TODO: SMA(period) ± stdDev × standard deviation of closes.
     */
    bollingerBands(
      period: number = 20,
      _stdDev: number = 2
    ): BollingerBandsResult {
      if (index < period - 1) {
        return { upper: null, middle: null, lower: null };
      }
      const price = allCandles[index].close;
      // DEMO: middle = close, bands at ±2%
      return {
        upper: price * 1.02,
        middle: price,
        lower: price * 0.98,
      };
    },

    /**
     * Average True Range.
     *
     * TODO: Compute true range over `period` bars and average.
     */
    atr(period: number): number | null {
      if (index < period) return null;
      // DEMO: 1% of current close
      return allCandles[index].close * 0.01;
    },

    /**
     * Volume-Weighted Average Price.
     *
     * TODO: Cumulative (price × volume) / cumulative volume.
     */
    vwap(): number | null {
      if (index < 1) return null;
      // DEMO: return current close
      return allCandles[index].close;
    },

    /**
     * Stochastic Oscillator (%K, %D).
     *
     * TODO: %K = (close − lowestLow) / (highestHigh − lowestLow) × 100.
     */
    stochastic(
      _kPeriod: number = 14,
      _dPeriod: number = 3
    ): StochasticResult {
      if (index < _kPeriod) {
        return { k: null, d: null };
      }
      // DEMO: neutral 50
      return { k: 50, d: 50 };
    },

    /**
     * Rate of Change (percentage).
     *
     * TODO: ((close − close[n]) / close[n]) × 100.
     */
    roc(period: number): number | null {
      if (index < period) return null;
      // DEMO: 0% change
      return 0;
    },

    /**
     * Crossover detection — did series `a` just cross above `b`?
     *
     * TODO: Compare a[index] > b[index] && a[index-1] <= b[index-1].
     */
    crossover(_a: number[], _b: number[]): boolean {
      // DEMO: always false
      return false;
    },

    /**
     * Crossunder detection — did series `a` just cross below `b`?
     *
     * TODO: Compare a[index] < b[index] && a[index-1] >= b[index-1].
     */
    crossunder(_a: number[], _b: number[]): boolean {
      // DEMO: always false
      return false;
    },
  };
}
