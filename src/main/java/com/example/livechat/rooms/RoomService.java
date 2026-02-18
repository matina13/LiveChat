package com.example.livechat.rooms;

import com.example.livechat.users.User;
import com.example.livechat.users.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RoomService {

    private final RoomRepository rooms;
    private final RoomMemberRepository members;
    private final UserRepository users;

    public RoomService(RoomRepository rooms, RoomMemberRepository members, UserRepository users) {
        this.rooms = rooms;
        this.members = members;
        this.users = users;
    }

    @Transactional
    public RoomResponse createRoom(CreateRoomRequest request, long userId) {
        String name = request.name().trim();
        if (rooms.existsByName(name)) {
            throw new IllegalArgumentException("Room name already in use");
        }

        User creator = users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

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
            throw new IllegalArgumentException("Cannot start a DM with yourself");
        }

        User target = users.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        User self = users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

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

                    return toResponse(saved, userId);
                });
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> listRooms(long userId) {
        return rooms.findAllForMember(userId).stream().map(r -> toResponse(r, userId)).toList();
    }

    @Transactional(readOnly = true)
    public RoomResponse getRoom(long roomId, long userId) {
        Room room = rooms.findByIdForMember(roomId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));
        return toResponse(room, userId);
    }

    @Transactional
    public RoomResponse joinRoom(long roomId, long userId) {
        Room room = rooms.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));

        if ("direct".equals(room.getType())) {
            throw new IllegalArgumentException("Cannot join a direct message room");
        }

        if (room.isPrivate()) {
            throw new IllegalArgumentException("Room is private");
        }

        if (!members.existsByRoom_IdAndUser_Id(roomId, userId)) {
            User user = users.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            RoomMember member = new RoomMember();
            member.setRoom(room);
            member.setUser(user);
            member.setRole("member");
            members.save(member);
        }

        return toResponse(room, userId);
    }

    @Transactional
    public void leaveRoom(long roomId, long userId) {
        Room room = rooms.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));

        if (!members.existsByRoom_IdAndUser_Id(roomId, userId)) {
            throw new IllegalArgumentException("Not a member of this room");
        }

        if (room.getCreator().getId().equals(userId)) {
            throw new IllegalArgumentException("Owner cannot leave — delete the room instead");
        }

        members.deleteByRoom_IdAndUser_Id(roomId, userId);
    }

    @Transactional
    public void deleteRoom(long roomId, long userId) {
        Room room = rooms.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));

        if (!room.getCreator().getId().equals(userId)) {
            throw new IllegalArgumentException("Only the room owner can delete it");
        }

        rooms.delete(room);
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> getMembers(long roomId, long userId) {
        if (!members.existsByRoom_IdAndUser_Id(roomId, userId)) {
            throw new IllegalArgumentException("Not a member of this room");
        }

        return members.findAllByRoomId(roomId).stream()
                .map(m -> new MemberResponse(
                        m.getUser().getId(),
                        m.getUser().getUsername(),
                        m.getRole(),
                        m.getJoinedAt()
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
        String otherUsername = null;
        if ("direct".equals(room.getType()) && userId > 0) {
            otherUsername = members.findOtherMember(room.getId(), userId)
                    .map(rm -> rm.getUser().getUsername())
                    .orElse("Unknown");
        }
        return new RoomResponse(
                room.getId(),
                room.getName(),
                room.isPrivate(),
                room.getCreator().getId(),
                room.getCreatedAt(),
                room.getType(),
                otherUsername
        );
    }
}
