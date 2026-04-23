package com.fearlesstasting.api.poll.repository;

import com.fearlesstasting.api.poll.entity.RoomPollOption;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RoomPollOptionRepository extends JpaRepository<RoomPollOption, String> {

    @Query("""
        select o from RoomPollOption o
        left join fetch o.restaurant
        where o.poll.id = :pollId
        order by o.createdAt asc
        """)
    List<RoomPollOption> findByPollIdWithRestaurant(String pollId);

    @Query("""
        select o from RoomPollOption o
        where o.poll.id in :pollIds
        """)
    List<RoomPollOption> findAllByPollIds(Collection<String> pollIds);

    @Query("""
        select o from RoomPollOption o
        join fetch o.poll
        where o.id = :id
        """)
    Optional<RoomPollOption> findByIdWithPoll(String id);
}
