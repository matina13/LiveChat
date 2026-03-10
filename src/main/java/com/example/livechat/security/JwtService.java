package com.example.livechat.security;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

@Service
public class JwtService {

    private final SecretKey key;
    private final String issuer;
    private final long minutes;
    private final long refreshDays;

    public JwtService(
            SecretKey key,
            @Value("${app.jwt.issuer}") String issuer,
            @Value("${app.jwt.access-token-minutes}") long minutes,
            @Value("${app.jwt.refresh-token-days}") long refreshDays
    ) {
        this.key = key;
        this.issuer = issuer;
        this.minutes = minutes;
        this.refreshDays = refreshDays;
    }

    public String createAccessToken(long userId, String username) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(minutes * 60);

        try {
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .issuer(issuer)
                    .issueTime(Date.from(now))
                    .expirationTime(Date.from(exp))
                    .subject(String.valueOf(userId))
                    .claim("username", username)
                    .build();


            JWSHeader header = new JWSHeader(JWSAlgorithm.HS256);

            SignedJWT jwt = new SignedJWT(header, claims);

            // HS256 signer using your secret
            JWSSigner signer = new MACSigner(key.getEncoded());
            jwt.sign(signer);

            return jwt.serialize();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to create JWT", e);
        }
    }

    public String createRefreshToken(long userId, String username) {
        Instant now = Instant.now();
        Instant exp = now.plus(refreshDays, ChronoUnit.DAYS);
        try {
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .issuer(issuer)
                    .issueTime(Date.from(now))
                    .expirationTime(Date.from(exp))
                    .subject(String.valueOf(userId))
                    .claim("username", username)
                    .claim("type", "refresh")
                    .build();
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            jwt.sign(new MACSigner(key.getEncoded()));
            return jwt.serialize();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to create refresh token", e);
        }
    }
}
