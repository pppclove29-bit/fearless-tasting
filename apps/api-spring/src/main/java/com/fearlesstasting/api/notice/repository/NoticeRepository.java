package com.fearlesstasting.api.notice.repository;

import com.fearlesstasting.api.notice.entity.Notice;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoticeRepository extends JpaRepository<Notice, String> {

    List<Notice> findAllByEnabledTrueOrderBySortOrderAscCreatedAtDesc();

    List<Notice> findAllByOrderBySortOrderAscCreatedAtDesc();
}
