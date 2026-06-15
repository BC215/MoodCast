package com.moodcast.member.service;

import com.moodcast.common.exception.AuthException;
import com.moodcast.member.dto.login.RefreshTokenInfo;
import com.moodcast.member.vo.Member;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
public class JwtService {
    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.issuer}")
    private String issuer;

    @Value("${jwt.access-token-expire-minutes}")
    private Long accessTokenExpireMinutes;

    @Value("${jwt.refresh-token-expire-days}")
    private Long refreshTokenExpireDays;

    @Value("${jwt.refresh-cookie-name}")
    private String refreshCookieName;

    @Value("${jwt.refresh-cookie-same-site:Lax}")
    private String refreshCookieSameSite;

    @Value("${jwt.refresh-cookie-secure:false}")
    private boolean refreshCookieSecure;

    private final MessageSource messageSource;

    public JwtService(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String createAccessToken(Member member) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(accessTokenExpireMinutes, ChronoUnit.MINUTES);

        return Jwts.builder()
                .issuer(issuer)
                .subject(String.valueOf(member.getMemberId()))
                .claim("type", "ACCESS")
                .claim("email", member.getEmail())
                .claim("role", member.getRole())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(getSigningKey(), Jwts.SIG.HS256)
                .compact();
    }

    // memberId + tokenId
    // pc접속중 모바일로 접속했을때 토큰을 덮어쓰지 않게 하려고 수정함
    public String createRefreshToken(Member member, String tokenId) {
        return createRefreshToken(member, tokenId, true);
    }

    public String createRefreshToken(Member member, String tokenId, boolean remember) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(refreshTokenExpireDays, ChronoUnit.DAYS);

        return Jwts.builder()
                .issuer(issuer)
                .subject(String.valueOf(member.getMemberId()))
                .claim("type", "REFRESH")
                .claim("tokenId", tokenId)
                .claim("remember", remember)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(getSigningKey(), Jwts.SIG.HS256)
                .compact();
    }

    public Long getMemberIdFromAccessToken(String accessToken) {
        if (accessToken == null || accessToken.trim().isEmpty()) {
            throw new AuthException(messageSource.getMessage("auth.required", null, LocaleContextHolder.getLocale()));
        }

        try {
            Claims claims = parseToken(accessToken);
            String tokenType = claims.get("type", String.class);

            if (!"ACCESS".equals(tokenType)) {
                throw new AuthException(messageSource.getMessage("auth.required", null, LocaleContextHolder.getLocale()));
            }

            return Long.parseLong(claims.getSubject());
        } catch (JwtException | NumberFormatException e) { // Catching JwtException and NumberFormatException
            throw new AuthException(messageSource.getMessage("auth.required", null, LocaleContextHolder.getLocale()));
        }
    }

    private Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String getRefreshCookieName() {
        return refreshCookieName;
    }

    public long getRefreshTokenMaxAgeSeconds() {
        return refreshTokenExpireDays * 24 * 60 * 60;
    }

    public ResponseCookie createRefreshCookie(String refreshToken) {
        return createRefreshCookie(refreshToken, true);
    }

    public ResponseCookie createRefreshCookie(String refreshToken, boolean remember) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie
                .from(refreshCookieName, refreshToken)
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite(normalizeSameSite(refreshCookieSameSite))
                .path("/");

        if (remember) {
            builder.maxAge(Duration.ofSeconds(getRefreshTokenMaxAgeSeconds()));
        }

        return builder.build();
    }

    public ResponseCookie createDeleteRefreshCookie() {
        return ResponseCookie
                .from(refreshCookieName, "")
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite(normalizeSameSite(refreshCookieSameSite))
                .path("/")
                .maxAge(0)
                .build();
    }

    private String normalizeSameSite(String sameSite) {
        if (sameSite == null || sameSite.trim().isEmpty()) {
            return "Lax";
        }

        String value = sameSite.trim();
        if ("none".equalsIgnoreCase(value)) {
            return "None";
        }
        if ("strict".equalsIgnoreCase(value)) {
            return "Strict";
        }

        return "Lax";
    }

    // refresh 토큰을 한 번만 파싱해서 공통 검증을 처리함
    private Claims parseRefreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.trim().isEmpty()) {
            throw new AuthException(messageSource.getMessage("auth.required", null, LocaleContextHolder.getLocale()));
        }

        try {
            Claims claims = parseToken(refreshToken);
            String tokenType = claims.get("type", String.class);

            if (!"REFRESH".equals(tokenType)) {
                throw new AuthException(messageSource.getMessage("auth.required", null, LocaleContextHolder.getLocale()));
            }

            return claims;
        } catch (JwtException | IllegalArgumentException e) {
            throw new AuthException(messageSource.getMessage("auth.required", null, LocaleContextHolder.getLocale()));
        }
    }

    // refresh 토큰에서 memberId와 tokenId를 같이 꺼냄
    public RefreshTokenInfo getRefreshTokenInfo(String refreshToken) {
        Claims claims = parseRefreshToken(refreshToken);
        String tokenId = claims.get("tokenId", String.class);
        Boolean remember = claims.get("remember", Boolean.class);
        if (tokenId == null || tokenId.trim().isEmpty()) {
            throw new AuthException(messageSource.getMessage("auth.required", null, LocaleContextHolder.getLocale()));
        }

        try {
            return new RefreshTokenInfo(Long.parseLong(claims.getSubject()), tokenId, remember != null && remember); // Fixed potential NPE if remember is null
        } catch (NumberFormatException e) { // Catching NumberFormatException
            throw new AuthException(messageSource.getMessage("auth.required", null, LocaleContextHolder.getLocale()));
        }
    }

    // 기존 호출부가 깨지지 않도록 memberId만 필요한 경우도 지원함
    public Long getMemberIdFromRefreshToken(String refreshToken) {
        return getRefreshTokenInfo(refreshToken).getMemberId();
    }

    // 기존 호출부가 깨지지 않도록 tokenId만 필요한 경우도 지원함
    public String getTokenIdFromRefreshToken(String refreshToken) {
        return getRefreshTokenInfo(refreshToken).getTokenId();
    }
}
