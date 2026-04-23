package com.fearlesstasting.api.category.controller.dto;

import com.fearlesstasting.api.category.entity.Category;

public record CategoryResponse(
    Integer id,
    String name,
    String emoji,
    int displayOrder,
    boolean isActive
) {
    public static CategoryResponse from(Category c) {
        return new CategoryResponse(c.getId(), c.getName(), c.getEmoji(), c.getDisplayOrder(), c.isActive());
    }
}
