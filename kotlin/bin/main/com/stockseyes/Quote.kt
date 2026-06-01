package com.stockseyes

import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.concurrent.Callable
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Normalise a raw upstream quote into the SDK's [Quote] shape.
 *
 * This is a **pure, exported function** so tests can target it directly
 * against the shared fixtures.
 *
 * - `changePercent` guards against divide-by-zero (close == 0 → 0%).
 * - `timestamp` is converted to a [java.time.Instant].
 * - `currency` is always `"INR"` (Indian market).
 */
fun normalizeQuote(raw: RawQuote): Quote {
    val close = raw.ohlc.close
    val changePercent = if (close != 0.0) (raw.change / close) * 100.0 else 0.0

    // Parse ISO-8601 timestamp — handle both 'Z' suffix and offsets.
    val timestamp = Instant.from(
        DateTimeFormatter.ISO_DATE_TIME.parse(raw.timestamp)
    )

    return Quote(
        symbol = raw.tradingSymbol,
        name = raw.tradingSymbol,
        price = raw.lastPrice,
        change = raw.change,
        changePercent = changePercent,
        open = raw.ohlc.open,
        high = raw.ohlc.high,
        low = raw.ohlc.low,
        volume = raw.volumeTradedToday,
        marketCap = raw.marketCapInCrores,
        timestamp = timestamp,
        currency = "INR",
        exchange = raw.exchange,
    )
}

/**
 * Fetch and normalise a single real-time quote.
 */
internal fun getQuote(config: HttpConfig, symbol: String, exchange: String = "NSE"): Quote {
    val body = httpGet(config, "/rapidapi/stock/quote", mapOf(
        "tradingSymbol" to symbol,
        "exchange" to exchange,
    ))
    val raw = json.decodeFromString<RawQuote>(body)
    return normalizeQuote(raw)
}

/**
 * Fetch quotes for multiple symbols in parallel; per-symbol failures are
 * returned, not thrown.
 *
 * Mirrors the Node SDK's `Promise.allSettled` parallelism and the Python
 * SDK's `ThreadPoolExecutor` — worker count is capped at 10 to avoid
 * hammering upstream when callers pass a large list.
 */
internal fun batchQuote(
    config: HttpConfig,
    symbols: List<String>,
    exchange: String = "NSE",
): Map<String, Any> {
    val unique = symbols.map { it.uppercase() }.distinct()
    if (unique.isEmpty()) return emptyMap()

    val pool: ExecutorService = Executors.newFixedThreadPool(minOf(unique.size, 10))
    try {
        val futures = unique.map { symbol ->
            pool.submit(Callable {
                try {
                    symbol to (getQuote(config, symbol, exchange) as Any)
                } catch (e: Exception) {
                    symbol to mapOf("error" to (e.message ?: "Unknown error"))
                }
            })
        }
        return futures.associate { it.get() }
    } finally {
        pool.shutdown()
    }
}
