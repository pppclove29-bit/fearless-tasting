package com.fearlesstasting.api.notification.controller;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.notification.entity.RoomNotification;
import com.fearlesstasting.api.notification.service.RoomNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "알림")
@RestController
@RequestMapping("/users/me/notifications")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final RoomNotificationService service;

    /**
     * Nest `AppNotification` shape.
     * <pre>{ id, roomId, type, message, isRead, createdAt, room: { id, name } }</pre>
     */
    public record NotificationView(
        String id,
        String roomId,
        String type,
        String message,
        boolean isRead,
        LocalDateTime createdAt,
        RoomBrief room
    ) {
        public record RoomBrief(String id, String name) {}

        static NotificationView from(RoomNotification n) {
            return new NotificationView(
                n.getId(), n.getRoom().getId(), n.getType(), n.getMessage(),
                n.isRead(), n.getCreatedAt(),
                new RoomBrief(n.getRoom().getId(), n.getRoom().getName())
            );
        }
    }

    @Operation(summary = "최근 알림 20건")
    @GetMapping
    public List<NotificationView> list(@CurrentUser AuthUserPrincipal principal) {
        return service.listRecent(principal.userId()).stream().map(NotificationView::from).toList();
    }

    @Operation(summary = "읽지 않은 알림 수")
    @GetMapping("/unread-count")
    public Map<String, Long> unread(@CurrentUser AuthUserPrincipal principal) {
        return Map.of("count", service.unreadCount(principal.userId()));
    }

    @Operation(summary = "모두 읽음 처리")
    @PatchMapping("/read")
    public Map<String, Integer> markRead(@CurrentUser AuthUserPrincipal principal) {
        return Map.of("updated", service.markAllRead(principal.userId()));
    }
}
