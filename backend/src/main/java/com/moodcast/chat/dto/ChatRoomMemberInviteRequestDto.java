package com.moodcast.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class ChatRoomMemberInviteRequestDto {
    private List<Long> memberIds;
}
