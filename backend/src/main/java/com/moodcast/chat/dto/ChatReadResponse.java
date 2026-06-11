package com.moodcast.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class ChatReadResponse {
    private Long roomId;
    private int memberId;
    private Long lastReadMessageId;
}
