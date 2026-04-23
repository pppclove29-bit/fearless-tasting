package com.fearlesstasting.api.storage.controller;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.common.ratelimit.RateLimit;
import com.fearlesstasting.api.storage.service.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "스토리지")
@RestController
@RequestMapping("/storage")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class StorageController {

    private final StorageService storageService;

    public record PresignRequest(
        @NotBlank String folder,         // "restaurant-images" 등
        @NotBlank String contentType,    // "image/jpeg" 등
        @Positive  long   contentLength  // 바이트
    ) {}

    @Operation(summary = "이미지 업로드용 프리사인드 URL 발급")
    @PostMapping("/presigned-upload")
    @RateLimit(capacity = 30, refillSeconds = 60)
    public StorageService.PresignedUpload presignedUpload(
        @CurrentUser AuthUserPrincipal principal,
        @Valid @RequestBody PresignRequest req
    ) {
        // 유저별 폴더 스코프 — path traversal + 타 유저 폴더 침범 차단
        String scoped = "users/" + principal.userId() + "/" + req.folder();
        return storageService.createImageUpload(scoped, req.contentType(), req.contentLength());
    }
}
