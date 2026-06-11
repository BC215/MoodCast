import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import SpaIcon from '@mui/icons-material/Spa';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import CelebrationIcon from '@mui/icons-material/Celebration';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import styles from './EmotionBadge.module.css';

const emotionConfig = {
  1: {
    label: '행복해요',
    icon: EmojiEmotionsIcon,
    color: '#F8D86A',
    tint: '#FFF8DA',
    className: styles.happy,
  },
  2: {
    label: '슬퍼요',
    icon: SentimentDissatisfiedIcon,
    color: '#9CC3F5',
    tint: '#EDF5FF',
    className: styles.sad,
  },
  3: {
    label: '차분해요',
    icon: SpaIcon,
    color: '#E7C08F',
    tint: '#FFF5E8',
    className: styles.calm,
  },
  4: {
    label: '화가 나요',
    icon: SentimentVeryDissatisfiedIcon,
    color: '#F3A6A0',
    tint: '#FFF0EE',
    className: styles.angry,
  },
  5: {
    label: '신나요',
    icon: CelebrationIcon,
    color: '#F5A7D4',
    tint: '#FFF0FA',
    className: styles.excited,
  },
  6: {
    label: '무덤덤해요',
    icon: SentimentNeutralIcon,
    color: '#C5CDD8',
    tint: '#F5F7FA',
    className: styles.neutral,
  },
  default: {
    label: '감정 없음',
    icon: SentimentNeutralIcon,
    color: '#C5CDD8',
    tint: '#F5F7FA',
    className: styles.neutral,
  },
};

function resolveEmotion(emotion) {
  if (!emotion && emotion !== 0) {
    return emotionConfig.default;
  }

  if (typeof emotion === 'object') {
    if (emotion.id && emotionConfig[emotion.id]) {
      return emotionConfig[emotion.id];
    }
    if (emotion.name) {
      return resolveEmotion(emotion.name);
    }
  }

  if (typeof emotion === 'number' && emotionConfig[emotion]) {
    return emotionConfig[emotion];
  }

  if (typeof emotion === 'string') {
    const normalized = emotion.trim();
    const byName = {
      행복: emotionConfig[1],
      슬픔: emotionConfig[2],
      차분함: emotionConfig[3],
      화남: emotionConfig[4],
      신나감: emotionConfig[5],
      무감정: emotionConfig[6],
      행복해요: emotionConfig[1],
      슬퍼요: emotionConfig[2],
      차분해요: emotionConfig[3],
      '화가 나요': emotionConfig[4],
      신나요: emotionConfig[5],
      무덤덤해요: emotionConfig[6],
    };

    return byName[normalized] || emotionConfig.default;
  }

  return emotionConfig.default;
}

export function EmotionBadge({ emotion, count, value }) {
  const meta = resolveEmotion(emotion);
  const Icon = meta.icon;
  const displayValue = count ?? value;

  return (
    <span className={`${styles.badge} ${meta.className}`} style={{ backgroundColor: meta.tint, borderColor: meta.color }}>
      <Icon className={styles.icon} style={{ color: meta.color }} />
      <span className={styles.label}>{meta.label}</span>
      {displayValue !== undefined && displayValue !== null ? <strong className={styles.count}>{displayValue}</strong> : null}
    </span>
  );
}

export { emotionConfig };
