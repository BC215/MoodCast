package com.moodcast.member.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class LoginAuditLog {
    private Long loginAuditId;
    private Long memberId;
    private String email;
    private String provider;
    private String loginType;
    private Integer success;
    private String failReason;
    private String ipAddress;
    private String userAgent;
    private LocalDateTime createdAt;
}
