package com.moodcast.chat.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class ChatRoomMemberVo {
    private Long roomMemberId;
    private Long roomId;
    private Long memberId;
    private String memberName;
    private String email;
    private String profileImageUrl;
    private String joinedAt;
    private String hiddenAt;
    private String leftAt;
    private String lastReadAt;
    private Long lastReadMessageId;
    private Integer isActive;
    private String deletedYn;
}
