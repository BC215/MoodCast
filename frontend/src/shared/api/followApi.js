import { normalizeMentionCandidate } from '../lib/mentionUtils';

const API_BASE = import.meta.env.VITE_BACKSERVER || 'http://localhost:8080';

export async function fetchMentionCandidates(memberId, keyword = '') {
  if (!memberId) {
    return [];
  }

  const params = new URLSearchParams();
  params.set('memberId', String(memberId));
  if (keyword && keyword.trim()) {
    params.set('keyword', keyword.trim());
  }

  const response = await fetch(`${API_BASE}/api/follows/mention-candidates?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`멘션 후보 조회 실패: ${response.status}`);
  }

  const data = await response.json();
  const normalized = Array.isArray(data) ? data.map(normalizeMentionCandidate) : [];
  return normalized;
}
