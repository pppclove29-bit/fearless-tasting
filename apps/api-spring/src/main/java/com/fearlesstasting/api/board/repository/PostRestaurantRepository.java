package com.fearlesstasting.api.board.repository;

import com.fearlesstasting.api.board.entity.PostRestaurant;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostRestaurantRepository extends JpaRepository<PostRestaurant, String> {
    List<PostRestaurant> findAllByPostId(String postId);
    List<PostRestaurant> findAllByPostIdIn(Collection<String> postIds);
    void deleteByPostId(String postId);
}
