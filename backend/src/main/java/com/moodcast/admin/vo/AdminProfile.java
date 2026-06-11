package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/* ==========================================================================
 * 관리자 개인 정보 VO
 * --------------------------------------------------------------------------
 * 관리자 개인 정보 수정 화면에 표시할 로그인 관리자 본인의 정보를 담습니다.
 *
 * 현재 화면에 필요한 값:
 * - memberId: 로그인 회원 PK
 * - name: 실명
 * - nickname: 닉네임
 * - phone: 전화번호
 * ========================================================================== */
@NoArgsConstructor
@AllArgsConstructor
@Data
public class AdminProfile {
    private Long memberId;
    private String name;
    private String nickname;
    private String phone;
}
