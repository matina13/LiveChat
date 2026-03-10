package com.example.livechat.auth;

public record AuthResponse(String token, String refreshToken, String username, String email) {}
