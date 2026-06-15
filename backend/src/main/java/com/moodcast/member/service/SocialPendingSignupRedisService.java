package com.moodcast.member.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
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
    private final MessageSource messageSource;

    public SocialPendingSignupRedisService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper, MessageSource messageSource) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.messageSource = messageSource;
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
            throw new IllegalStateException(messageSource.getMessage("social.signup.save.failed", null, LocaleContextHolder.getLocale()));
        }

        return pendingToken;
    }

    // pendingToken으로 추가가입에 필요한 소셜 정보를 꺼냄
    public PendingSocialSignup get(String pendingToken) {
        if (pendingToken == null || pendingToken.trim().isEmpty()) {
            throw new IllegalArgumentException(messageSource.getMessage("social.signup.info.missing", null, LocaleContextHolder.getLocale()));
        }

        String value = redisTemplate.opsForValue().get(key(pendingToken));
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(messageSource.getMessage("social.signup.expired", null, LocaleContextHolder.getLocale()));
        }

        try {
            return objectMapper.readValue(value, PendingSocialSignup.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(messageSource.getMessage("social.signup.read.failed", null, LocaleContextHolder.getLocale()));
        }
    }

    public void delete(String pendingToken) {
        redisTemplate.delete(key(pendingToken));
    }
}
