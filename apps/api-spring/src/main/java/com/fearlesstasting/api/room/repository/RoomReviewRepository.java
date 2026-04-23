package com.fearlesstasting.api.room.repository;

import com.fearlesstasting.api.room.entity.RoomReview;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RoomReviewRepository extends JpaRepository<RoomReview, String> {

    /**
     * 여러 식당의 리뷰 통계를 한 번에 집계 — N+1 방지.
     * 반환: (restaurantId, reviewCount, avgRating) 튜플.
     */
    @Query("""
        select rv.visit.restaurant.id,
               count(rv),
               avg(rv.rating)
        from RoomReview rv
        where rv.visit.restaurant.id in :restaurantIds
        group by rv.visit.restaurant.id
        """)
    List<Object[]> aggregateByRestaurantIds(Collection<String> restaurantIds);

    Optional<RoomReview> findByVisitIdAndUserId(String visitId, String userId);

    @Query("""
        select rv from RoomReview rv
        join fetch rv.user
        where rv.visit.id = :visitId
        order by rv.createdAt asc
        """)
    List<RoomReview> findAllByVisitIdWithUser(String visitId);

    /** 방 단위 종합 통계 — (totalReviews, avgRating). */
    @Query("""
        select count(rv), avg(rv.rating)
        from RoomReview rv
        where rv.visit.restaurant.room.id = :roomId
        """)
    Object[] summaryByRoomId(String roomId);

    /** 방 내 카테고리별 집계 — (categoryName, count, avgRating). */
    @Query("""
        select rv.visit.restaurant.category,
               count(rv),
               avg(rv.rating)
        from RoomReview rv
        where rv.visit.restaurant.room.id = :roomId
        group by rv.visit.restaurant.category
        order by count(rv) desc
        """)
    List<Object[]> categoryDistributionByRoomId(String roomId);

    /**
     * 공개 방 열람용 익명 리뷰 조회.
     * (rating, content, createdAt) 3개 필드만 — 작성자 정보 미노출.
     */
    @Query("""
        select rv.rating, rv.content, rv.createdAt
        from RoomReview rv
        where rv.visit.restaurant.id = :restaurantId
        order by rv.createdAt desc
        """)
    List<Object[]> findAllByRestaurantIdAnonymous(String restaurantId);

    /** 내가 쓴 모든 리뷰 (유저 프로필 페이지용). */
    long countByUserId(String userId);

    @Query("""
        select rv from RoomReview rv
        join fetch rv.visit v
        join fetch v.restaurant r
        where rv.user.id = :userId
        order by rv.createdAt desc
        """)
    List<RoomReview> findAllByUserIdWithRestaurant(String userId);

    /** 방 내 식당별 최고/최저 평점 — 스태츠 TOP/BOTTOM용. */
    @Query("""
        select r.id, r.name, r.address, r.category, avg(rv.rating), count(rv)
        from RoomReview rv
        join rv.visit v
        join v.restaurant r
        where r.room.id = :roomId
        group by r.id, r.name, r.address, r.category
        having count(rv) > 0
        order by avg(rv.rating) desc
        """)
    List<Object[]> topRatedByRoomId(String roomId);

    /** 타임라인용 — 방 최근 리뷰. */
    @Query("""
        select rv from RoomReview rv
        join fetch rv.visit v
        join fetch v.restaurant
        join fetch rv.user
        where v.restaurant.room.id = :roomId
        order by rv.createdAt desc
        """)
    List<RoomReview> findByRoomIdRecent(String roomId, org.springframework.data.domain.Pageable pageable);

    default List<RoomReview> findByRoomIdRecent(String roomId, int limit) {
        return findByRoomIdRecent(roomId, org.springframework.data.domain.PageRequest.of(0, limit));
    }

    /** 플랫폼 전역 통계 — (totalReviews, avgRating). */
    @Query("select count(rv), avg(rv.rating) from RoomReview rv")
    Object[] platformSummary();

    /** 고평점 맛집 추천 (discover). */
    @Query("""
        select r.id, r.name, r.address, r.category, r.latitude, r.longitude,
               avg(rv.rating), count(rv)
        from RoomReview rv
        join rv.visit v
        join v.restaurant r
        where r.room.isPublic = true and r.isClosed = false
        group by r.id, r.name, r.address, r.category, r.latitude, r.longitude
        having count(rv) >= 3
        order by avg(rv.rating) desc, count(rv) desc
        """)
    List<Object[]> discoverHighRated(org.springframework.data.domain.Pageable pageable);

    /** 유저 랭킹 (리뷰 수 기준). */
    @Query("""
        select u.id, u.nickname, u.profileImageUrl, count(rv), avg(rv.rating)
        from RoomReview rv
        join rv.user u
        group by u.id, u.nickname, u.profileImageUrl
        order by count(rv) desc
        """)
    List<Object[]> rankByReviewCount(org.springframework.data.domain.Pageable pageable);

    /** 방문 여러 건의 리뷰를 user join fetch로 한 번에 로드 (N+1 방지). */
    @Query("""
        select rv from RoomReview rv
        join fetch rv.user
        where rv.visit.id in :visitIds
        order by rv.createdAt asc
        """)
    List<RoomReview> findAllByVisitIdInWithUser(Collection<String> visitIds);
}
