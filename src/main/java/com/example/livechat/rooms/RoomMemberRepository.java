package com.example.livechat.rooms;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomMemberRepository extends JpaRepository<RoomMember, Long> {
    boolean existsByRoom_IdAndUser_Id(long roomId, long userId);
}
