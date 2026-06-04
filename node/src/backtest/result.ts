import type {
  BacktestMetrics,
  BacktestResult,
  BacktestResultJSON,
  EquityPoint,
  LogEntry,
  Order,
  Trade,
} from './types';

/** Round to `dp` decimals; non-finite values collapse to 0 to keep JSON valid. */
function round(n: number, dp: number): number {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
const r4 = (n: number): number => round(n, 4);
const r6 = (n: number): number => round(n, 6);

export interface ResultInput {
  symbol: string;
  interval: string;
  startTime: Date;
  endTime: Date;
  initialCash: number;
  metrics: BacktestMetrics;
  trades: Trade[];
  orders: Order[];
  equityCurve: EquityPoint[];
  logs: LogEntry[];
}

/** Assemble the `BacktestResult` handle (with the contract-rounded `toJSON`). */
export function buildResult(input: ResultInput): BacktestResult {
  const {
    symbol,
    interval,
    startTime,
    endTime,
    initialCash,
    metrics,
    trades,
    orders,
    equityCurve,
    logs,
  } = input;

  const toJSON = (): BacktestResultJSON => ({
    symbol,
    interval,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    initialCash: r4(initialCash),
    metrics: {
      initialCash: r4(metrics.initialCash),
      finalEquity: r4(metrics.finalEquity),
      totalReturnPct: r6(metrics.totalReturnPct),
      cagrPct: r6(metrics.cagrPct),
      maxDrawdownPct: r6(metrics.maxDrawdownPct),
      sharpe: r6(metrics.sharpe),
      sortino: r6(metrics.sortino),
      winRatePct: r6(metrics.winRatePct),
      profitFactor: metrics.profitFactor === null ? null : r6(metrics.profitFactor),
      avgTradePct: r6(metrics.avgTradePct),
      totalTrades: metrics.totalTrades,
      totalCommission: r4(metrics.totalCommission),
      exposurePct: r6(metrics.exposurePct),
      buyHoldReturnPct: r6(metrics.buyHoldReturnPct),
      periodsPerYear: metrics.periodsPerYear,
    },
    trades: trades.map((t) => ({
      entryTime: t.entryTime.toISOString(),
      entryPrice: r4(t.entryPrice),
      exitTime: t.exitTime.toISOString(),
      exitPrice: r4(t.exitPrice),
      quantity: t.quantity,
      pnl: r4(t.pnl),
      returnPct: r6(t.returnPct),
      barsHeld: t.barsHeld,
      commission: r4(t.commission),
    })),
    equityCurve: equityCurve.map((e) => ({
      timestamp: e.timestamp.toISOString(),
      equity: r4(e.equity),
      drawdownPct: r6(e.drawdownPct),
    })),
  });

  const toString = (): string => {
    const m = metrics;
    const pf = m.profitFactor === null ? 'n/a' : m.profitFactor.toFixed(2);
    return [
      `Backtest — ${symbol} (${interval})`,
      `Period:        ${startTime.toISOString().slice(0, 10)} → ${endTime
        .toISOString()
        .slice(0, 10)}`,
      `Initial cash:  ${m.initialCash.toFixed(2)}`,
      `Final equity:  ${m.finalEquity.toFixed(2)}`,
      `Total return:  ${m.totalReturnPct.toFixed(2)}%`,
      `CAGR:          ${m.cagrPct.toFixed(2)}%`,
      `Max drawdown:  ${m.maxDrawdownPct.toFixed(2)}%`,
      `Sharpe:        ${m.sharpe.toFixed(2)}`,
      `Sortino:       ${m.sortino.toFixed(2)}`,
      `Trades:        ${m.totalTrades}  (win ${m.winRatePct.toFixed(1)}%, PF ${pf})`,
      `Exposure:      ${m.exposurePct.toFixed(1)}%`,
      `Buy & hold:    ${m.buyHoldReturnPct.toFixed(2)}%`,
    ].join('\n');
  };

  return {
    symbol,
    interval,
    startTime,
    endTime,
    initialCash,
    metrics,
    trades,
    orders,
    equityCurve,
    logs,
    toJSON,
    toString,
    print() {
      // eslint-disable-next-line no-console
      console.log(toString());
    },
  };
}
