package com.moodcast.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class ChatRoomMemberResponseDto {
    private Long memberId;
    private String memberName;
    private String email;
    private String profileImageUrl;
    private String joinedAt;
}
