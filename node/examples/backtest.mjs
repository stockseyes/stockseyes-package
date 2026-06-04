// Backtesting example for @stockseyes/node — no API key needed.
// Historical candles are mock-backed for now, so this runs fully offline.
//
// Build first, then run:
//   npm run build
//   node examples/backtest.mjs
import { useStockEyes } from '../dist/index.mjs';
import { createBacktest, feedFromStockEyes } from '../dist/backtest/index.mjs';

const client = useStockEyes({ apiKey: 'example-key' });

const result = await createBacktest({
  feed: feedFromStockEyes(client, {
    symbol: 'RELIANCE',
    from: '2023-01-01',
    to: '2023-12-31',
    interval: '1d',
  }),
  initialCash: 100_000,
  commission: { type: 'percent', value: 0.0003 }, // 3 bps per trade
  strategy: {
    name: 'SMA 20/50 crossover',
    onBar: (ctx) => {
      const fast = ctx.indicator.sma(20);
      const slow = ctx.indicator.sma(50);
      if (fast === undefined || slow === undefined) return; // warming up
      if (!ctx.position.isOpen && fast > slow) ctx.buy();
      else if (ctx.position.isOpen && fast < slow) ctx.close();
    },
  },
}).run();

result.print();
console.log(`\nTrades: ${result.trades.length}, equity points: ${result.equityCurve.length}`);
