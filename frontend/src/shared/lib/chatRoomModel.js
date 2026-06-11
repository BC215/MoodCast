import { formatKoreanTime } from "./dateTime";
import { parseChatContent } from "./chatContent";

export const DIRECT_LEAVE_PREFIX = "__MOODCAST_DIRECT_LEAVE__::";

export function normalizeDirectIncomingMessage(message, currentUserId, timeCache) {
  const senderId = Number(message?.senderId);
  const parsedContent = parseChatContent(message?.content ?? "");
  const isSystemMessage =
    message?.eventType === "CHAT_SYSTEM" ||
    message?.eventType === "CHAT_ROOM_LEFT" ||
    (typeof message?.content === "string" && message.content.startsWith(DIRECT_LEAVE_PREFIX));
  const messageKey =
    message?.chatId ??
    message?.id ??
    `${senderId}-${message?.createdAt ?? Date.now()}`;
  const cachedTime = timeCache?.get?.(messageKey);
  const computedTime = message?.time || formatKoreanTime(message?.createdAt) || "";
  const displayTime = cachedTime || computedTime;

  if (timeCache && displayTime && !cachedTime) {
    timeCache.set(messageKey, displayTime);
  }

  return {
    id: messageKey,
    sender: senderId === currentUserId ? "me" : "them",
    text: parsedContent.text || message?.text || "",
    imageUrls: parsedContent.imageUrls,
    rawContent: message?.content ?? "",
    time: displayTime,
    senderId,
    receiverId: Number(message?.receiverId),
    createdAt: message?.createdAt ?? "",
    isRead: message?.isRead ?? 0,
    eventType: message?.eventType ?? "CHAT_MESSAGE",
    isSystem: isSystemMessage,
  };
}

export function normalizeGroupMessage(message, timeCache) {
  const messageKey = message?.messageId ?? message?.id;
  const parsedContent = parseChatContent(message?.content ?? "");
  const cachedTime = timeCache?.get?.(messageKey);
  const computedTime = message?.time || (message?.createdAt ? formatKoreanTime(message.createdAt) : "");
  const time = cachedTime || computedTime;

  if (timeCache && time && !cachedTime) {
    timeCache.set(messageKey, time);
  }

  return {
    messageId: message?.messageId ?? message?.id,
    roomId: message?.roomId,
    senderId: Number(message?.senderId),
    senderName: message?.senderName || "회원",
    profileImageUrl: message?.profileImageUrl || "",
    content: parsedContent.text || message?.content || "",
    imageUrls: parsedContent.imageUrls,
    rawContent: message?.content || "",
    time,
    createdAt: message?.createdAt || "",
    readCount: Number(message?.readCount || 0),
    unreadCount: Number(message?.unreadCount || 0),
    eventType: message?.eventType || "",
    isPending: Boolean(message?.isPending),
  };
}

export function getMemberDisplayName(member) {
  return (
    member?.nickname ||
    member?.name ||
    member?.memberName ||
    member?.displayName ||
    member?.userName ||
    member?.username ||
    (member?.email ? String(member.email).split("@")[0] : "") ||
    `회원 ${member?.memberId}`
  );
}

export function buildRoomName(selectedMembers) {
  const names = selectedMembers.map(getMemberDisplayName).filter(Boolean);

  if (names.length === 0) {
    return "새 채팅방";
  }

  if (names.length === 1) {
    return `${names[0]} 님과의 채팅`;
  }

  return `${names[0]} 외 ${names.length - 1}명`;
}

