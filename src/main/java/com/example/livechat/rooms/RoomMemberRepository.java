package com.example.livechat.rooms;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoomMemberRepository extends JpaRepository<RoomMember, Long> {
    boolean existsByRoom_IdAndUser_Id(long roomId, long userId);

    void deleteByRoom_IdAndUser_Id(long roomId, long userId);

    @Query("select rm from RoomMember rm join fetch rm.user where rm.room.id = :roomId order by rm.joinedAt asc")
    List<RoomMember> findAllByRoomId(@Param("roomId") long roomId);

    @Query("select rm from RoomMember rm join fetch rm.user where rm.room.id = :roomId and rm.user.id <> :userId")
    Optional<RoomMember> findOtherMember(@Param("roomId") long roomId, @Param("userId") long userId);

    @Query("select rm.user.id from RoomMember rm where rm.room.id = :roomId and rm.user.id <> :senderId")
    List<Long> findRecipientIds(@Param("roomId") long roomId, @Param("senderId") long senderId);
}
