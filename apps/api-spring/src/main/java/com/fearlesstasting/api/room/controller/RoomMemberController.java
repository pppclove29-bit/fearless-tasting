package com.fearlesstasting.api.room.controller;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.room.entity.RoomMember;
import com.fearlesstasting.api.room.service.RoomMemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "방 - 멤버")
@RestController
@RequestMapping("/rooms/{roomId}")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class RoomMemberController {

    private final RoomMemberService service;

    public record MemberView(String userId, String nickname, String profileImageUrl,
                             String role, LocalDateTime joinedAt) {
        static MemberView from(RoomMember m) {
            var u = m.getUser();
            return new MemberView(u.getId(), u.getNickname(), u.getProfileImageUrl(),
                m.getRole(), m.getJoinedAt());
        }
    }

    public record RoleRequest(@NotBlank String role) {}

    @Operation(summary = "방 멤버 목록")
    @GetMapping("/members")
    public List<MemberView> list(@PathVariable String roomId, @CurrentUser AuthUserPrincipal principal) {
        return service.list(roomId, principal.userId()).stream().map(MemberView::from).toList();
    }

    @Operation(summary = "멤버 역할 변경 (owner)")
    @PatchMapping("/members/{userId}")
    public MemberView updateRole(@PathVariable String roomId,
                                  @PathVariable String userId,
                                  @CurrentUser AuthUserPrincipal principal,
                                  @Valid @RequestBody RoleRequest req) {
        return MemberView.from(service.updateRole(roomId, userId, req.role(), principal.userId()));
    }

    @Operation(summary = "멤버 강퇴 (owner)")
    @DeleteMapping("/members/{userId}")
    public ResponseEntity<Void> kick(@PathVariable String roomId,
                                      @PathVariable String userId,
                                      @CurrentUser AuthUserPrincipal principal) {
        service.kick(roomId, userId, principal.userId());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "방장 위임 (owner)")
    @PatchMapping("/transfer/{userId}")
    public ResponseEntity<Void> transfer(@PathVariable String roomId,
                                          @PathVariable String userId,
                                          @CurrentUser AuthUserPrincipal principal) {
        service.transferOwner(roomId, userId, principal.userId());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "방 탈퇴 (owner는 먼저 위임 필요)")
    @PostMapping("/leave")
    public ResponseEntity<Void> leave(@PathVariable String roomId,
                                       @CurrentUser AuthUserPrincipal principal) {
        service.leave(roomId, principal.userId());
        return ResponseEntity.noContent().build();
    }
}
