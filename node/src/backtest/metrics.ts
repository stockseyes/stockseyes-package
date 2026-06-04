import type { BacktestMetrics, EquityPoint, Trade } from './types';

function mean(a: number[]): number {
  if (!a.length) return 0;
  let s = 0;
  for (const x of a) s += x;
  return s / a.length;
}

/** Annualized Sharpe using population stdev of per-period returns. */
export function sharpe(returns: number[], rfPerPeriod: number, periodsPerYear: number): number {
  if (returns.length < 2) return 0;
  const m = mean(returns);
  let v = 0;
  for (const r of returns) v += (r - m) ** 2;
  v /= returns.length;
  const sd = Math.sqrt(v);
  if (sd === 0) return 0;
  return ((m - rfPerPeriod) / sd) * Math.sqrt(periodsPerYear);
}

/** Annualized Sortino using downside deviation below the risk-free rate. */
export function sortino(returns: number[], rfPerPeriod: number, periodsPerYear: number): number {
  if (returns.length < 2) return 0;
  const m = mean(returns);
  let dv = 0;
  for (const r of returns) {
    const d = Math.min(0, r - rfPerPeriod);
    dv += d * d;
  }
  dv /= returns.length;
  const dd = Math.sqrt(dv);
  if (dd === 0) return 0;
  return ((m - rfPerPeriod) / dd) * Math.sqrt(periodsPerYear);
}

export interface MetricsInput {
  /** Equity curve; `drawdownPct` is computed and written back in place. */
  equityCurve: EquityPoint[];
  trades: Trade[];
  initialCash: number;
  startTime: Date;
  endTime: Date;
  periodsPerYear: number;
  riskFreeRate: number;
  /** Number of bars that ended with an open position. */
  exposureBars: number;
  totalBars: number;
  buyHoldReturnPct: number;
  totalCommission: number;
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/** Compute the full metric set from the equity curve + trades (pure). */
export function computeMetrics(input: MetricsInput): BacktestMetrics {
  const {
    equityCurve,
    trades,
    initialCash,
    startTime,
    endTime,
    periodsPerYear,
    riskFreeRate,
    exposureBars,
    totalBars,
    buyHoldReturnPct,
    totalCommission,
  } = input;

  const n = equityCurve.length;
  const finalEquity = n ? equityCurve[n - 1].equity : initialCash;
  const totalReturn = initialCash !== 0 ? finalEquity / initialCash - 1 : 0;

  // Drawdown curve (written back) + max drawdown.
  let peak = -Infinity;
  let maxDD = 0;
  for (const pt of equityCurve) {
    if (pt.equity > peak) peak = pt.equity;
    const dd = peak > 0 ? (pt.equity - peak) / peak : 0;
    pt.drawdownPct = dd * 100;
    if (dd < maxDD) maxDD = dd;
  }

  // CAGR from elapsed calendar time.
  const ms = endTime.getTime() - startTime.getTime();
  const years = ms > 0 ? ms / MS_PER_YEAR : 0;
  const cagr =
    years > 0 && initialCash > 0 && finalEquity > 0
      ? Math.pow(finalEquity / initialCash, 1 / years) - 1
      : 0;

  // Per-bar returns of the equity curve.
  const returns: number[] = [];
  for (let i = 1; i < n; i++) {
    const prev = equityCurve[i - 1].equity;
    returns.push(prev !== 0 ? equityCurve[i].equity / prev - 1 : 0);
  }
  const rfPerPeriod = periodsPerYear > 0 ? riskFreeRate / periodsPerYear : 0;

  // Trade stats.
  const totalTrades = trades.length;
  let wins = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let returnPctSum = 0;
  for (const t of trades) {
    returnPctSum += t.returnPct;
    if (t.pnl > 0) {
      wins++;
      grossProfit += t.pnl;
    } else if (t.pnl < 0) {
      grossLoss += -t.pnl;
    }
  }

  return {
    initialCash,
    finalEquity,
    totalReturnPct: totalReturn * 100,
    cagrPct: cagr * 100,
    maxDrawdownPct: maxDD * 100,
    sharpe: sharpe(returns, rfPerPeriod, periodsPerYear),
    sortino: sortino(returns, rfPerPeriod, periodsPerYear),
    winRatePct: totalTrades ? (wins / totalTrades) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
    avgTradePct: totalTrades ? (returnPctSum / totalTrades) * 100 : 0,
    totalTrades,
    totalCommission,
    exposurePct: totalBars ? (exposureBars / totalBars) * 100 : 0,
    buyHoldReturnPct,
    periodsPerYear,
  };
}
