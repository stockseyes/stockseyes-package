// ─────────────────────────────────────────────────────────────
// backtest/chart.ts — Generate interactive HTML chart
// ─────────────────────────────────────────────────────────────
//
// Produces a self-contained HTML file with:
//   - Stats dashboard (return, win rate, drawdown, Sharpe, etc.)
//   - Price chart with BUY/SELL markers
//   - Equity curve with gradient fill
//   - Volume bars
//   - Trade log table
//
// TODO:
//   - Use a charting library (Chart.js / Lightweight Charts) for real charts
//   - Implement interactive hover tooltips
//   - Add dark theme styling
//   - Write to file when filePath is provided
//

import type { BacktestResult } from './types';

/**
 * Generate a self-contained interactive HTML chart from backtest results.
 *
 * @param result   - The BacktestResult from runBacktest()
 * @param filePath - Optional file path to write the HTML (Node.js only).
 *                   If omitted, returns the HTML as a string.
 * @returns        - The HTML content as a string
 *
 * TODO: Replace this placeholder HTML with a real chart implementation
 *       using Chart.js or TradingView Lightweight Charts. The current
 *       output is a styled static page showing the stats and trade log.
 */
export async function generateBacktestChart(
  result: BacktestResult,
  filePath?: string
): Promise<string> {
  // ── Build trade log rows for the HTML table ──
  const tradeRows = result.trades
    .map(
      (t) => `
      <tr>
        <td>${t.date}</td>
        <td class="${t.type === 'BUY' ? 'buy' : 'sell'}">${t.type}</td>
        <td>₹${t.price.toLocaleString()}</td>
        <td>${t.shares}</td>
        <td class="${t.pnl >= 0 ? 'profit' : 'loss'}">₹${t.pnl.toLocaleString()}</td>
        <td>₹${t.commission}</td>
      </tr>`
    )
    .join('\n');

  // ── Build equity curve data points for chart (JSON) ──
  // TODO: This will be consumed by Chart.js / Lightweight Charts
  const equityData = JSON.stringify(
    result.equityCurve.map((p) => ({
      x: p.date,
      y: Math.round(p.equity),
    }))
  );

  // ── Build price data points for chart (JSON) ──
  const priceData = JSON.stringify(
    result.candles.map((c) => ({
      x: c.date,
      y: c.close,
    }))
  );

  // ── Assemble HTML ──
  // TODO: Replace with a full interactive chart implementation.
  //       This is a styled placeholder showing stats + trade table.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Backtest Report — ${result.symbol}</title>
  <style>
    /* TODO: Enhance with proper dark theme and chart styling */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #0f0f1a;
      color: #e0e0e0;
      padding: 24px;
    }
    h1 { color: #fff; margin-bottom: 8px; }
    .subtitle { color: #888; margin-bottom: 24px; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: #1a1a2e;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #2a2a4a;
    }
    .stat-card .label { color: #888; font-size: 13px; margin-bottom: 4px; }
    .stat-card .value { font-size: 24px; font-weight: 700; color: #fff; }
    .stat-card .value.positive { color: #4ade80; }
    .stat-card .value.negative { color: #f87171; }
    .chart-placeholder {
      background: #1a1a2e;
      border: 1px dashed #2a2a4a;
      border-radius: 12px;
      padding: 60px;
      text-align: center;
      color: #555;
      margin-bottom: 32px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #1a1a2e;
      border-radius: 12px;
      overflow: hidden;
    }
    th { background: #16213e; color: #aaa; padding: 12px; text-align: left; font-size: 13px; }
    td { padding: 12px; border-top: 1px solid #2a2a4a; font-size: 14px; }
    .buy { color: #4ade80; font-weight: 600; }
    .sell { color: #f87171; font-weight: 600; }
    .profit { color: #4ade80; }
    .loss { color: #f87171; }
  </style>
</head>
<body>
  <h1>📈 Backtest Report: ${result.symbol}</h1>
  <p class="subtitle">${result.exchange} · ${result.candles[0]?.date ?? ''} → ${result.candles[result.candles.length - 1]?.date ?? ''}</p>

  <!-- Stats Dashboard -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="label">Total Return</div>
      <div class="value ${result.totalReturn >= 0 ? 'positive' : 'negative'}">${result.totalReturn}%</div>
    </div>
    <div class="stat-card">
      <div class="label">Win Rate</div>
      <div class="value">${result.winRate}%</div>
    </div>
    <div class="stat-card">
      <div class="label">Max Drawdown</div>
      <div class="value negative">${result.maxDrawdown}%</div>
    </div>
    <div class="stat-card">
      <div class="label">Sharpe Ratio</div>
      <div class="value">${result.sharpeRatio}</div>
    </div>
    <div class="stat-card">
      <div class="label">Profit Factor</div>
      <div class="value">${result.profitFactor}</div>
    </div>
    <div class="stat-card">
      <div class="label">Total Trades</div>
      <div class="value">${result.totalTrades}</div>
    </div>
    <div class="stat-card">
      <div class="label">Initial Capital</div>
      <div class="value">₹${result.initialCapital.toLocaleString()}</div>
    </div>
    <div class="stat-card">
      <div class="label">Final Equity</div>
      <div class="value ${result.finalEquity >= result.initialCapital ? 'positive' : 'negative'}">₹${Math.round(result.finalEquity).toLocaleString()}</div>
    </div>
  </div>

  <!-- Chart placeholders — TODO: Replace with real interactive charts -->
  <div class="chart-placeholder">
    <p>📊 Price Chart with BUY/SELL Markers</p>
    <p style="font-size:12px;margin-top:8px;">TODO: Render using Chart.js or Lightweight Charts</p>
    <p style="font-size:11px;margin-top:4px;color:#444;">Data points loaded: ${result.candles.length} candles</p>
  </div>

  <div class="chart-placeholder">
    <p>📈 Equity Curve</p>
    <p style="font-size:12px;margin-top:8px;">TODO: Render equity curve with gradient fill</p>
    <p style="font-size:11px;margin-top:4px;color:#444;">Equity points loaded: ${result.equityCurve.length}</p>
  </div>

  <!-- Trade Log Table -->
  <h2 style="color:#fff;margin-bottom:12px;">Trade Log</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Price</th>
        <th>Shares</th>
        <th>P&amp;L</th>
        <th>Commission</th>
      </tr>
    </thead>
    <tbody>
      ${tradeRows || '<tr><td colspan="6" style="text-align:center;color:#555;">No trades executed</td></tr>'}
    </tbody>
  </table>

  <!-- Embedded data for future chart rendering -->
  <script>
    // TODO: Use these data arrays with Chart.js or Lightweight Charts
    const equityCurveData = ${equityData};
    const priceChartData = ${priceData};
    console.log('[StockEyes Backtest] Chart data loaded:', {
      equityPoints: equityCurveData.length,
      pricePoints: priceChartData.length,
    });
  </script>
</body>
</html>`;

  // TODO: Write to file when filePath is provided
  // In real implementation:
  //   if (filePath) {
  //     const fs = await import('fs/promises');
  //     await fs.writeFile(filePath, html, 'utf-8');
  //   }
  if (filePath) {
    // DEMO: Log that we would write to file
    console.log(`[StockEyes] Chart HTML would be written to: ${filePath}`);
  }

  return html;
}
