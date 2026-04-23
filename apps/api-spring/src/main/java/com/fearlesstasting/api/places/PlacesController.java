package com.fearlesstasting.api.places;

import com.fearlesstasting.api.common.ratelimit.RateLimit;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "외부 장소 검색")
@RestController
@RequestMapping("/places")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class PlacesController {

    private final PlacesService placesService;

    @Operation(summary = "네이버 로컬 장소 검색")
    @GetMapping("/naver")
    @RateLimit(capacity = 30, refillSeconds = 60)
    public PlacesService.SearchResult searchNaver(
        @RequestParam String query,
        @RequestParam(defaultValue = "1") int start
    ) {
        return placesService.searchNaver(query, start);
    }
}
