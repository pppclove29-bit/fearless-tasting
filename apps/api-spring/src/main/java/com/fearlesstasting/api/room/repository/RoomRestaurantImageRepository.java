package com.fearlesstasting.api.room.repository;

import com.fearlesstasting.api.room.entity.RoomRestaurantImage;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RoomRestaurantImageRepository extends JpaRepository<RoomRestaurantImage, String> {

    @Query("""
        select i from RoomRestaurantImage i
        where i.restaurant.id = :restaurantId
        order by i.sortOrder asc
        """)
    List<RoomRestaurantImage> findAllByRestaurantId(String restaurantId);

    @Query("""
        select i from RoomRestaurantImage i
        where i.restaurant.id in :restaurantIds
        order by i.sortOrder asc
        """)
    List<RoomRestaurantImage> findAllByRestaurantIdIn(Collection<String> restaurantIds);

    void deleteByRestaurantId(String restaurantId);
}
