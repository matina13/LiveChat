package com.example.livechat.rooms;

import java.time.OffsetDateTime;

public record RoomResponse(
        Long id,
        String name,
        boolean isPrivate,
        Long creatorId,
        OffsetDateTime createdAt,
        String type,
        String otherUsername,
        Long otherUserId,       // non-null for direct rooms
        long unreadCount,
        String otherUserAvatarUrl
) {}
