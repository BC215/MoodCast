import { Client } from '@stomp/stompjs';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { websocketBaseUrl } from '../shared/lib/websocketUrl';

const API_BASE = import.meta.env.VITE_BACKSERVER || '/api';
export const CHAT_UNREAD_CHANGED_EVENT = 'moodchat:unread-changed';

function sumUnreadCount(threads) {
  if (!Array.isArray(threads)) {
    return 0;
  }

  return threads.reduce((total, thread) => total + Number(thread.unreadCount || 0), 0);
}

export function notifyChatUnreadChanged() {
  window.dispatchEvent(new Event(CHAT_UNREAD_CHANGED_EVENT));
}

export function useUnreadChatCount(memberId) {
  const clientRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!memberId) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE}/chat/threads`, {
        params: { memberId },
      });
      setUnreadCount(sumUnreadCount(response.data));
    } catch (error) {
      console.error('안읽은 채팅 조회 실패', error);
    }
  }, [memberId]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!memberId) {
      setUnreadCount(0);
      return undefined;
    }

    const handleUnreadChanged = () => {
      refreshUnreadCount();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshUnreadCount();
      }
    };

    window.addEventListener(CHAT_UNREAD_CHANGED_EVENT, handleUnreadChanged);
    window.addEventListener('focus', handleUnreadChanged);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener(CHAT_UNREAD_CHANGED_EVENT, handleUnreadChanged);
      window.removeEventListener('focus', handleUnreadChanged);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [memberId, refreshUnreadCount]);

  useEffect(() => {
    if (!memberId) {
      return undefined;
    }

    const client = new Client({
      brokerURL: websocketBaseUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},
    });

    client.onConnect = () => {
      client.subscribe(`/sub/notifications/${memberId}`, () => {
        refreshUnreadCount();
      });
    };

    client.onWebSocketClose = () => {
      clientRef.current = null;
    };

    client.onStompError = (frame) => {
      console.error('채팅 뱃지 STOMP 오류', frame.headers?.message || frame.body);
    };

    client.activate();
    clientRef.current = client;

    return () => {
      clientRef.current = null;
      client.deactivate();
    };
  }, [memberId, refreshUnreadCount]);

  return unreadCount;
}
