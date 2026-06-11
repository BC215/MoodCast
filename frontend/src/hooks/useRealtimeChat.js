import { Client } from '@stomp/stompjs';
import { useEffect, useRef, useState } from 'react';
import { websocketBaseUrl } from '../shared/lib/websocketUrl';

export function useRealtimeChat(memberId, onMessage) {
  const clientRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!memberId) {
      setConnected(false);
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
      setConnected(true);
      client.subscribe(`/sub/chat/${memberId}`, (frame) => {
        try {
          const payload = JSON.parse(frame.body);
          onMessageRef.current?.(payload);
        } catch (error) {
          console.error('채팅 메시지 파싱 실패', error);
        }
      });
    };

    client.onWebSocketClose = () => {
      setConnected(false);
    };

    client.onStompError = (frame) => {
      console.error('STOMP 오류', frame.headers?.message || frame.body);
    };

    client.activate();
    clientRef.current = client;

    return () => {
      setConnected(false);
      clientRef.current = null;
      client.deactivate();
    };
  }, [memberId]);

  const sendMessage = (payload) => {
    if (!clientRef.current || !clientRef.current.connected) {
      return false;
    }

    clientRef.current.publish({
      destination: '/pub/chat/send',
      body: JSON.stringify(payload),
    });

    return true;
  };

  return {
    connected,
    sendMessage,
  };
}
