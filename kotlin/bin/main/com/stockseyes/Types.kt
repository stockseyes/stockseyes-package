package com.stockseyes

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/**
 * User-facing configuration for [useStockEyes].
 *
 * @property apiKey RapidAPI key, sent as the `x-rapidapi-key` header. **Required.**
 * @property host Bare RapidAPI host (domain only, no path). Sent as `x-rapidapi-host`.
 * @property baseUrl Full base URL for requests. Defaults to `https://<host>/v1`.
 * @property timeoutMs Per-request timeout in **milliseconds**. Defaults to 10 000.
 */
data class StockEyesConfig(
    val apiKey: String,
    val host: String? = null,
    val baseUrl: String? = null,
    val timeoutMs: Int = 10_000,
)

/**
 * Internal, fully-resolved request configuration.
 */
internal data class HttpConfig(
    val apiKey: String,
    val host: String,
    val baseURL: String,
    val timeoutMs: Int,
)

/**
 * Pagination options for [StockEyesClient.search].
 */
data class SearchOptions(
    val limit: Int = 5,
    val offset: Int = 0,
)

// ---------------------------------------------------------------------------
// Normalised (SDK) shapes — the cross-language contract
// ---------------------------------------------------------------------------

/**
 * Instrument type enum.  Serialises to lowercase to match the spec.
 */
enum class InstrumentType(val value: String) {
    STOCK("stock"),
    ETF("etf"),
    INDEX("index"),
    CRYPTO("crypto"),
    FOREX("forex"),
    UNKNOWN("unknown");

    override fun toString(): String = value
}

/**
 * A normalised real-time stock quote.
 */
data class Quote(
    val symbol: String,
    val name: String,
    val price: Double,
    val change: Double,
    val changePercent: Double,
    val open: Double,
    val high: Double,
    val low: Double,
    val volume: Long,
    val marketCap: Double?,
    val timestamp: Instant,
    val currency: String,
    val exchange: String,
) {
    /**
     * Serialise to a plain map (ISO-8601 UTC timestamp string).
     *
     * Output uses `camelCase` keys matching the spec — identical to the
     * Node SDK's JSON output and the Python SDK's `to_dict()`.
     */
    fun toMap(): Map<String, Any?> {
        val ts = DateTimeFormatter
            .ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            .withZone(ZoneOffset.UTC)
            .format(timestamp)

        return mapOf(
            "symbol" to symbol,
            "name" to name,
            "price" to price,
            "change" to change,
            "changePercent" to changePercent,
            "open" to open,
            "high" to high,
            "low" to low,
            "volume" to volume,
            "marketCap" to marketCap,
            "timestamp" to ts,
            "currency" to currency,
            "exchange" to exchange,
        )
    }
}

/**
 * A normalised search-result instrument.
 */
data class Instrument(
    val symbol: String,
    val name: String,
    val exchange: String,
    val type: InstrumentType,
    val currency: String,
) {
    /** Serialise to a plain map. */
    fun toMap(): Map<String, Any> = mapOf(
        "symbol" to symbol,
        "name" to name,
        "exchange" to exchange,
        "type" to type.value,
        "currency" to currency,
    )
}

/**
 * Normalised search response.
 */
data class SearchResult(
    val query: String,
    val results: List<Instrument>,
) {
    /** Serialise to a plain map. */
    fun toMap(): Map<String, Any> = mapOf(
        "query" to query,
        "results" to results.map { it.toMap() },
    )
}

// ---------------------------------------------------------------------------
// Raw upstream (RapidAPI) response shapes
// ---------------------------------------------------------------------------

@Serializable
internal data class RawOHLC(
    val open: Double,
    val high: Double,
    val low: Double,
    val close: Double,
)

@Serializable
internal data class RawQuote(
    val tradingSymbol: String,
    val exchange: String,
    val lastPrice: Double,
    val change: Double,
    val ohlc: RawOHLC,
    val volumeTradedToday: Long,
    val timestamp: String,
    val marketCapInCrores: Double? = null,
    val lowerCircuitLimit: Double? = null,
    val upperCircuitLimit: Double? = null,
    val lastTradedTime: String? = null,
    val instrumentToken: Long? = null,
    val oi: Double? = null,
    val averagePrice: Double? = null,
    val buyQuantity: Long? = null,
    val sellQuantity: Long? = null,
    val depth: kotlinx.serialization.json.JsonObject? = null,
    val error: String? = null,
)

@Serializable
internal data class RawInstrument(
    @SerialName("instrument_token") val instrumentToken: Long,
    @SerialName("exchange_token") val exchangeToken: String,
    val tradingsymbol: String,
    val name: String,
    @SerialName("last_price") val lastPrice: String,
    val expiry: String,
    val strike: String,
    @SerialName("tick_size") val tickSize: String,
    @SerialName("lot_size") val lotSize: String,
    @SerialName("instrument_type") val instrumentType: String,
    val segment: String,
    val exchange: String,
)

@Serializable
internal data class RawSearchResponse(
    val instruments: List<RawInstrument>,
    val totalCount: Int,
)
