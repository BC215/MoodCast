import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { formatKoreanTime } from "../../../shared/lib/dateTime";
import { formatChatPreview } from "../../../shared/lib/chatContent";

function getDisplayRoomTitle(room) {
  const roomTitle = String(room?.roomName || "").trim();
  const memberCount = Number(room?.memberCount || 0);
  const matchedTitle = roomTitle.match(/^(.*?)(?:\s외\s\d+명)$/);

  if (!matchedTitle) {
    return roomTitle || "그룹 채팅방";
  }

  const baseTitle = matchedTitle[1].trim();

  if (!baseTitle) {
    return roomTitle || "그룹 채팅방";
  }

  if (memberCount <= 1) {
    return baseTitle;
  }

  return `${baseTitle} 외 ${memberCount - 1}명`;
}

export function GroupChatRoomList({
  rooms,
  activeRoomId,
  isLoading,
  roomName,
  roomDescription,
  invitedMemberIds,
  onRoomNameChange,
  onRoomDescriptionChange,
  onInvitedMemberIdsChange,
  onCreateRoom,
  onSelectRoom,
}) {
  return (
    <section className="group-chat-list-card">
      <div className="group-chat-card-head">
        <div>
          <strong>그룹 채팅방</strong>
          <p>부서별 카드형 UI로 그룹 대화를 이어가세요.</p>
        </div>
      </div>

      <form className="group-chat-create-form" onSubmit={onCreateRoom}>
        <input
          type="text"
          placeholder="채팅방 이름"
          value={roomName}
          onChange={onRoomNameChange}
        />
        <textarea
          placeholder="설명(선택)"
          value={roomDescription}
          onChange={onRoomDescriptionChange}
          rows={2}
        />
        <input
          type="text"
          placeholder="초대 memberId (쉼표로 구분)"
          value={invitedMemberIds}
          onChange={onInvitedMemberIdsChange}
        />
        <button type="submit">
          <AddRoundedIcon />
          <span>그룹방 만들기</span>
        </button>
      </form>

      <div className="group-chat-room-list" data-dashboard-scroll-container="group-room-list">
        {isLoading ? <p className="group-chat-helper">채팅방을 불러오는 중입니다.</p> : null}
        {!isLoading && rooms.length === 0 ? (
          <p className="group-chat-empty">참여 중인 그룹 채팅방이 없습니다.</p>
        ) : null}
        {rooms.map((room) => (
          <button
            key={room.roomId}
            type="button"
            className={`group-chat-room-item ${Number(activeRoomId) === Number(room.roomId) ? "is-active" : ""}`}
            onClick={() => onSelectRoom(room)}
          >
            <div className="group-chat-room-main">
              <strong>{getDisplayRoomTitle(room)}</strong>
              <p>{formatChatPreview(room.lastMessage) || room.roomDescription || "새로운 대화를 시작해보세요."}</p>
            </div>
            <div className="group-chat-room-meta">
              <span>{room.memberCount || 0}명</span>
              {Number(room.unreadCount || 0) > 0 ? (
                <span
                  style={{
                    minWidth: "20px",
                    padding: "2px 6px",
                    borderRadius: "999px",
                    background: "#7c4dff",
                    color: "#fff",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                >
                  {room.unreadCount}
                </span>
              ) : null}
              <span>{formatKoreanTime(room.lastMessageAt) || room.lastMessageAt || ""}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
