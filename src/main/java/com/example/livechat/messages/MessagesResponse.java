package com.example.livechat.messages;

import java.util.List;

public record MessagesResponse(
        List<MessageResponse> messages,
        int page,
        int size,
        long total
) {}
