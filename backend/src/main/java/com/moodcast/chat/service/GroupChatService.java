package com.moodcast.chat.service;

import com.moodcast.chat.dto.ChatRoomCreateRequestDto;
import com.moodcast.chat.dto.ChatRoomMemberInviteRequestDto;
import com.moodcast.chat.dto.ChatRoomMemberResponseDto;
import com.moodcast.chat.dto.ChatRoomMessageResponseDto;
import com.moodcast.chat.dto.ChatRoomMessageSendRequestDto;
import com.moodcast.chat.dto.ChatRoomResponseDto;
import com.moodcast.chat.mapper.GroupChatMapper;
import com.moodcast.chat.vo.ChatMessageVo;
import com.moodcast.chat.vo.ChatRoomMemberVo;
import com.moodcast.chat.vo.ChatRoomVo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupChatService {

    public static final String ROOM_TYPE_GROUP = "GROUP";
    public static final String ROOM_TYPE_DIRECT = "DIRECT";

    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter CHAT_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final GroupChatMapper groupChatMapper;

    @Transactional
    public ChatRoomResponseDto createChatRoom(ChatRoomCreateRequestDto request) {
        validateRoomCreateRequest(request);

        String roomType = normalizeRoomType(request.getRoomType());
        Set<Long> memberIds = new LinkedHashSet<>();
        memberIds.add(request.getCreatorId());
        if (request.getMemberIds() != null) {
            memberIds.addAll(
                    request.getMemberIds().stream()
                            .filter(Objects::nonNull)
                            .filter(memberId -> memberId > 0)
                            .collect(Collectors.toList())
            );
        }

        if (ROOM_TYPE_DIRECT.equals(roomType)) {
            ChatRoomVo existingRoom = findRoomByMemberIds(List.copyOf(memberIds), roomType);
            if (existingRoom != null) {
                activateRoomMembers(existingRoom.getRoomId(), memberIds);
                return toRoomResponse(requireRoomSummary(existingRoom.getRoomId()));
            }
        }

        ChatRoomVo chatRoomVo = new ChatRoomVo();
        chatRoomVo.setRoomType(roomType);
        chatRoomVo.setRoomName(normalizeRoomName(request.getRoomName()));
        chatRoomVo.setRoomDescription(normalizeRoomDescription(request.getRoomDescription()));
        chatRoomVo.setCreatedBy(request.getCreatorId());
        chatRoomVo.setDeletedYn("N");
        groupChatMapper.insertChatRoom(chatRoomVo);

        activateRoomMembers(chatRoomVo.getRoomId(), memberIds);
        return toRoomResponse(requireRoomSummary(chatRoomVo.getRoomId()));
    }

    @Transactional(readOnly = true)
    public List<ChatRoomResponseDto> getRoomsByMemberId(Long memberId) {
        return getRoomsByMemberId(memberId, ROOM_TYPE_GROUP);
    }

    @Transactional(readOnly = true)
    public List<ChatRoomResponseDto> getRoomsByMemberId(Long memberId, String roomType) {
        if (memberId == null || memberId <= 0) {
            return List.of();
        }

        return groupChatMapper.selectChatRoomsByMemberId(memberId, normalizeRoomType(roomType))
                .stream()
                .map(this::toRoomResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ChatRoomVo findRoomByMemberIds(List<Long> memberIds, String roomType) {
        if (memberIds == null || memberIds.isEmpty()) {
            return null;
        }

        List<Long> normalizedMemberIds = memberIds.stream()
                .filter(Objects::nonNull)
                .filter(memberId -> memberId > 0)
                .distinct()
                .collect(Collectors.toList());

        if (normalizedMemberIds.isEmpty()) {
            return null;
        }

        return groupChatMapper.selectChatRoomByMemberIds(
                normalizedMemberIds,
                normalizedMemberIds.size(),
                normalizeRoomType(roomType)
        );
    }

    @Transactional(readOnly = true)
    public List<ChatRoomMessageResponseDto> getMessagesByRoomId(Long roomId) {
        return getMessagesByRoomId(roomId, null);
    }

    @Transactional(readOnly = true)
    public List<ChatRoomMessageResponseDto> getMessagesByRoomId(Long roomId, Long memberId) {
        if (roomId == null || roomId <= 0) {
            return List.of();
        }

        if (memberId != null && memberId > 0) {
            ChatRoomMemberVo roomMember = groupChatMapper.selectChatRoomMemberByRoomIdAndMemberId(roomId, memberId);
            if (roomMember == null) {
                return List.of();
            }
            if (roomMember.getIsActive() != null && roomMember.getIsActive() == 0) {
                return List.of();
            }
        }

        return groupChatMapper.selectChatMessagesByRoomId(roomId, memberId)
                .stream()
                .map(this::toMessageResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markRoomAsRead(Long roomId, Long memberId, Long lastReadMessageId) {
        if (roomId == null || roomId <= 0 || memberId == null || memberId <= 0) {
            return;
        }

        if (lastReadMessageId == null || lastReadMessageId <= 0) {
            groupChatMapper.touchRoomReadState(roomId, memberId);
            return;
        }

        groupChatMapper.updateLastReadMessageId(roomId, memberId, lastReadMessageId);
    }

    @Transactional
    public void updateLastReadMessageId(Long roomId, int memberId, Long lastReadMessageId) {
        markRoomAsRead(roomId, (long) memberId, lastReadMessageId);
    }

    @Transactional
    public ChatRoomResponseDto inviteMembers(Long roomId, ChatRoomMemberInviteRequestDto request) {
        if (roomId == null || roomId <= 0) {
            throw new IllegalArgumentException("채팅방 정보가 올바르지 않습니다.");
        }
        if (request == null || request.getMemberIds() == null || request.getMemberIds().isEmpty()) {
            throw new IllegalArgumentException("초대할 멤버를 선택해 주세요.");
        }

        validateRoomExists(roomId);

        Set<Long> memberIds = request.getMemberIds().stream()
                .filter(Objects::nonNull)
                .filter(memberId -> memberId > 0)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        activateRoomMembers(roomId, memberIds);
        return toRoomResponse(requireRoomSummary(roomId));
    }

    @Transactional
    public void hideRoom(Long roomId, Long memberId) {
        if (roomId == null || roomId <= 0 || memberId == null || memberId <= 0) {
            throw new IllegalArgumentException("채팅방 정보가 올바르지 않습니다.");
        }

        ChatRoomMemberVo roomMember = groupChatMapper.selectChatRoomMemberByRoomIdAndMemberId(roomId, memberId);
        if (roomMember == null) {
            throw new IllegalArgumentException("참여 중인 채팅방이 아닙니다.");
        }

        groupChatMapper.hideChatRoomMember(roomId, memberId);
    }

    @Transactional
    public ChatRoomMessageResponseDto leaveRoom(Long roomId, Long memberId) {
        if (roomId == null || roomId <= 0 || memberId == null || memberId <= 0) {
            throw new IllegalArgumentException("채팅방 정보가 올바르지 않습니다.");
        }

        ChatRoomMemberVo roomMember = groupChatMapper.selectChatRoomMemberByRoomIdAndMemberId(roomId, memberId);
        if (roomMember == null) {
            throw new IllegalArgumentException("참여 중인 채팅방이 아닙니다.");
        }

        if (roomMember.getIsActive() != null && roomMember.getIsActive() == 0) {
            return null;
        }

        groupChatMapper.leaveChatRoomMember(roomId, memberId);

        ChatMessageVo systemMessage = buildSystemMessage(roomId, memberId, buildLeaveMessage(roomMember));
        groupChatMapper.insertSystemChatMessage(systemMessage);

        if (groupChatMapper.countActiveChatRoomMembers(roomId) == 0) {
            groupChatMapper.softDeleteChatRoomIfEmpty(roomId);
        }

        ChatMessageVo savedMessage = groupChatMapper.selectChatMessageById(systemMessage.getMessageId());
        if (savedMessage != null) {
            savedMessage.setEventType("CHAT_SYSTEM");
        }
        return toMessageResponse(savedMessage);
    }

    @Transactional
    public ChatRoomMessageResponseDto saveMessage(Long roomId, ChatRoomMessageSendRequestDto request) {
        if (roomId == null || roomId <= 0) {
            throw new IllegalArgumentException("채팅방 정보가 올바르지 않습니다.");
        }
        if (request == null || request.getSenderId() == null || request.getSenderId() <= 0) {
            throw new IllegalArgumentException("보낸 사람 정보가 올바르지 않습니다.");
        }

        String content = normalizeMessageContent(request.getContent());
        if (content.isEmpty()) {
            throw new IllegalArgumentException("메시지 내용을 입력해 주세요.");
        }

        ChatRoomMemberVo activeMember = groupChatMapper.selectActiveChatRoomMember(roomId, request.getSenderId());
        if (activeMember == null) {
            throw new IllegalArgumentException("참여 중인 사용자만 메시지를 보낼 수 있습니다.");
        }

        ChatMessageVo chatMessageVo = new ChatMessageVo();
        chatMessageVo.setRoomId(roomId);
        chatMessageVo.setSenderId(request.getSenderId());
        chatMessageVo.setContent(content);
        chatMessageVo.setMessageType("MESSAGE");
        chatMessageVo.setCreatedAt(nowText());
        chatMessageVo.setDeletedYn("N");
        groupChatMapper.insertChatMessage(chatMessageVo);

        ChatMessageVo savedMessage = groupChatMapper.selectChatMessageById(chatMessageVo.getMessageId());
        if (savedMessage != null) {
            savedMessage.setEventType("CHAT_MESSAGE");
        }
        return toMessageResponse(savedMessage);
    }

    @Transactional
    public ChatRoomMessageResponseDto deleteMessage(Long roomId, Long messageId, Long memberId) {
        if (roomId == null || roomId <= 0 || messageId == null || messageId <= 0 || memberId == null || memberId <= 0) {
            throw new IllegalArgumentException("메시지 삭제 정보가 올바르지 않습니다.");
        }

        ChatRoomMemberVo activeMember = groupChatMapper.selectActiveChatRoomMember(roomId, memberId);
        if (activeMember == null) {
            throw new IllegalArgumentException("참여 중인 사용자만 메시지를 삭제할 수 있습니다.");
        }

        ChatMessageVo targetMessage = groupChatMapper.selectChatMessageById(messageId);
        if (targetMessage == null || !roomId.equals(targetMessage.getRoomId())) {
            throw new IllegalArgumentException("삭제할 메시지를 찾을 수 없습니다.");
        }
        if (!memberId.equals(targetMessage.getSenderId())) {
            throw new IllegalArgumentException("본인이 보낸 메시지만 삭제할 수 있습니다.");
        }

        groupChatMapper.softDeleteChatMessage(messageId);

        ChatRoomMessageResponseDto response = new ChatRoomMessageResponseDto();
        response.setMessageId(messageId);
        response.setRoomId(roomId);
        response.setSenderId(memberId);
        response.setSenderName(targetMessage.getSenderName());
        response.setProfileImageUrl(targetMessage.getProfileImageUrl());
        response.setEventType("CHAT_DELETE");
        return response;
    }

    @Transactional(readOnly = true)
    public List<ChatRoomMemberResponseDto> getMembersByRoomId(Long roomId) {
        if (roomId == null || roomId <= 0) {
            return List.of();
        }

        return groupChatMapper.selectChatRoomMembersByRoomId(roomId)
                .stream()
                .map(member -> new ChatRoomMemberResponseDto(
                        member.getMemberId(),
                        member.getMemberName(),
                        member.getEmail(),
                        member.getProfileImageUrl(),
                        member.getJoinedAt()
                ))
                .collect(Collectors.toList());
    }

    private void validateRoomCreateRequest(ChatRoomCreateRequestDto request) {
        if (request == null) {
            throw new IllegalArgumentException("채팅방 생성 정보가 없습니다.");
        }
        if (request.getCreatorId() == null || request.getCreatorId() <= 0) {
            throw new IllegalArgumentException("생성자 정보가 올바르지 않습니다.");
        }
        if (normalizeRoomName(request.getRoomName()).isEmpty()) {
            throw new IllegalArgumentException("채팅방 이름을 입력해 주세요.");
        }
    }

    private void validateRoomExists(Long roomId) {
        if (groupChatMapper.selectChatRoomById(roomId) == null) {
            throw new IllegalArgumentException("존재하지 않는 채팅방입니다.");
        }
    }

    private ChatRoomVo requireRoomSummary(Long roomId) {
        ChatRoomVo room = groupChatMapper.selectChatRoomById(roomId);
        if (room == null) {
            throw new IllegalStateException("채팅방 정보를 불러오지 못했습니다.");
        }
        return room;
    }

    private ChatRoomResponseDto toRoomResponse(ChatRoomVo room) {
        if (room == null) {
            return null;
        }

        return new ChatRoomResponseDto(
                room.getRoomId(),
                room.getRoomType(),
                room.getRoomName(),
                room.getRoomDescription(),
                room.getCreatedBy(),
                room.getCreatedAt(),
                room.getMemberCount(),
                room.getLastMessage(),
                room.getLastMessageAt(),
                room.getUnreadCount()
        );
    }

    private ChatRoomMessageResponseDto toMessageResponse(ChatMessageVo message) {
        if (message == null) {
            return null;
        }

        return new ChatRoomMessageResponseDto(
                message.getMessageId(),
                message.getRoomId(),
                message.getSenderId(),
                message.getSenderName(),
                message.getProfileImageUrl(),
                message.getContent(),
                message.getCreatedAt(),
                message.getReadCount(),
                message.getUnreadCount(),
                message.getEventType()
        );
    }

    private ChatMessageVo buildSystemMessage(Long roomId, Long senderId, String content) {
        ChatMessageVo chatMessageVo = new ChatMessageVo();
        chatMessageVo.setRoomId(roomId);
        chatMessageVo.setSenderId(senderId);
        chatMessageVo.setContent(content);
        chatMessageVo.setMessageType("SYSTEM");
        chatMessageVo.setCreatedAt(nowText());
        chatMessageVo.setDeletedYn("N");
        return chatMessageVo;
    }

    private String buildLeaveMessage(ChatRoomMemberVo roomMember) {
        String memberName = normalizeDisplayName(roomMember == null ? null : roomMember.getMemberName());
        return memberName + "님이 나갔습니다.";
    }

    private String normalizeRoomName(String roomName) {
        return roomName == null ? "" : roomName.trim();
    }

    private String normalizeRoomDescription(String roomDescription) {
        return roomDescription == null ? null : roomDescription.trim();
    }

    private String normalizeRoomType(String roomType) {
        String normalized = roomType == null ? "" : roomType.trim().toUpperCase();
        return normalized.isEmpty() ? ROOM_TYPE_GROUP : normalized;
    }

    private String normalizeMessageContent(String content) {
        return content == null ? "" : content.trim();
    }

    private String normalizeDisplayName(String displayName) {
        if (displayName == null) {
            return "회원";
        }

        String trimmed = displayName.trim();
        return trimmed.isEmpty() ? "회원" : trimmed;
    }

    private void activateRoomMembers(Long roomId, Set<Long> memberIds) {
        if (roomId == null || memberIds == null || memberIds.isEmpty()) {
            return;
        }

        for (Long memberId : memberIds) {
            ChatRoomMemberVo roomMemberVo = new ChatRoomMemberVo();
            roomMemberVo.setRoomId(roomId);
            roomMemberVo.setMemberId(memberId);
            roomMemberVo.setDeletedYn("N");
            groupChatMapper.upsertChatRoomMember(roomMemberVo);
        }
    }

    private String nowText() {
        return LocalDateTime.now(KOREA_ZONE).format(CHAT_TIME_FORMATTER);
    }
}
