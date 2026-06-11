import { useEffect, useState } from 'react';

export function useViewportWidth() {
  // 현재 브라우저 창 너비를 상태로 관리합니다.
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 0 : window.innerWidth));

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}

export function useIsDesktop() {
  // 화면 너비가 1024픽셀 이상이면 데스크톱 레이아웃으로 간주합니다.
  return useViewportWidth() >= 1024;
}
