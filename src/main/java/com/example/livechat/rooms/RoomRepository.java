package com.example.livechat.rooms;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {
    boolean existsByName(String name);

    @Query("""
            select distinct r
            from RoomMember rm
            join rm.room r
            where rm.user.id = :userId
            order by r.lastMessageAt desc nulls last, r.createdAt desc
            """)
    List<Room> findAllForMember(@Param("userId") long userId);

    @Query("""
            select r
            from Room r
            join RoomMember rm on rm.room = r
            where r.id = :roomId and rm.user.id = :userId
            """)
    Optional<Room> findByIdForMember(@Param("roomId") long roomId, @Param("userId") long userId);

    @Query("""
            select r from Room r
            join RoomMember rm1 on rm1.room = r and rm1.user.id = :userId1
            join RoomMember rm2 on rm2.room = r and rm2.user.id = :userId2
            where r.type = 'direct'
            """)
    Optional<Room> findDmBetween(@Param("userId1") long userId1, @Param("userId2") long userId2);

    @Query("""
            select r
            from Room r
            where r.isPrivate = false
              and r.type = 'group'
              and lower(r.name) like lower(concat('%', :query, '%'))
              and not exists (
                select 1 from RoomMember rm
                where rm.room = r and rm.user.id = :userId
              )
            order by r.createdAt desc
            """)
    Page<Room> searchPublicRooms(
            @Param("userId") long userId,
            @Param("query") String query,
            Pageable pageable
    );
}
