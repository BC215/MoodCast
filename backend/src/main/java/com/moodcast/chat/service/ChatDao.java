package com.moodcast.chat.dao;

import com.moodcast.chat.vo.ChatThread;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ChatDao {

    /**
     * 특정 회원의 채팅 스레드 목록과 각 스레드의 안 읽은 메시지 수를 조회합니다.
     */
    List<ChatThread> findChatThreadsByMemberId(@Param("memberId") Long memberId);
}