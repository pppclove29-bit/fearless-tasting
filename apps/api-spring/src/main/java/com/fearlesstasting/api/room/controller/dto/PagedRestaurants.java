package com.fearlesstasting.api.room.controller.dto;

import com.fearlesstasting.api.room.service.RoomRestaurantService.RestaurantListItem;
import java.util.List;
import org.springframework.data.domain.Page;

/** Nest 응답 구조 `{ data, total, page, pageSize }`와 동등. */
public record PagedRestaurants(
    List<RestaurantListItem> data,
    long total,
    int page,
    int pageSize
) {
    public static PagedRestaurants from(Page<RestaurantListItem> page) {
        return new PagedRestaurants(
            page.getContent(),
            page.getTotalElements(),
            page.getNumber() + 1,
            page.getSize()
        );
    }
}
