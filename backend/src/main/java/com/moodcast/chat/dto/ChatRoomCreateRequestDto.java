package com.moodcast.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class ChatRoomCreateRequestDto {
    private String roomType;
    private String roomName;
    private String roomDescription;
    private Long creatorId;
    private List<Long> memberIds;
}
