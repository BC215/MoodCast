import { createClient } from "@supabase/supabase-js";

// Vite는 VITE_ 접두사가 붙은 환경 변수만 클라이언트 측 코드에 노출합니다.
// 따라서 .env 파일에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 설정해야 합니다.
// 백엔드에서 사용하는 SERVICE_ROLE_KEY는 보안상 프론트엔드에 노출해서는 안 됩니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // 프론트엔드에서는 일반적으로 ANON_KEY를 사용합니다.

if (!supabaseUrl || !supabaseKey) {
  // 개발 환경에서 환경 변수가 설정되지 않았을 경우 경고 또는 오류를 발생시킵니다.
  // Vercel과 같은 배포 환경에서는 빌드 시점에 환경 변수가 주입됩니다.
  console.error(
    "Supabase URL 또는 Key가 .env 파일에 설정되지 않았습니다. VITE_SUPABASE_URL 및 VITE_SUPABASE_ANON_KEY를 확인하세요.",
  );
  // throw new Error('Supabase URL 또는 Key가 .env 파일에 설정되지 않았습니다.'); // 빌드 실패를 원치 않으면 주석 처리
}

// 전역에서 사용할 수파베이스 인스턴스 생성
export const supabase = createClient(supabaseUrl, supabaseKey);
