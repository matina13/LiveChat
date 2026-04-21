package com.example.livechat.rooms;

import com.example.livechat.messages.MessageRepository;
import com.example.livechat.users.User;
import com.example.livechat.users.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RoomService {

    private final RoomRepository rooms;
    private final RoomMemberRepository members;
    private final UserRepository users;
    private final MessageRepository messages;
    private final SimpMessagingTemplate messagingTemplate;

    public RoomService(RoomRepository rooms, RoomMemberRepository members, UserRepository users, MessageRepository messages, SimpMessagingTemplate messagingTemplate) {
        this.rooms = rooms;
        this.members = members;
        this.users = users;
        this.messages = messages;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public RoomResponse createRoom(CreateRoomRequest request, long userId) {
        String name = request.name().trim();
        if (rooms.existsByName(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Room name already in use");
        }

        User creator = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Room room = new Room();
        room.setName(name);
        room.setPrivate(request.isPrivate());
        room.setType("group");
        room.setCreator(creator);
        Room saved = rooms.save(room);

        RoomMember owner = new RoomMember();
        owner.setRoom(saved);
        owner.setUser(creator);
        owner.setRole("owner");
        members.save(owner);

        return toResponse(saved, userId);
    }

    @Transactional
    public RoomResponse findOrCreateDm(long targetUserId, long userId) {
        if (targetUserId == userId) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot start a DM with yourself");
        }

        User target = users.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        User self = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        return rooms.findDmBetween(userId, targetUserId)
                .map(r -> toResponse(r, userId))
                .orElseGet(() -> {
                    long min = Math.min(userId, targetUserId);
                    long max = Math.max(userId, targetUserId);
                    String dmName = "dm:" + min + ":" + max;

                    Room room = new Room();
                    room.setName(dmName);
                    room.setPrivate(true);
                    room.setType("direct");
                    room.setCreator(self);
                    Room saved = rooms.save(room);

                    RoomMember m1 = new RoomMember();
                    m1.setRoom(saved); m1.setUser(self); m1.setRole("member");
                    members.save(m1);

                    RoomMember m2 = new RoomMember();
                    m2.setRoom(saved); m2.setUser(target); m2.setRole("member");
                    members.save(m2);

                    messagingTemplate.convertAndSend(
                            "/topic/users/" + targetUserId + "/notifications",
                            Map.of("type", "room_added", "roomId", saved.getId())
                    );

                    return toResponse(saved, userId);
                });
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> listRooms(long userId) {
        List<Room> roomList = rooms.findAllForMember(userId);
        if (roomList.isEmpty()) return List.of();

        List<Long> roomIds = roomList.stream().map(Room::getId).toList();
        Map<Long, Long> unread = messages.countUnreadPerRoom(userId, roomIds).stream()
                .collect(Collectors.toMap(r -> (Long) r[0], r -> (Long) r[1]));

        return roomList.stream()
                .map(r -> toResponse(r, userId, unread.getOrDefault(r.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public RoomResponse getRoom(long roomId, long userId) {
        Room room = rooms.findByIdForMember(roomId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
        return toResponse(room, userId);
    }

    @Transactional
    public RoomResponse joinRoom(long roomId, long userId) {
        Room room = rooms.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        if ("direct".equals(room.getType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot join a direct message room");
        }

        if (room.isPrivate()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Room is private");
        }

        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        RoomMember member = new RoomMember();
        member.setRoom(room);
        member.setUser(user);
        member.setRole("member");
        try {
            members.save(member);
        } catch (DataIntegrityViolationException ignored) {
            // already a member — idempotent
        }

        return toResponse(room, userId);
    }

    @Transactional
    public void leaveRoom(long roomId, long userId) {
        Room room = rooms.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        if (!members.existsByRoom_IdAndUser_Id(roomId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member of this room");
        }

        if (room.getCreator().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Owner cannot leave — delete the room instead");
        }

        members.deleteByRoom_IdAndUser_Id(roomId, userId);
    }

    @Transactional
    public void deleteRoom(long roomId, long userId) {
        Room room = rooms.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        if (!room.getCreator().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the room owner can delete it");
        }

        rooms.delete(room);
    }

    @Transactional
    public void inviteToRoom(long roomId, long inviterId, String username) {
        Room room = rooms.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        RoomMember inviter = members.findByRoom_IdAndUser_Id(roomId, inviterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member of this room"));

        if (!"owner".equals(inviter.getRole()) && !"admin".equals(inviter.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only owners and admins can invite members");
        }

        User invitee = users.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (members.existsByRoom_IdAndUser_Id(roomId, invitee.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User is already a member");
        }

        RoomMember member = new RoomMember();
        member.setRoom(room);
        member.setUser(invitee);
        member.setRole("member");
        members.save(member);

        messagingTemplate.convertAndSend(
                "/topic/users/" + invitee.getId() + "/notifications",
                Map.of("type", "room_added", "roomId", roomId)
        );
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> getMembers(long roomId, long userId) {
        if (!members.existsByRoom_IdAndUser_Id(roomId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member of this room");
        }

        return members.findAllByRoomId(roomId).stream()
                .map(m -> new MemberResponse(
                        m.getUser().getId(),
                        m.getUser().getUsername(),
                        m.getRole(),
                        m.getJoinedAt(),
                        m.getUser().getAvatarUrl()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public PublicRoomsResponse searchPublicRooms(String query, long userId, int page, int size) {
        String normalized = query == null ? "" : query.trim();
        Page<Room> results = rooms.searchPublicRooms(userId, normalized, PageRequest.of(page, size));

        List<RoomResponse> roomsResponse = results.stream().map(r -> toResponse(r, userId)).toList();

        return new PublicRoomsResponse(
                roomsResponse,
                results.getNumber(),
                results.getSize(),
                results.getTotalElements()
        );
    }

    private RoomResponse toResponse(Room room, long userId) {
        return toResponse(room, userId, 0L);
    }

    private RoomResponse toResponse(Room room, long userId, long unreadCount) {
        String otherUsername = null;
        Long otherUserId = null;
        String otherUserAvatarUrl = null;
        if ("direct".equals(room.getType()) && userId > 0) {
            var other = members.findOtherMember(room.getId(), userId).orElse(null);
            if (other != null) {
                otherUsername = other.getUser().getUsername();
                otherUserId = other.getUser().getId();
                otherUserAvatarUrl = other.getUser().getAvatarUrl();
            } else {
                otherUsername = "Unknown";
            }
        }
        return new RoomResponse(
                room.getId(),
                room.getName(),
                room.isPrivate(),
                room.getCreator().getId(),
                room.getCreatedAt(),
                room.getType(),
                otherUsername,
                otherUserId,
                unreadCount,
                otherUserAvatarUrl
        );
    }
}
