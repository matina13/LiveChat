package com.example.livechat.websocket;

import java.util.List;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Component;

@Component
public class WebSocketJwtAuthInterceptor implements ChannelInterceptor {

    private final JwtDecoder jwtDecoder;

    public WebSocketJwtAuthInterceptor(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        if (SimpMessageType.CONNECT.equals(accessor.getMessageType())) {
            String token = resolveToken(accessor);
            if (token == null || token.isBlank()) {
                throw new IllegalArgumentException("Missing Authorization token");
            }

            Jwt jwt = jwtDecoder.decode(token);
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(jwt.getSubject(), null, List.of());
            accessor.setUser(auth);
            if (accessor.getSessionAttributes() != null) {
                accessor.getSessionAttributes().put("user", auth);
                accessor.getSessionAttributes().put("userId", jwt.getSubject());
                accessor.getSessionAttributes().put("username", jwt.getClaimAsString("username"));
            }
        } else if (accessor.getUser() == null && accessor.getSessionAttributes() != null) {
            Object user = accessor.getSessionAttributes().get("user");
            if (user instanceof UsernamePasswordAuthenticationToken auth) {
                accessor.setUser(auth);
            }
        }

        return message;
    }

    private String resolveToken(StompHeaderAccessor accessor) {
        String header = firstHeader(accessor, "Authorization");
        if (header == null) header = firstHeader(accessor, "authorization");
        if (header == null) return null;
        if (header.startsWith("Bearer ")) return header.substring(7);
        return header;
    }

    private String firstHeader(StompHeaderAccessor accessor, String name) {
        List<String> values = accessor.getNativeHeader(name);
        if (values == null || values.isEmpty()) return null;
        return values.get(0);
    }
}
