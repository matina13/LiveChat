package com.example.livechat.messages;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/rooms/{roomId}/messages")
public class MessageController {

    private final MessageService messages;
    private final SimpMessagingTemplate ws;

    public MessageController(MessageService messages, SimpMessagingTemplate ws) {
        this.messages = messages;
        this.ws = ws;
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

    @PatchMapping("/{messageId}")
    public ResponseEntity<MessageResponse> editMessage(
            @PathVariable long roomId,
            @PathVariable long messageId,
            @Valid @RequestBody EditMessageRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        MessageResponse response = messages.editMessage(roomId, messageId, userId, request);
        ws.convertAndSend("/topic/rooms/" + roomId, response);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable long roomId,
            @PathVariable long messageId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        messages.deleteMessage(roomId, messageId, userId);
        ws.convertAndSend("/topic/rooms/" + roomId,
                Map.of("type", "delete", "id", messageId, "roomId", roomId));
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

    @PostMapping("/read")
    public ResponseEntity<Void> markRead(
            @PathVariable long roomId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        messages.markRoomRead(roomId, userId);
        return ResponseEntity.noContent().build();
    }
}
