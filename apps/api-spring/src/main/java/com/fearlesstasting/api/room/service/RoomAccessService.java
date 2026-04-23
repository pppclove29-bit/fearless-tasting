package com.fearlesstasting.api.room.service;

import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.room.entity.Room;
import com.fearlesstasting.api.room.entity.RoomMember;
import com.fearlesstasting.api.room.repository.RoomMemberRepository;
import com.fearlesstasting.api.room.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Nest의 `RoomMemberGuard` / `RoomManagerGuard` 역할을 수행하는 도메인 레이어 가드.
 * Spring Security는 경로 기반 인가엔 강하지만 "이 유저가 이 방의 멤버인가" 같은
 * 도메인 레벨 인가는 서비스에서 명시적으로 체크하는 편이 가독성·테스트 용이성이 높음.
 */
@Service
@RequiredArgsConstructor
public class RoomAccessService {

    private final RoomRepository roomRepository;
    private final RoomMemberRepository memberRepository;

    @Transactional(readOnly = true)
    public Room loadRoom(String roomId) {
        return roomRepository.findById(roomId)
            .orElseThrow(() -> ApiException.notFound("방을 찾을 수 없습니다."));
    }

    /** 멤버십 확인. 없으면 403. */
    @Transactional(readOnly = true)
    public RoomMember requireMembership(String roomId, String userId) {
        return memberRepository.findByRoomIdAndUserId(roomId, userId)
            .orElseThrow(() -> ApiException.forbidden("방 멤버만 접근할 수 있습니다."));
    }

    /** owner 또는 manager 권한 확인. */
    @Transactional(readOnly = true)
    public RoomMember requireManager(String roomId, String userId) {
        RoomMember member = requireMembership(roomId, userId);
        if (!member.isOwnerOrManager()) {
            throw ApiException.forbidden("매니저 이상 권한이 필요합니다.");
        }
        return member;
    }

    /** owner 권한 확인. */
    @Transactional(readOnly = true)
    public RoomMember requireOwner(String roomId, String userId) {
        RoomMember member = requireMembership(roomId, userId);
        if (!member.isOwner()) {
            throw ApiException.forbidden("방장만 수행할 수 있습니다.");
        }
        return member;
    }
}
