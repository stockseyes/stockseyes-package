// ─────────────────────────────────────────────────────────────────────────────
// backtest_strategy_params.mjs
// ─────────────────────────────────────────────────────────────────────────────
// A deep-dive example showing HOW TO USE EVERY PARAMETER the strategy
// function receives. Run after building:
//
//   npm run build
//   STOCKSEYES_RAPIDAPI_KEY=your_key node examples/backtest_strategy_params.mjs
// ─────────────────────────────────────────────────────────────────────────────

import {
  useStockEyes,
  exportBacktestCSV,
  generateBacktestChart,
} from '../dist/index.mjs';

const apiKey = process.env.STOCKSEYES_RAPIDAPI_KEY ?? 'demo-key';
const client = useStockEyes({ apiKey });

// ─────────────────────────────────────────────────────────────────────────────
// THE STRATEGY FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
//
// Your strategy receives 5 parameters on EVERY candle:
//
//   (candle, index, allCandles, portfolio, indicators) => Signal
//
// Below we demonstrate each one in detail.
// ─────────────────────────────────────────────────────────────────────────────

const fullDemoStrategy = (candle, index, allCandles, portfolio, indicators) => {
  // ═══════════════════════════════════════════════════════════════════════════
  // PARAM 1: candle — The current OHLCV bar
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Shape:
  //   {
  //     date:   string   — ISO date, e.g. "2025-06-02"
  //     open:   number   — opening price
  //     high:   number   — highest price during the bar
  //     low:    number   — lowest price during the bar
  //     close:  number   — closing price (most important for signals)
  //     volume: number   — shares traded during the bar
  //   }
  //
  // Common uses:
  //   - candle.close for trend/price checks
  //   - candle.volume for volume-based filters
  //   - candle.high / candle.low for range analysis

  const priceRange = candle.high - candle.low;
  const isBullishBar = candle.close > candle.open;
  const isHighVolume = candle.volume > 2_000_000;

  // Log on the first candle to show the shape
  if (index === 0) {
    console.log('\n📊 PARAM 1 — candle (first bar):');
    console.log(`   date:   ${candle.date}`);
    console.log(`   open:   ₹${candle.open}`);
    console.log(`   high:   ₹${candle.high}`);
    console.log(`   low:    ₹${candle.low}`);
    console.log(`   close:  ₹${candle.close}`);
    console.log(`   volume: ${candle.volume.toLocaleString()}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARAM 2: index — Which bar number we're on (0-indexed)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Starts at 0 for the first candle. Useful for:
  //   - Skipping early bars until enough data is available
  //   - Time-based rules (e.g., only trade after bar 50)
  //   - Logging / debugging specific bars

  // Example: Skip the first 50 bars so indicators have enough history
  if (index < 50) {
    if (index === 0) {
      console.log('\n🔢 PARAM 2 — index:');
      console.log(`   Current bar index: ${index}`);
      console.log('   Skipping first 50 bars for indicator warmup...');
    }
    return 'HOLD';
  }

  // Log once when warmup ends
  if (index === 50) {
    console.log(`   ✅ Warmup done! Trading starts at bar ${index}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARAM 3: allCandles — Full candle history up to the current bar
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // An array of Candle objects from bar 0 to the current bar (inclusive).
  // NO future data — you can never "peek ahead".
  //
  // Common uses:
  //   - Custom indicator math (e.g. your own moving average)
  //   - Pattern detection over recent bars
  //   - Look-back comparisons

  // Example: Check if today's close is the highest in the last 20 bars
  const recentCandles = allCandles.slice(-20);
  const highestClose = Math.max(...recentCandles.map((c) => c.close));
  const isAt20DayHigh = candle.close >= highestClose;

  // Example: Calculate a simple 5-bar average manually
  const last5 = allCandles.slice(-5);
  const manualAvg = last5.reduce((sum, c) => sum + c.close, 0) / last5.length;

  if (index === 50) {
    console.log('\n📚 PARAM 3 — allCandles:');
    console.log(`   Total candles so far: ${allCandles.length}`);
    console.log(`   First candle date:    ${allCandles[0].date}`);
    console.log(`   Current candle date:  ${allCandles[allCandles.length - 1].date}`);
    console.log(`   20-day highest close: ₹${highestClose}`);
    console.log(`   Manual 5-bar avg:     ₹${manualAvg.toFixed(2)}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARAM 4: portfolio — Your current account state
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Shape:
  //   {
  //     cash:          number   — remaining cash balance
  //     shares:        number   — shares currently held (0 when flat)
  //     direction:     string   — 'LONG' | 'SHORT' | 'FLAT'
  //     avgEntryPrice: number   — average price of open position (0 when flat)
  //     equity:        number   — total value = cash + (shares × price)
  //     unrealizedPnl: number   — floating P&L on open position
  //   }
  //
  // Common uses:
  //   - Check if you're already in a position before entering
  //   - Implement stop-loss / take-profit based on unrealizedPnl
  //   - Risk management based on equity

  if (index === 50) {
    console.log('\n💰 PARAM 4 — portfolio:');
    console.log(`   cash:          ₹${portfolio.cash.toLocaleString()}`);
    console.log(`   shares:        ${portfolio.shares}`);
    console.log(`   direction:     ${portfolio.direction}`);
    console.log(`   avgEntryPrice: ₹${portfolio.avgEntryPrice}`);
    console.log(`   equity:        ₹${portfolio.equity.toLocaleString()}`);
    console.log(`   unrealizedPnl: ₹${portfolio.unrealizedPnl}`);
  }

  // Example: Stop-loss — if unrealized loss exceeds 5%, exit
  if (portfolio.direction === 'LONG' && portfolio.avgEntryPrice > 0) {
    const lossPct =
      ((candle.close - portfolio.avgEntryPrice) / portfolio.avgEntryPrice) * 100;
    if (lossPct < -5) {
      console.log(
        `   🛑 Stop-loss triggered at bar ${index}: ${lossPct.toFixed(2)}% loss`
      );
      return 'SELL'; // close the long
    }
  }

  // Example: Take-profit — if unrealized gain exceeds 10%, exit
  if (portfolio.direction === 'LONG' && portfolio.avgEntryPrice > 0) {
    const gainPct =
      ((candle.close - portfolio.avgEntryPrice) / portfolio.avgEntryPrice) * 100;
    if (gainPct > 10) {
      console.log(
        `   🎯 Take-profit triggered at bar ${index}: +${gainPct.toFixed(2)}% gain`
      );
      return 'SELL'; // close the long
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARAM 5: indicators — Built-in technical analysis helpers
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Each indicator function computes its value at the CURRENT bar.
  // They return null when there isn't enough historical data.
  //
  // ⚠️  ALWAYS check for null before using an indicator value!
  //
  // Available indicators:
  //   indicators.sma(period)                         → number | null
  //   indicators.ema(period)                         → number | null
  //   indicators.rsi(period)                         → number | null
  //   indicators.macd(fast?, slow?, signal?)         → { macd, signal, histogram }
  //   indicators.bollingerBands(period?, stdDev?)    → { upper, middle, lower }
  //   indicators.atr(period)                         → number | null
  //   indicators.vwap()                              → number | null
  //   indicators.stochastic(kPeriod?, dPeriod?)      → { k, d }
  //   indicators.roc(period)                         → number | null
  //   indicators.crossover(seriesA, seriesB)         → boolean
  //   indicators.crossunder(seriesA, seriesB)        → boolean

  // ─── 5a. SMA (Simple Moving Average) ──────────────────────────────────────
  const sma20 = indicators.sma(20); // 20-bar average — trend direction
  const sma50 = indicators.sma(50); // 50-bar average — longer-term trend

  // ─── 5b. EMA (Exponential Moving Average) ─────────────────────────────────
  const ema12 = indicators.ema(12); // faster EMA — reacts quickly
  const ema26 = indicators.ema(26); // slower EMA — smoother signal

  // ─── 5c. RSI (Relative Strength Index) ────────────────────────────────────
  const rsi = indicators.rsi(14); // 0–100 scale, <30 oversold, >70 overbought

  // ─── 5d. MACD (Moving Average Convergence Divergence) ─────────────────────
  const macdResult = indicators.macd(); // default (12, 26, 9)
  // macdResult.macd      → MACD line
  // macdResult.signal    → Signal line
  // macdResult.histogram → MACD - Signal (positive = bullish momentum)

  // ─── 5e. Bollinger Bands ──────────────────────────────────────────────────
  const bb = indicators.bollingerBands(20, 2);
  // bb.upper  → upper band (overbought zone)
  // bb.middle → SMA(20) — the center line
  // bb.lower  → lower band (oversold zone)

  // ─── 5f. ATR (Average True Range) ────────────────────────────────────────
  const atr = indicators.atr(14); // volatility measure — useful for position sizing

  // ─── 5g. VWAP (Volume-Weighted Average Price) ────────────────────────────
  const vwap = indicators.vwap(); // institutional fair price

  // ─── 5h. Stochastic Oscillator ───────────────────────────────────────────
  const stoch = indicators.stochastic(14, 3);
  // stoch.k → fast stochastic (0–100)
  // stoch.d → slow stochastic (smoothed)

  // ─── 5i. ROC (Rate of Change) ────────────────────────────────────────────
  const roc = indicators.roc(10); // percentage price change over 10 bars

  // ─── 5j. Crossover / Crossunder ──────────────────────────────────────────
  // These take two number arrays and check if the first just crossed the second
  // Useful for MA crossover strategies
  // const didCross = indicators.crossover(shortMASeries, longMASeries);

  // Log all indicator values once
  if (index === 50) {
    console.log('\n📐 PARAM 5 — indicators (all values at bar 50):');
    console.log(`   sma(20):           ${sma20}`);
    console.log(`   sma(50):           ${sma50}`);
    console.log(`   ema(12):           ${ema12}`);
    console.log(`   ema(26):           ${ema26}`);
    console.log(`   rsi(14):           ${rsi}`);
    console.log(`   macd():            macd=${macdResult.macd}, signal=${macdResult.signal}, hist=${macdResult.histogram}`);
    console.log(`   bollingerBands():  upper=${bb.upper}, middle=${bb.middle}, lower=${bb.lower}`);
    console.log(`   atr(14):           ${atr}`);
    console.log(`   vwap():            ${vwap}`);
    console.log(`   stochastic():      k=${stoch.k}, d=${stoch.d}`);
    console.log(`   roc(10):           ${roc}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STRATEGY LOGIC — combining all parameters
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Return value must be: 'BUY' | 'SELL' | 'HOLD'
  //
  //   'BUY'  → If FLAT: opens a LONG. If SHORT: closes the short.
  //   'SELL' → If FLAT: opens a SHORT. If LONG: closes the long.
  //   'HOLD' → Do nothing.

  // Guard: ensure all indicators are available
  if (sma20 === null || sma50 === null || rsi === null || atr === null) {
    return 'HOLD';
  }

  // ── Entry: Golden cross + RSI not overbought + high volume ──
  if (
    portfolio.direction === 'FLAT' &&
    sma20 > sma50 &&           // short MA above long MA (uptrend)
    rsi < 65 &&                 // not overbought
    isHighVolume &&             // volume confirmation
    isBullishBar                // current bar is green
  ) {
    return 'BUY';
  }

  // ── Exit: Death cross OR RSI overbought ──
  if (
    portfolio.direction === 'LONG' &&
    (sma20 < sma50 || rsi > 80) // trend reversal or extreme overbought
  ) {
    return 'SELL';
  }

  return 'HOLD';
};

// ─────────────────────────────────────────────────────────────────────────────
// RUN THE BACKTEST
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════');
console.log('  StockEyes Backtest — Strategy Parameters Demo');
console.log('═══════════════════════════════════════════════════════════');

const result = await client.backtestStrategy(fullDemoStrategy, {
  symbol: 'RELIANCE',
  exchange: 'NSE',
  capitalAmount: 500_000,
  commission: 0,
  historicalOptions: {
    period: '1y',
    interval: '1d',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// PRINT RESULTS
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  RESULTS');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  Symbol:         ${result.symbol} (${result.exchange})`);
console.log(`  Initial Capital: ₹${result.initialCapital.toLocaleString()}`);
console.log(`  Final Equity:   ₹${Math.round(result.finalEquity).toLocaleString()}`);
console.log(`  Total Return:   ${result.totalReturn}%`);
console.log(`  Total Trades:   ${result.totalTrades}`);
console.log(`  Winning Trades: ${result.winningTrades}`);
console.log(`  Win Rate:       ${result.winRate}%`);
console.log(`  Max Drawdown:   ${result.maxDrawdown}%`);
console.log(`  Sharpe Ratio:   ${result.sharpeRatio}`);
console.log(`  Profit Factor:  ${result.profitFactor}`);

if (result.trades.length > 0) {
  console.log('\n  Last 5 trades:');
  for (const t of result.trades.slice(-5)) {
    console.log(
      `    ${t.date}  ${t.type.padEnd(4)}  ₹${t.price}  ×${t.shares}  P&L: ₹${t.pnl}`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT OUTPUTS
// ─────────────────────────────────────────────────────────────────────────────

const csv = await exportBacktestCSV(result);
console.log(`\n  CSV preview (first 5 lines):`);
csv.split('\n').slice(0, 5).forEach((line) => console.log(`    ${line}`));

const html = await generateBacktestChart(result);
console.log(`\n  Chart HTML generated: ${html.length} bytes`);
console.log('\n✅ Strategy parameters demo complete.');
