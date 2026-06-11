export const feedPosts = [
  {
    id: 1,
    author: 'Sarah Kim',
    avatar: 'S',
    imageSrc: '/MoodCast-logo.svg',
    imageAlt: 'MoodCast logo example',
    time: '2시간 전',
    text: '오늘 저녁 하늘이 정말 아름다웠어요! 🌇',
    tone: 'sunset',
    likes: 234,
    comments: 45,
    vibes: 18,
    attachments: [
      { id: 'a1', name: 'project-plan.pdf', type: '문서' },
      { id: 'a2', name: 'behind-the-scenes.mov', type: '영상' },
    ],
    previewComment: { author: 'Juno', time: '1분 전', text: '이 하늘 색감 정말 좋아요.' },
    commentsList: [{ id: 1, author: 'Juno', time: '1분 전', text: '이 하늘 색감 정말 좋아요.' }],
  },
  {
    id: 2,
    author: 'John Park',
    avatar: 'J',
    imageSrc: '/MoodCast-logo.svg',
    imageAlt: 'MoodCast logo example',
    time: '5시간 전',
    text: '새로운 프로젝트 시작! 함께 응원해주세요 💪',
    tone: 'coffee',
    likes: 156,
    comments: 28,
    vibes: 12,
    previewComment: { author: 'Haru', time: '5분 전', text: '커피 사진만 봐도 기분이 좋아져요.' },
    commentsList: [{ id: 1, author: 'Haru', time: '5분 전', text: '커피 사진만 봐도 기분이 좋아져요.' }],
  },
];

export const savedPosts = [
  { id: 1, tag: '#감성', title: '오늘의 기록', detail: '감성적인 문장과 사진을 저장해두는 카드입니다.' },
  { id: 2, tag: '#일상', title: '일상 메모', detail: '다음에 다시 보고 싶은 일상 스냅샷입니다.' },
];

export const moodStats = [
  { name: 'Happy', percent: 42, color: '#2f7efb' },
  { name: 'Calm', percent: 27, color: '#7c3aed' },
  { name: 'Excited', percent: 18, color: '#ff2f8f' },
  { name: 'Sad', percent: 13, color: '#2f7efb' },
  { name: 'Anxious', percent: 9, color: '#9ca3af' },
];

export const trendingTags = [
  { name: '#MoodCast', count: '12.5K 게시물' },
  { name: '#일상', count: '8.2K 게시물' },
  { name: '#여행', count: '5.7K 게시물' },
  { name: '#사진', count: '4.3K 게시물' },
  { name: '#맛집', count: '3.1K 게시물' },
];

export const searchUsers = [
  { name: 'Sarah Kim', handle: '@sarahkim' },
  { name: 'John Park', handle: '@johnpark' },
  { name: 'Mina Lee', handle: '@minalee' },
];

export const chatThreads = [
  { id: 1, name: 'Sarah Kim', preview: '오늘 저녁 하늘 사진 정말 좋았어요.', time: '2분 전', unread: 3 },
  { id: 2, name: 'John Park', preview: '새 프로젝트는 잘 진행되고 있나요?', time: '15분 전', unread: 0 },
  { id: 3, name: 'Emma Lee', preview: '카페 추천 리스트를 보내드렸어요.', time: '1시간 전', unread: 0 },
];

export const chatMessages = {
  1: [
    { id: 1, sender: 'them', text: '오늘 저녁 하늘 사진 정말 좋았어요.', time: '2:15 PM' },
    { id: 2, sender: 'me', text: '감사해요. 분위기가 너무 좋아서 바로 찍었어요.', time: '2:16 PM' },
  ],
  2: [
    { id: 1, sender: 'them', text: '새 프로젝트는 잘 진행되고 있나요?', time: '10:10 AM' },
    { id: 2, sender: 'me', text: '조금씩 정리 중이에요. 곧 공유할게요.', time: '10:12 AM' },
  ],
  3: [
    { id: 1, sender: 'them', text: '카페 추천 리스트를 보내드렸어요.', time: '어제' },
    { id: 2, sender: 'me', text: '덕분에 주말 일정이 즐거워졌어요.', time: '어제' },
  ],
};

export const profileStats = [
  { label: '게시물', value: '128' },
  { label: '저장됨', value: '42' },
  { label: '팔로워', value: '310' },
  { label: '팔로잉', value: '180' },
];

export const profileHighlights = [
  { label: '감정 공감률', value: '72%' },
  { label: '주간 반응', value: '94' },
  { label: '프로필 상태', value: '완료' },
];

export const followers = [
  { id: 1, name: 'Juno', handle: '@juno', avatar: 'J', isFollowing: true },
  { id: 2, name: 'Haru', handle: '@haru', avatar: 'H', isFollowing: false },
  { id: 3, name: 'Min', handle: '@min', avatar: 'M', isFollowing: true },
  { id: 4, name: 'Eun', handle: '@eun', avatar: 'E', isFollowing: false },
];

export const following = [
  { id: 1, name: 'John Park', handle: '@johnpark', avatar: 'J', isFollowing: true },
  { id: 2, name: 'Mina Lee', handle: '@minalee', avatar: 'M', isFollowing: true },
  { id: 3, name: 'Sora Kim', handle: '@sorakim', avatar: 'S', isFollowing: true },
  { id: 4, name: 'Daehoon', handle: '@daehoon', avatar: 'D', isFollowing: true },
];

export const interestTags = ['감성', '여행', '사진', '카페', '운동', '기록', '음악', '영화'];
