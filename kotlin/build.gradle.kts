import org.jetbrains.kotlin.gradle.tasks.KotlinCompile
import com.vanniktech.maven.publish.SonatypeHost

plugins {
    kotlin("jvm") version "1.9.25"
    kotlin("plugin.serialization") version "1.9.25"
    `java-library`
    id("com.vanniktech.maven.publish") version "0.29.0"
    signing
}

group = "io.github.stockseyes"
version = "0.1.0"

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")

    testImplementation(kotlin("test"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
}

java {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
}

tasks.withType<KotlinCompile>().configureEach {
    kotlinOptions {
        jvmTarget = "11"
    }
}

tasks.test {
    useJUnitPlatform()
}

mavenPublishing {
    publishToMavenCentral(SonatypeHost.CENTRAL_PORTAL)

    signAllPublications()

    coordinates(
        groupId = "io.github.stockseyes",
        artifactId = "stockseyes",
        version = version.toString()
    )

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
                id.set("tusharsinghal")
                name.set("Tushar Singhal") 
            }
        }

        scm {
            url.set("https://github.com/stockseyes/stockseyes-package")
            connection.set("scm:git:git://github.com/stockseyes/stockseyes-package.git")
            developerConnection.set("scm:git:ssh://github.com/stockseyes/stockseyes-package.git")
        }
    }
}