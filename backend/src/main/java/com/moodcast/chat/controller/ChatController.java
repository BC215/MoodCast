package com.moodcast.chat.controller;

import com.moodcast.chat.dto.ChatThreadResponse;
import com.moodcast.chat.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    /**
     * 특정 회원의 채팅 스레드 목록과 각 스레드의 안 읽은 메시지 수를 조회합니다.
     *
     * @param memberId 조회할 회원의 ID
     * @return 채팅 스레드 목록 (ChatThreadResponse)
     */
    @GetMapping("/threads")
    public ResponseEntity<List<ChatThreadResponse>> getChatThreads(@RequestParam Long memberId) {
        if (memberId == null) {
            return ResponseEntity.badRequest().build();
        }
        List<ChatThreadResponse> chatThreads = chatService.getChatThreadsWithUnreadCount(memberId);
        return ResponseEntity.ok(chatThreads);
    }
}