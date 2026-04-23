package com.fearlesstasting.api.notification.service;

import com.fearlesstasting.api.fcm.service.FcmService;
import com.fearlesstasting.api.notification.entity.RoomNotification;
import com.fearlesstasting.api.notification.repository.RoomNotificationRepository;
import com.fearlesstasting.api.room.entity.Room;
import com.fearlesstasting.api.room.repository.RoomMemberRepository;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 방 내 활동 알림 생성 + FCM 푸시 브로드캐스트.
 * Nest `createNotificationForRoom()`의 fire-and-forget을 `@Async`로 재현.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RoomNotificationService {

    public static final int DEFAULT_RECENT_LIMIT = 20;

    private final RoomNotificationRepository notificationRepository;
    private final RoomMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final FcmService fcmService;

    /**
     * 방 멤버 전원(트리거 유저 제외)에게 알림 생성 + FCM 브로드캐스트.
     * 현재 트랜잭션과 독립적으로 호출자 스레드풀에서 돌아가므로 본 서비스는 자체 트랜잭션 시작.
     */
    @Async("taskExecutor")
    @Transactional
    public void broadcast(String roomId, String triggeredByUserId, String type, String message) {
        var members = memberRepository.findAllByRoomIdWithUser(roomId);
        if (members.isEmpty()) return;

        Room room = members.get(0).getRoom();
        List<String> recipients = members.stream()
            .map(m -> m.getUser().getId())
            .filter(id -> !id.equals(triggeredByUserId))
            .toList();

        for (String uid : recipients) {
            User u = userRepository.findById(uid).orElse(null);
            if (u == null) continue;
            notificationRepository.save(RoomNotification.builder()
                .room(room).user(u).type(type).message(message).build());
        }

        try {
            fcmService.sendToUsersAsync(recipients, room.getName(), message,
                Map.of("roomId", roomId, "type", type));
        } catch (Exception ex) {
            log.warn("FCM broadcast 실패 roomId={} err={}", roomId, ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<RoomNotification> listRecent(String userId) {
        return notificationRepository.findRecentByUserId(userId, PageRequest.of(0, DEFAULT_RECENT_LIMIT));
    }

    @Transactional(readOnly = true)
    public long unreadCount(String userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public int markAllRead(String userId) {
        return notificationRepository.markAllReadByUserId(userId);
    }
}
