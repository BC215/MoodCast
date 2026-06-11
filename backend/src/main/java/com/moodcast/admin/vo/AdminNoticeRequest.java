package com.moodcast.admin.vo;

import lombok.Data;

/*
 * 공지사항 작성/수정 요청 VO입니다.
 *
 * 프론트에서 전달한 제목, 본문, 공지 분류를 백엔드에서 검증한 뒤 notices_tbl에 저장합니다.
 */
@Data
public class AdminNoticeRequest {
    private String title;
    private String content;
    private String noticeType;
}
