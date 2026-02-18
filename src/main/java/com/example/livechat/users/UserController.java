package com.example.livechat.users;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserSearchResponse>> search(
            @RequestParam(defaultValue = "") String query,
            @AuthenticationPrincipal Jwt jwt
    ) {
        long userId = Long.parseLong(jwt.getSubject());
        String normalized = query.trim();
        if (normalized.isEmpty()) return ResponseEntity.ok(List.of());
        List<UserSearchResponse> results = users.searchByUsername(normalized, userId, PageRequest.of(0, 10))
                .stream()
                .map(u -> new UserSearchResponse(u.getId(), u.getUsername()))
                .toList();
        return ResponseEntity.ok(results);
    }
}
