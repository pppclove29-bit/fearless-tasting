plugins {
    java
    id("org.springframework.boot") version "3.3.5"
    id("io.spring.dependency-management") version "1.1.6"
}

group = "com.fearlesstasting"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

extra["queryDslVersion"] = "5.1.0"

dependencies {
    // ─── Spring Boot Starters ───
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // ─── DB / Migration ───
    runtimeOnly("com.mysql:mysql-connector-j")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-mysql")

    // ─── QueryDSL ───
    implementation("com.querydsl:querydsl-jpa:${property("queryDslVersion")}:jakarta")
    annotationProcessor("com.querydsl:querydsl-apt:${property("queryDslVersion")}:jakarta")
    annotationProcessor("jakarta.annotation:jakarta.annotation-api")
    annotationProcessor("jakarta.persistence:jakarta.persistence-api")

    // ─── MapStruct (DTO <-> Entity) ───
    implementation("org.mapstruct:mapstruct:1.6.2")
    annotationProcessor("org.mapstruct:mapstruct-processor:1.6.2")

    // ─── JWT (jjwt) ───
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

    // ─── Rate Limiting (Bucket4j) ───
    implementation("com.bucket4j:bucket4j-core:8.10.1")

    // ─── 오브젝트 스토리지 (AWS SDK v2 — S3/R2 호환) ───
    implementation(platform("software.amazon.awssdk:bom:2.28.16"))
    implementation("software.amazon.awssdk:s3")
    implementation("software.amazon.awssdk:auth")

    // ─── API Docs ───
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0")

    // ─── Lombok ───
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // ─── Dev / Test ───
    developmentOnly("org.springframework.boot:spring-boot-devtools")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.testcontainers:junit-jupiter:1.20.3")
    testImplementation("org.testcontainers:mysql:1.20.3")
    testRuntimeOnly("com.h2database:h2:2.3.232")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<JavaCompile> {
    options.compilerArgs.addAll(
        listOf(
            "-parameters",
            "-Amapstruct.defaultComponentModel=spring",
            "-Amapstruct.unmappedTargetPolicy=IGNORE",
        ),
    )
}

tasks.withType<Test> {
    useJUnitPlatform()
}

// QueryDSL Q-class 생성 디렉토리를 소스 세트에 추가
sourceSets {
    main {
        java {
            srcDir("${layout.buildDirectory.get()}/generated/sources/annotationProcessor/java/main")
        }
    }
}
