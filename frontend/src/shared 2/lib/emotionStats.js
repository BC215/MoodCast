import { EMOTIONS } from '../config/emotions';

export function buildEmotionStats(posts = []) {
  const counts = new Map(EMOTIONS.map((emotion) => [emotion.id, 0]));

  for (const post of posts) {
    const emotionId = Number(post?.emotionId);
    if (!counts.has(emotionId)) continue;
    counts.set(emotionId, (counts.get(emotionId) || 0) + 1);
  }

  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);

  return EMOTIONS.map((emotion) => {
    const count = counts.get(emotion.id) || 0;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;

    return {
      ...emotion,
      count,
      percent,
    };
  });
}

export const EMOTION_RANGE_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'day', label: '일간' },
  { value: 'week', label: '주간' },
  { value: 'month', label: '월간' },
];

function getPostCreatedAt(post) {
  const value = post?.createdAt ?? post?.created_at;
  const createdAt = value ? new Date(value) : null;
  return createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null;
}

export function filterPostsByRange(posts = [], range = 'all', now = new Date()) {
  if (range === 'all') {
    return posts;
  }

  const durationMap = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  };

  const threshold = now.getTime() - (durationMap[range] ?? 0);
  return posts.filter((post) => {
    const createdAt = getPostCreatedAt(post);
    return createdAt ? createdAt.getTime() >= threshold : false;
  });
}
