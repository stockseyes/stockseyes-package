package com.stockseyes

import kotlinx.serialization.json.Json
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import java.io.File

/**
 * Normaliser tests — asserts against the shared fixtures.
 *
 * Mirrors `node/test/normalize.test.ts` and `python/tests/test_normalize.py`
 * exactly: load the raw fixture, run the normaliser, and verify the output
 * matches the `*.normalized.json` fixture.
 */
class NormalizeTest {

    private val fixturesDir = File(
        System.getProperty("user.dir")
    ).resolve("../fixtures").canonicalFile

    private fun loadFixture(name: String): String =
        fixturesDir.resolve(name).readText(Charsets.UTF_8)

    private val jsonParser = Json { ignoreUnknownKeys = true; isLenient = true }

    // -- Quote normalisation -----------------------------------------------

    @Test
    fun `normalizeQuote turns raw quote fixture into normalised fixture`() {
        val rawJson = loadFixture("quote.json")
        val expectedJson = loadFixture("quote.normalized.json")

        val raw = jsonParser.decodeFromString<RawQuote>(rawJson)
        val expected = jsonParser.parseToJsonElement(expectedJson) as kotlinx.serialization.json.JsonObject

        val q = normalizeQuote(raw)

        assertEquals(expected["symbol"]!!.asPrimitive().content, q.symbol)
        assertEquals(expected["name"]!!.asPrimitive().content, q.name)
        assertEquals(expected["price"]!!.asPrimitive().double, q.price)
        assertEquals(expected["change"]!!.asPrimitive().double, q.change)
        assertEquals(expected["open"]!!.asPrimitive().double, q.open)
        assertEquals(expected["high"]!!.asPrimitive().double, q.high)
        assertEquals(expected["low"]!!.asPrimitive().double, q.low)
        assertEquals(expected["volume"]!!.asPrimitive().long, q.volume)
        assertEquals(expected["marketCap"]!!.asPrimitive().double, q.marketCap)
        assertEquals(expected["currency"]!!.asPrimitive().content, q.currency)
        assertEquals(expected["exchange"]!!.asPrimitive().content, q.exchange)

        // changePercent: floating-point tolerance
        assertEquals(
            expected["changePercent"]!!.asPrimitive().double,
            q.changePercent,
            1e-6,
            "changePercent should match within tolerance"
        )

        // timestamp: ISO string matches fixture
        assertEquals(
            expected["timestamp"]!!.asPrimitive().content,
            q.toMap()["timestamp"],
        )
    }

    @Test
    fun `normalizeQuote returns zero percent when close is zero`() {
        val rawJson = loadFixture("quote.json")
        val raw = jsonParser.decodeFromString<RawQuote>(rawJson)
        val modified = raw.copy(
            change = 10.0,
            ohlc = raw.ohlc.copy(close = 0.0),
        )

        val q = normalizeQuote(modified)

        assertEquals(0.0, q.changePercent)
    }

    @Test
    fun `normalizeQuote converts non-UTC offset to UTC`() {
        val rawJson = loadFixture("quote.json")
        val raw = jsonParser.decodeFromString<RawQuote>(rawJson)
        // 15:45 IST (+05:30) is exactly the 10:15 UTC the fixture already encodes.
        val modified = raw.copy(timestamp = "2026-05-27T15:45:00.000+05:30")

        val q = normalizeQuote(modified)

        assertEquals("2026-05-27T10:15:00.000Z", q.toMap()["timestamp"])
    }

    // -- Search / instrument normalisation ---------------------------------

    @Test
    fun `normalizeInstrument turns raw search fixture into normalised results`() {
        val rawJson = loadFixture("search.json")
        val expectedJson = loadFixture("search.normalized.json")

        val raw = jsonParser.decodeFromString<RawSearchResponse>(rawJson)
        val expected = jsonParser.parseToJsonElement(expectedJson) as kotlinx.serialization.json.JsonObject
        val expectedResults = expected["results"] as kotlinx.serialization.json.JsonArray

        val result = raw.instruments.map { normalizeInstrument(it) }

        assertEquals(expectedResults.size, result.size)
        result.forEachIndexed { i, instrument ->
            val exp = expectedResults[i] as kotlinx.serialization.json.JsonObject
            assertEquals(exp["symbol"]!!.asPrimitive().content, instrument.symbol)
            assertEquals(exp["name"]!!.asPrimitive().content, instrument.name)
            assertEquals(exp["exchange"]!!.asPrimitive().content, instrument.exchange)
            assertEquals(exp["type"]!!.asPrimitive().content, instrument.type.value)
            assertEquals(exp["currency"]!!.asPrimitive().content, instrument.currency)
        }
    }
}

// Extension to make JSON assertions cleaner
private fun kotlinx.serialization.json.JsonElement.asPrimitive() =
    this as kotlinx.serialization.json.JsonPrimitive
