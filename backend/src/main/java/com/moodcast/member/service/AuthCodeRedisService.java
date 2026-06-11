package com.moodcast.member.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class AuthCodeRedisService {
    // TTL 세팅
    // 인증코드 유효시간
    private static final Duration CODE_TTL = Duration.ofMinutes(3);
    // 인증완료 상태 유지시간
    private static final Duration VERIFIED_TTL = Duration.ofMinutes(10);
    // 재요청 쿨타임
    private static final Duration COOLDOWN_TTL = Duration.ofSeconds(60);
    // 일일 발송횟수 제한 초기화
    private static final Duration SEND_COUNT_TTL = Duration.ofDays(1);
    // 일일 최대 횟수
    private static final int DAILY_SEND_LIMIT = 10;
    // 같은 IP에서 하루에 허용할 인증번호 발송 횟수
    private static final int IP_DAILY_SEND_LIMIT = 30;

    private final StringRedisTemplate redisTemplate;

    public AuthCodeRedisService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    // redis key로 사용할 문자열 세팅
    private String key(String type, String purpose, String targetType, String targetValue) {
        return "auth:" + type + ":" + purpose + ":" + targetType + ":" + targetValue;
    }

    private String ipSendKey(String purpose, String targetType, String ipAddress) {
        return "auth:send:ip:" + purpose + ":" + targetType + ":" + ipAddress;
    }

    // 재요청 쿨타임 체크
    public void checkCooldown(String purpose, String targetType, String targetValue) {
        // 키 남아 있는지 체크
        Boolean exists = redisTemplate.hasKey(key("cooldown", purpose, targetType, targetValue));
        // 키 있으면 쿨타임 남음
        if (Boolean.TRUE.equals(exists)) {
            throw new IllegalArgumentException("인증번호는 60초에 한 번만 요청할 수 있습니다. 잠시 후 다시 시도해주세요.");
        }
    }

    public void checkAndIncreaseSendCount(String purpose, String targetType, String targetValue) {
        String sendCountKey = key("send-count", purpose, targetType, targetValue);

        // 1증가 key없으면 만들어줌
        Long count = redisTemplate.opsForValue().increment(sendCountKey);

        // count가 1이면 (첫요청) 만료 세팅
        if (count != null && count == 1) {
            redisTemplate.expire(sendCountKey, SEND_COUNT_TTL);
        }

        // 일일 요청횟수 초과
        if (count != null && count > DAILY_SEND_LIMIT) {
            throw new IllegalArgumentException("오늘 인증번호 요청 횟수를 초과했습니다. 내일 다시 시도해주세요.");
        }
    }

    // 같은 IP에서 인증번호 발송을 과하게 반복하는 것을 막음
    public void checkAndIncreaseIpSendCount(String purpose, String targetType, String ipAddress) {
        String sendCountKey = ipSendKey(purpose, targetType, ipAddress);
        Long count = redisTemplate.opsForValue().increment(sendCountKey);

        if (count != null && count == 1) {
            redisTemplate.expire(sendCountKey, SEND_COUNT_TTL);
        }

        if (count != null && count > IP_DAILY_SEND_LIMIT) {
            throw new IllegalArgumentException("현재 네트워크에서 인증번호 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
        }
    }

    // 인증번호 발급
    public void saveAuthCode(String purpose, String targetType, String targetValue, String hashCode) {
        // 데이터 저장, ttl 세팅
        // key, 값, ttl
        redisTemplate.opsForValue().set(key("code", purpose, targetType, targetValue), hashCode, CODE_TTL);
        redisTemplate.opsForValue().set(key("cooldown", purpose, targetType, targetValue), "1", COOLDOWN_TTL);

        // 기존 입력횟수, 완료여부 삭제
        redisTemplate.delete(key("attempt", purpose, targetType, targetValue));
        redisTemplate.delete(key("verified", purpose, targetType, targetValue));
    }

    // 조회
    public String getAuthCodeHash(String purpose, String targetType, String targetValue) {
        // 인증번호 가져오기 ttl만료 되었으면 null
        return redisTemplate.opsForValue().get(key("code", purpose, targetType, targetValue));
    }

    // 실패 count update
    public Long increaseAttempt(String purpose, String targetType, String targetValue) {
        String attemptKey = key("attempt", purpose, targetType, targetValue);
        Long count = redisTemplate.opsForValue().increment(attemptKey);

        if (count != null && count == 1) {
            redisTemplate.expire(attemptKey, CODE_TTL);
        }

        return count == null ? 0 : count;
    }

    // 인증번호 입력 실패 횟수를 조회
    // key 없으면 0으로 판단
    public long getAttemptCount(String purpose, String targetType, String targetValue) {
        String value = redisTemplate.opsForValue().get(key("attempt", purpose, targetType, targetValue));

        if (value == null) {
            return 0;
        }

        return Long.parseLong(value);
    }

    // 성공처리
    public void markVerified(String purpose, String targetType, String targetValue) {
        redisTemplate.opsForValue().set(key("verified", purpose, targetType, targetValue), "true", VERIFIED_TTL);

        redisTemplate.delete(key("code", purpose, targetType, targetValue));
        redisTemplate.delete(key("attempt", purpose, targetType, targetValue));
    }

    // 인증 성공 여부
    public boolean isVerified(String purpose, String targetType, String targetValue) {
        Boolean exists = redisTemplate.hasKey(key("verified", purpose, targetType, targetValue));
        return Boolean.TRUE.equals(exists);
    }

    // 가입 완료 후 정리
    public void clearAuth(String purpose, String targetType, String targetValue) {
        redisTemplate.delete(key("code", purpose, targetType, targetValue));
        redisTemplate.delete(key("attempt", purpose, targetType, targetValue));
        redisTemplate.delete(key("verified", purpose, targetType, targetValue));
        redisTemplate.delete(key("cooldown", purpose, targetType, targetValue));
    }
}
