package com.example.livechat.rooms;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRoomRequest(
        @NotBlank @Size(min = 3, max = 100) String name,
        boolean isPrivate
) {}
