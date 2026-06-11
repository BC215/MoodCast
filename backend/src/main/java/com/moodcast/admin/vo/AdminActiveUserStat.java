package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/* ==========================================================================
 * 관리자 대시보드 시간별 활성 사용자 VO
 * --------------------------------------------------------------------------
 * 시간별 활성 사용자 그래프에 필요한 집계 결과를 담는 객체입니다.
 *
 * 초보자 설명:
 * - label은 그래프 왼쪽에 보일 시간/날짜 이름입니다.
 * - activeUserCount는 해당 시간/날짜에 활동한 사용자 수입니다.
 * - 지금은 members.last_login_at 기준으로 집계합니다.
 * ========================================================================== */
@NoArgsConstructor
@AllArgsConstructor
@Data
public class AdminActiveUserStat {

    private String label;

    private Double activeUserCount;
}
