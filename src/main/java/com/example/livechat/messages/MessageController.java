package com.example.livechat.messages;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms/{roomId}/messages")
public class MessageController {

    private final MessageService messages;

    public MessageController(MessageService messages) {
        this.messages = messages;
    }

    @PostMapping
    public ResponseEntity<MessageResponse> sendMessage(
            @PathVariable long roomId,
            @Valid @RequestBody CreateMessageRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        return ResponseEntity.ok(messages.sendMessage(roomId, userId, request));
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable long roomId,
            @PathVariable long messageId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        messages.deleteMessage(roomId, messageId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<MessagesResponse> listMessages(
            @PathVariable long roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        return ResponseEntity.ok(messages.listMessages(roomId, userId, page, size));
    }
}
