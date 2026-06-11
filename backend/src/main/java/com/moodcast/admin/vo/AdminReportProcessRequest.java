package com.moodcast.admin.vo;

import lombok.Data;

/*
 * Admin report process request value object.
 * processResult: WARNING, TEMPORARY_SUSPEND, PERMANENT_SUSPEND, REJECT.
 */
@Data
public class AdminReportProcessRequest {

    private String processResult;
    private String processReason;
    private Integer suspendDays;
    private String suspendedUntil;
    private Boolean hideTargetContent;
}
