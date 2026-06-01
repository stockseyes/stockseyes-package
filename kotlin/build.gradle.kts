plugins {
    kotlin("jvm") version "1.9.25"
    kotlin("plugin.serialization") version "1.9.25"
    `java-library`
    `maven-publish`
}

group = "com.stockseyes"
version = "0.1.0"

repositories {
    mavenCentral()
}

dependencies {
    // Sole runtime dependency — Kotlin has no built-in JSON parser.
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")

    // Test
    testImplementation(kotlin("test"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
}

java {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
    withSourcesJar()
    withJavadocJar()
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
    kotlinOptions {
        jvmTarget = "11"
    }
}

tasks.test {
    useJUnitPlatform()
}

publishing {
    publications {
        create<MavenPublication>("maven") {
            from(components["java"])

            pom {
                name.set("stockseyes")
                description.set(
                    "Official Stockseyes SDK for Kotlin/JVM — real-time Indian stock market " +
                    "(NSE/BSE) quotes, instrument search, and market data via RapidAPI."
                )
                url.set("https://github.com/stockseyes/stockseyes-package/tree/main/kotlin#readme")

                licenses {
                    license {
                        name.set("MIT")
                        url.set("https://opensource.org/licenses/MIT")
                    }
                }

                developers {
                    developer {
                        name.set("Tushar Singhal")
                    }
                }

                scm {
                    url.set("https://github.com/stockseyes/stockseyes-package")
                    connection.set("scm:git:git://github.com/stockseyes/stockseyes-package.git")
                }
            }
        }
    }
}
