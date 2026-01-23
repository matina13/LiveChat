package com.example.livechat.auth;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class MeController {

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
        String issuer = (jwt.getIssuer() == null) ? null : jwt.getIssuer().toString();

        return Map.of(
                "sub", jwt.getSubject(),
                "username", jwt.getClaimAsString("username"),
                "issuer", issuer
        );
    }

}
