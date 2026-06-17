package com.moodcast.moodchat.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import com.moodcast.moodchat.dto.ChatMessageDto;
import com.moodcast.moodchat.service.ChatService;
import com.moodcast.moodchat.vo.ChatVo;
import com.moodcast.moodchat.vo.ChatThreadVo;
import lombok.RequiredArgsConstructor;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/chat")
public class ChatController {
    // @RequiredArgsConstructor가 final 필드에 대한 생성자를 자동으로 생성하므로 @Autowired는 불필요합니다.
    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping("/messages")
    public ResponseEntity<?> messages(
        @RequestParam Long memberId,
        @RequestParam Long partnerId
    ) {
        List<ChatVo> list = chatService.selectChatMessages(memberId, partnerId);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/threads")
    public ResponseEntity<?> threads(@RequestParam Long memberId) {
        List<ChatThreadVo> list = chatService.selectChatThreads(memberId);
        return ResponseEntity.ok(list);
    }

    @PostMapping("/send")
    public ResponseEntity<?> sendMessage(@RequestBody ChatVo chatVo) {
        ChatVo savedChat = chatService.insertChat(chatVo);
        return ResponseEntity.ok(savedChat);
    }

    @PostMapping("/read")
    public ResponseEntity<?> markMessagesAsRead(
        @RequestParam Long memberId,
        @RequestParam Long partnerId
    ) {
        int updatedCount = chatService.markMessagesAsRead(memberId, partnerId);
        if (updatedCount > 0) {
            ChatMessageDto readReceipt = new ChatMessageDto();
            readReceipt.setSenderId(partnerId.intValue());
            readReceipt.setReceiverId(memberId.intValue());
            readReceipt.setIsRead(1);
            readReceipt.setEventType("READ_RECEIPT");
            messagingTemplate.convertAndSend("/sub/chat/" + partnerId, readReceipt);
        }
        return ResponseEntity.ok(updatedCount);
    }

    @PostMapping("/messages/delete")
    public ResponseEntity<?> deleteMessage(
        @RequestParam Long chatId,
        @RequestParam Long memberId
    ) {
        ChatVo deletedChat = chatService.deleteChatMessage(chatId, memberId);
        if (deletedChat == null) {
            return ResponseEntity.notFound().build();
        }

        ChatMessageDto deleteMessage = new ChatMessageDto();
        deleteMessage.setChatId(deletedChat.getChatId());
        deleteMessage.setSenderId(deletedChat.getSenderId());
        deleteMessage.setReceiverId(deletedChat.getReceiverId());
        deleteMessage.setEventType("CHAT_DELETE");
        deleteMessage.setIsRead(deletedChat.getIsRead());

        if (deletedChat.getIsRead() == 0) {
            messagingTemplate.convertAndSend("/sub/chat/" + deletedChat.getSenderId(), deleteMessage);
            messagingTemplate.convertAndSend("/sub/chat/" + deletedChat.getReceiverId(), deleteMessage);
        } else if (deletedChat.getSenderId() == memberId.intValue()) {
            messagingTemplate.convertAndSend("/sub/chat/" + memberId, deleteMessage);
        } else {
            messagingTemplate.convertAndSend("/sub/chat/" + memberId, deleteMessage);
        }

        return ResponseEntity.ok(deletedChat);
    }

    @RequestMapping(value = "/leave", method = {RequestMethod.POST, RequestMethod.DELETE})
    public ResponseEntity<?> leaveDirectChat(
        @RequestParam Long memberId,
        @RequestParam Long partnerId
    ) {
        ChatVo systemChat = chatService.leaveDirectChat(memberId, partnerId);
        if (systemChat == null) {
            return ResponseEntity.badRequest().build();
        }

        if (systemChat.getContent() != null && !systemChat.getContent().isBlank()) {
            ChatMessageDto leaveMessage = new ChatMessageDto();
            leaveMessage.setChatId(systemChat.getChatId());
            leaveMessage.setSenderId(systemChat.getSenderId());
            leaveMessage.setReceiverId(systemChat.getReceiverId());
            leaveMessage.setContent(systemChat.getContent());
            leaveMessage.setCreatedAt(systemChat.getCreatedAt());
            leaveMessage.setIsRead(systemChat.getIsRead());
            leaveMessage.setEventType("CHAT_SYSTEM");

            messagingTemplate.convertAndSend("/sub/chat/" + partnerId, leaveMessage);
        }

        return ResponseEntity.ok(systemChat);
    }
}
