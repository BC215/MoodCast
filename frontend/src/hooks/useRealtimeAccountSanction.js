import { Client } from '@stomp/stompjs';
import { useEffect, useRef } from 'react';
import { logoutAndRedirect } from '../stores/useAuthStore';
import { websocketBaseUrl } from '../shared/lib/websocketUrl';

export function useRealtimeAccountSanction(memberId) {
  const clientRef = useRef(null);
  const suspendHandledRef = useRef(false);

  useEffect(() => {
    suspendHandledRef.current = false;
  }, [memberId]);

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
      client.subscribe(`/sub/notifications/${memberId}`, (frame) => {
        try {
          const payload = JSON.parse(frame.body);

          if (payload?.eventType !== 'ACCOUNT_SANCTION') {
            return;
          }

          if (payload?.sanctionType === 'WARNING') {
            window.alert(payload.message || '관리자로부터 경고를 받았습니다.');
            return;
          }

          if (payload?.sanctionType === 'SUSPENDED' && !suspendHandledRef.current) {
            suspendHandledRef.current = true;
            window.alert(payload.message || '계정이 정지되어 로그아웃됩니다.');
            logoutAndRedirect();
          }
        } catch (error) {
          console.error('계정 제재 알림 수신 실패', error);
        }
      });
    };

    client.onWebSocketClose = () => {
      clientRef.current = null;
    };

    client.onStompError = (frame) => {
      console.error('계정 제재 STOMP 오류', frame.headers?.message || frame.body);
    };

    client.activate();
    clientRef.current = client;

    return () => {
      clientRef.current = null;
      client.deactivate();
    };
  }, [memberId]);
}
