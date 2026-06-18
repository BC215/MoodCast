import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useGroupChatSocket } from "../../../hooks/useGroupChatSocket";
import {
  deleteGroupChatMessage,
  fetchGroupChatMessages,
  leaveGroupChatRoom,
  updateGroupChatRoomRead,
} from "../../../shared/api/groupChatApi";
import { serializeChatContent } from "../../../shared/lib/chatContent";
import {
  getLatestConfirmedMessageId,
  normalizeGroupMessage,
} from "../../../shared/lib/chatRoomModel";
import { GroupChatRoomDetail } from "../../GroupChat/components/GroupChatRoomDetail";

const API_BASE = import.meta.env.VITE_BACKSERVER || "/api";

export function GroupRoomOverlay({
  room,
  currentMember,
  onClose,
  onProfileClick,
  onRequestInvite,
  onRoomUpdated,
}) {
  const messageInputRef = useRef(null);
  const groupMessageTimeCacheRef = useRef(new Map());
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const lastSentReadMessageIdRef = useRef(0);
  const currentMemberId = Number(currentMember?.memberId) || null;
  const notifyRoomUpdated = () => {
    window.setTimeout(() => {
      onRoomUpdated?.();
    }, 150);
  };

  const syncRoomReadState = async (roomId, lastReadMessageId) => {
    if (!roomId || !currentMemberId) {
      return;
    }

    const numericLastReadMessageId = Number(lastReadMessageId);
    const hasMessageId = Number.isFinite(numericLastReadMessageId) && numericLastReadMessageId > 0;

    if (hasMessageId && lastSentReadMessageIdRef.current >= numericLastReadMessageId) {
      return;
    }

    if (hasMessageId) {
      lastSentReadMessageIdRef.current = numericLastReadMessageId;
    }

    const payload = hasMessageId
      ? {
          memberId: currentMemberId,
          lastReadMessageId: numericLastReadMessageId,
        }
      : {
          memberId: currentMemberId,
        };

    if (sendReadEvent(roomId, payload)) {
      notifyRoomUpdated();
      return;
    }

    try {
      await updateGroupChatRoomRead(roomId, payload);
      notifyRoomUpdated();
    } catch (error) {
      console.error("Group read sync failed", error);
    }
  };

  const loadMessages = async (roomId, shouldMarkRead = true) => {
    if (!roomId) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);

    try {
      const response = await fetchGroupChatMessages(roomId, currentMemberId);
      const normalizedMessages = Array.isArray(response.data)
        ? response.data.map((item) => normalizeGroupMessage(item, groupMessageTimeCacheRef.current))
        : [];

      setMessages(normalizedMessages);

      if (shouldMarkRead) {
        const lastMessageId = getLatestConfirmedMessageId(normalizedMessages);
        await syncRoomReadState(roomId, lastMessageId);
      }
    } catch (error) {
      console.error("Group messages load failed", error);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
      onRoomUpdated?.();
    }
  };

  useEffect(() => {
    lastSentReadMessageIdRef.current = 0;
    loadMessages(room?.roomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.roomId, currentMemberId]);

  useEffect(() => {
    if (!room?.roomId || !messages.length) {
      return;
    }

    const lastMessageId = getLatestConfirmedMessageId(messages);
    syncRoomReadState(room.roomId, lastMessageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, room?.roomId]);

  const handleIncomingMessage = (incomingMessage) => {
    if (incomingMessage?.eventType === "CHAT_DELETE") {
      const deletedMessageId = Number(incomingMessage?.messageId ?? incomingMessage?.id);

      setMessages((previousMessages) =>
        previousMessages.filter((item) => Number(item.messageId) !== deletedMessageId),
      );
      onRoomUpdated?.();
      return;
    }

    const normalized = normalizeGroupMessage(incomingMessage, groupMessageTimeCacheRef.current);

    setMessages((previousMessages) => {
      const pendingIndex = previousMessages.findIndex(
        (item) =>
          item.isPending &&
          Number(item.senderId) === Number(normalized.senderId) &&
          item.content === normalized.content,
      );

      if (pendingIndex >= 0) {
        const nextMessages = [...previousMessages];
        nextMessages[pendingIndex] = normalized;
        return nextMessages;
      }

      if (
        previousMessages.some(
          (item) => Number(item.messageId) === Number(normalized.messageId),
        )
      ) {
        return previousMessages;
      }

      return [...previousMessages, normalized];
    });

    if (currentMemberId && Number(normalized.senderId) !== currentMemberId) {
      syncRoomReadState(room?.roomId, normalized.messageId).catch(() => {});
    }

    onRoomUpdated?.();
  };

  const { connected, sendMessage, sendReadEvent } = useGroupChatSocket(
    currentMemberId,
    room?.roomId,
    handleIncomingMessage,
    async (payload) => {
      if (!payload || Number(payload.memberId) === Number(currentMemberId)) {
        return;
      }

      await loadMessages(room?.roomId, false);
    },
  );

  const handleSend = async (eventOrPayload = {}) => {
    if (typeof eventOrPayload?.preventDefault === "function") {
      eventOrPayload.preventDefault();
    }

    const payload =
      eventOrPayload && typeof eventOrPayload === "object" && typeof eventOrPayload.preventDefault !== "function"
        ? eventOrPayload
        : {};
    const trimmedMessage = typeof payload.text === "string" ? payload.text.trim() : "";
    const imageUrls = Array.isArray(payload.imageUrls) ? payload.imageUrls : [];

    if ((!trimmedMessage && imageUrls.length === 0) || !room?.roomId || !currentMemberId || isSending) {
      return;
    }

    setIsSending(true);

    try {
      const content = serializeChatContent({
        text: trimmedMessage,
        imageUrls,
      });

      if (!content) {
        return false;
      }

      const pendingMessage = normalizeGroupMessage({
        messageId: `pending-${Date.now()}`,
        roomId: room.roomId,
        senderId: currentMemberId,
        senderName: currentMember?.memberName || currentMember?.nickname || "나",
        profileImageUrl: currentMember?.profileImageUrl || "",
        content,
        createdAt: new Date().toISOString(),
        readCount: 0,
        unreadCount: 0,
        eventType: "",
        isPending: true,
      }, groupMessageTimeCacheRef.current);

      setMessages((previousMessages) => [...previousMessages, pendingMessage]);

      const published = sendMessage(room.roomId, {
        senderId: currentMemberId,
        content,
      });

      if (!published) {
        const response = await axios.post(`${API_BASE}/api/chat/rooms/${room.roomId}/messages`, {
          senderId: currentMemberId,
          content,
        });

        const savedMessage = normalizeGroupMessage(response.data, groupMessageTimeCacheRef.current);
        setMessages((previousMessages) => {
            const pendingIndex = previousMessages.findIndex(
              (item) =>
                item.isPending &&
                Number(item.senderId) === Number(savedMessage.senderId) &&
                item.rawContent === savedMessage.rawContent,
            );

          if (pendingIndex >= 0) {
            const nextMessages = [...previousMessages];
            nextMessages[pendingIndex] = savedMessage;
            return nextMessages;
          }

          return [...previousMessages, savedMessage];
        });
      }

      const lastMessageId = getLatestConfirmedMessageId(messages);
      await syncRoomReadState(room.roomId, lastMessageId);

      onRoomUpdated?.();
      return true;
    } catch (error) {
      console.error("Group message send failed", error);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (item) => {
    if (!room?.roomId || !currentMemberId || !item?.messageId) {
      return;
    }

    try {
      await deleteGroupChatMessage(room.roomId, item.messageId, currentMemberId);
      setMessages((previousMessages) =>
        previousMessages.filter(
          (messageItem) => Number(messageItem.messageId) !== Number(item.messageId),
        ),
      );
    } catch (error) {
      console.error("Group message delete failed", error);
    }
  };

  const handleLeave = async () => {
    if (!room?.roomId || !currentMemberId) {
      return;
    }

    onClose?.();

    try {
      await leaveGroupChatRoom(room.roomId, currentMemberId);
    } catch (error) {
      console.error("Group room leave failed", error);
    } finally {
      onRoomUpdated?.();
    }
  };

  const activeRoom = useMemo(
    () => ({
      roomId: room?.roomId,
      roomName: room?.roomName || "Group Chat",
      roomDescription: room?.roomDescription || "",
      memberCount: room?.memberCount || 0,
      currentMemberId,
    }),
    [room, currentMemberId],
  );

  if (!room) {
    return null;
  }

  return (
    <>
      <GroupChatRoomDetail
        activeRoom={activeRoom}
        messages={messages}
        connected={connected}
        currentMemberId={currentMemberId}
        onSubmitMessage={handleSend}
        onDeleteMessage={handleDeleteMessage}
        onLeaveRoom={handleLeave}
        onInviteMembers={() => onRequestInvite?.(room)}
        onProfileClick={onProfileClick}
        onBack={onClose}
      />
      {isLoadingMessages ? <p className="moodchat-overlayStatus">메시지를 불러오는 중...</p> : null}
    </>
  );
}
