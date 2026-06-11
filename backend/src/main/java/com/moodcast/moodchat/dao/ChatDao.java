package com.moodcast.moodchat.dao;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.moodcast.moodchat.vo.ChatVo;
import com.moodcast.moodchat.vo.ChatThreadVo;

import java.util.List;

@Mapper
public interface ChatDao {
    int insertChat(ChatVo chatVo);

    ChatVo selectChatMessageById(@Param("chatId") Long chatId);

    List<ChatThreadVo> selectChatThreads(@Param("memberId") Long memberId);

    List<ChatVo> selectChatMessages(
        @Param("memberId") Long memberId,
        @Param("partnerId") Long partnerId
    );

    int updateMessagesRead(
        @Param("memberId") Long memberId,
        @Param("partnerId") Long partnerId
    );

    int deleteChatMessageGlobally(@Param("chatId") Long chatId);

    int deleteChatMessageForSender(
        @Param("chatId") Long chatId,
        @Param("memberId") Long memberId
    );

    int deleteChatMessageForReceiver(
        @Param("chatId") Long chatId,
        @Param("memberId") Long memberId
    );

    int hideDirectChatMessagesAsSender(
        @Param("memberId") Long memberId,
        @Param("partnerId") Long partnerId
    );

    int hideDirectChatMessagesAsReceiver(
        @Param("memberId") Long memberId,
        @Param("partnerId") Long partnerId
    );
}
