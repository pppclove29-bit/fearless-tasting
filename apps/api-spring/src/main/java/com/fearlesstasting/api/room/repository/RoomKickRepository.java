package com.fearlesstasting.api.room.repository;

import com.fearlesstasting.api.room.entity.RoomKick;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomKickRepository extends JpaRepository<RoomKick, String> {

    boolean existsByRoomIdAndUserId(String roomId, String userId);
}
