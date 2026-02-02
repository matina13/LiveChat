package com.example.livechat.messages;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, Long> {
    Page<Message> findByRoom_IdOrderByCreatedAtDesc(long roomId, Pageable pageable);
}
