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
        room.setCreator(creator);
        Room saved = rooms.save(room);

        RoomMember owner = new RoomMember();
        owner.setRoom(saved);
        owner.setUser(creator);
        owner.setRole("owner");
        members.save(owner);

        return new RoomResponse(
                saved.getId(),
                saved.getName(),
                saved.isPrivate(),
                saved.getCreator().getId(),
                saved.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> listRooms(long userId) {
        return rooms.findAllForMember(userId).stream()
                .map(room -> new RoomResponse(
                        room.getId(),
                        room.getName(),
                        room.isPrivate(),
                        room.getCreator().getId(),
                        room.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public RoomResponse getRoom(long roomId, long userId) {
        Room room = rooms.findByIdForMember(roomId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));

        return new RoomResponse(
                room.getId(),
                room.getName(),
                room.isPrivate(),
                room.getCreator().getId(),
                room.getCreatedAt()
        );
    }

    @Transactional
    public RoomResponse joinRoom(long roomId, long userId) {
        Room room = rooms.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));

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

        return new RoomResponse(
                room.getId(),
                room.getName(),
                room.isPrivate(),
                room.getCreator().getId(),
                room.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public PublicRoomsResponse searchPublicRooms(String query, long userId, int page, int size) {
        String normalized = query == null ? "" : query.trim();
        Page<Room> results = rooms.searchPublicRooms(userId, normalized, PageRequest.of(page, size));

        List<RoomResponse> roomsResponse = results.stream()
                .map(room -> new RoomResponse(
                        room.getId(),
                        room.getName(),
                        room.isPrivate(),
                        room.getCreator().getId(),
                        room.getCreatedAt()
                ))
                .toList();

        return new PublicRoomsResponse(
                roomsResponse,
                results.getNumber(),
                results.getSize(),
                results.getTotalElements()
        );
    }
}
