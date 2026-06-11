package com.moodcast.admin.vo;

import lombok.Data;

/*
 * 관리자 기능 담당 작업(문건우): 신고 처리율을 전체 신고 목록 조회 없이 계산하기 위한 통계 응답 VO입니다.
 */
@Data
public class AdminReportProcessRateStat {

    private Long totalCount;
    private Long doneCount;
    private Long openCount;
}
