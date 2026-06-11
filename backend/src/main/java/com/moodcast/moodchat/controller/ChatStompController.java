package com.moodcast.moodchat.controller;

import com.moodcast.member.dao.LoginDao;
import com.moodcast.member.vo.Member;
import com.moodcast.moodchat.dto.ChatMessageDto;
import com.moodcast.moodchat.dto.ChatSendRequestDto;
import com.moodcast.moodchat.service.ChatService;
import com.moodcast.moodchat.vo.ChatVo;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class ChatStompController {
    private final SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;
    private final LoginDao loginDao;

    @MessageMapping("/chat/send")
    public void sendMessage(@Payload ChatSendRequestDto request) {
        if (request == null || request.getSenderId() == null || request.getReceiverId() == null) {
            return;
        }

        String content = request.getContent() == null ? "" : request.getContent().trim();
        if (content.isEmpty()) {
            return;
        }

        int senderId = request.getSenderId();
        int receiverId = request.getReceiverId();

        ChatVo chatVo = new ChatVo();
        chatVo.setSenderId(senderId);
        chatVo.setReceiverId(receiverId);
        chatVo.setContent(content);
        chatVo.setIsRead(request.getIsRead() != null ? request.getIsRead() : 0);

        ChatVo savedChat = chatService.insertChat(chatVo);
        Member sender = loginDao.findMemberById((long) senderId);

        ChatMessageDto chatMessage = buildChatMessage(savedChat, sender, "CHAT_MESSAGE");
        messagingTemplate.convertAndSend("/sub/chat/" + receiverId, chatMessage);
        messagingTemplate.convertAndSend("/sub/chat/" + senderId, chatMessage);

        ChatMessageDto notificationMessage = buildChatMessage(savedChat, sender, "CHAT_NOTIFICATION");
        messagingTemplate.convertAndSend("/sub/notifications/" + receiverId, notificationMessage);
    }

    private ChatMessageDto buildChatMessage(ChatVo savedChat, Member sender, String eventType) {
        ChatMessageDto message = new ChatMessageDto();
        message.setChatId(savedChat.getChatId());
        message.setSenderId(savedChat.getSenderId());
        message.setReceiverId(savedChat.getReceiverId());
        message.setContent(savedChat.getContent());
        message.setCreatedAt(savedChat.getCreatedAt());
        message.setIsRead(savedChat.getIsRead());
        message.setSenderNickname(sender != null ? sender.getNickname() : null);
        message.setSenderProfileImageUrl(sender != null ? sender.getProfileImageUrl() : null);
        message.setEventType(eventType);
        return message;
    }
}
