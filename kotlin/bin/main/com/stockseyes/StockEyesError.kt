package com.stockseyes

/**
 * Machine-readable error codes for every failure category.
 *
 * Maps directly to the codes defined in the cross-SDK contract:
 * `rate_limit | auth | not_found | http | network | timeout`.
 */
enum class StockEyesErrorCode(val value: String) {
    RATE_LIMIT("rate_limit"),
    AUTH("auth"),
    NOT_FOUND("not_found"),
    HTTP("http"),
    NETWORK("network"),
    TIMEOUT("timeout");

    override fun toString(): String = value
}

/**
 * Error thrown for every failed request, with a machine-readable [code].
 *
 * Every SDK request path surfaces failures as this type — never a bare
 * `Exception`.
 *
 * @property code One of `rate_limit`, `auth`, `not_found`, `http`, `network`,
 *   or `timeout`.
 * @property status The HTTP status code, or `0` for network/timeout failures.
 */
class StockEyesError(
    message: String,
    val code: StockEyesErrorCode,
    val status: Int = 0,
) : Exception(message) {

    override fun toString(): String =
        "StockEyesError(\"$message\", code=${code.value}, status=$status)"
}

/**
 * Type-guard: returns `true` if [err] is a [StockEyesError].
 */
fun isStockEyesError(err: Throwable): Boolean = err is StockEyesError

/**
 * Map an HTTP status code to a [StockEyesErrorCode].
 */
internal fun codeForStatus(status: Int): StockEyesErrorCode = when {
    status == 401 || status == 403 -> StockEyesErrorCode.AUTH
    status == 404 -> StockEyesErrorCode.NOT_FOUND
    status == 429 -> StockEyesErrorCode.RATE_LIMIT
    else -> StockEyesErrorCode.HTTP
}
