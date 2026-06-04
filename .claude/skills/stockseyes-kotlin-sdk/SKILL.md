---
name: stockseyes-kotlin-sdk
description: Implementation conventions for the stockseyes Kotlin/JVM package. Use when writing or changing any code under kotlin/.
---

# stockseyes (Kotlin) conventions

`kotlin/` is the Kotlin/JVM SDK for Stockseyes, conforming to the same contract as `@stockseyes/node` and Python `stockseyes`. Follow the existing patterns in `kotlin/src/main/kotlin/com/stockseyes/` rather than introducing new ones.

## Public surface

- The only entry point is the factory **`useStockEyes(config)`**, returning a `StockEyesClient`. Do not require users to instantiate the client directly.
- Export public classes (`StockEyesConfig`, `SearchOptions`, `Quote`, `Instrument`, `SearchResult`, `BatchQuoteEntry`, `StockEyesErrorCode`, `StockEyesError`, `isStockEyesError`, `InstrumentType`) from the `com.stockseyes` package.
- `batchQuote` returns `Map<String, BatchQuoteEntry>` where `BatchQuoteEntry` is a sealed class with `Success(quote)` and `Failure(error)` cases — gives callers exhaustive `when` matching without unchecked casts.

## Config

- `StockEyesConfig`: `apiKey` (required) + optional `host`, `baseUrl`, `timeoutMs`. Resolve it into the internal `HttpConfig`.
- `baseUrl = config.baseUrl ?: "https://$host/v1"`. `host` is the **bare domain** used for the `x-rapidapi-host` header — never put a path or protocol in `host`.

## HTTP layer (`kotlin/src/main/kotlin/com/stockseyes/Http.kt`)

- All requests go through `httpGet` / `httpPost`. Build URLs with `buildUrl` (which uses `URLEncoder.encode` and `&`-join) — never string-concatenate query params.
- Uses `java.net.HttpURLConnection` from the standard library to avoid external runtime HTTP clients.
- `kotlinx-serialization-json` is the sole runtime dependency for JSON parsing.
- Set the `x-rapidapi-key` + `x-rapidapi-host` headers and connection/read timeout values.

## Errors

- Every failure throws a `StockEyesError(message, code, status)`. Codes are defined by the `StockEyesErrorCode` enum: `RATE_LIMIT, AUTH, NOT_FOUND, HTTP, NETWORK, TIMEOUT`.
- Status → code mapping: 401/403 → `AUTH`, 404 → `NOT_FOUND`, 429 → `RATE_LIMIT`, other non-2xx → `HTTP`; `SocketTimeoutException` → `TIMEOUT`; other `IOException` → `NETWORK`.
- Never throw a bare `Exception` from a request path.

## Normalisation

- Keep raw wire types separate from the normalised dataclasses.
- Normalisers (`normalizeQuote`, `normalizeInstrument`) are **pure, exported functions** (so tests can target them directly).
- Convert timestamps to `java.time.Instant`, guard divide-by-zero (e.g. `changePercent = if (close != 0) (change / close) * 100 else 0.0`), and the market is Indian so `currency: "INR"`.

## Naming & Serialization

- Kotlin names use `camelCase` for functions/variables and `PascalCase` for classes/enums.
- Dataclasses must provide a `toMap()` method matching the camelCase contract layout for cross-SDK uniformity.
- Raw wire models are annotated with `@Serializable` and `@SerialName` to handle JSON mappings.

## Packaging

- Built via Gradle Kotlin DSL targeting **JDK 11**.
- Published as Maven artifact `io.github.stockseyes:stockseyes` via the `com.vanniktech.maven.publish` plugin (Sonatype Central Portal). The `io.github.<gh-org>` namespace is used because we don't own the `stockseyes.com` domain — never change this to `com.stockseyes` without going through Sonatype namespace verification.

## Testing

- JUnit 5. Load shared fixtures from `../../fixtures` and assert normalised output.
- Run test task via `./gradlew test` from the `kotlin/` directory.
