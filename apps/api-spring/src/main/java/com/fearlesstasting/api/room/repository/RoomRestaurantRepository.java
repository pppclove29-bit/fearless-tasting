package com.fearlesstasting.api.room.repository;

import com.fearlesstasting.api.category.entity.Category;
import com.fearlesstasting.api.room.entity.RoomRestaurant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface RoomRestaurantRepository extends JpaRepository<RoomRestaurant, String>, RoomRestaurantQueryRepository {

    Optional<RoomRestaurant> findByRoomIdAndNameAndAddress(String roomId, String name, String address);

    long countByRoomId(String roomId);

    @Query("""
        select r from RoomRestaurant r
        left join fetch r.categoryRef
        where r.room.id = :roomId
        order by r.createdAt desc
        """)
    java.util.List<RoomRestaurant> findAllByRoomIdWithCategory(String roomId);

    @Query("""
        select r from RoomRestaurant r
        left join fetch r.categoryRef
        where r.id = :id
        """)
    Optional<RoomRestaurant> findByIdWithCategory(String id);

    /**
     * 특정 원본값(category)을 가진 미매핑 식당을 일괄 재분류.
     * 관리자 CMS의 "매핑 대기 → 매핑" 흐름에서 호출.
     * JPA 벌크 업데이트 쿼리 — flush + clearAutomatically로 영속성 컨텍스트 정합성 보장.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
        update RoomRestaurant r
        set r.categoryRef = :category,
            r.category = :displayName
        where r.category = :rawInput and r.categoryRef is null
        """)
    int bulkAssignCategoryByRawInput(String rawInput, Category category, String displayName);
}
