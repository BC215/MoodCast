package com.moodcast.chat.controller;

import com.moodcast.chat.dto.ChatReadRequest;
import com.moodcast.chat.dto.ChatRoomCreateRequestDto;
import com.moodcast.chat.dto.ChatRoomMemberInviteRequestDto;
import com.moodcast.chat.dto.ChatRoomMemberResponseDto;
import com.moodcast.chat.dto.ChatRoomMessageResponseDto;
import com.moodcast.chat.dto.ChatRoomMessageSendRequestDto;
import com.moodcast.chat.dto.ChatRoomResponseDto;
import com.moodcast.chat.service.GroupChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping({"/chat", "/api/chat"})
public class GroupChatController {

    private final GroupChatService groupChatService;
    private final SimpMessagingTemplate messagingTemplate;

    @PostMapping("/rooms")
    public ResponseEntity<ChatRoomResponseDto> createRoom(@RequestBody ChatRoomCreateRequestDto request) {
        return ResponseEntity.ok(groupChatService.createChatRoom(request));
    }

    @GetMapping("/rooms")
    public ResponseEntity<List<ChatRoomResponseDto>> getRooms(@RequestParam Long memberId) {
        return ResponseEntity.ok(groupChatService.getRoomsByMemberId(memberId));
    }

    @GetMapping("/rooms/member/{memberId}")
    public ResponseEntity<List<ChatRoomResponseDto>> getRoomsByMemberId(@PathVariable Long memberId) {
        return ResponseEntity.ok(groupChatService.getRoomsByMemberId(memberId));
    }

    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<List<ChatRoomMessageResponseDto>> getMessagesByRoomId(
            @PathVariable Long roomId,
            @RequestParam(required = false) Long memberId
    ) {
        return ResponseEntity.ok(groupChatService.getMessagesByRoomId(roomId, memberId));
    }

    @PatchMapping("/rooms/{roomId}/read")
    public ResponseEntity<Void> markRoomAsRead(
            @PathVariable Long roomId,
            @RequestBody ChatReadRequest request
    ) {
        if (request != null) {
            groupChatService.updateLastReadMessageId(roomId, request.getMemberId(), request.getLastReadMessageId());
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/rooms/{roomId}/read")
    public ResponseEntity<Void> markRoomAsReadLegacy(
            @PathVariable Long roomId,
            @RequestParam Long memberId,
            @RequestParam(required = false) Long lastReadMessageId
    ) {
        groupChatService.markRoomAsRead(roomId, memberId, lastReadMessageId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/rooms/{roomId}/messages")
    public ResponseEntity<ChatRoomMessageResponseDto> sendMessage(
            @PathVariable Long roomId,
            @RequestBody ChatRoomMessageSendRequestDto request
    ) {
        ChatRoomMessageResponseDto savedMessage = groupChatService.saveMessage(roomId, request);
        messagingTemplate.convertAndSend("/topic/chat/rooms/" + roomId, savedMessage);
        return ResponseEntity.ok(savedMessage);
    }

    @DeleteMapping("/rooms/{roomId}/messages/{messageId}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable Long roomId,
            @PathVariable Long messageId,
            @RequestParam Long memberId
    ) {
        ChatRoomMessageResponseDto deletedMessage = groupChatService.deleteMessage(roomId, messageId, memberId);
        messagingTemplate.convertAndSend("/topic/chat/rooms/" + roomId, deletedMessage);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/rooms/{roomId}/members")
    public ResponseEntity<List<ChatRoomMemberResponseDto>> getMembersByRoomId(@PathVariable Long roomId) {
        return ResponseEntity.ok(groupChatService.getMembersByRoomId(roomId));
    }

    @PostMapping("/rooms/{roomId}/members")
    public ResponseEntity<ChatRoomResponseDto> inviteMembers(
            @PathVariable Long roomId,
            @RequestBody ChatRoomMemberInviteRequestDto request
    ) {
        return ResponseEntity.ok(groupChatService.inviteMembers(roomId, request));
    }

    @DeleteMapping("/rooms/{roomId}/hide")
    public ResponseEntity<Void> hideRoom(
            @PathVariable Long roomId,
            @RequestParam Long memberId
    ) {
        groupChatService.hideRoom(roomId, memberId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/rooms/{roomId}/leave")
    public ResponseEntity<Void> leaveRoom(
            @PathVariable Long roomId,
            @RequestParam Long memberId
    ) {
        ChatRoomMessageResponseDto systemMessage = groupChatService.leaveRoom(roomId, memberId);
        if (systemMessage != null) {
            messagingTemplate.convertAndSend("/topic/chat/rooms/" + roomId, systemMessage);
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/rooms/{roomId}/members/{memberId}")
    public ResponseEntity<Void> leaveRoomLegacy(
            @PathVariable Long roomId,
            @PathVariable Long memberId
    ) {
        ChatRoomMessageResponseDto systemMessage = groupChatService.leaveRoom(roomId, memberId);
        if (systemMessage != null) {
            messagingTemplate.convertAndSend("/topic/chat/rooms/" + roomId, systemMessage);
        }
        return ResponseEntity.noContent().build();
    }
}
