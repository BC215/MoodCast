package com.moodcast.member.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.moodcast.member.dto.oauth.PendingSocialSignup;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
public class SocialPendingSignupRedisService {
    private static final Duration PENDING_TTL = Duration.ofMinutes(10);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public SocialPendingSignupRedisService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    private String key(String pendingToken) {
        return "auth:social:pending:" + pendingToken;
    }

    // 소셜 신규 가입 중간 상태를 10분 동안만 Redis에 보관함
    public String save(PendingSocialSignup pendingSocialSignup) {
        String pendingToken = UUID.randomUUID().toString();

        try {
            redisTemplate.opsForValue().set(
                    key(pendingToken),
                    objectMapper.writeValueAsString(pendingSocialSignup),
                    PENDING_TTL
            );
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("소셜 가입 정보를 저장하지 못했습니다.");
        }

        return pendingToken;
    }

    // pendingToken으로 추가가입에 필요한 소셜 정보를 꺼냄
    public PendingSocialSignup get(String pendingToken) {
        if (pendingToken == null || pendingToken.trim().isEmpty()) {
            throw new IllegalArgumentException("소셜 가입 정보가 없습니다.");
        }

        String value = redisTemplate.opsForValue().get(key(pendingToken));
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("소셜 가입 시간이 만료되었습니다. 다시 시도해주세요.");
        }

        try {
            return objectMapper.readValue(value, PendingSocialSignup.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("소셜 가입 정보를 읽지 못했습니다.");
        }
    }

    public void delete(String pendingToken) {
        redisTemplate.delete(key(pendingToken));
    }
}
