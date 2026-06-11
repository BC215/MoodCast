package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/*
 * 관리자 통계 대시보드 상단 요약 VO입니다.
 * --------------------------------------------------------------------------
 * 프론트 통계 화면의 카드와 하단 요약에 바로 사용할 숫자를 담습니다.
 *
 * 초보자 설명:
 * - VO는 DB 조회 결과를 Java 객체로 담아 프론트에 JSON으로 보내기 위한 상자입니다.
 * - SQL 컬럼명은 new_member_count처럼 snake_case이고,
 *   Java 필드명은 newMemberCount처럼 camelCase라서 mapper resultMap에서 연결합니다.
 */
@NoArgsConstructor
@AllArgsConstructor
@Data
public class AdminStatisticsSummary {

    private Long totalMemberCount; // 현재 DB에 저장된 전체 회원 수입니다.

    private Long newMemberCount; // 선택한 기간 안에 새로 가입한 회원 수입니다.

    private Long activeUserCount; // 선택한 기간 안에 로그인 기록이 있는 활성 사용자 수입니다.

    private Long postCount; // 선택한 기간 안에 작성된 삭제되지 않은 게시글 수입니다.

    private Long commentCount; // 선택한 기간 안에 작성된 삭제되지 않은 댓글 수입니다.

    private Long empathyCount; // 선택한 기간 안에 발생한 공감/좋아요 수입니다.
}
