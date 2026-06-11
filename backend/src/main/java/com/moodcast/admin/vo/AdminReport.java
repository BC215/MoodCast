package com.moodcast.admin.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/*
 * Admin report management response value object.
 * targetType: POST or COMMENT.
 * reportStatus: PENDING, REVIEWING, DONE.
 * processResult: WARNING, TEMPORARY_SUSPEND, PERMANENT_SUSPEND, REJECT.
 */
@Data
public class AdminReport {

    private Long reportId;
    private String targetType;

    private Long reporterMemberId;
    private String reporterName;
    private String reporterNickname;
    private String reporterEmail;

    private Long targetMemberId;
    private String targetMemberName;
    private String targetMemberNickname;
    private String targetMemberEmail;
    private LocalDateTime targetMemberCreatedAt;
    private Long targetPostCount;
    private Long targetCommentCount;
    private Long targetLikeCount;
    private Long targetReportCount;
    private Long targetWarningCount;
    private Long targetSuspendCount;

    private Long postId;
    private Long commentId;
    private String postTitle;
    private String postTags;
    private String targetContent;
    private String commentContent;

    private String reason;
    private String reportStatus;
    private String processResult;
    private String handledMemo;
    private Long handledByMemberId;
    private String handledByMemberName;
    private LocalDateTime reviewedAt;
    private LocalDateTime handledAt;
    private LocalDateTime createdAt;

    private Long sameTargetReportCount;
    private Long sameTargetReporterCount;

    private List<AdminReportActivity> activities;
    private List<AdminReportReporter> reporters;
}
