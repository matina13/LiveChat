package com.example.livechat.auth;

import com.example.livechat.security.JwtService;
import com.example.livechat.users.User;
import com.example.livechat.users.UserRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwtService) {
        this.users = users;
        this.encoder = encoder;
        this.jwtService = jwtService;
    }

    public void register(RegisterRequest req) {
        if (users.existsByEmail(req.email())) {
            throw new IllegalArgumentException("Email already in use");
        }
        if (users.existsByUsername(req.username())) {
            throw new IllegalArgumentException("Username already in use");
        }

        User u = new User();
        u.setUsername(req.username());
        u.setEmail(req.email());
        u.setPassword(encoder.encode(req.password())); // store hash
        users.save(u);
    }

    public AuthResponse login(LoginRequest req) {
        User u = users.findByEmail(req.email())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!encoder.matches(req.password(), u.getPassword())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        String token = jwtService.createAccessToken(u.getId().longValue(), u.getUsername());
        return new AuthResponse(token, u.getUsername(), u.getEmail());
    }
}
