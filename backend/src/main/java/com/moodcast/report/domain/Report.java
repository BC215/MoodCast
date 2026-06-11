package com.moodcast.report.domain;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class Report {
    private Long reportId;
    private Long reporterMemberId;
    private Long postId;
    private Long commentId;
    private String reason;
    private String reportStatus;
    private LocalDateTime createdAt;
}
