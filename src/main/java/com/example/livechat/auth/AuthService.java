package com.example.livechat.auth;

import com.example.livechat.security.JwtService;
import com.example.livechat.users.User;
import com.example.livechat.users.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;
    private final JwtDecoder jwtDecoder;
    private final RefreshTokenRepository refreshTokens;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwtService,
                       JwtDecoder jwtDecoder, RefreshTokenRepository refreshTokens) {
        this.users = users;
        this.encoder = encoder;
        this.jwtService = jwtService;
        this.jwtDecoder = jwtDecoder;
        this.refreshTokens = refreshTokens;
    }

    public void register(RegisterRequest req) {
        if (users.existsByEmail(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }
        if (users.existsByUsername(req.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already in use");
        }

        User u = new User();
        u.setUsername(req.username());
        u.setEmail(req.email());
        u.setPassword(encoder.encode(req.password()));
        users.save(u);
    }

    public AuthResponse login(LoginRequest req) {
        User u = users.findByEmail(req.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!encoder.matches(req.password(), u.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        long userId = u.getId().longValue();
        String accessToken = jwtService.createAccessToken(userId, u.getUsername());
        String refreshToken = jwtService.createRefreshToken(userId, u.getUsername());

        Jwt decoded = jwtDecoder.decode(refreshToken);
        refreshTokens.save(new RefreshToken(userId, hash(refreshToken), decoded.getExpiresAt()));

        return new AuthResponse(accessToken, refreshToken, u.getUsername(), u.getEmail(), u.getAvatarUrl());
    }

    public AuthResponse refresh(String refreshToken) {
        Jwt decoded;
        try {
            decoded = jwtDecoder.decode(refreshToken);
        } catch (JwtException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired refresh token");
        }
        if (!"refresh".equals(decoded.getClaim("type"))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token type");
        }

        String hash = hash(refreshToken);
        if (!refreshTokens.existsByTokenHash(hash)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token has been revoked");
        }
        refreshTokens.deleteByTokenHash(hash);

        long userId = Long.parseLong(decoded.getSubject());
        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String newAccess = jwtService.createAccessToken(userId, user.getUsername());
        String newRefresh = jwtService.createRefreshToken(userId, user.getUsername());

        Jwt newDecoded = jwtDecoder.decode(newRefresh);
        refreshTokens.save(new RefreshToken(userId, hash(newRefresh), newDecoded.getExpiresAt()));

        return new AuthResponse(newAccess, newRefresh, user.getUsername(), user.getEmail(), user.getAvatarUrl());
    }

    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) return;
        refreshTokens.deleteByTokenHash(hash(refreshToken));
    }

    private String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(64);
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
