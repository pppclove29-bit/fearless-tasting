package com.fearlesstasting.api.inquiry.controller;

import com.fearlesstasting.api.common.ratelimit.RateLimit;
import com.fearlesstasting.api.inquiry.entity.Inquiry;
import com.fearlesstasting.api.inquiry.repository.InquiryRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "문의")
@RestController
@RequestMapping
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryRepository repository;

    public record InquiryView(String id, String category, String email,
                              String subject, String content, LocalDateTime createdAt) {
        static InquiryView from(Inquiry i) {
            return new InquiryView(i.getId(), i.getCategory(), i.getEmail(),
                i.getSubject(), i.getContent(), i.getCreatedAt());
        }
    }

    public record CreateRequest(
        @NotBlank @Size(max = 30) String category,
        @NotBlank @Email @Size(max = 200) String email,
        @NotBlank @Size(max = 300) String subject,
        @NotBlank @Size(max = 5000) String content
    ) {}

    @Operation(summary = "문의 등록 (공개)")
    @PostMapping("/inquiries")
    @RateLimit(capacity = 5, refillSeconds = 300)
    @Transactional
    public ResponseEntity<InquiryView> create(@Valid @RequestBody CreateRequest req) {
        Inquiry saved = repository.save(Inquiry.builder()
            .category(req.category())
            .email(req.email())
            .subject(req.subject())
            .content(req.content())
            .build());
        return ResponseEntity.status(201).body(InquiryView.from(saved));
    }

    @Operation(summary = "전체 문의 목록 (관리자)")
    @GetMapping("/admin/inquiries")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<InquiryView> list() {
        return repository.findAllByOrderByCreatedAtDesc().stream().map(InquiryView::from).toList();
    }
}
