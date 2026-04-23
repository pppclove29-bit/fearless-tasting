package com.fearlesstasting.api.storage.service;

import com.fearlesstasting.api.common.util.CuidGenerator;
import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.config.AppProperties;
import java.time.Duration;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

/**
 * 프리사인드 업로드 URL 발급 + 공개 URL 매핑.
 *
 * <h3>왜 클라이언트 직업로드인가</h3>
 * <ul>
 *   <li>이미지 파일이 API 서버를 거치지 않음 → 네트워크 절약·메모리 피크 회피</li>
 *   <li>서버는 <b>인증·MIME·크기·경로</b>만 검증하고 권한이 한정된 서명 URL을 발급</li>
 *   <li>Cloudflare R2도 동일 SDK(v2)로 호환 — endpointOverride만 바꾸면 됨</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class StorageService {

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp", "image/avif"
    );
    private static final long MAX_UPLOAD_BYTES = 10L * 1024 * 1024; // 10 MB

    private final AppProperties props;
    // S3Config가 선택적 — 로컬 개발에서 SDK 없이도 앱 기동되게 ObjectProvider로 감싼다
    private final ObjectProvider<S3Presigner> presignerProvider;

    public PresignedUpload createImageUpload(String folder, String contentType, long contentLength) {
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType)) {
            throw ApiException.badRequest("허용되지 않은 이미지 타입입니다: " + contentType);
        }
        if (contentLength <= 0 || contentLength > MAX_UPLOAD_BYTES) {
            throw ApiException.badRequest("파일 크기가 허용 범위를 벗어났습니다.");
        }

        S3Presigner presigner = presignerProvider.getIfAvailable();
        if (presigner == null) {
            throw ApiException.badRequest("스토리지가 구성되지 않았습니다. STORAGE_ACCESS_KEY를 설정하세요.");
        }

        String safeFolder = sanitizeFolder(folder);
        String ext = extensionFor(contentType);
        String key = safeFolder + "/" + CuidGenerator.generate() + ext;

        PutObjectRequest putRequest = PutObjectRequest.builder()
            .bucket(props.storage().bucket())
            .key(key)
            .contentType(contentType)
            .contentLength(contentLength)
            .build();

        PresignedPutObjectRequest signed = presigner.presignPutObject(PutObjectPresignRequest.builder()
            .signatureDuration(Duration.ofSeconds(props.storage().presignExpireSeconds()))
            .putObjectRequest(putRequest)
            .build());

        String publicUrl = publicUrlFor(key);
        return new PresignedUpload(
            signed.url().toString(),
            publicUrl,
            key,
            signed.httpRequest().method().name(),
            contentType,
            props.storage().presignExpireSeconds()
        );
    }

    private String publicUrlFor(String key) {
        String base = props.storage().publicBaseUrl();
        if (base == null || base.isBlank()) {
            return key;
        }
        return base.endsWith("/") ? base + key : base + "/" + key;
    }

    /** 폴더 경로의 ..·절대경로·제어문자 방지 — path traversal 차단. */
    private String sanitizeFolder(String folder) {
        if (folder == null || folder.isBlank()) return "uploads";
        String cleaned = folder.replaceAll("[^a-zA-Z0-9/_-]", "");
        if (cleaned.isBlank() || cleaned.startsWith("/")) return "uploads";
        return cleaned;
    }

    private String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/avif" -> ".avif";
            default -> "";
        };
    }

    public record PresignedUpload(
        String uploadUrl,
        String publicUrl,
        String key,
        String httpMethod,
        String contentType,
        long expiresInSeconds
    ) {}
}
