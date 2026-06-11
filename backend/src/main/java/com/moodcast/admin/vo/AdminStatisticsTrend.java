package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/*
 * 관리자 통계 대시보드 차트용 VO입니다.
 * --------------------------------------------------------------------------
 * 가입자 추이처럼 "라벨 + 숫자" 형태로 그릴 수 있는 차트 데이터를 담습니다.
 *
 * 초보자 설명:
 * - label: 차트 아래에 보이는 글자입니다. 예: 00시, 05/28, 1주차
 * - value: 해당 label 구간의 실제 숫자입니다.
 */
@NoArgsConstructor
@AllArgsConstructor
@Data
public class AdminStatisticsTrend {

    private String label;

    private Long value;
}
