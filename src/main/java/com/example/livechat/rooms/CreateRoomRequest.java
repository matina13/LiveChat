package com.example.livechat.rooms;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRoomRequest(
        @NotBlank @Size(min = 3, max = 100) String name,
        @JsonProperty("isPrivate") boolean isPrivate
) {}
