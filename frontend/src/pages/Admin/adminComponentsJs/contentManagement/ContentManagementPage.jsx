import { AdminLayout } from "../common/AdminLayout";
import { ContentPostManagement } from "./ContentPostManagement";

/* ==========================================================================
 * 콘텐츠 관리 페이지
 * --------------------------------------------------------------------------
 * 관리자 콘텐츠 관리의 최상위 페이지입니다.
 *
 * 초보자 설명:
 * - 이 파일은 관리자 공통 레이아웃과 실제 게시글 관리 컴포넌트를 연결합니다.
 * - 게시글 조회, 검색, 필터, 다중 처리 기능은 ContentPostManagement가 담당합니다.
 * ========================================================================== */
export function ContentManagementPage() {
  return (
    <AdminLayout
      title="콘텐츠 관리"
      description="게시글 상태를 확인하고 숨김, 삭제, 복구 처리를 관리하세요."
    >
      <ContentPostManagement />
    </AdminLayout>
  );
}
