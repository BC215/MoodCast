package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/*
 * 관리자 대시보드의 감정별 활동 분포 그래프에 사용할 VO입니다.
 *
 * 초보자 설명:
 * - VO는 DB 조회 결과를 Java 객체로 담아 프론트엔드에 JSON으로 보내기 위한 그릇입니다.
 * - emotionId는 post_tbl.emotion_id 값입니다.
 * - activityCount는 선택한 기간(일/주/월)에 작성된 게시글 수입니다.
 */
@NoArgsConstructor
@AllArgsConstructor
@Data
public class AdminEmotionActivity {
    private Long emotionId;
    private Long activityCount;
}
