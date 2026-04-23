package com.fearlesstasting.api.category.controller;

import com.fearlesstasting.api.category.controller.dto.CategoryResponse;
import com.fearlesstasting.api.category.controller.dto.CreateCategoryRequest;
import com.fearlesstasting.api.category.controller.dto.MappingResponse;
import com.fearlesstasting.api.category.controller.dto.UpdateCategoryRequest;
import com.fearlesstasting.api.category.controller.dto.UpsertMappingRequest;
import com.fearlesstasting.api.category.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 관리자 카테고리 CMS — Nest `AdminCategoriesController`와 동일한 엔드포인트로 포팅.
 * `@PreAuthorize("hasRole('ADMIN')")`로 AdminGuard 대체.
 */
@Tag(name = "관리자 - 카테고리")
@RestController
@RequestMapping("/admin/categories")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCategoryController {

    private final CategoryService categoryService;

    @Operation(summary = "전체 카테고리 목록 (비활성 포함)")
    @GetMapping
    public List<CategoryResponse> list() {
        return categoryService.listAll().stream().map(CategoryResponse::from).toList();
    }

    @Operation(summary = "카테고리 생성")
    @PostMapping
    public CategoryResponse create(@Valid @RequestBody CreateCategoryRequest req) {
        return CategoryResponse.from(categoryService.create(
            req.name(), req.emoji(), req.displayOrder(), req.isActive()
        ));
    }

    @Operation(summary = "카테고리 수정")
    @PatchMapping("/{id}")
    public CategoryResponse update(@PathVariable Integer id,
                                    @Valid @RequestBody UpdateCategoryRequest req) {
        return CategoryResponse.from(categoryService.update(
            id, req.name(), req.emoji(), req.displayOrder(), req.isActive()
        ));
    }

    @Operation(summary = "카테고리 삭제 (연결 식당은 미분류로 복귀)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        categoryService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "미매핑 원본 값 큐 (건수 내림차순)")
    @GetMapping("/unmapped")
    public List<CategoryService.UnmappedItem> unmapped() {
        return categoryService.listUnmapped();
    }

    @Operation(summary = "매핑 규칙 목록")
    @GetMapping("/mappings")
    public List<MappingResponse> mappings() {
        return categoryService.listMappings().stream().map(MappingResponse::from).toList();
    }

    @Operation(summary = "매핑 upsert + 동일 원본 식당 일괄 업데이트")
    @PostMapping("/mappings")
    public Map<String, Object> upsertMapping(@Valid @RequestBody UpsertMappingRequest req) {
        var result = categoryService.upsertMapping(req.rawInput(), req.categoryId());
        return Map.of(
            "mapping", MappingResponse.from(result.mapping()),
            "updatedRestaurants", result.updatedRestaurants()
        );
    }

    @Operation(summary = "매핑 삭제 (기존 식당 분류는 유지)")
    @DeleteMapping("/mappings/{id}")
    public ResponseEntity<Void> deleteMapping(@PathVariable Integer id) {
        categoryService.deleteMapping(id);
        return ResponseEntity.noContent().build();
    }
}
