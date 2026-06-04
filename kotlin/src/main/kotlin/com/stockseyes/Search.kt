package com.stockseyes

import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject

/**
 * Map a raw `instrument_type` string to the normalised [InstrumentType].
 */
internal fun normalizeType(raw: String = ""): InstrumentType {
    val t = raw.lowercase()
    return if ("eq" in t || "equity" in t || "stock" in t) {
        InstrumentType.STOCK
    } else {
        InstrumentType.UNKNOWN
    }
}

/**
 * Normalise a single raw instrument into the SDK's [Instrument] shape.
 *
 * This is a **pure, exported function** so tests can target it directly
 * against the shared fixtures.
 */
fun normalizeInstrument(raw: RawInstrument): Instrument = Instrument(
    symbol = raw.tradingsymbol,
    name = raw.name,
    exchange = raw.exchange,
    type = normalizeType(raw.instrumentType),
    currency = "INR",
)

/**
 * Search instruments by trading symbol.
 */
internal fun searchInstruments(
    config: HttpConfig,
    term: String,
    options: SearchOptions = SearchOptions(),
): SearchResult {
    val requestBody = buildJsonObject {
        putJsonObject("filterRequest") {
            putJsonArray("exchange") { add("NSE") }
            putJsonArray("instrument_type") { add("EQ") }
            putJsonArray("segment") { add("NSE") }
        }
        putJsonObject("searchPatterns") {
            put("tradingsymbol", term)
        }
        putJsonObject("paginationDetails") {
            put("limit", options.limit)
            put("offset", options.offset)
        }
    }.toString()

    val body = httpPost(config, "/public/instruments/search", requestBody)
    val raw = json.decodeFromString<RawSearchResponse>(body)

    return SearchResult(
        query = term,
        results = raw.instruments.map { normalizeInstrument(it) },
    )
}
