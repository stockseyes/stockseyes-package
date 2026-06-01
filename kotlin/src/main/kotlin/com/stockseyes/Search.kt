package com.stockseyes

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
    val requestBody = json.encodeToString(
        kotlinx.serialization.json.JsonObject.serializer(),
        kotlinx.serialization.json.buildJsonObject {
            put("filterRequest", kotlinx.serialization.json.buildJsonObject {
                put("exchange", kotlinx.serialization.json.buildJsonArray {
                    add(kotlinx.serialization.json.JsonPrimitive("NSE"))
                })
                put("instrument_type", kotlinx.serialization.json.buildJsonArray {
                    add(kotlinx.serialization.json.JsonPrimitive("EQ"))
                })
                put("segment", kotlinx.serialization.json.buildJsonArray {
                    add(kotlinx.serialization.json.JsonPrimitive("NSE"))
                })
            })
            put("searchPatterns", kotlinx.serialization.json.buildJsonObject {
                put("tradingsymbol", kotlinx.serialization.json.JsonPrimitive(term))
            })
            put("paginationDetails", kotlinx.serialization.json.buildJsonObject {
                put("limit", kotlinx.serialization.json.JsonPrimitive(options.limit))
                put("offset", kotlinx.serialization.json.JsonPrimitive(options.offset))
            })
        }
    )

    val body = httpPost(config, "/public/instruments/search", requestBody)
    val raw = json.decodeFromString<RawSearchResponse>(body)

    return SearchResult(
        query = term,
        results = raw.instruments.map { normalizeInstrument(it) },
    )
}
