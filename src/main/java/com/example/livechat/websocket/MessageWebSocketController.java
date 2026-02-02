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

@Controller
public class MessageWebSocketController {

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    public MessageWebSocketController(
            MessageService messageService,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.messageService = messageService;
        this.messagingTemplate = messagingTemplate;
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
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, response);
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
