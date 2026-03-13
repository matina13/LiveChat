package com.example.livechat.messages;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Set;

public record MessageResponse(
        Long id,
        Long roomId,
        Long senderId,
        String senderUsername,
        String content,        // null when deleted
        OffsetDateTime createdAt,
        OffsetDateTime editedAt,
        boolean deleted,
        String type,           // "message" | "edit" | "delete"  — used by WS clients
        String messageType,    // "text" | "image"
        Map<String, Long> reactions,        // emoji → count
        Set<String> myReactions,            // emojis the requesting user has reacted with
        Long replyToId,
        String replyToSenderUsername,
        String replyToContent,              // null if reply-to was deleted
        String senderAvatarUrl
) {}
