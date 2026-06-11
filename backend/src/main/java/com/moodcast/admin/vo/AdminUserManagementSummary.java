package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/* ==========================================================================
 * 사용자 관리 하단 요약 응답 VO
 * --------------------------------------------------------------------------
 * 사용자 관리 페이지 하단에서 한 번에 필요한 데이터를 묶어서 내려주는 객체입니다.
 *
 * 포함 데이터:
 * - 전체/일반/관리자/정지 회원 수
 * - 가장 최근 가입한 회원 1명
 * - 가장 최근 제재당한 회원 1명
 * - 최근 권한/제재 변경 로그 목록
 *
 * 초보자 설명:
 * - 프론트에서 API를 여러 번 부르지 않도록, 하단 영역에 필요한 값을 한 응답으로 묶습니다.
 * ========================================================================== */
@NoArgsConstructor
@AllArgsConstructor
@Data
public class AdminUserManagementSummary {

    private Long totalMemberCount; // 전체 회원 수입니다.

    private Long normalMemberCount; // USER 또는 MEMBER 권한의 일반 회원 수입니다.

    private Long adminMemberCount; // SUPER_ADMIN 권한의 관리자 수입니다.

    private Long suspendedMemberCount; // status가 SUSPENDED인 정지 회원 수입니다.

    private AdminRecentMember latestJoinedMember; // 가장 최근 가입한 회원 1명입니다.

    private AdminRecentMember latestSanctionedMember; // 가장 최근 제재당한 회원 1명입니다.

    private List<AdminActionLogView> actionLogs; // 최근 권한 변경/제재 로그 목록입니다.
}
