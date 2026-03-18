package com.example.livechat.rooms;

import com.example.livechat.websocket.PresenceService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService rooms;
    private final RoomMemberRepository members;
    private final PresenceService presence;

    public RoomController(RoomService rooms, RoomMemberRepository members, PresenceService presence) {
        this.rooms = rooms;
        this.members = members;
        this.presence = presence;
    }

    @PostMapping
    public ResponseEntity<RoomResponse> createRoom(
            @Valid @RequestBody CreateRoomRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        return ResponseEntity.ok(rooms.createRoom(request, userId));
    }

    @GetMapping
    public ResponseEntity<List<RoomResponse>> listRooms(@AuthenticationPrincipal Jwt jwt) {
        long userId = Long.parseLong(jwt.getSubject());
        return ResponseEntity.ok(rooms.listRooms(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomResponse> getRoom(
            @PathVariable long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        return ResponseEntity.ok(rooms.getRoom(id, userId));
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<RoomResponse> joinRoom(
            @PathVariable long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        return ResponseEntity.ok(rooms.joinRoom(id, userId));
    }

    @DeleteMapping("/{id}/leave")
    public ResponseEntity<Void> leaveRoom(
            @PathVariable long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        rooms.leaveRoom(id, userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(
            @PathVariable long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        rooms.deleteRoom(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<List<MemberResponse>> getMembers(
            @PathVariable long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        return ResponseEntity.ok(rooms.getMembers(id, userId));
    }

    @PostMapping("/dm/{targetUserId}")
    public ResponseEntity<RoomResponse> startDm(
            @PathVariable long targetUserId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        return ResponseEntity.ok(rooms.findOrCreateDm(targetUserId, userId));
    }

    @PostMapping("/{id}/invite")
    public ResponseEntity<Void> inviteToRoom(
            @PathVariable long id,
            @RequestBody java.util.Map<String, String> body,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        rooms.inviteToRoom(id, userId, body.get("username"));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/presence")
    public ResponseEntity<List<Long>> getMyPresence(@AuthenticationPrincipal Jwt jwt) {
        long userId = Long.parseLong(jwt.getSubject());
        List<Long> myRoomIds = members.findRoomIdsByUserId(userId);
        if (myRoomIds.isEmpty()) return ResponseEntity.ok(List.of());
        List<Long> onlineIds = members.findUserIdsByRoomIds(myRoomIds).stream()
                .filter(presence::isOnline)
                .toList();
        return ResponseEntity.ok(onlineIds);
    }

    @GetMapping("/{id}/presence")
    public ResponseEntity<List<Long>> getRoomPresence(
            @PathVariable long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        if (!members.existsByRoom_IdAndUser_Id(id, userId)) {
            throw new IllegalArgumentException("Not a member of this room");
        }
        List<Long> onlineIds = members.findAllByRoomId(id).stream()
                .map(m -> m.getUser().getId())
                .filter(presence::isOnline)
                .toList();
        return ResponseEntity.ok(onlineIds);
    }

    @GetMapping("/public")
    public ResponseEntity<PublicRoomsResponse> searchPublicRooms(
            @RequestParam(required = false, defaultValue = "") String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        return ResponseEntity.ok(rooms.searchPublicRooms(query, userId, page, size));
    }
}
