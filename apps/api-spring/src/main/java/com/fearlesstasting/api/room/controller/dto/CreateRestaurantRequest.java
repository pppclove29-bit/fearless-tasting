package com.fearlesstasting.api.room.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRestaurantRequest(
    @NotBlank @Size(max = 200) String name,
    @NotBlank @Size(max = 300) String address,
    @NotBlank @Size(max = 50)  String province,
    @NotBlank @Size(max = 50)  String city,
    @NotBlank @Size(max = 100) String neighborhood,
    @NotBlank @Size(max = 100) String category,
    Double latitude,
    Double longitude,
    Boolean isWishlist
) {}
