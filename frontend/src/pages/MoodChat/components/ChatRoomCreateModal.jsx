import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import GroupAddRoundedIcon from '@mui/icons-material/GroupAddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useEffect, useMemo, useState } from 'react';
import { defaultAvatarSrc } from '../../../shared/lib/defaultAvatar';

function getDisplayName(member) {
  return (
    member?.nickname ||
    member?.name ||
    member?.memberName ||
    member?.displayName ||
    member?.userName ||
    member?.username ||
    (member?.email ? String(member.email).split("@")[0] : "") ||
    `회원 ${member?.memberId}`
  );
}
export function ChatRoomCreateModal({
  open,
  mode,
  members,
  selectedIds,
  currentMemberId,
  currentRoomName,
  isLoading,
  onToggleMember,
  onClose,
  onSubmit,
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setQuery('');
    }
  }, [open]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return members;
    }

    return members.filter((member) => {
      const displayName = getDisplayName(member).toLowerCase();
      const email = String(member?.email || '').toLowerCase();
      return displayName.includes(normalizedQuery) || email.includes(normalizedQuery);
    });
  }, [members, query]);

  if (!open) {
    return null;
  }

  const selectedCount = selectedIds.length;

  return (
    <div className="moodchat-modalBackdrop" role="presentation" onClick={onClose}>
      <div
        className="moodchat-modal"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'invite' ? '채팅방 멤버 초대' : '채팅방 생성'}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="moodchat-modalHeader">
          <div>
            <strong>{mode === 'invite' ? '멤버 초대' : '채팅방 만들기'}</strong>
            <p>
              {mode === 'invite'
                ? '아래 목록에서 초대할 사람을 선택하세요.'
                : '1명을 선택하면 1:1, 2명 이상이면 그룹 채팅방으로 생성됩니다.'}
            </p>
          </div>
          <button type="button" className="moodchat-iconButton" onClick={onClose} aria-label="닫기">
            <CloseRoundedIcon />
          </button>
        </div>

        <div className="moodchat-modalSummary">
          <span>
            {mode === 'invite' && currentRoomName ? `대상 방: ${currentRoomName}` : '초대/생성 대상'}
          </span>
          <strong>{selectedCount}명 선택</strong>
        </div>

        <label className="moodchat-searchField">
          <SearchRoundedIcon />
          <input
            type="text"
            placeholder="이름 또는 이메일 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="moodchat-memberList">
          {isLoading ? (
            <p className="moodchat-emptyState">멤버 목록을 불러오는 중입니다.</p>
          ) : null}

          {!isLoading && filteredMembers.length === 0 ? (
            <p className="moodchat-emptyState">표시할 멤버 목록이 없습니다.</p>
          ) : null}

          {!isLoading
            ? filteredMembers.map((member) => {
            const memberId = Number(member.memberId);
            const isSelected = selectedIds.includes(memberId);
            const displayName = getDisplayName(member);
            const profileImageSrc = member.profileImageUrl || defaultAvatarSrc;

            if (!memberId || memberId === Number(currentMemberId)) {
              return null;
            }

            return (
              <button
                key={memberId}
                type="button"
                className={`moodchat-memberItem ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onToggleMember(member)}
              >
                <img
                  className="moodchat-memberAvatar"
                  src={profileImageSrc}
                  alt={displayName}
                  onError={(event) => {
                    event.currentTarget.src = defaultAvatarSrc;
                  }}
                />
                <div className="moodchat-memberMeta">
                  <strong>{displayName}</strong>
                  <span>@{member.email ? member.email.split('@')[0] : memberId}</span>
                </div>
                <span className="moodchat-checkbox">{isSelected ? '선택' : '+'}</span>
              </button>
            );
          })
            : null}
        </div>

        <div className="moodchat-modalActions">
          <button type="button" className="moodchat-secondaryButton" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="moodchat-primaryButton"
            onClick={onSubmit}
            disabled={selectedCount === 0}
          >
            <GroupAddRoundedIcon />
            {mode === 'invite' ? '초대하기' : '채팅방 만들기'}
          </button>
        </div>
      </div>
    </div>
  );
}
