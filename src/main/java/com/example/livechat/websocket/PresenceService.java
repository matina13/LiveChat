package com.example.livechat.websocket;

import com.example.livechat.rooms.RoomMemberRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class PresenceService {

    private final ConcurrentHashMap<Long, AtomicInteger> connections = new ConcurrentHashMap<>();

    private final RoomMemberRepository members;
    private final SimpMessagingTemplate ws;

    public PresenceService(RoomMemberRepository members, SimpMessagingTemplate ws) {
        this.members = members;
        this.ws = ws;
    }

    public void userConnected(long userId) {
        int count = connections.computeIfAbsent(userId, k -> new AtomicInteger(0)).incrementAndGet();
        if (count == 1) broadcast(userId, true);
    }

    public void userDisconnected(long userId) {
        AtomicInteger counter = connections.get(userId);
        if (counter == null) return;
        int count = counter.decrementAndGet();
        if (count <= 0) {
            connections.remove(userId);
            broadcast(userId, false);
        }
    }

    public boolean isOnline(long userId) {
        AtomicInteger counter = connections.get(userId);
        return counter != null && counter.get() > 0;
    }

    public Set<Long> onlineUserIds() {
        return connections.keySet();
    }

    private void broadcast(long userId, boolean online) {
        Map<String, Object> payload = Map.of("userId", userId, "online", online);
        members.findRoomIdsByUserId(userId)
                .forEach(roomId -> ws.convertAndSend("/topic/rooms/" + roomId + "/presence", payload));
    }
}
