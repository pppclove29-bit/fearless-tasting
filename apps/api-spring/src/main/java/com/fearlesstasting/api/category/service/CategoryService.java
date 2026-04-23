package com.fearlesstasting.api.category.service;

import com.fearlesstasting.api.category.entity.Category;
import com.fearlesstasting.api.category.entity.CategoryMapping;
import com.fearlesstasting.api.category.repository.CategoryMappingRepository;
import com.fearlesstasting.api.category.repository.CategoryRepository;
import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.room.repository.RoomRestaurantRepository;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 카테고리/매핑 관리 서비스.
 * Nest `CategoriesService`를 Java로 포팅. Prisma 트랜잭션은 Spring @Transactional로 대체.
 */
@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryMappingRepository mappingRepository;
    private final RoomRestaurantRepository restaurantRepository;

    @Transactional(readOnly = true)
    public List<Category> listActive() {
        return categoryRepository.findAllByIsActiveTrueOrderByDisplayOrderAscIdAsc();
    }

    @Transactional(readOnly = true)
    public List<Category> listAll() {
        return categoryRepository.findAllByOrderByDisplayOrderAscIdAsc();
    }

    /**
     * 원본 문자열을 Category로 해석.
     * 1) Category.name 정확 일치
     * 2) CategoryMapping.rawInput 정확 일치
     * 3) "음식점 > X > Y" 계층 분해 후 각 파트 재시도
     * 4) 실패 시 Resolution.unmapped(rawInput) — 관리자 CMS 매핑 대기
     */
    @Transactional(readOnly = true)
    public CategoryResolution resolve(String raw) {
        if (raw == null) return CategoryResolution.unmapped("");
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return CategoryResolution.unmapped("");

        Optional<CategoryResolution> direct = findByNameOrMapping(trimmed);
        if (direct.isPresent()) return direct.get();

        List<String> parts = Arrays.stream(trimmed.split(">"))
            .map(String::trim)
            .filter(p -> !p.isEmpty() && !"음식점".equals(p))
            .toList();

        for (int i = parts.size() - 1; i >= 0; i--) {
            Optional<CategoryResolution> hit = findByNameOrMapping(parts.get(i));
            if (hit.isPresent()) return hit.get();
        }

        return CategoryResolution.unmapped(trimmed);
    }

    private Optional<CategoryResolution> findByNameOrMapping(String value) {
        Optional<Category> byName = categoryRepository.findByName(value);
        if (byName.isPresent()) return Optional.of(CategoryResolution.mapped(byName.get()));

        Optional<CategoryMapping> byMapping = mappingRepository.findByRawInput(value);
        return byMapping.map(m -> CategoryResolution.mapped(m.getCategory()));
    }

    @Transactional
    public Category create(String name, String emoji, Integer displayOrder, Boolean isActive) {
        if (categoryRepository.existsByName(name)) {
            throw ApiException.conflict("이미 존재하는 카테고리입니다.");
        }
        return categoryRepository.save(Category.builder()
            .name(name)
            .emoji(emoji)
            .displayOrder(displayOrder)
            .isActive(isActive)
            .build());
    }

    @Transactional
    public Category update(Integer id, String name, String emoji, Integer displayOrder, Boolean isActive) {
        Category cat = categoryRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("카테고리를 찾을 수 없습니다."));

        if (name != null && !name.equals(cat.getName()) && categoryRepository.existsByName(name)) {
            throw ApiException.conflict("이미 존재하는 카테고리 이름입니다.");
        }
        cat.update(name, emoji, displayOrder, isActive);
        return cat;
    }

    @Transactional
    public void delete(Integer id) {
        Category cat = categoryRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("카테고리를 찾을 수 없습니다."));
        categoryRepository.delete(cat);
    }

    // ─── 관리자 CMS: 매핑 큐 + 매핑 규칙 ─────────────────────────────────

    /** 미매핑 원본 값 집계 (관리자 "매핑 대기" 탭). */
    @Transactional(readOnly = true)
    public List<UnmappedItem> listUnmapped() {
        return mappingRepository.findUnmappedRawInputsWithCount().stream()
            .map(row -> new UnmappedItem((String) row[0], ((Number) row[1]).longValue()))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryMapping> listMappings() {
        return mappingRepository.findAllWithCategory();
    }

    /**
     * 매핑 upsert + 동일 원본값 식당 일괄 재분류.
     * Nest `upsertMapping()`의 트랜잭션 블록을 Spring @Transactional로 대체.
     */
    @Transactional
    public UpsertResult upsertMapping(String rawInput, Integer categoryId) {
        String trimmed = rawInput == null ? "" : rawInput.trim();
        if (trimmed.isEmpty()) throw ApiException.badRequest("원본 문자열은 비워둘 수 없습니다.");

        Category category = categoryRepository.findById(categoryId)
            .orElseThrow(() -> ApiException.notFound("대상 카테고리를 찾을 수 없습니다."));

        CategoryMapping mapping = mappingRepository.findByRawInput(trimmed)
            .map(existing -> { existing.reassign(category); return existing; })
            .orElseGet(() -> mappingRepository.save(CategoryMapping.builder()
                .rawInput(trimmed).category(category).build()));

        int updated = restaurantRepository.bulkAssignCategoryByRawInput(trimmed, category, category.getName());
        return new UpsertResult(mapping, updated);
    }

    @Transactional
    public void deleteMapping(Integer id) {
        CategoryMapping m = mappingRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("매핑을 찾을 수 없습니다."));
        mappingRepository.delete(m);
    }

    public record UnmappedItem(String rawInput, long count) {}
    public record UpsertResult(CategoryMapping mapping, int updatedRestaurants) {}
}