export function buildDirectThread(memberItem) {
  return {
    roomType: "direct",
    roomId: null,
    threadKey: `direct-${memberItem?.memberId}`,
    partnerMemberId: memberItem?.memberId,
    partnerName:
      memberItem?.name ||
      memberItem?.nickname ||
      memberItem?.memberName ||
      memberItem?.displayName ||
      memberItem?.userName ||
      memberItem?.username ||
      "",
    partnerNickname:
      memberItem?.nickname ||
      memberItem?.name ||
      memberItem?.memberName ||
      memberItem?.displayName ||
      memberItem?.userName ||
      memberItem?.username ||
      "",
    partnerProfileImageUrl: memberItem?.profileImageUrl || "",
    roomName:
      memberItem?.nickname ||
      memberItem?.name ||
      memberItem?.memberName ||
      memberItem?.displayName ||
      memberItem?.userName ||
      memberItem?.username ||
      "",
    roomDescription: "",
    lastMessage: "",
    lastMessageAt: "",
    unreadCount: 0,
    memberCount: 2,
  };
}

export function normalizeDirectThread(thread) {
  return {
    roomType: "direct",
    roomId: null,
    threadKey: `direct-${thread?.partnerMemberId}`,
    partnerMemberId: thread?.partnerMemberId,
    partnerName:
      thread?.partnerName ||
      thread?.partnerNickname ||
      thread?.memberName ||
      thread?.displayName ||
      thread?.userName ||
      thread?.username ||
      "",
    partnerNickname:
      thread?.partnerNickname ||
      thread?.partnerName ||
      thread?.memberName ||
      thread?.displayName ||
      thread?.userName ||
      thread?.username ||
      "",
    partnerProfileImageUrl: thread?.partnerProfileImageUrl || "",
    roomName:
      thread?.partnerNickname ||
      thread?.partnerName ||
      thread?.memberName ||
      thread?.displayName ||
      thread?.userName ||
      thread?.username ||
      "",
    roomDescription: "",
    lastMessage: thread?.lastMessage || "",
    lastMessageAt: thread?.lastMessageAt || "",
    unreadCount: Number(thread?.unreadCount || 0),
    memberCount: 2,
  };
}

export function normalizeGroupThread(thread) {
  return {
    roomType: "group",
    roomId: thread?.roomId,
    threadKey: `group-${thread?.roomId}`,
    roomName: thread?.roomName || "그룹 채팅방",
    roomDescription: thread?.roomDescription || "",
    lastMessage: thread?.lastMessage || "",
    lastMessageAt: thread?.lastMessageAt || "",
    unreadCount: Number(thread?.unreadCount || 0),
    memberCount: Number(thread?.memberCount || 0),
    createdBy: thread?.createdBy,
  };
}

export function getGroupThreadDisplayName(thread) {
  const roomName = String(thread?.roomName || "").trim();
  const memberCount = Number(thread?.memberCount || 0);
  const baseName = roomName
    .replace(/\s*님의?\s*채팅$/, "")
    .replace(/\s*님과의\s*채팅$/, "")
    .replace(/\s외\s\d+명$/, "")
    .trim();

  if (!roomName) {
    return "그룹 채팅방";
  }

  if (memberCount <= 1) {
    return baseName || roomName;
  }

  return `${baseName || roomName} 외 ${memberCount - 1}명`;
}

export function getThreadSortValue(thread) {
  const rawValue = thread?.lastMessageAt || thread?.createdAt || "";
  if (!rawValue) {
    return 0;
  }

  const parsedValue = Date.parse(String(rawValue).replace(" ", "T"));
  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

export function normalizeGroupRoom(room) {
  return {
    roomId: room?.roomId,
    roomName: room?.roomName || "Group Chat",
    roomDescription: room?.roomDescription || "",
    createdBy: room?.createdBy,
    createdAt: room?.createdAt,
    memberCount: Number(room?.memberCount || 0),
    lastMessage: room?.lastMessage || "",
    lastMessageAt: room?.lastMessageAt || "",
    unreadCount: Number(room?.unreadCount || 0),
  };
}

export function getLatestConfirmedMessageId(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const messageId = Number(messages[index]?.messageId);
    if (Number.isFinite(messageId) && messageId > 0) {
      return messageId;
    }
  }

  return null;
}

