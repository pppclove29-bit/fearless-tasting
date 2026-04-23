package com.fearlesstasting.api.room.repository;

import com.fearlesstasting.api.room.entity.Room;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RoomRepository extends JpaRepository<Room, String> {

    Optional<Room> findByInviteCode(String inviteCode);

    boolean existsByInviteCode(String inviteCode);

    /** 내가 참여 중인 방 전체 (owner 또는 member). fetch join으로 owner 미리 로드. */
    @Query("""
        select distinct r from Room r
        join fetch r.owner
        left join RoomMember m on m.room = r
        where m.user.id = :userId or r.owner.id = :userId
        order by r.updatedAt desc
        """)
    List<Room> findAllByUserId(String userId);

    /** 공개 방 (품질 필터 제외, 단순 목록). 페이지네이션은 호출자. */
    @Query("""
        select r from Room r
        join fetch r.owner
        where r.isPublic = true
        order by r.updatedAt desc
        """)
    List<Room> findAllPublic();

    @Query("select r.id from Room r where r.isPublic = true order by r.updatedAt desc")
    List<String> findPublicIds();
}
