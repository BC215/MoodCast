package com.moodcast.chat.service;

import com.moodcast.chat.dao.ChatDao;
import com.moodcast.chat.dto.ChatThreadResponse;
import com.moodcast.chat.vo.ChatThread;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private final ChatDao chatDao;

    public ChatService(ChatDao chatDao) {
        this.chatDao = chatDao;
    }

    @Transactional(readOnly = true)
    public List<ChatThreadResponse> getChatThreadsWithUnreadCount(Long memberId) {
        List<ChatThread> threads = chatDao.findChatThreadsByMemberId(memberId);
        return threads.stream()
                .map(thread -> new ChatThreadResponse(
                        thread.getThreadId(),
                        thread.getOtherMemberId(), // 예시: 상대방 ID
                        thread.getUnreadCount()))
                .collect(Collectors.toList());
    }
}