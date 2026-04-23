package com.fearlesstasting.api.room.repository;

import com.fearlesstasting.api.room.entity.RoomMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RoomMemberRepository extends JpaRepository<RoomMember, String> {

    Optional<RoomMember> findByRoomIdAndUserId(String roomId, String userId);

    long countByRoomId(String roomId);

    long countByUserId(String userId);

    @Query("""
        select m from RoomMember m
        join fetch m.user
        where m.room.id = :roomId
        order by case m.role when 'owner' then 0 when 'manager' then 1 else 2 end,
                 m.joinedAt asc
        """)
    List<RoomMember> findAllByRoomIdWithUser(String roomId);
}
