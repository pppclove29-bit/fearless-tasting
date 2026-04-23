package com.fearlesstasting.api.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.room.entity.Room;
import com.fearlesstasting.api.room.entity.RoomMember;
import com.fearlesstasting.api.room.repository.RoomMemberRepository;
import com.fearlesstasting.api.room.repository.RoomRepository;
import com.fearlesstasting.api.support.AbstractIntegrationTest;
import com.fearlesstasting.api.support.TestFixtures;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Transactional;

@Transactional
@Rollback
@DisplayName("RoomService 통합 테스트 (Testcontainers MySQL)")
class RoomServiceIntegrationTest extends AbstractIntegrationTest {

    @Autowired RoomService roomService;
    @Autowired RoomRepository roomRepository;
    @Autowired RoomMemberRepository memberRepository;
    @Autowired UserRepository userRepository;

    @Test
    @DisplayName("방을 생성하면 생성자는 owner로 멤버십이 자동 생성된다")
    void create_auto_membership() {
        User owner = userRepository.save(TestFixtures.user("owner@test.local", "집주인"));

        Room room = roomService.create(
            owner.getId(), "테스트 방",
            RoomService.RoomCreateOptions.defaults()
        );

        assertThat(room.getId()).isNotBlank();
        assertThat(room.getInviteCode()).hasSize(8);
        assertThat(room.getOwner().getId()).isEqualTo(owner.getId());

        RoomMember me = memberRepository.findByRoomIdAndUserId(room.getId(), owner.getId()).orElseThrow();
        assertThat(me.isOwner()).isTrue();
    }

    @Test
    @DisplayName("초대 코드로 입장하면 member 권한이 부여된다")
    void join_by_invite_code() {
        User owner = userRepository.save(TestFixtures.user("owner2@test.local", "집주인2"));
        User guest = userRepository.save(TestFixtures.user("guest@test.local", "손님"));

        Room room = roomService.create(owner.getId(), "방", RoomService.RoomCreateOptions.defaults());
        roomService.joinByInviteCode(room.getInviteCode(), guest.getId());

        RoomMember guestMember = memberRepository.findByRoomIdAndUserId(room.getId(), guest.getId()).orElseThrow();
        assertThat(guestMember.getRole()).isEqualTo(RoomMember.ROLE_MEMBER);
        assertThat(memberRepository.countByRoomId(room.getId())).isEqualTo(2);
    }

    @Test
    @DisplayName("방 인원이 가득 찬 상태에서는 입장 시 403")
    void join_fails_when_full() {
        User owner = userRepository.save(TestFixtures.user("owner3@test.local", "집주인3"));
        Room room = roomService.create(
            owner.getId(), "만원방",
            new RoomService.RoomCreateOptions(false, 2, true, true, false, false)
        );

        User g1 = userRepository.save(TestFixtures.user("g1@test.local", "손님1"));
        roomService.joinByInviteCode(room.getInviteCode(), g1.getId());

        User g2 = userRepository.save(TestFixtures.user("g2@test.local", "손님2"));
        assertThatThrownBy(() -> roomService.joinByInviteCode(room.getInviteCode(), g2.getId()))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("가득");
    }

    @Test
    @DisplayName("owner가 아닌 유저가 update() 시 ForbiddenException")
    void update_requires_owner() {
        User owner = userRepository.save(TestFixtures.user("own@test.local", "주인"));
        User guest = userRepository.save(TestFixtures.user("g@test.local", "게스트"));
        Room room = roomService.create(owner.getId(), "방", RoomService.RoomCreateOptions.defaults());
        roomService.joinByInviteCode(room.getInviteCode(), guest.getId());

        var opts = new RoomService.RoomUpdateOptions(
            "바뀐 이름", null, null, null, null, null, null, null
        );
        assertThatThrownBy(() -> roomService.update(room.getId(), guest.getId(), opts))
            .isInstanceOf(ApiException.class);
    }
}
