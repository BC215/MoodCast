package com.moodcast.chat.mapper;

import com.moodcast.chat.vo.ChatMessageVo;
import com.moodcast.chat.vo.ChatRoomMemberVo;
import com.moodcast.chat.vo.ChatRoomVo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface GroupChatMapper {
    int insertChatRoom(ChatRoomVo chatRoomVo);

    int upsertChatRoomMember(ChatRoomMemberVo chatRoomMemberVo);

    int hideChatRoomMember(@Param("roomId") Long roomId, @Param("memberId") Long memberId);

    int leaveChatRoomMember(@Param("roomId") Long roomId, @Param("memberId") Long memberId);

    int softDeleteChatRoomIfEmpty(@Param("roomId") Long roomId);

    int updateLastReadMessageId(
            @Param("roomId") Long roomId,
            @Param("memberId") Long memberId,
            @Param("lastReadMessageId") Long lastReadMessageId
    );

    int touchRoomReadState(@Param("roomId") Long roomId, @Param("memberId") Long memberId);

    ChatRoomVo selectChatRoomById(@Param("roomId") Long roomId);

    ChatRoomVo selectChatRoomByMemberIds(
            @Param("memberIds") List<Long> memberIds,
            @Param("memberCount") int memberCount,
            @Param("roomType") String roomType
    );

    List<ChatRoomVo> selectChatRoomsByMemberId(
            @Param("memberId") Long memberId,
            @Param("roomType") String roomType
    );

    ChatRoomMemberVo selectChatRoomMemberByRoomIdAndMemberId(@Param("roomId") Long roomId, @Param("memberId") Long memberId);

    ChatRoomMemberVo selectActiveChatRoomMember(@Param("roomId") Long roomId, @Param("memberId") Long memberId);

    List<ChatRoomMemberVo> selectChatRoomMembersByRoomId(@Param("roomId") Long roomId);

    int countActiveChatRoomMembers(@Param("roomId") Long roomId);

    int insertChatMessage(ChatMessageVo chatMessageVo);

    ChatMessageVo selectChatMessageById(@Param("messageId") Long messageId);

    int softDeleteChatMessage(@Param("messageId") Long messageId);

    int insertSystemChatMessage(ChatMessageVo chatMessageVo);

    List<ChatMessageVo> selectChatMessagesByRoomId(@Param("roomId") Long roomId, @Param("memberId") Long memberId);
}
