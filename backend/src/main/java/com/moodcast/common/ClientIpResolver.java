package com.moodcast.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// 직접 EC2 접근 시에는 조작 가능한 X-Forwarded-For 대신 remoteAddr를 사용함
@Component
public class ClientIpResolver {
    @Value("${app.trust-forwarded-headers:false}")
    private boolean trustForwardedHeaders;

    public String resolve(HttpServletRequest request) {
        if (request == null) {
            return null;
        }

        if (trustForwardedHeaders) {
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                return forwardedFor.split(",")[0].trim();
            }
        }

        return request.getRemoteAddr();
    }
}
