package com.fearlesstasting.api.board.service;

import com.fearlesstasting.api.board.entity.Board;
import com.fearlesstasting.api.board.repository.BoardRepository;
import com.fearlesstasting.api.common.web.ApiException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final BoardRepository repository;

    @Transactional(readOnly = true)
    public List<Board> listPublic() {
        return repository.findAllByEnabledTrueOrderBySortOrderAscCreatedAtAsc();
    }

    @Transactional(readOnly = true)
    public List<Board> listAll() {
        return repository.findAllByOrderBySortOrderAscCreatedAtAsc();
    }

    @Transactional(readOnly = true)
    public Board getBySlug(String slug) {
        return repository.findBySlug(slug)
            .orElseThrow(() -> ApiException.notFound("게시판을 찾을 수 없습니다."));
    }

    @Transactional
    public Board create(String name, String slug, String description, Integer sortOrder,
                        Boolean enabled, Integer popularThreshold) {
        if (repository.existsBySlug(slug)) throw ApiException.conflict("이미 사용 중인 슬러그입니다.");
        return repository.save(Board.builder()
            .name(name).slug(slug).description(description)
            .sortOrder(sortOrder).enabled(enabled).popularThreshold(popularThreshold).build());
    }

    @Transactional
    public Board update(String id, String name, String slug, String description,
                        Integer sortOrder, Boolean enabled, Integer popularThreshold) {
        Board b = repository.findById(id)
            .orElseThrow(() -> ApiException.notFound("게시판을 찾을 수 없습니다."));
        if (slug != null && !slug.equals(b.getSlug()) && repository.existsBySlug(slug)) {
            throw ApiException.conflict("이미 사용 중인 슬러그입니다.");
        }
        b.update(name, slug, description, sortOrder, enabled, popularThreshold);
        return b;
    }

    @Transactional
    public void delete(String id) {
        if (!repository.existsById(id)) throw ApiException.notFound("게시판을 찾을 수 없습니다.");
        repository.deleteById(id);
    }
}
