package com.example.livechat.users;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public UserController(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
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
                .map(u -> new UserSearchResponse(u.getId(), u.getUsername(), u.getAvatarUrl()))
                .toList();
        return ResponseEntity.ok(results);
    }

    @PatchMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadAvatar(
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt
    ) throws IOException {
        if (file.getContentType() == null || !file.getContentType().startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File must be an image");
        }
        if (file.getSize() > 2L * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Max 2MB");
        }

        String original = file.getOriginalFilename();
        String ext = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf('.'))
                : "";
        String filename = UUID.randomUUID() + ext;

        var uploadsDir = Paths.get("uploads");
        Files.createDirectories(uploadsDir);
        Files.copy(file.getInputStream(), uploadsDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

        long userId = Long.parseLong(jwt.getSubject());
        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setAvatarUrl("/uploads/" + filename);
        users.save(user);

        return ResponseEntity.ok(Map.of("avatarUrl", "/uploads/" + filename));
    }

    @PatchMapping("/me/password")
    public ResponseEntity<Void> changePassword(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        if (currentPassword == null || newPassword == null || newPassword.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be at least 8 characters");
        }

        long userId = Long.parseLong(jwt.getSubject());
        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (!encoder.matches(currentPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }

        user.setPassword(encoder.encode(newPassword));
        users.save(user);
        return ResponseEntity.noContent().build();
    }
}
