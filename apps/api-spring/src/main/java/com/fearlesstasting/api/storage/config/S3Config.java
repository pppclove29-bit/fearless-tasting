package com.fearlesstasting.api.storage.config;

import com.fearlesstasting.api.config.AppProperties;
import java.net.URI;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * AWS SDK v2 S3Client / S3Presigner 빈.
 * {@code app.storage.access-key} 가 비어있으면 빈 등록 자체를 건너뛰어 로컬 개발 편의.
 * (ConditionalOnProperty는 빈 문자열도 "존재"로 판정하므로 SpEL로 공백 체크)
 */
@Configuration
@ConditionalOnExpression("'${app.storage.access-key:}' != ''")
public class S3Config {

    @Bean
    public S3Client s3Client(AppProperties props) {
        var builder = S3Client.builder()
            .region(Region.of(props.storage().region()))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(props.storage().accessKey(), props.storage().secretKey())
            ));
        if (props.storage().endpoint() != null && !props.storage().endpoint().isBlank()) {
            builder.endpointOverride(URI.create(props.storage().endpoint()));
        }
        return builder.build();
    }

    @Bean
    public S3Presigner s3Presigner(AppProperties props) {
        var builder = S3Presigner.builder()
            .region(Region.of(props.storage().region()))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(props.storage().accessKey(), props.storage().secretKey())
            ));
        if (props.storage().endpoint() != null && !props.storage().endpoint().isBlank()) {
            builder.endpointOverride(URI.create(props.storage().endpoint()));
        }
        return builder.build();
    }
}
