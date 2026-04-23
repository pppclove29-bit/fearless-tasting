package com.fearlesstasting.api.notification.repository;

import com.fearlesstasting.api.notification.entity.RoomNotification;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface RoomNotificationRepository extends JpaRepository<RoomNotification, String> {

    @Query("""
        select n from RoomNotification n
        join fetch n.room
        where n.user.id = :userId
        order by n.createdAt desc
        """)
    List<RoomNotification> findRecentByUserId(String userId, Pageable pageable);

    long countByUserIdAndIsReadFalse(String userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update RoomNotification n set n.isRead = true where n.user.id = :userId and n.isRead = false")
    int markAllReadByUserId(String userId);
}
