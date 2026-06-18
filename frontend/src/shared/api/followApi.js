import { normalizeMentionCandidate } from "../lib/mentionUtils";
import { apiClient } from "./client";

export async function fetchMentionCandidates(memberId, keyword = "") {
  if (!memberId) {
    return [];
  }
  const params = new URLSearchParams();
  params.set("memberId", String(memberId));
  if (keyword?.trim()) {
    params.set("keyword", keyword.trim());
  }

  try {
    // apiClient의 baseURL에 '/api'가 포함되어 있으므로, 여기서는 '/api'를 제거합니다.
    // Authorization 헤더는 apiClient의 인터셉터가 자동으로 처리합니다.
    const response = await apiClient.get(`/follows/mention-candidates`, {
      params,
    });
    return Array.isArray(response.data)
      ? response.data.map(normalizeMentionCandidate)
      : [];
  } catch (error) {
    console.error("멘션 후보 조회 실패:", error);
    throw error;
  }
}
