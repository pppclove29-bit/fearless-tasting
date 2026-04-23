package com.fearlesstasting.api.room.controller;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.room.service.RevisitSuggestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "재방문 추천")
@RestController
@RequestMapping("/rooms/revisit-suggestions")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class RevisitSuggestionController {

    private final RevisitSuggestionService service;

    @Operation(summary = "재방문 추천 식당 (60일+ 미방문, 4.0+ 평점)")
    @GetMapping
    public List<RevisitSuggestionService.RevisitSuggestion> suggestions(@CurrentUser AuthUserPrincipal principal) {
        return service.suggestionsFor(principal.userId());
    }
}
