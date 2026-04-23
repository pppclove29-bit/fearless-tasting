package com.fearlesstasting.api.common.web;

import java.util.List;
import org.springframework.http.HttpStatus;

/**
 * Nest HttpException 응답 포맷과 동일한 형태로 직렬화.
 * <pre>
 * { "statusCode": 400, "message": "...", "error": "Bad Request" }
 * </pre>
 *
 * - 단일 메시지면 {@code message}는 String
 * - 검증 에러 등 다중 메시지면 {@code message}는 {@code List<String>}
 *   (Nest class-validator 기본 동작 그대로)
 */
public record ErrorResponse(
    int statusCode,
    Object message,
    String error
) {
    public static ErrorResponse of(HttpStatus status, String message) {
        return new ErrorResponse(status.value(), message, status.getReasonPhrase());
    }

    public static ErrorResponse of(HttpStatus status, List<String> messages) {
        return new ErrorResponse(status.value(), messages, status.getReasonPhrase());
    }
}
