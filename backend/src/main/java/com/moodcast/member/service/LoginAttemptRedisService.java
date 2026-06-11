package com.moodcast.member.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class LoginAttemptRedisService {
    private static final int MAX_FAILURE_COUNT = 5;
    private static final Duration FAILURE_TTL = Duration.ofMinutes(30);
    private static final Duration LOCK_TTL = Duration.ofMinutes(30);

    private final StringRedisTemplate redisTemplate;

    public LoginAttemptRedisService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    private String failKey(String email) {
        return "auth:login:fail:email:" + email;
    }

    private String lockKey(String email) {
        return "auth:login:lock:email:" + email;
    }

    // 잠금 상태면 DB 조회 전에 로그인 시도를 막음
    public void checkLocked(String email) {
        String locked = redisTemplate.opsForValue().get(lockKey(email));

        if (locked != null) {
            throw new IllegalArgumentException("비밀번호 입력 실패가 5회를 초과했습니다. 30분 후 다시 시도해주세요.");
        }
    }

    // 로그인 실패 횟수를 올리고 5회 이상이면 30분 잠금 처리함
    public void recordFailure(String email) {
        Long failCount = redisTemplate.opsForValue().increment(failKey(email));

        if (failCount != null && failCount == 1L) {
            redisTemplate.expire(failKey(email), FAILURE_TTL);
        }

        if (failCount != null && failCount >= MAX_FAILURE_COUNT) {
            redisTemplate.opsForValue().set(lockKey(email), "LOCKED", LOCK_TTL);
            redisTemplate.delete(failKey(email));

            throw new IllegalArgumentException("비밀번호 입력 실패가 5회를 초과했습니다. 30분 후 다시 시도해주세요.");
        }
    }

    // 로그인 성공 시 기존 실패/잠금 기록을 정리함
    public void clear(String email) {
        redisTemplate.delete(failKey(email));
        redisTemplate.delete(lockKey(email));
    }
}
