package com.moodcast.member.service;

import com.moodcast.member.dao.LoginAuditDao;
import com.moodcast.member.vo.LoginAuditLog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class LoginAuditService {
    private static final Logger log = LoggerFactory.getLogger(LoginAuditService.class);

    private final LoginAuditDao loginAuditDao;
    private final StringRedisTemplate redisTemplate;

    public LoginAuditService(LoginAuditDao loginAuditDao, StringRedisTemplate redisTemplate) {
        this.loginAuditDao = loginAuditDao;
        this.redisTemplate = redisTemplate;
    }

    // 감사 로그 저장 실패가 로그인/refresh 흐름을 깨지 않게 막음
    public void record(
            Long memberId,
            String email,
            String provider,
            String loginType,
            boolean success,
            String failReason,
            String ipAddress,
            String userAgent
    ) {
        try {
            LoginAuditLog loginAuditLog = new LoginAuditLog();
            loginAuditLog.setMemberId(memberId);
            loginAuditLog.setEmail(email);
            loginAuditLog.setProvider(provider);
            loginAuditLog.setLoginType(loginType);
            loginAuditLog.setSuccess(success ? 1 : 0);
            loginAuditLog.setFailReason(failReason);
            loginAuditLog.setIpAddress(ipAddress);
            loginAuditLog.setUserAgent(userAgent);

            loginAuditDao.insertLoginAuditLog(loginAuditLog);
        } catch (Exception e) {
            log.warn("로그인 감사 로그 저장 실패: {}", e.getMessage());
        }
    }

    // refresh 성공은 너무 자주 발생하므로 같은 환경에서는 1시간에 한 번만 감사 로그로 남김
    public void recordRefreshSuccess(Long memberId, String email, String ipAddress, String userAgent) {
        if (memberId == null) {
            record(null, email, null, "REFRESH_SUCCESS", true, null, ipAddress, userAgent);
            return;
        }

        String userAgentKey = userAgent == null ? "unknown" : Integer.toHexString(userAgent.hashCode());
        String auditKey = "auth:audit:refresh-success:" + memberId + ":" + ipAddress + ":" + userAgentKey;

        try {
            Boolean firstRefreshInWindow = redisTemplate.opsForValue()
                    .setIfAbsent(auditKey, "1", Duration.ofHours(1));

            if (Boolean.TRUE.equals(firstRefreshInWindow)) {
                record(memberId, email, null, "REFRESH_SUCCESS", true, null, ipAddress, userAgent);
            }
        } catch (Exception e) {
            log.warn("refresh 감사 로그 제한 처리 실패: {}", e.getMessage());
            record(memberId, email, null, "REFRESH_SUCCESS", true, null, ipAddress, userAgent);
        }
    }
}
