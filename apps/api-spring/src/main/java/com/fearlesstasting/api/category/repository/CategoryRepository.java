package com.fearlesstasting.api.category.repository;

import com.fearlesstasting.api.category.entity.Category;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Integer> {

    Optional<Category> findByName(String name);

    boolean existsByName(String name);

    List<Category> findAllByIsActiveTrueOrderByDisplayOrderAscIdAsc();

    List<Category> findAllByOrderByDisplayOrderAscIdAsc();
}
