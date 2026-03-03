package com.example.livechat.messages;

import java.time.OffsetDateTime;

public record MessageResponse(
        Long id,
        Long roomId,
        Long senderId,
        String senderUsername,
        String content,        // null when deleted
        OffsetDateTime createdAt,
        OffsetDateTime editedAt,
        boolean deleted,
        String type            // "message" | "edit" | "delete"  — used by WS clients
) {}
