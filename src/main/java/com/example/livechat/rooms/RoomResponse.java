package com.example.livechat.rooms;

import java.time.OffsetDateTime;

public record RoomResponse(
        Long id,
        String name,
        boolean isPrivate,
        Long creatorId,
        OffsetDateTime createdAt
) {}
