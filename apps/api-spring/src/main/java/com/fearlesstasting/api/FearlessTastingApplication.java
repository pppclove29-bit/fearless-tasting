package com.fearlesstasting.api;

import com.fearlesstasting.api.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
@EnableConfigurationProperties(AppProperties.class)
public class FearlessTastingApplication {

    public static void main(String[] args) {
        SpringApplication.run(FearlessTastingApplication.class, args);
    }
}
