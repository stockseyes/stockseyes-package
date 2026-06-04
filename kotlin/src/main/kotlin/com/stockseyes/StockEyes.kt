package com.stockseyes

private const val DEFAULT_HOST =
    "indian-stock-market-data-nse-bse-bcd-mcx-cds-nfo.p.rapidapi.com"
private const val DEFAULT_TIMEOUT_MS = 10_000

/**
 * Client returned by [useStockEyes].
 *
 * Do not instantiate directly — use the [useStockEyes] factory.
 */
class StockEyesClient internal constructor(private val config: HttpConfig) {

    /**
     * Get a real-time quote for a single instrument.
     *
     * @param symbol Trading symbol (e.g. `"RELIANCE"`).
     * @param exchange Exchange code. Defaults to `"NSE"`.
     * @return A normalised [Quote].
     * @throws StockEyesError on any request failure.
     */
    fun quote(symbol: String, exchange: String = "NSE"): Quote =
        getQuote(config, symbol, exchange)

    /**
     * Fetch quotes for multiple symbols; per-symbol failures are returned,
     * not thrown.
     *
     * @param symbols List of trading symbols.
     * @param exchange Exchange code. Defaults to `"NSE"`.
     * @return A map of symbol → [Quote] or `{ "error": "..." }`.
     */
    fun batchQuote(symbols: List<String>, exchange: String = "NSE"): Map<String, Any> =
        batchQuote(config, symbols, exchange)

    /**
     * Search instruments by trading symbol.
     *
     * @param term Search term (e.g. `"REL"`).
     * @param options Pagination options.
     * @return A normalised [SearchResult].
     * @throws StockEyesError on any request failure.
     */
    fun search(term: String, options: SearchOptions = SearchOptions()): SearchResult =
        searchInstruments(config, term, options)
}

/**
 * Create a Stockseyes API client.
 *
 * This is the **only** entry point. Do not instantiate [StockEyesClient]
 * directly.
 *
 * ```kotlin
 * val client = useStockEyes(StockEyesConfig(apiKey = "your-rapidapi-key"))
 * val quote = client.quote("RELIANCE")
 * ```
 *
 * @param config A [StockEyesConfig] with at least [StockEyesConfig.apiKey] set.
 * @return A [StockEyesClient] ready to make API calls.
 * @throws IllegalArgumentException if [StockEyesConfig.apiKey] is empty.
 */
fun useStockEyes(config: StockEyesConfig): StockEyesClient {
    require(config.apiKey.isNotEmpty()) { "[StockEyes] apiKey is required" }

    val host = config.host ?: DEFAULT_HOST
    val httpConfig = HttpConfig(
        apiKey = config.apiKey,
        host = host,
        baseURL = config.baseUrl ?: "https://$host/v1",
        timeoutMs = config.timeoutMs,
    )
    return StockEyesClient(httpConfig)
}
