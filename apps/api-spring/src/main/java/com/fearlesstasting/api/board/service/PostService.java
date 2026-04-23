package com.fearlesstasting.api.board.service;

import com.fearlesstasting.api.board.entity.Board;
import com.fearlesstasting.api.board.entity.Comment;
import com.fearlesstasting.api.board.entity.Post;
import com.fearlesstasting.api.board.entity.PostBookmark;
import com.fearlesstasting.api.board.entity.PostLike;
import com.fearlesstasting.api.board.entity.PostRestaurant;
import com.fearlesstasting.api.board.repository.BoardRepository;
import com.fearlesstasting.api.board.repository.CommentLikeRepository;
import com.fearlesstasting.api.board.repository.CommentRepository;
import com.fearlesstasting.api.board.repository.PostBookmarkRepository;
import com.fearlesstasting.api.board.repository.PostLikeRepository;
import com.fearlesstasting.api.board.repository.PostRepository;
import com.fearlesstasting.api.board.repository.PostRestaurantRepository;
import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 커뮤니티 게시판: 게시글 CRUD + 댓글 + 추천/북마크.
 * 익명 기능: `isAnonymous=true` 시 작성자 정보 노출 억제 (컨트롤러에서 처리).
 */
@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final BoardRepository boardRepository;
    private final PostLikeRepository postLikeRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final PostBookmarkRepository bookmarkRepository;
    private final PostRestaurantRepository postRestaurantRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<Post> listByBoard(String boardSlug, int page, int size) {
        Board board = boardRepository.findBySlug(boardSlug)
            .orElseThrow(() -> ApiException.notFound("게시판을 찾을 수 없습니다."));
        int safe = Math.min(50, Math.max(1, size));
        return postRepository.findByBoardIdWithAuthor(board.getId(), PageRequest.of(Math.max(0, page - 1), safe));
    }

    @Transactional(readOnly = true)
    public Post get(String id) {
        return postRepository.findByIdWithAuthor(id)
            .orElseThrow(() -> ApiException.notFound("게시글을 찾을 수 없습니다."));
    }

    @Transactional
    public Post create(String boardSlug, String userId, String title, String content,
                       boolean isAnonymous, List<PostRestaurantInput> restaurants) {
        Board board = boardRepository.findBySlug(boardSlug)
            .orElseThrow(() -> ApiException.notFound("게시판을 찾을 수 없습니다."));
        User author = userRepository.findById(userId)
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));

        Post post = postRepository.save(Post.builder()
            .board(board).author(author).title(title).content(content).isAnonymous(isAnonymous).build());

        if (restaurants != null) {
            for (PostRestaurantInput r : restaurants) {
                postRestaurantRepository.save(PostRestaurant.builder()
                    .post(post)
                    .name(r.name()).address(r.address()).category(r.category())
                    .latitude(r.latitude()).longitude(r.longitude()).kakaoPlaceId(r.kakaoPlaceId())
                    .build());
            }
        }
        return post;
    }

    @Transactional
    public Post update(String id, String userId, String title, String content) {
        Post post = postRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("게시글을 찾을 수 없습니다."));
        if (!post.getAuthor().getId().equals(userId)) {
            throw ApiException.forbidden("본인의 게시글만 수정할 수 있습니다.");
        }
        post.update(title, content);
        return post;
    }

    @Transactional
    public void delete(String id, String userId) {
        Post post = postRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("게시글을 찾을 수 없습니다."));
        User actor = userRepository.findById(userId)
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));
        if (!post.getAuthor().getId().equals(userId) && !actor.isAdmin()) {
            throw ApiException.forbidden("본인의 게시글만 삭제할 수 있습니다.");
        }
        postRepository.delete(post);
    }

    // ─── 댓글 ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Comment> listComments(String postId) {
        return commentRepository.findAllByPostIdWithAuthor(postId);
    }

    @Transactional
    public Comment addComment(String postId, String userId, String content, boolean isAnonymous) {
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> ApiException.notFound("게시글을 찾을 수 없습니다."));
        User author = userRepository.findById(userId)
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));
        return commentRepository.save(Comment.builder()
            .post(post).author(author).content(content).isAnonymous(isAnonymous).build());
    }

    @Transactional
    public void deleteComment(String commentId, String userId) {
        Comment c = commentRepository.findById(commentId)
            .orElseThrow(() -> ApiException.notFound("댓글을 찾을 수 없습니다."));
        User actor = userRepository.findById(userId).orElseThrow();
        if (!c.getAuthor().getId().equals(userId) && !actor.isAdmin()) {
            throw ApiException.forbidden("본인의 댓글만 삭제할 수 있습니다.");
        }
        commentRepository.delete(c);
    }

    // ─── 추천 / 북마크 토글 ──────────────────────────────────────────────

    @Transactional
    public LikeResult togglePostLike(String postId, String userId) {
        var existing = postLikeRepository.findByPostIdAndUserId(postId, userId);
        if (existing.isPresent()) {
            postLikeRepository.delete(existing.get());
            return new LikeResult(false, postLikeRepository.countByPostId(postId));
        }
        Post post = postRepository.findById(postId).orElseThrow(() -> ApiException.notFound("게시글 없음"));
        User user = userRepository.findById(userId).orElseThrow();
        postLikeRepository.save(PostLike.builder().post(post).user(user).build());
        return new LikeResult(true, postLikeRepository.countByPostId(postId));
    }

    @Transactional
    public LikeResult toggleCommentLike(String commentId, String userId) {
        var existing = commentLikeRepository.findByCommentIdAndUserId(commentId, userId);
        if (existing.isPresent()) {
            commentLikeRepository.delete(existing.get());
            return new LikeResult(false, commentLikeRepository.countByCommentId(commentId));
        }
        Comment c = commentRepository.findById(commentId).orElseThrow(() -> ApiException.notFound("댓글 없음"));
        User user = userRepository.findById(userId).orElseThrow();
        commentLikeRepository.save(com.fearlesstasting.api.board.entity.CommentLike.builder()
            .comment(c).user(user).build());
        return new LikeResult(true, commentLikeRepository.countByCommentId(commentId));
    }

    @Transactional
    public LikeResult toggleBookmark(String postId, String userId) {
        var existing = bookmarkRepository.findByPostIdAndUserId(postId, userId);
        if (existing.isPresent()) {
            bookmarkRepository.delete(existing.get());
            return new LikeResult(false, bookmarkRepository.countByPostId(postId));
        }
        Post post = postRepository.findById(postId).orElseThrow(() -> ApiException.notFound("게시글 없음"));
        User user = userRepository.findById(userId).orElseThrow();
        bookmarkRepository.save(PostBookmark.builder().post(post).user(user).build());
        return new LikeResult(true, bookmarkRepository.countByPostId(postId));
    }

    public record LikeResult(boolean active, long count) {}

    public record PostRestaurantInput(
        String name, String address, String category,
        Double latitude, Double longitude, String kakaoPlaceId
    ) {}
}
