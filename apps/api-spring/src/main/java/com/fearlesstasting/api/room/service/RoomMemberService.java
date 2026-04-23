package com.fearlesstasting.api.room.service;

import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.room.entity.Room;
import com.fearlesstasting.api.room.entity.RoomKick;
import com.fearlesstasting.api.room.entity.RoomMember;
import com.fearlesstasting.api.room.repository.RoomKickRepository;
import com.fearlesstasting.api.room.repository.RoomMemberRepository;
import com.fearlesstasting.api.room.repository.RoomRepository;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 방 멤버 권한 이관 / 강퇴 / 탈퇴.
 * Nest `RoomsService.updateMemberRole/kickMember/transferOwnership/leaveRoom` 포팅.
 */
@Service
@RequiredArgsConstructor
public class RoomMemberService {

    private final RoomMemberRepository memberRepository;
    private final RoomKickRepository kickRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final RoomAccessService accessService;

    @Transactional(readOnly = true)
    public List<RoomMember> list(String roomId, String actorUserId) {
        accessService.requireMembership(roomId, actorUserId);
        return memberRepository.findAllByRoomIdWithUser(roomId);
    }

    @Transactional
    public RoomMember updateRole(String roomId, String targetUserId, String role, String actorUserId) {
        accessService.requireOwner(roomId, actorUserId);
        if (!role.equals(RoomMember.ROLE_MANAGER) && !role.equals(RoomMember.ROLE_MEMBER)) {
            throw ApiException.badRequest("유효하지 않은 역할입니다.");
        }
        RoomMember target = memberRepository.findByRoomIdAndUserId(roomId, targetUserId)
            .orElseThrow(() -> ApiException.notFound("멤버를 찾을 수 없습니다."));
        if (target.isOwner()) {
            throw ApiException.badRequest("방장은 역할을 바꿀 수 없습니다. 먼저 방장을 위임하세요.");
        }
        target.promoteTo(role);
        return target;
    }

    @Transactional
    public void kick(String roomId, String targetUserId, String actorUserId) {
        accessService.requireOwner(roomId, actorUserId);
        if (targetUserId.equals(actorUserId)) {
            throw ApiException.badRequest("본인은 강퇴할 수 없습니다.");
        }
        RoomMember target = memberRepository.findByRoomIdAndUserId(roomId, targetUserId)
            .orElseThrow(() -> ApiException.notFound("멤버를 찾을 수 없습니다."));
        Room room = accessService.loadRoom(roomId);
        User user = userRepository.findById(targetUserId)
            .orElseThrow(() -> ApiException.notFound("유저를 찾을 수 없습니다."));

        memberRepository.delete(target);
        kickRepository.save(RoomKick.builder().room(room).user(user).build());
    }

    @Transactional
    public void transferOwner(String roomId, String newOwnerUserId, String currentOwnerUserId) {
        accessService.requireOwner(roomId, currentOwnerUserId);
        if (newOwnerUserId.equals(currentOwnerUserId)) {
            throw ApiException.badRequest("본인에게 방장 위임은 불가합니다.");
        }
        Room room = accessService.loadRoom(roomId);

        RoomMember newOwner = memberRepository.findByRoomIdAndUserId(roomId, newOwnerUserId)
            .orElseThrow(() -> ApiException.notFound("새 방장 후보를 찾을 수 없습니다."));
        RoomMember oldOwner = memberRepository.findByRoomIdAndUserId(roomId, currentOwnerUserId)
            .orElseThrow(() -> ApiException.notFound("기존 방장 멤버십을 찾을 수 없습니다."));

        newOwner.promoteTo(RoomMember.ROLE_OWNER);
        oldOwner.promoteTo(RoomMember.ROLE_MEMBER);

        User newOwnerUser = userRepository.findById(newOwnerUserId)
            .orElseThrow(() -> ApiException.notFound("유저를 찾을 수 없습니다."));
        room.transferOwner(newOwnerUser);
    }

    @Transactional
    public void leave(String roomId, String userId) {
        RoomMember me = accessService.requireMembership(roomId, userId);
        if (me.isOwner()) {
            throw ApiException.badRequest("방장은 먼저 방장을 위임한 뒤에 나갈 수 있습니다.");
        }
        memberRepository.delete(me);
    }
}
