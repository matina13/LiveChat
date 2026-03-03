package com.example.livechat.websocket;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;

@Component
public class StompPresenceListener {

    private final PresenceService presence;

    public StompPresenceListener(PresenceService presence) {
        this.presence = presence;
    }

    @EventListener
    public void handleConnect(SessionConnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Map<String, Object> attrs = accessor.getSessionAttributes();
        String userIdStr = (attrs != null) ? (String) attrs.get("userId") : null;
        if (userIdStr != null) {
            presence.userConnected(Long.parseLong(userIdStr));
        }
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Map<String, Object> attrs = accessor.getSessionAttributes();
        String userIdStr = (attrs != null) ? (String) attrs.get("userId") : null;
        if (userIdStr != null) {
            presence.userDisconnected(Long.parseLong(userIdStr));
        }
    }
}
