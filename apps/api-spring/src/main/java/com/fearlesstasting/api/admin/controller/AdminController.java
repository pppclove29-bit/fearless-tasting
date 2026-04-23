package com.fearlesstasting.api.admin.controller;

import com.fearlesstasting.api.admin.entity.DemoAccount;
import com.fearlesstasting.api.admin.service.AdminStatsService;
import com.fearlesstasting.api.admin.service.AdminUserService;
import com.fearlesstasting.api.admin.service.DemoAccountService;
import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 - 유저/통계/데모")
@RestController
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminUserService userService;
    private final DemoAccountService demoService;
    private final AdminStatsService statsService;

    // ─── 유저 관리 ──────────────────────────────────────────────────────

    public record UserView(String id, String email, String nickname,
                           String profileImageUrl, String role, LocalDateTime createdAt) {
        static UserView from(User u) {
            return new UserView(u.getId(), u.getEmail(), u.getNickname(),
                u.getProfileImageUrl(), u.getRole(), u.getCreatedAt());
        }
    }

    public record RoleRequest(@NotBlank String role) {}

    @Operation(summary = "이메일로 유저 검색")
    @GetMapping("/admin/users/search")
    public UserView searchByEmail(@RequestParam String email) {
        return UserView.from(userService.searchByEmail(email));
    }

    @Operation(summary = "유저 역할 변경")
    @PatchMapping("/admin/users/{id}/role")
    public UserView updateRole(@PathVariable String id,
                                @Valid @RequestBody RoleRequest req,
                                @CurrentUser AuthUserPrincipal principal) {
        return UserView.from(userService.updateRole(id, req.role(), principal.userId()));
    }

    // ─── 데모 계정 ──────────────────────────────────────────────────────

    public record DemoView(String id, String userId, String email, String nickname,
                           String memo, LocalDateTime createdAt) {
        static DemoView from(DemoAccount d) {
            return new DemoView(d.getId(), d.getUser().getId(), d.getUser().getEmail(),
                d.getUser().getNickname(), d.getMemo(), d.getCreatedAt());
        }
    }

    public record CreateDemoRequest(@Size(max = 200) String memo) {}
    public record UpdateDemoRequest(@Size(max = 200) String memo) {}

    @Operation(summary = "데모 계정 목록")
    @GetMapping("/admin/demo-accounts")
    public List<DemoView> demos() {
        return demoService.list().stream().map(DemoView::from).toList();
    }

    @Operation(summary = "데모 계정 생성")
    @PostMapping("/admin/demo-accounts")
    public DemoView createDemo(@Valid @RequestBody CreateDemoRequest req) {
        return DemoView.from(demoService.createNew(req.memo()));
    }

    @Operation(summary = "데모 계정 메모 수정")
    @PatchMapping("/admin/demo-accounts/{id}")
    public DemoView updateDemo(@PathVariable String id, @Valid @RequestBody UpdateDemoRequest req) {
        return DemoView.from(demoService.updateMemo(id, req.memo()));
    }

    @Operation(summary = "데모 계정 삭제")
    @DeleteMapping("/admin/demo-accounts/{id}")
    public ResponseEntity<Void> deleteDemo(@PathVariable String id) {
        demoService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "데모 계정으로 로그인 (관리자가 토큰 발급)")
    @PostMapping("/admin/demo-accounts/{userId}/login")
    public AdminUserService.DemoLoginResult loginAsDemo(@PathVariable String userId) {
        return userService.issueDemoLogin(userId);
    }

    // ─── 대시보드 ──────────────────────────────────────────────────────

    @Operation(summary = "관리자 대시보드 통계")
    @GetMapping("/admin/dashboard")
    public AdminStatsService.Dashboard dashboard() {
        return statsService.dashboard();
    }
}
