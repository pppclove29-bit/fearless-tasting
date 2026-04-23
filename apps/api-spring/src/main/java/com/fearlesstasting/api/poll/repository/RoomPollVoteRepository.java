package com.fearlesstasting.api.poll.repository;

import com.fearlesstasting.api.poll.entity.RoomPollVote;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RoomPollVoteRepository extends JpaRepository<RoomPollVote, String> {

    Optional<RoomPollVote> findByOptionIdAndUserId(String optionId, String userId);

    /** 특정 투표의 내 투표 1건 찾기. 옵션 교체 UI에서 사용. */
    @Query("""
        select v from RoomPollVote v
        where v.option.poll.id = :pollId and v.user.id = :userId
        """)
    Optional<RoomPollVote> findByPollIdAndUserId(String pollId, String userId);

    /** 여러 옵션의 득표 수 일괄 집계 (optionId, count). */
    @Query("""
        select v.option.id, count(v)
        from RoomPollVote v
        where v.option.id in :optionIds
        group by v.option.id
        """)
    List<Object[]> countByOptionIds(Collection<String> optionIds);
}
