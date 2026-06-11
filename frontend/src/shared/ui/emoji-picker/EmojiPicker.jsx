import styles from "./EmojiPicker.module.css";

const DEFAULT_EMOJIS = [
  "😀",
  "😄",
  "😁",
  "😊",
  "😍",
  "😘",
  "🥰",
  "😭",
  "😂",
  "🙂",
  "😉",
  "😎",
  "👍",
  "👀",
  "🙏",
  "🔥",
  "✨",
  "💜",
  "💙",
  "❤️",
  "🎉",
  "🥳",
];

export function EmojiPicker({ open, onSelect, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className={styles.popover} role="dialog" aria-label="이모지 선택기">
      <div className={styles.header}>
        <strong>이모지</strong>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          ×
        </button>
      </div>
      <div className={styles.grid}>
        {DEFAULT_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={styles.emojiButton}
            onClick={() => onSelect?.(emoji)}
            aria-label={emoji}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
