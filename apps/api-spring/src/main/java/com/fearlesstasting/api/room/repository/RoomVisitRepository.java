package com.fearlesstasting.api.room.repository;

import com.fearlesstasting.api.room.entity.RoomVisit;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RoomVisitRepository extends JpaRepository<RoomVisit, String> {

    long countByRestaurantId(String restaurantId);

    @Query("""
        select v from RoomVisit v
        join fetch v.restaurant
        left join fetch v.createdBy
        where v.id = :id
        """)
    Optional<RoomVisit> findByIdWithRestaurant(String id);

    @Query("""
        select v from RoomVisit v
        left join fetch v.createdBy
        where v.restaurant.id = :restaurantId
        order by v.visitedAt desc, v.createdAt desc
        """)
    List<RoomVisit> findAllByRestaurantIdWithCreator(String restaurantId);

    @Query("select count(v) from RoomVisit v where v.restaurant.room.id = :roomId")
    long countByRoomId(String roomId);

    @Query("""
        select v from RoomVisit v
        join fetch v.restaurant
        left join fetch v.createdBy
        where v.restaurant.room.id = :roomId
        order by v.createdAt desc
        """)
    List<RoomVisit> findByRoomIdRecent(String roomId, org.springframework.data.domain.Pageable pageable);

    default List<RoomVisit> findByRoomIdRecent(String roomId, int limit) {
        return findByRoomIdRecent(roomId, org.springframework.data.domain.PageRequest.of(0, limit));
    }

    long countByCreatedById(String userId);

    /**
     * 재방문 추천 — 60일 이상 안 간 고평점(4.0+) 식당.
     * 반환: (restaurantId, name, address, category, roomId, roomName, lastVisit, avgRating, visitCount)
     */
    @Query("""
        select r.id, r.name, r.address, r.category, r.room.id, r.room.name,
               max(v.visitedAt), avg(rv.rating), count(distinct v)
        from RoomVisit v
        join v.restaurant r
        join RoomMember m on m.room = r.room
        left join RoomReview rv on rv.visit = v
        where m.user.id = :userId
          and r.isClosed = false
          and r.isWishlist = false
        group by r.id, r.name, r.address, r.category, r.room.id, r.room.name
        having max(v.visitedAt) < :threshold
           and avg(rv.rating) >= 4.0
        order by avg(rv.rating) desc
        """)
    List<Object[]> findRevisitSuggestionsForUser(String userId, java.time.LocalDate threshold);
}
