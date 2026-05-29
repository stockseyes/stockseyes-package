// ─────────────────────────────────────────────────────────────
// backtest/csv.ts — Export backtest results to CSV
// ─────────────────────────────────────────────────────────────
//
// Generates a CSV report from a BacktestResult:
//   - Header comment block with summary stats
//   - One row per candle with signal, position, equity, trade P&L
//
// TODO:
//   - In Node.js: write to file when path is provided
//   - In browser: return as string only
//   - Add proper CSV escaping for edge cases
//

import type { BacktestResult } from './types';

/**
 * Export a backtest result to CSV format.
 *
 * @param result   - The BacktestResult from runBacktest()
 * @param filePath - Optional file path to write the CSV (Node.js only).
 *                   If omitted, returns the CSV as a string.
 * @returns        - The CSV content as a string
 *
 * TODO: Implement actual file writing using fs.writeFile when filePath is provided.
 *       Currently always returns a string regardless of filePath.
 */
export async function exportBacktestCSV(
  result: BacktestResult,
  filePath?: string
): Promise<string> {
  const lines: string[] = [];

  // ── Header comment block with summary stats ──
  const firstDate = result.candles[0]?.date ?? 'N/A';
  const lastDate = result.candles[result.candles.length - 1]?.date ?? 'N/A';

  lines.push(`# Backtest Report: ${result.symbol}`);
  lines.push(`# Period: ${firstDate} to ${lastDate}`);
  lines.push(
    `# Initial Capital: ₹${result.initialCapital.toLocaleString()} | Final Equity: ₹${Math.round(result.finalEquity).toLocaleString()}`
  );
  lines.push(
    `# Return: ${result.totalReturn}% | Win Rate: ${result.winRate}% | Max Drawdown: ${result.maxDrawdown}%`
  );
  lines.push(`# Total Trades: ${result.totalTrades} | Sharpe Ratio: ${result.sharpeRatio} | Profit Factor: ${result.profitFactor}`);
  lines.push(`# ──────────────────────────────────────────────────────`);

  // ── CSV header row ──
  lines.push(
    'Date,Open,High,Low,Close,Volume,Signal,Position,Shares,Cash,Equity,Trade P&L'
  );

  // ── Build a trade lookup by date for quick access ──
  // TODO: In real implementation, track signals per candle during the backtest
  //       so we have accurate per-row signal data. For now, use trade dates.
  const tradeByDate = new Map(
    result.trades.map((t) => [t.date, t])
  );

  // ── One row per candle ──
  let currentPosition: 'FLAT' | 'LONG' | 'SHORT' = 'FLAT';
  let currentShares = 0;
  let currentCash = result.initialCapital;

  for (const candle of result.candles) {
    const trade = tradeByDate.get(candle.date);
    let signal = 'HOLD';
    let tradePnl = 0;

    if (trade) {
      signal = trade.type;
      tradePnl = trade.pnl;

      // Update position tracking
      if (trade.type === 'BUY' && currentPosition === 'FLAT') {
        currentPosition = 'LONG';
        currentShares = trade.shares;
        currentCash -= trade.shares * trade.price;
      } else if (trade.type === 'SELL' && currentPosition === 'FLAT') {
        currentPosition = 'SHORT';
        currentShares = trade.shares;
        currentCash += trade.shares * trade.price;
      } else if (
        (trade.type === 'SELL' && currentPosition === 'LONG') ||
        (trade.type === 'BUY' && currentPosition === 'SHORT')
      ) {
        currentPosition = 'FLAT';
        currentCash += trade.pnl;
        currentShares = 0;
      }
    }

    const equity =
      currentPosition === 'FLAT'
        ? currentCash
        : currentCash + currentShares * candle.close;

    lines.push(
      [
        candle.date,
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume,
        signal,
        currentPosition,
        currentShares,
        Math.round(currentCash),
        Math.round(equity),
        tradePnl,
      ].join(',')
    );
  }

  const csvContent = lines.join('\n');

  // TODO: Write to file when filePath is provided
  // In real implementation:
  //   if (filePath) {
  //     const fs = await import('fs/promises');
  //     await fs.writeFile(filePath, csvContent, 'utf-8');
  //   }
  if (filePath) {
    // DEMO: Log that we would write to file
    console.log(`[StockEyes] CSV would be written to: ${filePath}`);
  }

  return csvContent;
}
