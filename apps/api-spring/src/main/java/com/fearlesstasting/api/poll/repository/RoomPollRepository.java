package com.fearlesstasting.api.poll.repository;

import com.fearlesstasting.api.poll.entity.RoomPoll;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RoomPollRepository extends JpaRepository<RoomPoll, String> {

    @Query("""
        select p from RoomPoll p
        join fetch p.createdBy
        where p.room.id = :roomId
        order by p.createdAt desc
        """)
    List<RoomPoll> findAllByRoomIdWithCreator(String roomId);

    @Query("""
        select p from RoomPoll p
        join fetch p.createdBy
        where p.id = :id
        """)
    Optional<RoomPoll> findByIdWithCreator(String id);
}
