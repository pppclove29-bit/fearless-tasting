package com.fearlesstasting.api.category.service;

import com.fearlesstasting.api.category.entity.Category;

/**
 * 원본 문자열을 Category로 해석한 결과.
 * - category != null : 매핑 성공 (displayName = Category.name)
 * - category == null : 매핑 실패 (displayName = 원본 입력값, CMS 매핑 대기)
 */
public record CategoryResolution(Category category, String displayName) {
    public static CategoryResolution mapped(Category category) {
        return new CategoryResolution(category, category.getName());
    }

    public static CategoryResolution unmapped(String rawDisplay) {
        return new CategoryResolution(null, rawDisplay);
    }
}
