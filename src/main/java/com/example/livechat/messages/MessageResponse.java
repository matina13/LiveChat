package com.example.livechat.messages;

import java.time.OffsetDateTime;

public record MessageResponse(
        Long id,
        Long roomId,
        Long senderId,
        String senderUsername,
        String content,
        OffsetDateTime createdAt
) {}
