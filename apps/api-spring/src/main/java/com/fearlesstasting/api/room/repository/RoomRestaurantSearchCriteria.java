package com.fearlesstasting.api.room.repository;

/**
 * 식당 리스트 검색 조건. Nest `listRestaurants(options)`와 동일 필터.
 * sort 값:
 *  - latest (기본), oldest, name : DB 레벨 정렬
 *  - rating-high, rating-low, reviews, visits : 계산 필드, DB 정렬 불가 → 호출 측에서 메모리 정렬
 */
public record RoomRestaurantSearchCriteria(
    String search,
    Integer categoryId,      // null = 전체
    Boolean wishlistOnly,    // null = 모두, true/false = 필터
    String sort              // "latest" | "oldest" | "name"
) {
    public static RoomRestaurantSearchCriteria empty() {
        return new RoomRestaurantSearchCriteria(null, null, null, "latest");
    }
}
