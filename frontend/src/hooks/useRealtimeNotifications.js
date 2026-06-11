import { Client } from '@stomp/stompjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { websocketBaseUrl } from '../shared/lib/websocketUrl';

function getNotificationStorageKey(memberId) {
  return memberId ? `moodcast-notifications-${memberId}` : null;
}

function normalizeStoredNotification(notification) {
  if (!notification || typeof notification !== 'object') {
    return null;
  }

  return {
    ...notification,
    count: Number(notification.count || 1),
  };
}

function readStoredNotifications(memberId) {
  if (!memberId || typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getNotificationStorageKey(memberId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeStoredNotification).filter(Boolean) : [];
  } catch (error) {
    return [];
  }
}

function upsertNotification(previousNotifications, payload, notificationId) {
  const isChatNotification = payload?.eventType === 'CHAT_NOTIFICATION';
  const nextItem = {
    id: notificationId,
    ...payload,
    count: Number(payload?.count || 1),
  };

  if (!isChatNotification) {
    return [nextItem, ...previousNotifications.filter((item) => item.id !== notificationId)];
  }

  const senderId = Number(payload?.senderId || 0);
  const existingIndex = previousNotifications.findIndex(
    (item) =>
      item?.eventType === 'CHAT_NOTIFICATION' &&
      Number(item?.senderId || 0) === senderId,
  );

  if (existingIndex < 0) {
    return [nextItem, ...previousNotifications.filter((item) => item.id !== notificationId)];
  }

  const existingItem = previousNotifications[existingIndex];
  const mergedItem = {
    ...existingItem,
    ...payload,
    id: existingItem.id,
    count: Number(existingItem.count || 1) + 1,
  };

  const nextNotifications = previousNotifications.filter((_, index) => index !== existingIndex);
  return [mergedItem, ...nextNotifications.filter((item) => item.id !== notificationId)];
}

export function useRealtimeNotifications(memberId) {
  const clientRef = useRef(null);
  const [notifications, setNotifications] = useState(() => readStoredNotifications(memberId));

  useEffect(() => {
    if (!memberId) {
      setNotifications([]);
      return undefined;
    }

    setNotifications(readStoredNotifications(memberId));
    return undefined;
  }, [memberId]);

  useEffect(() => {
    if (!memberId || typeof window === 'undefined') {
      return undefined;
    }

    const storageKey = getNotificationStorageKey(memberId);
    window.localStorage.setItem(storageKey, JSON.stringify(notifications.slice(0, 5)));
    return undefined;
  }, [memberId, notifications]);

  useEffect(() => {
    if (!memberId) {
      setNotifications([]);
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
      client.subscribe(`/sub/notifications/${memberId}`, (frame) => {
        try {
          const payload = JSON.parse(frame.body);
          if (!['CHAT_NOTIFICATION', 'COMMENT_NOTIFICATION', 'MENTION'].includes(payload?.eventType)) {
            return;
          }

          const notificationId =
            payload?.notificationId ||
            `${payload.eventType || 'notification'}-${payload.chatId || payload.commentId || Date.now()}`;

          setNotifications((prevNotifications) => {
            const normalizedNotifications = prevNotifications
              .map(normalizeStoredNotification)
              .filter(Boolean);

            const nextNotifications = upsertNotification(
              normalizedNotifications,
              payload,
              notificationId,
            );

            return nextNotifications.slice(0, 5);
          });
        } catch (error) {
          console.error('알림 메시지 수신 실패', error);
        }
      });
    };

    client.onWebSocketClose = () => {
      clientRef.current = null;
    };

    client.onStompError = (frame) => {
      console.error('알림 STOMP 오류', frame.headers?.message || frame.body);
    };

    client.activate();
    clientRef.current = client;

    return () => {
      clientRef.current = null;
      client.deactivate();
    };
  }, [memberId]);

  const unreadCount = useMemo(() => notifications.length, [notifications]);

  const removeNotification = (notificationId) => {
    setNotifications((prevNotifications) => {
      const nextNotifications = prevNotifications
        .map(normalizeStoredNotification)
        .filter(Boolean)
        .filter((item) => item.id !== notificationId);

      if (memberId && typeof window !== 'undefined') {
        window.localStorage.setItem(
          getNotificationStorageKey(memberId),
          JSON.stringify(nextNotifications.slice(0, 5)),
        );
      }

      return nextNotifications;
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
    if (memberId && typeof window !== 'undefined') {
      window.localStorage.removeItem(getNotificationStorageKey(memberId));
    }
  };

  return {
    notifications,
    unreadCount,
    removeNotification,
    clearNotifications,
  };
}
