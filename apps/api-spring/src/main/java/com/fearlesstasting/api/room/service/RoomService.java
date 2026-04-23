package com.fearlesstasting.api.room.service;

import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.room.entity.Room;
import com.fearlesstasting.api.room.entity.RoomMember;
import com.fearlesstasting.api.room.repository.RoomKickRepository;
import com.fearlesstasting.api.room.repository.RoomMemberRepository;
import com.fearlesstasting.api.room.repository.RoomRepository;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import java.security.SecureRandom;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 방 도메인 서비스.
 * Nest `RoomsService` 중 방 CRUD + 초대 코드 + 입장 + 설정 변경 부분을 1:1 포팅.
 */
@Service
@RequiredArgsConstructor
public class RoomService {

    private static final int MAX_ROOMS_PER_USER = 30;
    private static final int INVITE_CODE_RETRIES = 10;
    private static final SecureRandom RNG = new SecureRandom();

    private final RoomRepository roomRepository;
    private final RoomMemberRepository memberRepository;
    private final RoomKickRepository kickRepository;
    private final UserRepository userRepository;
    private final RoomAccessService accessService;
    private final com.fearlesstasting.api.room.repository.RoomRestaurantRepository restaurantRepository;

    @Transactional
    public Room create(String ownerId, String name, RoomCreateOptions opts) {
        if (memberRepository.countByUserId(ownerId) >= MAX_ROOMS_PER_USER) {
            throw ApiException.forbidden("참여할 수 있는 방은 최대 " + MAX_ROOMS_PER_USER + "개입니다.");
        }
        User owner = userRepository.findById(ownerId)
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));

        Room room = Room.builder()
            .name(name)
            .inviteCode(generateInviteCode())
            .owner(owner)
            .maxMembers(opts.maxMembers())
            .isPublic(opts.isPublic())
            .tabWishlistEnabled(opts.tabWishlistEnabled())
            .tabRegionEnabled(opts.tabRegionEnabled())
            .tabPollEnabled(opts.tabPollEnabled())
            .tabStatsEnabled(opts.tabStatsEnabled())
            .build();
        roomRepository.save(room);

        memberRepository.save(RoomMember.builder()
            .room(room)
            .user(owner)
            .role(RoomMember.ROLE_OWNER)
            .build());

        return room;
    }

    @Transactional(readOnly = true)
    public List<Room> listMyRooms(String userId) {
        return roomRepository.findAllByUserId(userId);
    }

    /** 멤버십 정보 포함한 목록 아이템 (myRole, memberCount, restaurantCount 포함). */
    @Transactional(readOnly = true)
    public List<RoomListBundle> listMyRoomsWithCounts(String userId) {
        List<Room> rooms = roomRepository.findAllByUserId(userId);
        java.util.List<RoomListBundle> out = new java.util.ArrayList<>();
        for (Room r : rooms) {
            String myRole = memberRepository.findByRoomIdAndUserId(r.getId(), userId)
                .map(com.fearlesstasting.api.room.entity.RoomMember::getRole)
                .orElse(r.getOwner().getId().equals(userId)
                    ? com.fearlesstasting.api.room.entity.RoomMember.ROLE_OWNER
                    : com.fearlesstasting.api.room.entity.RoomMember.ROLE_MEMBER);
            long members = memberRepository.countByRoomId(r.getId());
            long restaurants = restaurantRepository.countByRoomId(r.getId());
            out.add(new RoomListBundle(r, myRole, members, restaurants));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public Room get(String roomId, String userId) {
        accessService.requireMembership(roomId, userId);
        return accessService.loadRoom(roomId);
    }

    public record RoomListBundle(Room room, String myRole, long memberCount, long restaurantCount) {}

    @Transactional
    public Room update(String roomId, String userId, RoomUpdateOptions opts) {
        accessService.requireOwner(roomId, userId);
        Room room = accessService.loadRoom(roomId);

        if (opts.name() != null) room.rename(opts.name());
        if (opts.announcement() != null) room.updateAnnouncement(opts.announcement().isBlank() ? null : opts.announcement());
        if (opts.maxMembers() != null) {
            long current = memberRepository.countByRoomId(roomId);
            if (opts.maxMembers() < current) {
                throw ApiException.badRequest("현재 멤버 수(" + current + ")보다 작게 설정할 수 없습니다.");
            }
            room.updateMaxMembers(opts.maxMembers());
        }
        if (opts.isPublic() != null) room.togglePublic(opts.isPublic());
        if (opts.anyTabSet()) {
            room.updateTabs(
                opts.tabWishlistEnabled() == null ? room.isTabWishlistEnabled() : opts.tabWishlistEnabled(),
                opts.tabRegionEnabled() == null ? room.isTabRegionEnabled() : opts.tabRegionEnabled(),
                opts.tabPollEnabled() == null ? room.isTabPollEnabled() : opts.tabPollEnabled(),
                opts.tabStatsEnabled() == null ? room.isTabStatsEnabled() : opts.tabStatsEnabled()
            );
        }
        return room;
    }

    @Transactional
    public void delete(String roomId, String userId) {
        accessService.requireOwner(roomId, userId);
        roomRepository.deleteById(roomId);
    }

    @Transactional
    public Room regenerateInviteCode(String roomId, String userId) {
        accessService.requireOwner(roomId, userId);
        Room room = accessService.loadRoom(roomId);
        room.regenerateInviteCode(generateInviteCode());
        return room;
    }

    /** 공개 방을 직접 참여 (초대 코드 없이, 로그인 필수). */
    @Transactional
    public Room joinPublicRoom(String roomId, String userId) {
        Room room = accessService.loadRoom(roomId);
        if (!room.isPublic()) throw ApiException.forbidden("공개 방이 아닙니다.");
        if (kickRepository.existsByRoomIdAndUserId(roomId, userId)) {
            throw ApiException.forbidden("이 방에서 강퇴된 이력이 있어 입장할 수 없습니다.");
        }
        if (memberRepository.findByRoomIdAndUserId(roomId, userId).isPresent()) return room;
        if (memberRepository.countByRoomId(roomId) >= room.getMaxMembers()) {
            throw ApiException.forbidden("방 인원이 가득 찼습니다.");
        }
        if (memberRepository.countByUserId(userId) >= MAX_ROOMS_PER_USER) {
            throw ApiException.forbidden("참여할 수 있는 방은 최대 " + MAX_ROOMS_PER_USER + "개입니다.");
        }
        User user = userRepository.findById(userId)
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));
        memberRepository.save(RoomMember.builder().room(room).user(user)
            .role(RoomMember.ROLE_MEMBER).build());
        return room;
    }

    @Transactional
    public Room joinByInviteCode(String inviteCode, String userId) {
        Room room = roomRepository.findByInviteCode(inviteCode)
            .orElseThrow(() -> ApiException.notFound("유효하지 않은 초대 코드입니다."));

        if (kickRepository.existsByRoomIdAndUserId(room.getId(), userId)) {
            throw ApiException.forbidden("이 방에서 강퇴된 이력이 있어 입장할 수 없습니다.");
        }
        if (memberRepository.findByRoomIdAndUserId(room.getId(), userId).isPresent()) {
            return room;
        }
        if (memberRepository.countByRoomId(room.getId()) >= room.getMaxMembers()) {
            throw ApiException.forbidden("방 인원이 가득 찼습니다.");
        }
        if (memberRepository.countByUserId(userId) >= MAX_ROOMS_PER_USER) {
            throw ApiException.forbidden("참여할 수 있는 방은 최대 " + MAX_ROOMS_PER_USER + "개입니다.");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));
        memberRepository.save(RoomMember.builder()
            .room(room)
            .user(user)
            .role(RoomMember.ROLE_MEMBER)
            .build());
        return room;
    }

    // ─── 헬퍼 ────────────────────────────────────────────────────────────

    private String generateInviteCode() {
        for (int i = 0; i < INVITE_CODE_RETRIES; i++) {
            byte[] buf = new byte[4];
            RNG.nextBytes(buf);
            StringBuilder sb = new StringBuilder(8);
            for (byte b : buf) sb.append(String.format("%02x", b));
            String code = sb.toString();
            if (!roomRepository.existsByInviteCode(code)) return code;
        }
        throw ApiException.conflict("초대 코드 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }

    // ─── 옵션 레코드 ─────────────────────────────────────────────────────

    public record RoomCreateOptions(
        boolean isPublic,
        int maxMembers,
        boolean tabWishlistEnabled,
        boolean tabRegionEnabled,
        boolean tabPollEnabled,
        boolean tabStatsEnabled
    ) {
        public static RoomCreateOptions defaults() {
            return new RoomCreateOptions(false, 4, true, true, false, false);
        }
    }

    public record RoomUpdateOptions(
        String name,
        String announcement,
        Integer maxMembers,
        Boolean isPublic,
        Boolean tabWishlistEnabled,
        Boolean tabRegionEnabled,
        Boolean tabPollEnabled,
        Boolean tabStatsEnabled
    ) {
        public boolean anyTabSet() {
            return tabWishlistEnabled != null || tabRegionEnabled != null
                || tabPollEnabled != null || tabStatsEnabled != null;
        }
    }
}
