package com.example.livechat.auth;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Sliding-window rate limiter for login attempts, keyed by IP address.
 * Allows MAX_ATTEMPTS within WINDOW_SECONDS before blocking.
 */
@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 10;
    private static final long WINDOW_SECONDS = 15 * 60; // 15 minutes

    // IP → timestamps of recent attempts
    private final Map<String, Deque<Instant>> attempts = new ConcurrentHashMap<>();

    /**
     * Returns true if the IP is allowed to attempt login, false if blocked.
     * Always records the attempt.
     */
    public synchronized boolean allowAndRecord(String ip) {
        Instant now = Instant.now();
        Instant cutoff = now.minusSeconds(WINDOW_SECONDS);

        Deque<Instant> window = attempts.computeIfAbsent(ip, k -> new ArrayDeque<>());

        // Drop entries outside the window
        while (!window.isEmpty() && window.peekFirst().isBefore(cutoff)) {
            window.pollFirst();
        }

        if (window.size() >= MAX_ATTEMPTS) {
            return false;
        }

        window.addLast(now);
        return true;
    }

    /** Call on successful login to clear the record for this IP. */
    public void reset(String ip) {
        attempts.remove(ip);
    }
}
