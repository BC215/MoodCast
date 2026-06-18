import axios from "axios";

const API_BASE = import.meta.env.VITE_BACKSERVER || "/api";

async function requestWithFallback(primaryRequest, fallbackRequest) {
  try {
    return await primaryRequest();
  } catch (primaryError) {
    if (typeof fallbackRequest !== "function") {
      throw primaryError;
    }

    return fallbackRequest(primaryError);
  }
}

export function fetchGroupChatRooms(memberId) {
  return requestWithFallback(
    () =>
      axios.get(`${API_BASE}/api/chat/rooms`, {
        params: { memberId },
      }),
    () =>
      axios.get(`${API_BASE}/chat/rooms/member/${memberId}`),
  ).catch(() => ({ data: [] }));
}

export function fetchGroupChatMessages(roomId, memberId) {
  return requestWithFallback(
    () =>
      axios.get(`${API_BASE}/api/chat/rooms/${roomId}/messages`, {
        params: memberId ? { memberId } : undefined,
      }),
    () =>
      axios.get(`${API_BASE}/chat/rooms/${roomId}/messages`, {
        params: memberId ? { memberId } : undefined,
      }),
  ).catch(() => ({ data: [] }));
}

export function createGroupChatRoom(payload) {
  return requestWithFallback(
    () => axios.post(`${API_BASE}/api/chat/rooms`, payload),
    () => axios.post(`${API_BASE}/chat/rooms`, payload),
  );
}

export function inviteGroupChatMembers(roomId, payload) {
  return requestWithFallback(
    () => axios.post(`${API_BASE}/api/chat/rooms/${roomId}/members`, payload),
    () => axios.post(`${API_BASE}/chat/rooms/${roomId}/members`, payload),
  );
}

export function fetchGroupChatMembers(roomId) {
  return requestWithFallback(
    () => axios.get(`${API_BASE}/api/chat/rooms/${roomId}/members`),
    () => axios.get(`${API_BASE}/chat/rooms/${roomId}/members`),
  ).catch(() => ({ data: [] }));
}

export function leaveGroupChatRoom(roomId, memberId) {
  return requestWithFallback(
    () =>
      axios.delete(`${API_BASE}/api/chat/rooms/${roomId}/leave`, {
        params: { memberId },
      }),
    () =>
      axios.delete(`${API_BASE}/chat/rooms/${roomId}/members/${memberId}`),
  );
}

export function hideGroupChatRoom(roomId, memberId) {
  return requestWithFallback(
    () =>
      axios.delete(`${API_BASE}/api/chat/rooms/${roomId}/hide`, {
        params: { memberId },
      }),
    () =>
      axios.delete(`${API_BASE}/chat/rooms/${roomId}/members/${memberId}`),
  );
}

export function markGroupChatRoomAsRead(roomId, memberId) {
  return requestWithFallback(
    () =>
      axios.post(`${API_BASE}/api/chat/rooms/${roomId}/read`, null, {
        params: memberId ? { memberId } : undefined,
      }),
    () =>
      axios.post(`${API_BASE}/chat/rooms/${roomId}/read`, null, {
        params: memberId ? { memberId } : undefined,
      }),
  ).catch(() => ({}));
}

export function updateGroupChatRoomRead(roomId, payload) {
  return requestWithFallback(
    () => axios.patch(`${API_BASE}/api/chat/rooms/${roomId}/read`, payload),
    () => axios.patch(`${API_BASE}/chat/rooms/${roomId}/read`, payload),
  ).catch(() => ({}));
}

export function deleteGroupChatMessage(roomId, messageId, memberId) {
  return requestWithFallback(
    () =>
      axios.delete(`${API_BASE}/api/chat/rooms/${roomId}/messages/${messageId}`, {
        params: { memberId },
      }),
    () =>
      axios.delete(`${API_BASE}/chat/rooms/${roomId}/messages/${messageId}`, {
        params: { memberId },
      }),
  );
}
