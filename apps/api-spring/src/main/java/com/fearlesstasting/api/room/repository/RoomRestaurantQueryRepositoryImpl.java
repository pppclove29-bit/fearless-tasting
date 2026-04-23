package com.fearlesstasting.api.room.repository;

import com.fearlesstasting.api.room.entity.QRoomRestaurant;
import com.fearlesstasting.api.room.entity.RoomRestaurant;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

/**
 * QueryDSL 동적 검색 구현.
 *
 * <h3>면접 어필 포인트</h3>
 * <ul>
 *   <li><b>BooleanBuilder 동적 조건</b>: null-safe 조합, 각 조건을 private 메소드로 분리해 가독성 유지</li>
 *   <li><b>fetchResults() 대신 fetch + fetchCount 분리</b>: Hibernate 6에서 fetchResults deprecated,
 *       count 쿼리를 별도로 발행해 모수 조회</li>
 *   <li><b>정렬·페이지네이션 동적 처리</b>: Pageable + 커스텀 sort key 조합</li>
 * </ul>
 */
@RequiredArgsConstructor
public class RoomRestaurantQueryRepositoryImpl implements RoomRestaurantQueryRepository {

    private final JPAQueryFactory query;

    @Override
    public Page<RoomRestaurant> search(String roomId, RoomRestaurantSearchCriteria criteria, Pageable pageable) {
        QRoomRestaurant r = QRoomRestaurant.roomRestaurant;

        BooleanBuilder where = new BooleanBuilder()
            .and(r.room.id.eq(roomId))
            .and(searchLike(criteria.search()))
            .and(categoryEq(criteria.categoryId()))
            .and(wishlistEq(criteria.wishlistOnly()));

        List<RoomRestaurant> content = query
            .selectFrom(r)
            .where(where)
            .orderBy(resolveOrder(criteria.sort()))
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

        Long total = query
            .select(r.count())
            .from(r)
            .where(where)
            .fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }

    // ─── 조건 헬퍼 ────────────────────────────────────────────────────────

    private com.querydsl.core.types.dsl.BooleanExpression searchLike(String search) {
        if (!StringUtils.hasText(search)) return null;
        QRoomRestaurant r = QRoomRestaurant.roomRestaurant;
        return r.name.containsIgnoreCase(search)
            .or(r.address.containsIgnoreCase(search))
            .or(r.category.containsIgnoreCase(search));
    }

    private com.querydsl.core.types.dsl.BooleanExpression categoryEq(Integer categoryId) {
        if (categoryId == null) return null;
        return QRoomRestaurant.roomRestaurant.categoryRef.id.eq(categoryId);
    }

    private com.querydsl.core.types.dsl.BooleanExpression wishlistEq(Boolean wishlist) {
        if (wishlist == null) return null;
        return QRoomRestaurant.roomRestaurant.isWishlist.eq(wishlist);
    }

    // ─── 정렬 헬퍼 ────────────────────────────────────────────────────────

    private OrderSpecifier<?> resolveOrder(String sort) {
        QRoomRestaurant r = QRoomRestaurant.roomRestaurant;
        return switch (sort == null ? "latest" : sort) {
            case "oldest" -> r.createdAt.asc();
            case "name" -> r.name.asc();
            default -> r.createdAt.desc();
        };
    }
}
