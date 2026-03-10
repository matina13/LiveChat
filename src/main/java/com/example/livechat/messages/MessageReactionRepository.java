package com.example.livechat.messages;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MessageReactionRepository extends JpaRepository<MessageReaction, Long> {
    List<MessageReaction> findByMessage_Id(long messageId);
    List<MessageReaction> findByMessage_IdIn(Collection<Long> messageIds);
    Optional<MessageReaction> findByMessage_IdAndUser_IdAndEmoji(long messageId, long userId, String emoji);
}
