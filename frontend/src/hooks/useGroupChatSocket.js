import { Client } from '@stomp/stompjs';
import { useEffect, useRef, useState } from 'react';
import { groupChatWebsocketBaseUrl } from '../shared/lib/websocketUrl';

function parseMessage(frameBody) {
  try {
    return JSON.parse(frameBody);
  } catch (error) {
    console.error('그룹 채팅 메시지 파싱 실패', error);
    return null;
  }
}

export function useGroupChatSocket(memberId, activeRoomId, onMessage, onRead) {
  const clientRef = useRef(null);
  const messageSubscriptionRef = useRef(null);
  const readSubscriptionRef = useRef(null);
  const activeRoomIdRef = useRef(activeRoomId);
  const onMessageRef = useRef(onMessage);
  const onReadRef = useRef(onRead);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);

  const clearSubscriptions = () => {
    if (messageSubscriptionRef.current) {
      messageSubscriptionRef.current.unsubscribe();
      messageSubscriptionRef.current = null;
    }

    if (readSubscriptionRef.current) {
      readSubscriptionRef.current.unsubscribe();
      readSubscriptionRef.current = null;
    }
  };

  const subscribeRoomTopics = (client, roomId) => {
    if (!roomId) {
      return;
    }

    clearSubscriptions();

    messageSubscriptionRef.current = client.subscribe(
      `/topic/chat/rooms/${roomId}`,
      (frame) => {
        const payload = parseMessage(frame.body);
        if (payload) {
          onMessageRef.current?.(payload);
        }
      },
    );

    readSubscriptionRef.current = client.subscribe(
      `/topic/chat/rooms/${roomId}/read`,
      (frame) => {
        const payload = parseMessage(frame.body);
        if (payload) {
          onReadRef.current?.(payload);
        }
      },
    );
  };

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;

    if (!clientRef.current?.connected) {
      return;
    }

    subscribeRoomTopics(clientRef.current, activeRoomId);
  }, [activeRoomId]);

  useEffect(() => {
    if (!memberId) {
      setConnected(false);
      return undefined;
    }

    const client = new Client({
      brokerURL: groupChatWebsocketBaseUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},
    });

    client.onConnect = () => {
      setConnected(true);
      subscribeRoomTopics(client, activeRoomIdRef.current);
    };

    client.onWebSocketClose = () => {
      setConnected(false);
    };

    client.onStompError = (frame) => {
      console.error('그룹 채팅 STOMP 오류', frame.headers?.message || frame.body);
    };

    client.activate();
    clientRef.current = client;

    return () => {
      setConnected(false);
      clearSubscriptions();
      clientRef.current = null;
      client.deactivate();
    };
  }, [memberId]);

  const sendMessage = (roomId, payload) => {
    if (!clientRef.current || !clientRef.current.connected || !roomId) {
      return false;
    }

    clientRef.current.publish({
      destination: `/app/chat/rooms/${roomId}/send`,
      body: JSON.stringify(payload),
    });

    return true;
  };

  const sendReadEvent = (roomId, payload) => {
    if (!clientRef.current || !clientRef.current.connected || !roomId) {
      return false;
    }

    clientRef.current.publish({
      destination: `/app/chat/rooms/${roomId}/read`,
      body: JSON.stringify(payload),
    });

    return true;
  };

  return {
    connected,
    sendMessage,
    sendReadEvent,
  };
}
