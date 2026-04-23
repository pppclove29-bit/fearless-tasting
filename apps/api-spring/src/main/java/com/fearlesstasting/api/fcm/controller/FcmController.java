package com.fearlesstasting.api.fcm.controller;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.fcm.service.FcmService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "푸시")
@RestController
@RequestMapping("/fcm")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class FcmController {

    private final FcmService fcmService;

    public record RegisterRequest(
        @NotBlank @Size(max = 500) String token,
        @Size(max = 200) String device
    ) {}

    @Operation(summary = "FCM 토큰 등록")
    @PostMapping("/tokens")
    public ResponseEntity<Void> register(@CurrentUser AuthUserPrincipal principal,
                                          @Valid @RequestBody RegisterRequest req) {
        fcmService.registerToken(principal.userId(), req.token(), req.device());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "FCM 토큰 삭제")
    @DeleteMapping("/tokens")
    public ResponseEntity<Void> unregister(@RequestParam String token) {
        fcmService.unregisterToken(token);
        return ResponseEntity.noContent().build();
    }
}
