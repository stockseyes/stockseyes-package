package com.stockseyes

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.IOException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URI
import java.net.URLEncoder

/**
 * Internal JSON parser — lenient to tolerate unknown keys in upstream
 * responses (the raw payloads may contain fields not in our model).
 */
internal val json = Json {
    ignoreUnknownKeys = true
    isLenient = true
}

/**
 * Build a full URL, encoding query params via [URLEncoder] — never
 * string-concatenate query params.
 *
 * `null` values are silently dropped (matches the Node/Python SDK behaviour).
 */
internal fun buildUrl(
    baseURL: String,
    path: String,
    params: Map<String, Any?>? = null,
): String {
    val url = "$baseURL$path"
    if (params.isNullOrEmpty()) return url

    val filtered = params.entries
        .filter { it.value != null }
        .joinToString("&") { (k, v) ->
            "${URLEncoder.encode(k, "UTF-8")}=${URLEncoder.encode(v.toString(), "UTF-8")}"
        }
    return if (filtered.isEmpty()) url else "$url?$filtered"
}

/**
 * Issue an HTTP request and return the raw response body as a string.
 *
 * Every failure is mapped to a [StockEyesError] — never a bare exception.
 */
internal fun httpRequest(
    config: HttpConfig,
    path: String,
    method: String = "GET",
    params: Map<String, Any?>? = null,
    body: String? = null,
): String {
    val url = buildUrl(config.baseURL, path, params)

    val connection: HttpURLConnection
    try {
        connection = URI(url).toURL().openConnection() as HttpURLConnection
    } catch (e: IOException) {
        throw StockEyesError(
            "Network error calling $path: ${e.message}",
            StockEyesErrorCode.NETWORK,
        )
    }

    try {
        connection.requestMethod = method
        connection.connectTimeout = config.timeoutMs
        connection.readTimeout = config.timeoutMs
        connection.setRequestProperty("x-rapidapi-key", config.apiKey)
        connection.setRequestProperty("x-rapidapi-host", config.host)
        connection.setRequestProperty("Content-Type", "application/json")

        if (body != null) {
            connection.doOutput = true
            connection.outputStream.use { os ->
                os.write(body.toByteArray(Charsets.UTF_8))
            }
        }

        val status = connection.responseCode
        if (status < 200 || status >= 300) {
            throw StockEyesError(
                "HTTP $status ${connection.responseMessage} calling $path",
                codeForStatus(status),
                status,
            )
        }

        val responseBody = connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }

        // Mirror Node/Python SDK: if the JSON body has a truthy `error` field, throw.
        try {
            val jsonObj = json.parseToJsonElement(responseBody)
            if (jsonObj is JsonObject && jsonObj.containsKey("error")) {
                val errorVal = jsonObj["error"]?.jsonPrimitive?.content
                if (!errorVal.isNullOrEmpty() && errorVal != "null") {
                    throw StockEyesError(errorVal, StockEyesErrorCode.HTTP, status)
                }
            }
        } catch (e: StockEyesError) {
            throw e // re-throw our own errors
        } catch (_: Exception) {
            // JSON parse failure is fine — the body might not be JSON
        }

        return responseBody
    } catch (e: StockEyesError) {
        throw e // re-throw — don't wrap our own errors
    } catch (e: SocketTimeoutException) {
        throw StockEyesError(
            "Request to $path timed out after ${config.timeoutMs}ms",
            StockEyesErrorCode.TIMEOUT,
        )
    } catch (e: IOException) {
        throw StockEyesError(
            "Network error calling $path: ${e.message}",
            StockEyesErrorCode.NETWORK,
        )
    } finally {
        connection.disconnect()
    }
}

/**
 * Issue an HTTP GET request and return the parsed response body.
 */
internal fun httpGet(
    config: HttpConfig,
    path: String,
    params: Map<String, Any?>? = null,
): String = httpRequest(config, path, "GET", params)

/**
 * Issue an HTTP POST request with a JSON body and return the parsed response body.
 */
internal fun httpPost(
    config: HttpConfig,
    path: String,
    body: String,
): String = httpRequest(config, path, "POST", body = body)
