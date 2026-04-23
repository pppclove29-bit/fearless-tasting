package com.fearlesstasting.api.inquiry.repository;

import com.fearlesstasting.api.inquiry.entity.Inquiry;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InquiryRepository extends JpaRepository<Inquiry, String> {
    List<Inquiry> findAllByOrderByCreatedAtDesc();
}
