package com.fearlesstasting.api.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fearlesstasting.api.category.entity.Category;
import com.fearlesstasting.api.category.repository.CategoryRepository;
import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.room.entity.Room;
import com.fearlesstasting.api.room.entity.RoomMember;
import com.fearlesstasting.api.room.entity.RoomRestaurant;
import com.fearlesstasting.api.room.repository.RoomMemberRepository;
import com.fearlesstasting.api.room.repository.RoomRepository;
import com.fearlesstasting.api.room.repository.RoomRestaurantRepository;
import com.fearlesstasting.api.room.repository.RoomRestaurantSearchCriteria;
import com.fearlesstasting.api.support.AbstractIntegrationTest;
import com.fearlesstasting.api.support.TestFixtures;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Transactional;

@Transactional
@Rollback
@DisplayName("RoomRestaurantService 통합 테스트 (QueryDSL + 카테고리 해석)")
class RoomRestaurantServiceIntegrationTest extends AbstractIntegrationTest {

    @Autowired RoomRestaurantService restaurantService;
    @Autowired RoomRestaurantRepository restaurantRepository;
    @Autowired RoomRepository roomRepository;
    @Autowired RoomMemberRepository memberRepository;
    @Autowired CategoryRepository categoryRepository;
    @Autowired UserRepository userRepository;

    @Test
    @DisplayName("식당 등록 시 카테고리 이름이 Category와 정확히 매칭되면 categoryRef가 세팅된다")
    void create_resolves_known_category() {
        // seed된 "한식" 카테고리 조회
        Category korean = categoryRepository.findByName("한식").orElseThrow();

        Setup s = setupRoomWithOwner();

        var cmd = new RoomRestaurantService.CreateRestaurantCommand(
            "국밥집", "서울특별시 강남구 역삼동 1-1",
            "서울특별시", "강남구", "역삼동",
            "한식",
            null, null, false
        );
        RoomRestaurant created = restaurantService.create(s.room.getId(), s.owner.getId(), cmd);

        assertThat(created.getCategoryRef()).isNotNull();
        assertThat(created.getCategoryRef().getId()).isEqualTo(korean.getId());
        assertThat(created.getCategory()).isEqualTo("한식");
    }

    @Test
    @DisplayName("미매핑 카테고리(예: 맥도날드)는 categoryRef가 null로 남고 원본 값이 category 필드에 보존된다")
    void create_preserves_unmapped_category_raw() {
        Setup s = setupRoomWithOwner();

        var cmd = new RoomRestaurantService.CreateRestaurantCommand(
            "맥도날드 역삼점", "서울특별시 강남구 역삼동 123",
            "서울특별시", "강남구", "역삼동",
            "맥도날드",
            null, null, false
        );
        RoomRestaurant created = restaurantService.create(s.room.getId(), s.owner.getId(), cmd);

        assertThat(created.getCategoryRef()).isNull();
        assertThat(created.getCategory()).isEqualTo("맥도날드"); // CMS 매핑 대기 큐에 노출될 원본
    }

    @Test
    @DisplayName("QueryDSL 검색: 이름으로 조회하면 해당 식당만 반환")
    void search_by_name() {
        Setup s = setupRoomWithOwner();
        create(s, "국밥집", "한식");
        create(s, "파스타러버", "양식");
        create(s, "짬뽕집", "중식");

        Page<RoomRestaurantService.RestaurantListItem> result = restaurantService.list(
            s.room.getId(), s.owner.getId(),
            new RoomRestaurantSearchCriteria("국밥", null, null, "latest"),
            PageRequest.of(0, 10)
        );
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).name()).isEqualTo("국밥집");
    }

    @Test
    @DisplayName("같은 방에 동일 (이름+주소) 식당을 등록하면 Conflict")
    void duplicate_rejected() {
        Setup s = setupRoomWithOwner();
        create(s, "국밥집", "한식");

        var dup = new RoomRestaurantService.CreateRestaurantCommand(
            "국밥집", "서울특별시 강남구 테스트동 1-1",
            "서울특별시", "강남구", "테스트동",
            "한식", null, null, false
        );
        assertThatThrownBy(() -> restaurantService.create(s.room.getId(), s.owner.getId(), dup))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("이미");
    }

    // ─── 픽스처 헬퍼 ────────────────────────────────────────────────────

    private record Setup(User owner, Room room) {}

    private Setup setupRoomWithOwner() {
        User owner = userRepository.save(TestFixtures.user(
            "r" + System.nanoTime() + "@test.local",
            "r" + System.nanoTime()
        ));
        Room room = roomRepository.save(TestFixtures.room("방", hex8(), owner));
        memberRepository.save(TestFixtures.ownerMembership(room, owner));
        return new Setup(owner, room);
    }

    private void create(Setup s, String name, String category) {
        var cmd = new RoomRestaurantService.CreateRestaurantCommand(
            name, "서울특별시 강남구 테스트동 1-1",
            "서울특별시", "강남구", "테스트동",
            category, null, null, false
        );
        restaurantService.create(s.room.getId(), s.owner.getId(), cmd);
    }

    private static String hex8() {
        long rnd = (long) (Math.random() * 0xFFFFFFFFL);
        return String.format("%08x", rnd);
    }
}
