package com.fearlesstasting.api.notice.service;

import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.notice.entity.Notice;
import com.fearlesstasting.api.notice.repository.NoticeRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository repository;

    @Transactional(readOnly = true)
    public List<Notice> listPublic() {
        return repository.findAllByEnabledTrueOrderBySortOrderAscCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<Notice> listAll() {
        return repository.findAllByOrderBySortOrderAscCreatedAtDesc();
    }

    @Transactional
    public Notice create(String title, String content, Boolean enabled, Integer sortOrder) {
        return repository.save(Notice.builder()
            .title(title).content(content).enabled(enabled).sortOrder(sortOrder).build());
    }

    @Transactional
    public Notice update(String id, String title, String content, Boolean enabled, Integer sortOrder) {
        Notice n = repository.findById(id)
            .orElseThrow(() -> ApiException.notFound("공지를 찾을 수 없습니다."));
        n.update(title, content, enabled, sortOrder);
        return n;
    }

    @Transactional
    public void delete(String id) {
        if (!repository.existsById(id)) {
            throw ApiException.notFound("공지를 찾을 수 없습니다.");
        }
        repository.deleteById(id);
    }
}
