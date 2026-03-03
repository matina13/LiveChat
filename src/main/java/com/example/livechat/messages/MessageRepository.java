package com.example.livechat.messages;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    Page<Message> findByRoom_IdOrderByCreatedAtDesc(long roomId, Pageable pageable);

    @Query("""
            SELECT m.room.id, COUNT(m)
            FROM Message m, RoomMember rm
            WHERE m.room = rm.room
              AND rm.user.id = :userId
              AND m.room.id IN :roomIds
              AND m.sender.id <> :userId
              AND m.deletedAt IS NULL
              AND (rm.lastReadAt IS NULL OR m.createdAt > rm.lastReadAt)
            GROUP BY m.room.id
            """)
    List<Object[]> countUnreadPerRoom(@Param("userId") long userId, @Param("roomIds") List<Long> roomIds);
}
