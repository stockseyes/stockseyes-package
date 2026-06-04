package com.stockseyes

import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource
import java.net.InetSocketAddress

/**
 * HTTP layer tests — URL building and error mapping.
 *
 * Mirrors `node/test/http.test.ts` and `python/tests/test_http.py` exactly:
 * verifies `buildUrl` encodes params correctly, and that HTTP/network/timeout
 * errors are mapped to the correct [StockEyesError] codes.
 */
class HttpTest {

    // -- buildUrl tests ----------------------------------------------------

    @Test
    fun `buildUrl encodes query params`() {
        val url = buildUrl(
            "https://h/v1",
            "/rapidapi/stock/quote",
            mapOf("tradingSymbol" to "M&M", "exchange" to "NSE"),
        )
        assertEquals(
            "https://h/v1/rapidapi/stock/quote?tradingSymbol=M%26M&exchange=NSE",
            url,
        )
    }

    @Test
    fun `buildUrl omits query string when no params`() {
        assertEquals("https://h/v1/x", buildUrl("https://h/v1", "/x"))
    }

    @Test
    fun `buildUrl omits query string for null params`() {
        assertEquals("https://h/v1/x", buildUrl("https://h/v1", "/x", null))
    }

    @Test
    fun `buildUrl skips null values in params`() {
        val url = buildUrl("https://h", "/x", mapOf("a" to 1, "b" to null, "c" to 2))
        assertEquals("https://h/x?a=1&c=2", url)
    }

    @Test
    fun `buildUrl returns no query string when all params are null`() {
        val url = buildUrl("https://h", "/x", mapOf("a" to null, "b" to null))
        assertEquals("https://h/x", url)
    }

    // -- Helpers: local HTTP server ----------------------------------------

    private fun withServer(
        statusCode: Int,
        body: String,
        block: (Int) -> Unit,
    ) {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/") { exchange ->
            val payload = body.toByteArray(Charsets.UTF_8)
            exchange.sendResponseHeaders(statusCode, payload.size.toLong())
            exchange.responseBody.use { it.write(payload) }
        }
        server.start()
        try {
            block(server.address.port)
        } finally {
            server.stop(0)
        }
    }

    private fun configFor(port: Int) = HttpConfig(
        apiKey = "test-key",
        host = "example.p.rapidapi.com",
        baseURL = "http://127.0.0.1:$port",
        timeoutMs = 5000,
    )

    // -- httpGet error mapping tests ---------------------------------------

    @ParameterizedTest
    @CsvSource(
        "401, AUTH",
        "403, AUTH",
        "404, NOT_FOUND",
        "429, RATE_LIMIT",
        "500, HTTP",
    )
    fun `maps HTTP status to StockEyesError code`(status: Int, expectedCode: String) {
        withServer(status, "{}") { port ->
            val err = assertThrows<StockEyesError> {
                httpGet(configFor(port), "/q")
            }
            assertEquals(StockEyesErrorCode.valueOf(expectedCode), err.code)
            assertEquals(status, err.status)
        }
    }

    @Test
    fun `throws when response body has an error field`() {
        withServer(200, """{"error": "bad symbol"}""") { port ->
            val err = assertThrows<StockEyesError> {
                httpGet(configFor(port), "/q")
            }
            assertTrue(isStockEyesError(err))
            assertEquals("bad symbol", err.message)
        }
    }

    @Test
    fun `resolves with parsed body on success`() {
        withServer(200, """{"hello": "world"}""") { port ->
            val result = httpGet(configFor(port), "/q")
            assertTrue(result.contains("\"hello\""))
            assertTrue(result.contains("\"world\""))
        }
    }

    @Test
    fun `timeout error`() {
        // Use an unreachable address with a very short timeout
        val config = HttpConfig(
            apiKey = "test-key",
            host = "example.p.rapidapi.com",
            baseURL = "http://198.51.100.1",  // TEST-NET-2: non-routable
            timeoutMs = 500,
        )
        val err = assertThrows<StockEyesError> {
            httpGet(config, "/q")
        }
        assertTrue(
            err.code == StockEyesErrorCode.TIMEOUT || err.code == StockEyesErrorCode.NETWORK,
            "Expected TIMEOUT or NETWORK, got ${err.code}"
        )
    }

    @Test
    fun `network error on refused connection`() {
        val config = HttpConfig(
            apiKey = "test-key",
            host = "example.p.rapidapi.com",
            baseURL = "http://127.0.0.1:1",  // Almost certainly refused
            timeoutMs = 2000,
        )
        val err = assertThrows<StockEyesError> {
            httpGet(config, "/q")
        }
        assertTrue(
            err.code == StockEyesErrorCode.NETWORK || err.code == StockEyesErrorCode.TIMEOUT,
            "Expected NETWORK or TIMEOUT, got ${err.code}"
        )
    }
}
