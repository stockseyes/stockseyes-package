package com.stockseyes.examples

import com.stockseyes.StockEyesConfig
import com.stockseyes.StockEyesError
import com.stockseyes.isStockEyesError
import com.stockseyes.useStockEyes
import kotlin.system.exitProcess

fun main() {
    val apiKey = System.getenv("STOCKSEYES_RAPIDAPI_KEY") ?: ""
    if (apiKey.isEmpty()) {
        System.err.println("Set STOCKSEYES_RAPIDAPI_KEY to your RapidAPI key first.")
        exitProcess(1)
    }

    val client = useStockEyes(StockEyesConfig(apiKey = apiKey))

    try {
        println("quote(\"RELIANCE\")…")
        val q = client.quote("RELIANCE")
        println("  ${q.symbol}  ₹${q.price}  (${String.format("%.2f", q.changePercent)}%)  @ ${q.exchange}")

        println("search(\"REL\")…")
        val s = client.search("REL")
        for (i in s.results) {
            println("  ${i.symbol} — ${i.name}")
        }

        println("\n✅ Live smoke test passed.")
    } catch (err: Throwable) {
        if (err is StockEyesError) {
            System.err.println("\n❌ StockEyesError [${err.code}] status=${err.status}: ${err.message}")
        } else if (isStockEyesError(err)) {
            System.err.println("\n❌ StockEyesError (via type guard): ${err.message}")
        } else {
            System.err.println("\n❌ Unexpected error: ${err.message}")
            err.printStackTrace()
        }
        exitProcess(1)
    }
}
