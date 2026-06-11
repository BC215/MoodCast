package com.moodcast.admin.vo;

import lombok.Data;

/*
 * 신고 상세 패널에서 같은 게시글/댓글을 신고한 회원 정보를 보여주기 위한 값 객체입니다.
 */
@Data
public class AdminReportReporter {

    private Long memberId; // 신고자 회원 번호입니다.

    private String name; // 신고자 실명입니다.

    private String nickname; // 신고자 닉네임입니다.

    private String email; // 신고자 이메일입니다.

    private Long reportCount; // 같은 대상에 대해 해당 신고자가 접수한 신고 건수입니다.

    private String firstReportedAt; // 해당 신고자의 최초 신고 접수 시간입니다.

    private String latestReportedAt; // 해당 신고자의 최근 신고 접수 시간입니다.
}
