package com.fearlesstasting.api.category.controller;

import com.fearlesstasting.api.category.controller.dto.CategoryResponse;
import com.fearlesstasting.api.category.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 공개: 활성 카테고리 목록 (프론트 칩/필터용). */
@Tag(name = "카테고리")
@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @Operation(summary = "활성 카테고리 목록")
    @GetMapping
    public List<CategoryResponse> listActive() {
        return categoryService.listActive().stream()
            .map(CategoryResponse::from)
            .toList();
    }
}
