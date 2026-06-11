import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import SentimentSatisfiedAltRoundedIcon from '@mui/icons-material/SentimentSatisfiedAltRounded';

export function GroupChatMessageComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  inputRef,
}) {
  return (
    <form className="group-chat-composer" onSubmit={onSubmit}>
      <label className="group-chat-composer-addButton" aria-label="이미지 추가" title="이미지 추가">
        <AddRoundedIcon />
        <input type="file" accept="image/*" />
      </label>
      <div className="group-chat-composer-inputShell">
        <input
          ref={inputRef}
          type="text"
          placeholder="메시지를 입력하세요..."
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        <button type="button" className="group-chat-composer-emojiButton" aria-label="이모지" title="이모지" disabled={disabled}>
          <SentimentSatisfiedAltRoundedIcon />
        </button>
      </div>
      <button type="submit" className="group-chat-composer-sendButton" aria-label="메시지 보내기" title="메시지 보내기" disabled={disabled}>
        <SendRoundedIcon />
      </button>
    </form>
  );
}
