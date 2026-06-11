package com.moodcast.report.dto;

import lombok.Data;

@Data
public class CreateReportRequest {
    private Long postId;
    private Long commentId;
    private String reason;
}
