package com.example.livechat.websocket;

import java.security.Principal;
import java.util.Map;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.example.livechat.messages.CreateMessageRequest;
import com.example.livechat.messages.MessageResponse;
import com.example.livechat.messages.MessageService;
import com.example.livechat.rooms.RoomMemberRepository;

@Controller
public class MessageWebSocketController {

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final RoomMemberRepository members;

    public MessageWebSocketController(
            MessageService messageService,
            SimpMessagingTemplate messagingTemplate,
            RoomMemberRepository members
    ) {
        this.messageService = messageService;
        this.messagingTemplate = messagingTemplate;
        this.members = members;
    }

    @MessageMapping("/rooms/{roomId}/typing")
    public void typing(
            @DestinationVariable long roomId,
            Principal principal,
            @Header(name = "simpSessionAttributes", required = false) Map<String, Object> sessionAttributes
    ) {
        Long userId = resolveUserId(principal, sessionAttributes);
        if (userId == null) return;

        String username = sessionAttributes != null
                ? String.valueOf(sessionAttributes.getOrDefault("username", "Unknown"))
                : "Unknown";

        messagingTemplate.convertAndSend(
                "/topic/rooms/" + roomId + "/typing",
                Map.of("userId", userId, "username", username)
        );
    }

    @MessageMapping("/rooms/{roomId}/send")
    public void sendMessage(
            @DestinationVariable long roomId,
            CreateMessageRequest request,
            Principal principal,
            @Header(name = "simpSessionAttributes", required = false) Map<String, Object> sessionAttributes
    ) {
        Long userId = resolveUserId(principal, sessionAttributes);
        if (userId == null) {
            throw new IllegalArgumentException("Unauthorized");
        }

        MessageResponse response = messageService.sendMessage(roomId, userId, request);

        // Broadcast to everyone subscribed to this room (sender sees it immediately)
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, response);

        // Notify all other members so they can update unread counts even if the room isn't open
        String raw = response.content() != null ? response.content() : "";
        String preview = raw.length() > 60 ? raw.substring(0, 60) + "…" : raw;

        Map<String, Object> notification = Map.of(
                "roomId", roomId,
                "senderId", response.senderId(),
                "senderUsername", response.senderUsername(),
                "preview", preview
        );

        members.findRecipientIds(roomId, userId)
                .forEach(recipientId ->
                        messagingTemplate.convertAndSend(
                                "/topic/users/" + recipientId + "/notifications",
                                notification
                        )
                );
    }

    private Long resolveUserId(Principal principal, Map<String, Object> sessionAttributes) {
        if (principal != null && principal.getName() != null) {
            return Long.parseLong(principal.getName());
        }
        if (sessionAttributes == null) return null;
        Object raw = sessionAttributes.get("userId");
        if (raw == null) return null;
        return Long.parseLong(String.valueOf(raw));
    }
}
