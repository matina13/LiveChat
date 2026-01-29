package com.example.livechat.rooms;

import java.util.List;

public record PublicRoomsResponse(
        List<RoomResponse> rooms,
        int page,
        int size,
        long total
) {}
