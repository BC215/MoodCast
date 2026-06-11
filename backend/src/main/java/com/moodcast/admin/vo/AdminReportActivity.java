package com.moodcast.admin.vo;

import lombok.Data;

/*
 * 신고 상세 패널에 표시할 대상 회원의 최근 활동 항목입니다.
 * 게시글, 댓글, 제재 로그를 같은 형태로 내려주기 위해 사용합니다.
 */
@Data
public class AdminReportActivity {

    private String type; // 화면에 표시할 활동 종류입니다. 예: 게시글, 댓글, 제재

    private String text; // 활동 설명 또는 본문 일부입니다.

    private String time; // 화면에 표시할 날짜와 시간입니다.
}
