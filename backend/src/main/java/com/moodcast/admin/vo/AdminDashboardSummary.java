package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/*
 * Admin dashboard summary value object.
 */
@NoArgsConstructor
@AllArgsConstructor
@Data
public class AdminDashboardSummary {
    private Long totalMemberCount;
    private Long todayNewMemberCount;
    private Long postCount;
    private Long pendingReportCount;
}
