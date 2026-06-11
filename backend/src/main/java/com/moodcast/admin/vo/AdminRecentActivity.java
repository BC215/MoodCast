package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/*
 * 관리자 대시보드의 최근 활동 목록에 사용할 VO입니다.
 *
 * 초보자 설명:
 * - 최근 가입, 탈퇴, 정지, 정지 해제처럼 서로 다른 조건에서 나온 활동을
 *   한 화면에 같은 형태로 보여주기 위해 공통 필드로 맞춘 객체입니다.
 * - adminName/adminNickname은 정지와 정지 해제처럼 관리자가 처리한 활동에서만 값이 들어옵니다.
 */
@NoArgsConstructor
@AllArgsConstructor
@Data
public class AdminRecentActivity {
    private String activityType;
    private Long memberId;
    private String memberName;
    private String memberNickname;
    private String memberEmail;
    private Long adminId;
    private String adminName;
    private String adminNickname;
    private String activityDetail;
    private LocalDateTime createdAt;
}
