package com.fearlesstasting.api.room.repository;

import com.fearlesstasting.api.room.entity.RoomRestaurant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * QueryDSL 기반 동적 검색 전용 리포지토리.
 * Spring Data JpaRepository에 커스텀 프래그먼트로 붙여 확장한다.
 */
public interface RoomRestaurantQueryRepository {

    Page<RoomRestaurant> search(String roomId, RoomRestaurantSearchCriteria criteria, Pageable pageable);
}
