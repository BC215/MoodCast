package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/*
 * 공지사항 VO입니다.
 *
 * notices_tbl 한 행을 표현합니다.
 * deleted_at이 null이면 정상 공지이고, 값이 있으면 삭제 탭으로 이동한 공지입니다.
 */
@NoArgsConstructor
@AllArgsConstructor
@Data
public class Notice {

    private Long noticeId; // notices_tbl.notice_id: 공지사항 PK입니다.

    private String title; // notices_tbl.title: 공지사항 제목입니다.

    private String content; // notices_tbl.content: 공지사항 본문 HTML입니다.

    private String noticeType; // notices_tbl.notice_type: NORMAL, UPDATE, EMERGENCY 중 하나입니다.

    private Long createdByAdminId; // notices_tbl.created_by_admin_id: 작성 관리자 member_id입니다.

    private String createdByAdminName; // members.name: 작성 관리자 실명입니다.

    private String createdByAdminNickname; // members.nickname: 작성 관리자 닉네임입니다.

    private String createdByAdminEmail; // members.email: 작성 관리자 로그인 이메일입니다.

    private String adminName; // 프론트 표시용 작성 관리자 실명입니다.

    private String adminNickname; // 프론트 표시용 작성 관리자 닉네임입니다.

    private String adminEmail; // 프론트 표시용 작성 관리자 로그인 이메일입니다.

    private Long updatedByAdminId; // notices_tbl.updated_by_admin_id: 마지막 수정 관리자 member_id입니다.

    private LocalDateTime createdAt; // notices_tbl.created_at: 최초 작성 시간입니다.

    private LocalDateTime updatedAt; // notices_tbl.updated_at: 마지막 수정 시간입니다.

    private LocalDateTime deletedAt; // notices_tbl.deleted_at: soft delete 처리 시간입니다.
}
