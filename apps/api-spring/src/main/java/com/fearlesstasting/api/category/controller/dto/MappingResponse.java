package com.fearlesstasting.api.category.controller.dto;

import com.fearlesstasting.api.category.entity.CategoryMapping;

public record MappingResponse(
    Integer id,
    String rawInput,
    Integer categoryId,
    String categoryName,
    String categoryEmoji
) {
    public static MappingResponse from(CategoryMapping m) {
        return new MappingResponse(
            m.getId(),
            m.getRawInput(),
            m.getCategory().getId(),
            m.getCategory().getName(),
            m.getCategory().getEmoji()
        );
    }
}
