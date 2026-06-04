# stockseyes

Official [Stockseyes](https://github.com/stockseyes/stockseyes-package) SDK for Kotlin/JVM — real-time **Indian stock market (NSE/BSE)** quotes, instrument search, and market data, served through the Stockseyes APIs on [RapidAPI](https://rapidapi.com/).

Conforms to the same cross-SDK contract as `@stockseyes/node` and Python `stockseyes`.

## Install

### Gradle (Kotlin DSL)

```kotlin
implementation("io.github.stockseyes:stockseyes:0.1.0")
```

### Gradle (Groovy DSL)

```groovy
implementation 'io.github.stockseyes:stockseyes:0.1.0'
```

### Maven

```xml
<dependency>
    <groupId>io.github.stockseyes</groupId>
    <artifactId>stockseyes</artifactId>
    <version>0.1.0</version>
</dependency>
```

> Requires **JDK 11** or higher.

## Quickstart

```kotlin
import com.stockseyes.useStockEyes
import com.stockseyes.StockEyesConfig

fun main() {
    val client = useStockEyes(StockEyesConfig(apiKey = "your-rapidapi-key"))

    val quote = client.quote("RELIANCE")
    println("${quote.symbol}  ₹${quote.price}  (${String.format("%.2f", quote.changePercent)}%)")
}
```

## Getting an API key

1. Subscribe to the Stockseyes API on RapidAPI.
2. Copy your **`X-RapidAPI-Key`** from the RapidAPI dashboard.
3. Pass it to `StockEyesConfig(apiKey = ...)`.

## ⚠️ Keep your key server-side

Your RapidAPI key is a **secret**. Never expose it in client-side or public code.

- **Do:** use this SDK in a backend service / API route / script.
- **If you must call from the browser:** put a proxy in front of RapidAPI and point the SDK at it with the `baseUrl` option.

## API

### `useStockEyes(config) → StockEyesClient`

| Config | Type | Default | Description |
| --- | --- | --- | --- |
| `apiKey` | `String` | — | **Required.** Your RapidAPI key (`x-rapidapi-key`). |
| `host` | `String?` | Stockseyes RapidAPI host | Bare RapidAPI host (`x-rapidapi-host`). |
| `baseUrl` | `String?` | `https://<host>/v1` | Override the request base URL (e.g. to point at your proxy). |
| `timeoutMs` | `Int` | `10000` | Per-request timeout in milliseconds. |

### `client.quote(symbol, exchange = "NSE") → Quote`

```kotlin
val q = client.quote("TCS", "NSE")
// Quote(symbol, name, price, change, changePercent, open, high, low,
//       volume, marketCap, timestamp, currency, exchange)
```

### `client.batchQuote(symbols, exchange = "NSE") → Map<String, BatchQuoteEntry>`

Fetches many quotes in parallel (using a thread pool). Per-symbol failures are returned as `BatchQuoteEntry.Failure` entries rather than raised, so the call as a whole never throws on partial failure.

```kotlin
import com.stockseyes.BatchQuoteEntry

val batch = client.batchQuote(listOf("RELIANCE", "TCS", "INFY"))
for ((symbol, entry) in batch) {
    when (entry) {
        is BatchQuoteEntry.Success -> println("$symbol: ₹${entry.quote.price}")
        is BatchQuoteEntry.Failure -> println("$symbol: ${entry.error}")
    }
}
```

### `client.search(term, options = SearchOptions()) → SearchResult`

```kotlin
val results = client.search("REL", SearchOptions(limit = 10, offset = 0))
for (instrument in results.results) {
    println("${instrument.symbol} — ${instrument.name}")
}
```

## Error handling

Every failed request raises a typed `StockEyesError` so you can react programmatically:

```kotlin
import com.stockseyes.StockEyesError
import com.stockseyes.StockEyesErrorCode
import com.stockseyes.isStockEyesError

try {
    val quote = client.quote("RELIANCE")
} catch (err: StockEyesError) {
    when (err.code) {
        StockEyesErrorCode.RATE_LIMIT -> { /* back off (HTTP 429) */ }
        StockEyesErrorCode.AUTH       -> { /* bad/expired key (401/403) */ }
        StockEyesErrorCode.NOT_FOUND  -> { /* unknown symbol (404) */ }
        StockEyesErrorCode.TIMEOUT    -> { /* exceeded timeoutMs */ }
        StockEyesErrorCode.NETWORK    -> { /* connection failed */ }
        else                          -> { /* other HTTP error — see err.status */ }
    }
} catch (err: Throwable) {
    if (isStockEyesError(err)) {
        // Alternative type guard check
    }
}
```

`StockEyesError` exposes `code` (`RATE_LIMIT | AUTH | NOT_FOUND | HTTP | NETWORK | TIMEOUT`) and `status` (HTTP status, or `0` for network/timeout).

## Development

```bash
cd kotlin
./gradlew test
```

## License

[MIT](./LICENSE) © Tushar Singhal
