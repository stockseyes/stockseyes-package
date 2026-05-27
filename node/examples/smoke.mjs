// Live smoke test for @stockseyes/node — confirms real requests work end-to-end
// (most importantly the x-rapidapi-host header fix).
//
// Build first, then run with your key:
//   npm run build
//   STOCKSEYES_RAPIDAPI_KEY=your_key node examples/smoke.mjs
import { useStockEyes, isStockEyesError } from '../dist/index.mjs';

const apiKey = process.env.STOCKSEYES_RAPIDAPI_KEY;
if (!apiKey) {
  console.error('Set STOCKSEYES_RAPIDAPI_KEY to your RapidAPI key first.');
  process.exit(1);
}

const client = useStockEyes({ apiKey });

try {
  console.log('quote("RELIANCE")…');
  const q = await client.quote('RELIANCE');
  console.log(
    `  ${q.symbol}  ₹${q.price}  (${q.changePercent.toFixed(2)}%)  @ ${q.exchange}`
  );

  console.log('search("REL")…');
  const s = await client.search('REL', { limit: 5 });
  for (const i of s.results) console.log(`  ${i.symbol} — ${i.name}`);

  console.log('\n✅ Live smoke test passed.');
} catch (err) {
  if (isStockEyesError(err)) {
    console.error(
      `\n❌ StockEyesError [${err.code}] status=${err.status}: ${err.message}`
    );
  } else {
    console.error('\n❌ Unexpected error:', err);
  }
  process.exit(1);
}
