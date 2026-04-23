package com.fearlesstasting.api.category.repository;

import com.fearlesstasting.api.category.entity.CategoryMapping;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CategoryMappingRepository extends JpaRepository<CategoryMapping, Integer> {

    Optional<CategoryMapping> findByRawInput(String rawInput);

    @Query("""
        select m from CategoryMapping m
        join fetch m.category
        order by m.category.id asc, m.rawInput asc
        """)
    List<CategoryMapping> findAllWithCategory();

    /**
     * 미매핑(`categoryId IS NULL`) 식당의 원본 category 값 집계.
     * 반환: (rawInput, count) — 식당 수 내림차순.
     * Nest `listUnmapped()`의 Prisma groupBy를 JPQL로 재현.
     */
    @Query("""
        select r.category, count(r)
        from com.fearlesstasting.api.room.entity.RoomRestaurant r
        where r.categoryRef is null
        group by r.category
        order by count(r) desc
        """)
    List<Object[]> findUnmappedRawInputsWithCount();
}
