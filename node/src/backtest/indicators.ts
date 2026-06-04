// Pure technical-indicator helpers. Each takes a CHRONOLOGICAL (oldest-first) array
// and returns the indicator value at the LAST element, or `undefined` during warm-up.
// These are exported so tests can target them directly and the engine can reuse them.

/** Simple moving average over the last `period` values. */
export function sma(values: number[], period: number): number | undefined {
  if (period <= 0 || values.length < period) return undefined;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i];
  return sum / period;
}

/** Exponential moving average (seeded with the SMA of the first `period`). */
export function ema(values: number[], period: number): number | undefined {
  if (period <= 0 || values.length < period) return undefined;
  const k = 2 / (period + 1);
  let prev = 0;
  for (let i = 0; i < period; i++) prev += values[i];
  prev /= period;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
  }
  return prev;
}

/** Relative Strength Index (Wilder's smoothing). 0–100. */
export function rsi(values: number[], period = 14): number | undefined {
  if (period <= 0 || values.length < period + 1) return undefined;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Population standard deviation over the last `period` values. */
export function stdev(values: number[], period: number): number | undefined {
  if (period <= 0 || values.length < period) return undefined;
  const start = values.length - period;
  let mean = 0;
  for (let i = start; i < values.length; i++) mean += values[i];
  mean /= period;
  let variance = 0;
  for (let i = start; i < values.length; i++) variance += (values[i] - mean) ** 2;
  variance /= period;
  return Math.sqrt(variance);
}

/** Maximum over the last `period` values. */
export function highest(values: number[], period: number): number | undefined {
  if (period <= 0 || values.length < period) return undefined;
  let m = -Infinity;
  for (let i = values.length - period; i < values.length; i++) {
    if (values[i] > m) m = values[i];
  }
  return m;
}

/** Minimum over the last `period` values. */
export function lowest(values: number[], period: number): number | undefined {
  if (period <= 0 || values.length < period) return undefined;
  let m = Infinity;
  for (let i = values.length - period; i < values.length; i++) {
    if (values[i] < m) m = values[i];
  }
  return m;
}
