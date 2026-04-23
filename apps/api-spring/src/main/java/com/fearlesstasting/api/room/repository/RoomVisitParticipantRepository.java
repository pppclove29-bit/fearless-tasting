package com.fearlesstasting.api.room.repository;

import com.fearlesstasting.api.room.entity.RoomVisitParticipant;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RoomVisitParticipantRepository extends JpaRepository<RoomVisitParticipant, String> {

    @Query("""
        select p from RoomVisitParticipant p
        join fetch p.user
        where p.visit.id in :visitIds
        """)
    List<RoomVisitParticipant> findByVisitIdsWithUser(Collection<String> visitIds);

    void deleteByVisitId(String visitId);
}
