import axios from 'axios';

const API_BASE = import.meta.env.VITE_BACKSERVER || 'http://localhost:8080';

function mergeUniqueMembers(listA, listB) {
  const memberMap = new Map();

  [...listA, ...listB].forEach((item) => {
    const memberId = Number(item?.memberId);
    if (!Number.isFinite(memberId) || memberId <= 0 || memberMap.has(memberId)) {
      return;
    }

    memberMap.set(memberId, {
      memberId,
      name: item?.name || item?.nickname || item?.memberName || item?.displayName || item?.userName || item?.username || '',
      nickname:
        item?.nickname ||
        item?.name ||
        item?.memberName ||
        item?.displayName ||
        item?.userName ||
        item?.username ||
        '',
      memberName:
        item?.memberName ||
        item?.displayName ||
        item?.userName ||
        item?.username ||
        item?.name ||
        item?.nickname ||
        '',
      email: item?.email || '',
      profileImageUrl: item?.profileImageUrl || '',
    });
  });

  return [...memberMap.values()];
}

export async function fetchChatInviteCandidates(memberId, token) {
  if (!memberId) {
    return [];
  }

  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  const [followersResult, followingResult] = await Promise.all([
    axios.get(`${API_BASE}/auth/follow/followers/${memberId}`, config),
    axios.get(`${API_BASE}/auth/follow/following/${memberId}`, config),
  ]);

  const followers = Array.isArray(followersResult.data) ? followersResult.data : [];
  const following = Array.isArray(followingResult.data) ? followingResult.data : [];

  return mergeUniqueMembers(followers, following);
}
