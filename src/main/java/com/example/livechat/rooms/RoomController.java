package com.example.livechat.rooms;

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

    public RoomController(RoomService rooms) {
        this.rooms = rooms;
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
