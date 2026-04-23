package com.fearlesstasting.api.support;

import com.fearlesstasting.api.room.entity.Room;
import com.fearlesstasting.api.room.entity.RoomMember;
import com.fearlesstasting.api.room.entity.RoomRestaurant;
import com.fearlesstasting.api.user.entity.User;

/** 통합 테스트 픽스처 팩토리. 빌더 호출을 한 줄로 줄여서 읽기 쉽게. */
public final class TestFixtures {

    private TestFixtures() {}

    public static User user(String email, String nickname) {
        return User.builder()
            .email(email)
            .nickname(nickname)
            .role("user")
            .pushEnabled(true)
            .build();
    }

    public static Room room(String name, String inviteCode, User owner) {
        return Room.builder()
            .name(name)
            .inviteCode(inviteCode)
            .owner(owner)
            .maxMembers(4)
            .build();
    }

    public static RoomMember ownerMembership(Room room, User owner) {
        return RoomMember.builder()
            .room(room)
            .user(owner)
            .role(RoomMember.ROLE_OWNER)
            .build();
    }

    public static RoomRestaurant restaurant(Room room, User addedBy, String name, String category) {
        return RoomRestaurant.builder()
            .room(room)
            .addedBy(addedBy)
            .name(name)
            .address("서울특별시 강남구 테스트동 1-1")
            .province("서울특별시")
            .city("강남구")
            .neighborhood("테스트동")
            .category(category)
            .build();
    }
}
