package com.example.livechat.rooms;

import java.time.OffsetDateTime;

public record MemberResponse(Long userId, String username, String role, OffsetDateTime joinedAt, String avatarUrl) {}
