package com.fearlesstasting.api.room.controller.dto;

import jakarta.validation.constraints.Size;

public record UpdateRestaurantRequest(
    @Size(max = 200) String name,
    @Size(max = 300) String address,
    @Size(max = 50)  String province,
    @Size(max = 50)  String city,
    @Size(max = 100) String neighborhood,
    @Size(max = 100) String category,
    Double latitude,
    Double longitude,
    Boolean isClosed
) {}
