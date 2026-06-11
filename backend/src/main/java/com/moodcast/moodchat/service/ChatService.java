package com.moodcast.moodchat.service;

import com.moodcast.chat.dto.ChatRoomCreateRequestDto;
import com.moodcast.chat.dto.ChatRoomMemberResponseDto;
import com.moodcast.chat.dto.ChatRoomMessageResponseDto;
import com.moodcast.chat.dto.ChatRoomMessageSendRequestDto;
import com.moodcast.chat.dto.ChatRoomResponseDto;
import com.moodcast.moodchat.dao.ChatDao;
import com.moodcast.chat.mapper.GroupChatMapper;
import com.moodcast.chat.service.GroupChatService;
import com.moodcast.chat.vo.ChatMessageVo;
import com.moodcast.chat.vo.ChatRoomMemberVo;
import com.moodcast.chat.vo.ChatRoomVo;
import com.moodcast.member.dao.LoginDao;
import com.moodcast.member.vo.Member;
import com.moodcast.moodchat.vo.ChatThreadVo;
import com.moodcast.moodchat.vo.ChatVo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ChatService {

    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter CHAT_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final String DIRECT_LEAVE_PREFIX = "__MOODCAST_DIRECT_LEAVE__::";
    private static final String ROOM_TYPE_DIRECT = GroupChatService.ROOM_TYPE_DIRECT;

    private final GroupChatService groupChatService;
    private final GroupChatMapper groupChatMapper;
    private final ChatDao chatDao;
    private final LoginDao loginDao;

    @Transactional
    public ChatVo insertChat(ChatVo chatVo) {
        if (chatVo == null || chatVo.getSenderId() <= 0 || chatVo.getReceiverId() <= 0) {
            return null;
        }

        ChatRoomVo room = ensureDirectRoom(
                Long.valueOf(chatVo.getSenderId()),
                Long.valueOf(chatVo.getReceiverId())
        );
        if (room == null || room.getRoomId() == null) {
            return null;
        }


        ChatRoomMessageSendRequestDto request = new ChatRoomMessageSendRequestDto();
        request.setSenderId((long) chatVo.getSenderId());
        request.setContent(chatVo.getContent());

        ChatRoomMessageResponseDto savedMessage = groupChatService.saveMessage(room.getRoomId(), request);
        if (savedMessage == null) {
            return null;
        }

        ChatVo response = new ChatVo();
        response.setChatId(savedMessage.getMessageId() == null ? 0 : savedMessage.getMessageId().intValue());
        response.setSenderId(savedMessage.getSenderId() == null ? 0 : savedMessage.getSenderId().intValue());
        response.setReceiverId(chatVo.getReceiverId());
        response.setContent(savedMessage.getContent());
        response.setCreatedAt(savedMessage.getCreatedAt());
        response.setIsRead(0);
        return response;
    }

    public List<ChatThreadVo> selectChatThreads(Long memberId) {
        if (memberId == null || memberId <= 0) {
            return List.of();
        }

        List<ChatThreadVo> legacyThreads = chatDao.selectChatThreads(memberId);
        List<ChatThreadVo> roomThreads = groupChatService.getRoomsByMemberId(memberId, ROOM_TYPE_DIRECT).stream()
                .map(room -> toDirectThread(memberId, room))
                .filter(Objects::nonNull)
                .toList();
        return mergeDirectThreads(legacyThreads, roomThreads);
    }

    public List<ChatVo> selectChatMessages(Long memberId, Long partnerId) {
        if (memberId == null || partnerId == null || memberId <= 0 || partnerId <= 0) {
            return List.of();
        }

        List<ChatVo> legacyMessages = chatDao.selectChatMessages(memberId, partnerId);
        ChatRoomVo room = groupChatService.findRoomByMemberIds(List.of(memberId, partnerId), ROOM_TYPE_DIRECT);
        if (room == null || room.getRoomId() == null) {
            return legacyMessages;
        }

        List<ChatVo> roomMessages = groupChatService.getMessagesByRoomId(room.getRoomId(), memberId).stream()
                .map(message -> toChatVo(message, partnerId))
                .toList();
        return mergeDirectMessages(legacyMessages, roomMessages);
    }

    public int markMessagesAsRead(Long memberId, Long partnerId) {
        if (memberId == null || partnerId == null || memberId <= 0 || partnerId <= 0) {
            return 0;
        }

        int legacyUpdatedCount = chatDao.updateMessagesRead(memberId, partnerId);
        ChatRoomVo room = groupChatService.findRoomByMemberIds(List.of(memberId, partnerId), ROOM_TYPE_DIRECT);
        if (room == null || room.getRoomId() == null) {
            return legacyUpdatedCount;
        }

        List<ChatRoomMessageResponseDto> messages = groupChatService.getMessagesByRoomId(room.getRoomId(), memberId);
        Long lastMessageId = getLatestMessageId(messages);
        groupChatService.markRoomAsRead(room.getRoomId(), memberId, lastMessageId);
        return legacyUpdatedCount > 0 ? legacyUpdatedCount : 1;
    }

    @Transactional
    public ChatVo deleteChatMessage(Long chatId, Long memberId) {
        if (chatId == null || memberId == null) {
            return null;
        }

        ChatMessageVo targetMessage = groupChatMapper.selectChatMessageById(chatId);
        if (targetMessage == null || targetMessage.getRoomId() == null) {
            return null;
        }

        ChatRoomResponseDto room = groupChatService.getRoomsByMemberId(memberId, ROOM_TYPE_DIRECT).stream()
                .filter(item -> Objects.equals(item.getRoomId(), targetMessage.getRoomId()))
                .findFirst()
                .orElse(null);
        if (room == null) {
            return null;
        }

        ChatRoomMessageResponseDto deletedMessage =
                groupChatService.deleteMessage(targetMessage.getRoomId(), chatId, memberId);
        if (deletedMessage == null) {
            return null;
        }

        ChatVo response = new ChatVo();
        response.setChatId(chatId.intValue());
        response.setSenderId(deletedMessage.getSenderId() == null ? 0 : deletedMessage.getSenderId().intValue());
        response.setReceiverId(resolveOtherMemberId(room.getRoomId(), memberId));
        response.setIsRead(0);
        response.setDeletedYn(1);
        response.setSenderDeletedYn(1);
        response.setReceiverDeletedYn(1);
        return response;
    }

    @Transactional
    public ChatVo leaveDirectChat(Long memberId, Long partnerId) {
        if (memberId == null || partnerId == null) {
            return null;
        }

        ChatRoomVo room = groupChatService.findRoomByMemberIds(List.of(memberId, partnerId), ROOM_TYPE_DIRECT);
        if (room == null || room.getRoomId() == null) {
            return null;
        }

        Member leavingMember = loginDao.findMemberById(memberId);
        ChatRoomMemberVo partnerRoomMember =
                groupChatMapper.selectChatRoomMemberByRoomIdAndMemberId(room.getRoomId(), partnerId);
        boolean partnerAlreadyLeft =
                partnerRoomMember != null
                        && (partnerRoomMember.getHiddenAt() != null || partnerRoomMember.getLeftAt() != null);

        groupChatMapper.hideChatRoomMember(room.getRoomId(), memberId);

        String displayName = leavingMember != null ? resolveDisplayName(leavingMember) : "Member " + memberId;
        String now = nowText();

        if (partnerAlreadyLeft) {
            ChatVo leaveState = new ChatVo();
            leaveState.setSenderId(memberId.intValue());
            leaveState.setReceiverId(partnerId.intValue());
            leaveState.setIsRead(1);
            leaveState.setCreatedAt(now);
            leaveState.setDeletedYn(0);
            return leaveState;
        }

        ChatMessageVo systemMessage = new ChatMessageVo();
        systemMessage.setRoomId(room.getRoomId());
        systemMessage.setSenderId((long) memberId);
        systemMessage.setContent(DIRECT_LEAVE_PREFIX + displayName + "\ub2d8\uc774 \ub098\uac14\uc2b5\ub2c8\ub2e4.");
        systemMessage.setMessageType("SYSTEM");
        systemMessage.setCreatedAt(now);
        systemMessage.setDeletedYn("N");
        groupChatMapper.insertSystemChatMessage(systemMessage);

        ChatVo response = new ChatVo();
        response.setChatId(systemMessage.getMessageId() == null ? 0 : systemMessage.getMessageId().intValue());
        response.setSenderId(memberId.intValue());
        response.setReceiverId(partnerId.intValue());
        response.setContent(systemMessage.getContent());
        response.setIsRead(1);
        response.setCreatedAt(now);
        response.setDeletedYn(0);
        return response;
    }

    private ChatRoomVo ensureDirectRoom(Long memberId, Long partnerId) {
        if (memberId == null || partnerId == null || memberId <= 0 || partnerId <= 0) {
            return null;
        }

        Member member = loginDao.findMemberById(memberId);
        Member partner = loginDao.findMemberById(partnerId);
        if (member == null || partner == null) {
            return null;
        }

        ChatRoomCreateRequestDto request = new ChatRoomCreateRequestDto();
        request.setRoomType(ROOM_TYPE_DIRECT);
        request.setRoomName(buildDirectRoomName(partner));
        request.setRoomDescription("");
        request.setCreatorId(memberId);
        request.setMemberIds(List.of(partnerId));

        ChatRoomResponseDto response = groupChatService.createChatRoom(request);
        if (response == null || response.getRoomId() == null) {
            return null;
        }

        return groupChatService.findRoomByMemberIds(List.of(memberId, partnerId), ROOM_TYPE_DIRECT);
    }

    private ChatThreadVo toDirectThread(Long memberId, ChatRoomResponseDto room) {
        if (room == null || room.getRoomId() == null) {
            return null;
        }

        List<ChatRoomMemberResponseDto> members = groupChatService.getMembersByRoomId(room.getRoomId());
        ChatRoomMemberResponseDto partnerMember = members.stream()
                .filter(member -> !Objects.equals(member.getMemberId(), memberId))
                .findFirst()
                .orElse(null);

        if (partnerMember == null) {
            return null;
        }

        ChatThreadVo thread = new ChatThreadVo();
        thread.setPartnerMemberId(partnerMember.getMemberId());
        thread.setPartnerName(resolveDisplayName(partnerMember.getMemberName(), partnerMember.getMemberId()));
        thread.setPartnerNickname(resolveDisplayName(partnerMember.getMemberName(), partnerMember.getMemberId()));
        thread.setPartnerProfileImageUrl(partnerMember.getProfileImageUrl());
        thread.setLastMessage(room.getLastMessage());
        thread.setLastMessageAt(room.getLastMessageAt());
        thread.setUnreadCount(room.getUnreadCount() == null ? 0 : room.getUnreadCount());
        return thread;
    }

    private ChatVo toChatVo(ChatRoomMessageResponseDto message, Long partnerId) {
        ChatVo chatVo = new ChatVo();
        chatVo.setChatId(message.getMessageId() == null ? 0 : message.getMessageId().intValue());
        chatVo.setSenderId(message.getSenderId() == null ? 0 : message.getSenderId().intValue());
        chatVo.setReceiverId(partnerId == null ? 0 : partnerId.intValue());
        chatVo.setContent(message.getContent());
        chatVo.setIsRead(message.getUnreadCount() != null && message.getUnreadCount() > 0 ? 0 : 1);
        chatVo.setCreatedAt(message.getCreatedAt());
        return chatVo;
    }

    private Long getLatestMessageId(List<ChatRoomMessageResponseDto> messages) {
        if (messages == null || messages.isEmpty()) {
            return null;
        }

        for (int index = messages.size() - 1; index >= 0; index -= 1) {
            ChatRoomMessageResponseDto message = messages.get(index);
            if (message != null && message.getMessageId() != null && message.getMessageId() > 0) {
                return message.getMessageId();
            }
        }

        return null;
    }

    private int resolveOtherMemberId(Long roomId, Long memberId) {
        if (roomId == null || memberId == null) {
            return 0;
        }

        return groupChatService.getMembersByRoomId(roomId).stream()
                .map(ChatRoomMemberResponseDto::getMemberId)
                .map(value -> value == null ? 0 : value.intValue())
                .filter(otherMemberId -> otherMemberId != memberId.intValue())
                .findFirst()
                .orElse(0);
    }

    private String buildDirectRoomName(Member partner) {
        if (partner == null) {
            return "chat-room";
        }

        String displayName = resolveDisplayName(partner);
        return displayName.isBlank() ? "chat-room" : displayName;
    }

    private String resolveDisplayName(Member member) {
        if (member == null) {
            return "Member";
        }

        if (member.getNickname() != null && !member.getNickname().isBlank()) {
            return member.getNickname();
        }

        if (member.getName() != null && !member.getName().isBlank()) {
            return member.getName();
        }

        return "Member " + member.getMemberId();
    }

    private String resolveDisplayName(String memberName, Long memberId) {
        if (memberName != null && !memberName.isBlank()) {
            return memberName;
        }

        return "Member " + memberId;
    }

    private String nowText() {
        return LocalDateTime.now(KOREA_ZONE).format(CHAT_TIME_FORMATTER);
    }

    private List<ChatThreadVo> mergeDirectThreads(List<ChatThreadVo> legacyThreads, List<ChatThreadVo> roomThreads) {
        Map<Long, ChatThreadVo> mergedThreads = new LinkedHashMap<>();
        addThreads(mergedThreads, legacyThreads);
        addThreads(mergedThreads, roomThreads);

        return mergedThreads.values().stream()
                .sorted(Comparator.comparingLong(this::toThreadSortValue).reversed())
                .toList();
    }

    private void addThreads(Map<Long, ChatThreadVo> mergedThreads, List<ChatThreadVo> threads) {
        if (threads == null || threads.isEmpty()) {
            return;
        }

        for (ChatThreadVo thread : threads) {
            if (thread == null || thread.getPartnerMemberId() == null) {
                continue;
            }

            Long partnerMemberId = thread.getPartnerMemberId();
            ChatThreadVo current = mergedThreads.get(partnerMemberId);
            if (current == null || toThreadSortValue(thread) >= toThreadSortValue(current)) {
                mergedThreads.put(partnerMemberId, thread);
            }
        }
    }

    private List<ChatVo> mergeDirectMessages(List<ChatVo> legacyMessages, List<ChatVo> roomMessages) {
        return java.util.stream.Stream.concat(
                        legacyMessages == null ? java.util.stream.Stream.empty() : legacyMessages.stream(),
                        roomMessages == null ? java.util.stream.Stream.empty() : roomMessages.stream())
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingLong(this::toMessageSortValue))
                .toList();
    }

    private long toThreadSortValue(ChatThreadVo thread) {
        return parseChatTime(thread == null ? null : thread.getLastMessageAt());
    }

    private long toMessageSortValue(ChatVo chatVo) {
        return parseChatTime(chatVo == null ? null : chatVo.getCreatedAt());
    }

    private long parseChatTime(String value) {
        if (value == null || value.isBlank()) {
            return 0L;
        }

        try {
            LocalDateTime parsed = LocalDateTime.parse(value, CHAT_TIME_FORMATTER);
            return parsed.atZone(KOREA_ZONE).toInstant().toEpochMilli();
        } catch (Exception ignored) {
            return 0L;
        }
    }
}
