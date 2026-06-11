import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import KeyboardArrowLeftRoundedIcon from "@mui/icons-material/KeyboardArrowLeftRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SentimentSatisfiedAltRoundedIcon from "@mui/icons-material/SentimentSatisfiedAltRounded";
import styles from "../../MoodChat/MoodChatPage.module.css";
import { defaultAvatarSrc } from "../../../shared/lib/defaultAvatar";
import { formatKoreanTime } from "../../../shared/lib/dateTime";
import { fetchGroupChatMembers } from "../../../shared/api/groupChatApi";
import { uploadChatImages } from "../../../shared/api/fileUploadApi";
import { EmojiPicker } from "../../../shared/ui/emoji-picker/EmojiPicker";
import { RichTextContent } from "../../../shared/ui/rich-text/RichTextContent";

function getDisplayRoomTitle(activeRoom) {
  const roomTitle = String(activeRoom?.roomName || "").trim();
  const memberCount = Number(activeRoom?.memberCount || 0);
  const matchedTitle = roomTitle.match(/^(.*?)(?:\s외\s\d+명)$/);
  const strippedTitle = roomTitle
    .replace(/\s*님의?\s*채팅$/, "")
    .replace(/\s*님과의\s*채팅$/, "")
    .trim();

  if (!matchedTitle) {
    if (memberCount > 2 && strippedTitle) {
      return `${strippedTitle} 외 ${memberCount - 1}명`;
    }

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

function getRoomSubtitleParts(activeRoom, connected) {
  const memberCount = Number(activeRoom?.memberCount || 0);
  const countText = memberCount === 2 ? "" : memberCount > 0 ? `참여 인원 ${memberCount}명` : "참여 인원 정보 없음";
  const connectionText = connected ? "실시간 연결됨" : "연결 대기";
  return { countText, connectionText };
}

function isNearBottom(element) {
  if (!element) {
    return true;
  }

  const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
  return distance < 80;
}

function createImageEntries(files) {
  return files.map((file, index) => ({
    id: `${file.name}-${file.lastModified}-${index}`,
    file,
    previewUrl: URL.createObjectURL(file),
  }));
}

export function GroupChatRoomDetail({
  activeRoom,
  messages,
  connected,
  currentMemberId,
  onSubmitMessage,
  onDeleteMessage,
  onLeaveRoom,
  onInviteMembers,
  onProfileClick,
  onBack,
}) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showScrollBottomButton, setShowScrollBottomButton] = useState(false);
  const [messageValue, setMessageValue] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [error, setError] = useState("");
  const [imageViewer, setImageViewer] = useState(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [messageActionMenu, setMessageActionMenu] = useState(null);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isMembersPanelOpen, setIsMembersPanelOpen] = useState(false);
  const [memberList, setMemberList] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberListError, setMemberListError] = useState("");
  const messagesRef = useRef(null);
  const bottomRef = useRef(null);
  const imageInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const selectedImagesRef = useRef([]);
  const messagePressTimerRef = useRef(null);
  const isUserNearBottomRef = useRef(true);

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(() => {
    return () => {
      selectedImagesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (!imageViewer) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setImageViewer(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveImageViewer(-1);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveImageViewer(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imageViewer]);

  const clearSelectedImages = () => {
    setSelectedImages((previousImages) => {
      previousImages.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleImageSelection = (event) => {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/"),
    );

    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    if (files.length > 5) {
      setError("이미지는 최대 5장까지 업로드할 수 있습니다.");
      return;
    }

    setError("");
    setSelectedImages((previousImages) => {
      previousImages.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return createImageEntries(files);
    });
  };

  const removeSelectedImage = (imageId) => {
    setSelectedImages((previousImages) => {
      const removedImage = previousImages.find((item) => item.id === imageId);
      if (removedImage) {
        URL.revokeObjectURL(removedImage.previewUrl);
      }

      return previousImages.filter((item) => item.id !== imageId);
    });
  };

  const openImageViewer = (src, alt) => {
    if (!src) {
      return;
    }

    setImageViewer({ src, alt: alt || "이미지" });
  };

  const openImageViewerWithList = (images, index, alt) => {
    const normalizedImages = Array.isArray(images)
      ? images.filter((imageUrl) => typeof imageUrl === "string" && imageUrl.trim().length > 0)
      : [];

    if (normalizedImages.length === 0) {
      return;
    }

    const safeIndex = Math.min(Math.max(Number(index) || 0, 0), normalizedImages.length - 1);
    setImageViewer({
      images: normalizedImages,
      index: safeIndex,
      orientation: "horizontal",
      alt: alt || "이미지",
    });
  };

  const handleViewerImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;

    if (!naturalWidth || !naturalHeight) {
      return;
    }

    setImageViewer((previousViewer) => {
      if (!previousViewer) {
        return previousViewer;
      }

      return {
        ...previousViewer,
        orientation: naturalHeight > naturalWidth ? "vertical" : "horizontal",
      };
    });
  };

  const moveImageViewer = (direction) => {
    setImageViewer((previousViewer) => {
      if (!previousViewer || !Array.isArray(previousViewer.images) || previousViewer.images.length === 0) {
        return previousViewer;
      }

      const nextIndex =
        (previousViewer.index + direction + previousViewer.images.length) %
        previousViewer.images.length;

      return {
        ...previousViewer,
        index: nextIndex,
      };
    });
  };

  const focusMessageInput = () => {
    if (!messageInputRef.current) {
      return;
    }

    try {
      messageInputRef.current.focus({ preventScroll: true });
    } catch (error) {
      messageInputRef.current.focus();
    }
  };

  const clearMessagePressTimer = () => {
    if (messagePressTimerRef.current) {
      window.clearTimeout(messagePressTimerRef.current);
      messagePressTimerRef.current = null;
    }
  };

  const closeMessageActionMenu = () => {
    setMessageActionMenu(null);
  };

  const openMessageActionMenu = (event, item, text) => {
    const menuWidth = 176;
    const menuHeight = 112;
    const nextX = Math.min(event.clientX || 0, window.innerWidth - menuWidth - 12);
    const nextY = Math.min(event.clientY || 0, window.innerHeight - menuHeight - 12);

    setMessageActionMenu({
      x: Math.max(12, nextX),
      y: Math.max(12, nextY),
      item,
      text: text || "",
    });
  };

  const handleMessagePressStart = (event, item, text) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    clearMessagePressTimer();
    const clientX = event.clientX;
    const clientY = event.clientY;
    messagePressTimerRef.current = window.setTimeout(() => {
      openMessageActionMenu({ clientX, clientY }, item, text);
    }, 450);
  };

  const handleMessagePressEnd = () => {
    clearMessagePressTimer();
  };

  const handleMessageContextMenu = (event, item, text) => {
    event.preventDefault();
    clearMessagePressTimer();
    openMessageActionMenu(event, item, text);
  };

  const handleCopyMessageText = async () => {
    const text = messageActionMenu?.text || "";
    if (!text) {
      closeMessageActionMenu();
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch (copyError) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    } finally {
      closeMessageActionMenu();
    }
  };

  const handleDeleteMessageAction = () => {
    if (!messageActionMenu?.item) {
      closeMessageActionMenu();
      return;
    }

    onDeleteMessage?.(messageActionMenu.item);
    closeMessageActionMenu();
  };

  const openLeaveConfirm = () => {
    setIsMoreMenuOpen(false);
    setIsLeaveConfirmOpen(true);
  };

  const closeLeaveConfirm = () => {
    setIsLeaveConfirmOpen(false);
  };

  const handleConfirmLeave = async () => {
    closeLeaveConfirm();
    await onLeaveRoom?.();
  };

  useEffect(() => {
    if (!messageActionMenu) {
      return undefined;
    }

    const handleOutside = () => closeMessageActionMenu();
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeMessageActionMenu();
      }
    };

    window.addEventListener("pointerdown", handleOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handleOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [messageActionMenu]);

  const scrollToBottom = () => {
    const element = messagesRef.current;
    if (!element) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  };

  const handleMessagesScroll = () => {
    const element = messagesRef.current;
    const nearBottom = isNearBottom(element);
    isUserNearBottomRef.current = nearBottom;
    setShowScrollBottomButton(!nearBottom && messages.length > 0);
  };

  useLayoutEffect(() => {
    setIsMoreMenuOpen(false);
    isUserNearBottomRef.current = true;
    setShowScrollBottomButton(false);

    requestAnimationFrame(() => {
      scrollToBottom("auto");
    });
  }, [activeRoom?.roomId]);

  useEffect(() => {
    if (!activeRoom?.roomId || messages.length === 0) {
      setShowScrollBottomButton(false);
      return;
    }

    if (isUserNearBottomRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom("auto");
      });
      setShowScrollBottomButton(false);
      return;
    }

    setShowScrollBottomButton(true);
  }, [messages.length, activeRoom?.roomId]);

  useEffect(() => {
    setIsEmojiPickerOpen(false);
    setMessageValue("");
    if (!activeRoom?.roomId) {
      clearSelectedImages();
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom?.roomId]);

  useEffect(() => {
    setIsMembersPanelOpen(false);
    setMemberList([]);
    setMemberListError("");
    setIsLoadingMembers(false);
  }, [activeRoom?.roomId]);

  useEffect(() => {
    if (!isMembersPanelOpen) {
      return undefined;
    }

    const { body, documentElement } = document;
    const scrollContainers = Array.from(
      document.querySelectorAll("[data-dashboard-scroll-container]"),
    );
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyLeft = body.style.left;
    const previousBodyRight = body.style.right;
    const previousBodyWidth = body.style.width;
    const previousContainerStyles = scrollContainers.map((element) => ({
      element,
      overflow: element.style.overflow,
      overflowY: element.style.overflowY,
      height: element.style.height,
      maxHeight: element.style.maxHeight,
    }));

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    scrollContainers.forEach((element) => {
      element.style.overflow = "hidden";
      element.style.overflowY = "hidden";
    });

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.left = previousBodyLeft;
      body.style.right = previousBodyRight;
      body.style.width = previousBodyWidth;
      previousContainerStyles.forEach(({ element, overflow, overflowY, height, maxHeight }) => {
        element.style.overflow = overflow;
        element.style.overflowY = overflowY;
        element.style.height = height;
        element.style.maxHeight = maxHeight;
      });
      window.scrollTo(0, scrollY);
    };
  }, [isMembersPanelOpen]);

  if (!activeRoom) {
    return null;
  }

  const displayRoomTitle = getDisplayRoomTitle(activeRoom);
  const roomInitial = displayRoomTitle.charAt(0).toUpperCase();
  const roomSubtitle = getRoomSubtitleParts(activeRoom, connected);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedMessage = messageValue.trim();

    if ((!trimmedMessage && selectedImages.length === 0) || !activeRoom || !currentMemberId) {
      return;
    }

    try {
      if (selectedImages.length > 0) {
        setIsUploadingImages(true);
      }

      let uploadedImageUrls = [];
      if (selectedImages.length > 0) {
        uploadedImageUrls = await uploadChatImages(selectedImages.map((item) => item.file));
      }

      const isSubmitted = await onSubmitMessage({
        text: trimmedMessage,
        imageUrls: uploadedImageUrls,
      });
      if (isSubmitted) {
        clearSelectedImages();
        setMessageValue("");
        setIsEmojiPickerOpen(false);
      }
    } catch (requestError) {
      console.error("그룹 채팅 메시지 전송 실패", requestError);
      setError(
        requestError?.response?.data?.message ||
          (selectedImages.length > 0
            ? "이미지 업로드 또는 전송에 실패했습니다."
            : "메시지 전송에 실패했습니다."),
      );
    } finally {
      setIsUploadingImages(false);
      requestAnimationFrame(focusMessageInput);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessageValue((previousMessage) => `${previousMessage}${emoji}`);
    setIsEmojiPickerOpen(false);
    requestAnimationFrame(focusMessageInput);
  };

  const openMembersPanel = async () => {
    if (!activeRoom?.roomId) {
      return;
    }

    setIsMembersPanelOpen(true);
    setMemberListError("");
    setIsLoadingMembers(true);

    try {
      const response = await fetchGroupChatMembers(activeRoom.roomId);
      const nextMemberList = Array.isArray(response.data) ? response.data : [];
      setMemberList(nextMemberList);
    } catch (requestError) {
      console.error("그룹 채팅 참여자 목록 조회 실패", requestError);
      setMemberList([]);
      setMemberListError("참여 인원 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const closeMembersPanel = () => {
    setIsMembersPanelOpen(false);
  };

  const handleOpenMembersPanelFromMenu = () => {
    setIsMoreMenuOpen(false);
    openMembersPanel();
  };

  return (
    <div className={styles.room}>
      <div className={styles.roomHeader}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onBack}
          aria-label="목록으로 돌아가기"
        >
          <ArrowBackRoundedIcon />
        </button>
        <div className={styles.headerAvatar}>{roomInitial}</div>
        <div className={styles.roomTitle}>
          <strong>{displayRoomTitle}</strong>
          <span>
            {roomSubtitle.countText ? (
              <button
                type="button"
                onClick={openMembersPanel}
                aria-label="참여 인원 목록 열기"
                aria-expanded={isMembersPanelOpen}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: 0,
                  border: 0,
                  background: "transparent",
                  color: "#667085",
                  font: "inherit",
                  cursor: "pointer",
                }}
              >
                {roomSubtitle.countText}
              </button>
            ) : null}
            <span>{roomSubtitle.countText ? " · " : ""}{roomSubtitle.connectionText}</span>
          </span>
        </div>
        <div className={styles.headerActions}>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              aria-label="더보기"
              onClick={() => setIsMoreMenuOpen((value) => !value)}
            >
              <MoreVertRoundedIcon />
            </button>
            {isMoreMenuOpen ? (
              <div
                style={{
                  position: "absolute",
                  top: "46px",
                  right: 0,
                  display: "grid",
                  gap: "8px",
                  minWidth: "160px",
                  padding: "10px",
                  borderRadius: "16px",
                  background: "rgba(255, 255, 255, 0.98)",
                  boxShadow: "0 18px 40px rgba(17, 24, 39, 0.14)",
                  zIndex: 1000,
                  justifyItems: "stretch",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onInviteMembers?.();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    minHeight: "42px",
                    padding: "0 14px",
                    border: 0,
                    borderRadius: "12px",
                    background: "rgba(124, 77, 255, 0.1)",
                    color: "#7c4dff",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    wordBreak: "keep-all",
                    fontWeight: 600,
                  }}
                >
                  참여자 초대
                </button>
                <button
                  type="button"
                  onClick={handleOpenMembersPanelFromMenu}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    minHeight: "42px",
                    padding: "0 14px",
                    border: 0,
                    borderRadius: "12px",
                    background: "rgba(124, 77, 255, 0.1)",
                    color: "#7c4dff",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    wordBreak: "keep-all",
                    fontWeight: 600,
                  }}
                >
                  참여자 보기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openLeaveConfirm();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    minHeight: "42px",
                    padding: "0 14px",
                    border: 0,
                    borderRadius: "12px",
                    background: "rgba(255, 106, 119, 0.1)",
                    color: "#d92d20",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    wordBreak: "keep-all",
                    fontWeight: 600,
                  }}
                >
                  채팅방 나가기
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div
        ref={messagesRef}
        className={styles.messages}
        data-dashboard-scroll-container="group-messages"
        aria-live="polite"
        onScroll={handleMessagesScroll}
      >
        {messages.length === 0 ? <p className={styles.emptyState}>아직 메시지가 없습니다.</p> : null}
        {messages.map((item) => {
          if (item.eventType === "CHAT_SYSTEM") {
            const isLeaveMessage =
              typeof item.content === "string" && item.content.includes("님이 나갔습니다.");

            return (
              <div key={item.messageId} className={styles.systemMessageRow}>
                <span className={styles.systemMessageText}>
                  <RichTextContent content={item.content} className={styles.richTextContent} />
                </span>
          {isLeaveMessage && onInviteMembers ? (
            <button
              type="button"
              className={styles.systemMessageActionButton}
              onClick={() => onInviteMembers?.(item.senderId)}
            >
              다시 초대하기
            </button>
          ) : null}
                <span className={styles.systemMessageTime}>
                  {item.time || formatKoreanTime(item.createdAt) || ""}
                </span>
              </div>
            );
          }

          const isMine = Number(item.senderId) === Number(currentMemberId);
          const senderName = item.senderName || "회원";
          const senderInitial = senderName.charAt(0).toUpperCase();
          const profileImageUrl = item.profileImageUrl || defaultAvatarSrc;
          const unreadCount = Number(item.unreadCount || 0);
          const imageUrls = Array.isArray(item.imageUrls) ? item.imageUrls : [];

          return (
            <div
              key={item.messageId}
              className={`${styles.messageRow} ${isMine ? styles.me : styles.them}`}
            >
              {!isMine ? (
                <button
                  type="button"
                  className={styles.messageAvatar}
                  onClick={() => onProfileClick?.(item.senderId)}
                  aria-label={`${senderName} 프로필 보기`}
                  title={`${senderName} 프로필 보기`}
                >
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt={senderName}
                      className={styles.messageAvatarImage}
                      onError={(event) => {
                        event.currentTarget.src = defaultAvatarSrc;
                      }}
                    />
                  ) : (
                    <span>{senderInitial}</span>
                  )}
                </button>
              ) : null}

              <div className={`${styles.messageItem} ${isMine ? styles.me : styles.them}`}>
                {!isMine ? <span className={styles.senderLabel}>{senderName}</span> : null}
                <div className={styles.bubbleWrap}>
                  <div className={styles.bubbleLine}>
                    {isMine ? (
                      <>
                        {unreadCount > 0 ? (
                          <span className={styles.unreadMarker}>{unreadCount}</span>
                        ) : null}
                        <div
                          className={`${styles.bubble} ${styles.me}`}
                          onPointerDown={(event) =>
                            handleMessagePressStart(event, item, item.content || "")
                          }
                          onPointerUp={handleMessagePressEnd}
                          onPointerLeave={handleMessagePressEnd}
                          onPointerCancel={handleMessagePressEnd}
                          onContextMenu={(event) =>
                            handleMessageContextMenu(event, item, item.content || "")
                          }
                        >
                          {item.content ? (
                            <p>
                              <RichTextContent content={item.content} className={styles.richTextContent} />
                            </p>
                          ) : null}
                          {imageUrls.length > 0 ? (
                            <div
                              className={`${styles.messageMediaGrid} ${
                                imageUrls.length === 1 ? styles.singleMessageMediaGrid : ""
                              }`}
                            >
                              {imageUrls.map((imageUrl, index) => (
                                <img
                                  key={`${imageUrl}-${index}`}
                                  className={styles.messageMediaImage}
                                  src={imageUrl}
                                  alt={`첨부 이미지 ${index + 1}`}
                                  loading="lazy"
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => openImageViewerWithList(imageUrls, index, `첨부 이미지 ${index + 1}`)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      openImageViewerWithList(imageUrls, index, `첨부 이미지 ${index + 1}`);
                                    }
                                  }}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className={`${styles.bubble} ${styles.them}`}
                          onPointerDown={(event) =>
                            handleMessagePressStart(event, item, item.content || "")
                          }
                          onPointerUp={handleMessagePressEnd}
                          onPointerLeave={handleMessagePressEnd}
                          onPointerCancel={handleMessagePressEnd}
                          onContextMenu={(event) =>
                            handleMessageContextMenu(event, item, item.content || "")
                          }
                        >
                          {item.content ? (
                            <p>
                              <RichTextContent content={item.content} className={styles.richTextContent} />
                            </p>
                          ) : null}
                          {imageUrls.length > 0 ? (
                            <div
                              className={`${styles.messageMediaGrid} ${
                                imageUrls.length === 1 ? styles.singleMessageMediaGrid : ""
                              }`}
                            >
                              {imageUrls.map((imageUrl, index) => (
                                <img
                                  key={`${imageUrl}-${index}`}
                                  className={styles.messageMediaImage}
                                  src={imageUrl}
                                  alt={`첨부 이미지 ${index + 1}`}
                                  loading="lazy"
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => openImageViewerWithList(imageUrls, index, `첨부 이미지 ${index + 1}`)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      openImageViewerWithList(imageUrls, index, `첨부 이미지 ${index + 1}`);
                                    }
                                  }}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                        {unreadCount > 0 ? (
                          <span
                            className={styles.unreadMarker}
                            style={{ marginLeft: "6px", marginBottom: "4px" }}
                          >
                            {unreadCount}
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                  <span
                    className={styles.messageTime}
                    style={isMine ? { textAlign: "right" } : { textAlign: "left" }}
                  >
                    {item.time || formatKoreanTime(item.createdAt) || ""}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {messageActionMenu ? (
        <div
          className={styles.messageActionMenu}
          style={{ left: `${messageActionMenu.x}px`, top: `${messageActionMenu.y}px` }}
          role="menu"
          aria-label="메시지 작업 메뉴"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={styles.messageActionMenuItem}
            onClick={handleCopyMessageText}
          >
            텍스트 복사
          </button>
          <button
            type="button"
            className={`${styles.messageActionMenuItem} ${styles.messageActionMenuItemDanger}`}
            onClick={handleDeleteMessageAction}
          >
            삭제
          </button>
        </div>
      ) : null}

  {showScrollBottomButton ? (
        <button
          type="button"
          className={styles.scrollBottomButton}
          onClick={() => {
            isUserNearBottomRef.current = true;
            setShowScrollBottomButton(false);
            scrollToBottom("smooth");
          }}
          aria-label="최신 메시지로 이동"
          title="최신 메시지로 이동"
        >
          <KeyboardArrowDownRoundedIcon />
        </button>
      ) : null}

      {imageViewer ? (
        <div
          className={styles.imageViewerOverlay}
          role="presentation"
          onClick={() => setImageViewer(null)}
        >
          {Array.isArray(imageViewer.images) && imageViewer.images.length > 1 ? (
            <button
              type="button"
              className={`${styles.imageViewerNavButton} ${styles.imageViewerPrevButton}`}
              aria-label="이전 이미지"
              title="이전 이미지"
              onClick={(event) => {
                event.stopPropagation();
                moveImageViewer(-1);
              }}
            >
              <KeyboardArrowLeftRoundedIcon className={styles.imageViewerNavIcon} />
            </button>
          ) : null}
          <div
            className={`${styles.imageViewerContent} ${
              imageViewer.orientation === "vertical"
                ? styles.imageViewerVertical
                : styles.imageViewerHorizontal
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={imageViewer.alt}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.imageViewerClose}
              aria-label="이미지 닫기"
              title="이미지 닫기"
              onClick={() => setImageViewer(null)}
            >
              <CloseRoundedIcon />
            </button>
            <span className={styles.imageViewerCounter}>
              {Array.isArray(imageViewer.images) && imageViewer.images.length > 0
                ? `${imageViewer.index + 1} / ${imageViewer.images.length}`
                : ""}
            </span>
            <img
              className={styles.imageViewerImage}
              src={imageViewer.images?.[imageViewer.index]}
              alt={imageViewer.alt}
              onLoad={handleViewerImageLoad}
              onClick={() => setImageViewer(null)}
            />
          </div>
          {Array.isArray(imageViewer.images) && imageViewer.images.length > 1 ? (
            <button
              type="button"
              className={`${styles.imageViewerNavButton} ${styles.imageViewerNextButton}`}
              aria-label="다음 이미지"
              title="다음 이미지"
              onClick={(event) => {
                event.stopPropagation();
                moveImageViewer(1);
              }}
            >
              <KeyboardArrowRightRoundedIcon className={styles.imageViewerNavIcon} />
            </button>
          ) : null}
        </div>
      ) : null}

      {isLeaveConfirmOpen ? (
        <div className="moodchat-modalBackdrop" role="presentation" onClick={closeLeaveConfirm}>
          <div
            className="moodchat-modal"
            role="dialog"
            aria-modal="true"
            aria-label="채팅방 나가기 확인"
            onClick={(event) => event.stopPropagation()}
            style={{ height: "auto", maxHeight: "none", minHeight: "0" }}
          >
            <div className="moodchat-modalHeader">
              <div>
                <strong>채팅방 나가기</strong>
                <p>한 번 나가면 다시 입장하기 전까지 이전 대화는 보이지 않습니다.</p>
              </div>
              <button type="button" className="moodchat-iconButton" onClick={closeLeaveConfirm} aria-label="닫기">
                <CloseRoundedIcon />
              </button>
            </div>
            <div className="moodchat-modalActions">
              <button type="button" className="moodchat-secondaryButton" onClick={closeLeaveConfirm}>
                취소
              </button>
              <button type="button" className="moodchat-primaryButton" onClick={handleConfirmLeave}>
                나가기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isMembersPanelOpen ? (
        <div className="moodchat-modalBackdrop" role="presentation" onClick={closeMembersPanel}>
          <div
            className="moodchat-modal"
            role="dialog"
            aria-modal="true"
            aria-label="참여 인원 목록"
            onClick={(event) => event.stopPropagation()}
            style={{ height: "auto", maxHeight: "none", minHeight: "0" }}
          >
            <div className="moodchat-modalHeader">
              <div>
                <strong>참여 인원</strong>
                <p>현재 그룹 채팅방에 참여 중인 인원입니다.</p>
              </div>
              <button
                type="button"
                className="moodchat-iconButton"
                onClick={closeMembersPanel}
                aria-label="닫기"
              >
                <CloseRoundedIcon />
              </button>
            </div>

            <div className="moodchat-modalSummary">
              <span>{displayRoomTitle}</span>
              <strong>{Number(activeRoom?.memberCount || 0)}명</strong>
            </div>

            <div className="moodchat-memberList">
              {isLoadingMembers ? (
                <p className="moodchat-emptyState">참여 인원 목록을 불러오는 중입니다.</p>
              ) : null}

              {!isLoadingMembers && memberListError ? (
                <p className="moodchat-emptyState">{memberListError}</p>
              ) : null}

              {!isLoadingMembers && !memberListError && memberList.length === 0 ? (
                <p className="moodchat-emptyState">참여 중인 인원이 없습니다.</p>
              ) : null}

              {!isLoadingMembers
                ? memberList.map((member) => {
                    const memberId = Number(member?.memberId);
                    const displayName = member?.memberName || `회원 ${memberId || ""}`;
                    const memberEmail = String(
                      member?.email ||
                        member?.memberEmail ||
                        member?.member_email ||
                        member?.loginEmail ||
                        member?.loginId ||
                        "",
                    ).trim();
                    const profileImageSrc = member?.profileImageUrl || defaultAvatarSrc;
                    const isCurrentUser = Number(currentMemberId) === memberId;

                    return (
                      <div
                        key={memberId || displayName}
                        className="moodchat-memberItem"
                        role="button"
                        tabIndex={0}
                        onClick={() => onProfileClick?.(memberId)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onProfileClick?.(memberId);
                          }
                        }}
                        aria-label={`${displayName} 프로필 보기`}
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
                          <strong>
                            {displayName}
                            {isCurrentUser ? " (나)" : ""}
                          </strong>
                          <span>{memberEmail || "이메일 정보 없음"}</span>
                        </div>
                      </div>
                    );
                  })
                : null}
            </div>

            <div className="moodchat-modalActions">
              <button type="button" className="moodchat-primaryButton" onClick={closeMembersPanel}>
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <form className={styles.composer} onSubmit={handleSubmit}>
        {selectedImages.length > 0 ? (
          <div className={styles.composerPreview}>
            <div className={styles.composerPreviewHead}>
              <span>첨부 이미지 {selectedImages.length}/5</span>
              <button type="button" onClick={clearSelectedImages}>
                전체 삭제
              </button>
            </div>
            <div
              className={`${styles.composerPreviewGrid} ${
                selectedImages.length === 1 ? styles.singleComposerPreviewGrid : ""
              }`}
            >
              {selectedImages.map((image) => (
                <div key={image.id} className={styles.composerPreviewItem}>
                  <img src={image.previewUrl} alt={image.file.name} />
                  <button
                    type="button"
                    className={styles.composerPreviewRemoveButton}
                    onClick={() => removeSelectedImage(image.id)}
                    aria-label="첨부 이미지 삭제"
                    title="첨부 이미지 삭제"
                  >
                    <DeleteOutlineRoundedIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {error ? <p className={styles.errorText}>{error}</p> : null}

        <div className={styles.composerRow}>
          <label className={styles.addButton} aria-label="이미지 추가" title="이미지 추가">
            <AddRoundedIcon />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelection}
              disabled={!activeRoom || isUploadingImages}
            />
          </label>
          <div className={styles.inputShell}>
            <input
              ref={messageInputRef}
              placeholder="메시지를 입력하세요..."
              value={messageValue}
              onChange={(event) => setMessageValue(event.target.value)}
              disabled={!activeRoom || isUploadingImages}
            />
            <button
              type="button"
              className={styles.emojiButton}
              aria-label="이모지"
              title="이모지"
              disabled={!activeRoom || isUploadingImages}
              aria-expanded={isEmojiPickerOpen}
              aria-haspopup="dialog"
              onClick={() => setIsEmojiPickerOpen((value) => !value)}
            >
              <SentimentSatisfiedAltRoundedIcon />
            </button>
            <EmojiPicker
              open={isEmojiPickerOpen}
              onSelect={handleEmojiSelect}
              onClose={() => setIsEmojiPickerOpen(false)}
            />
          </div>
          <button
            type="submit"
            className={styles.sendButton}
            aria-label="메시지 보내기"
            title="메시지 보내기"
            disabled={!activeRoom || isUploadingImages}
          >
            <SendRoundedIcon />
          </button>
        </div>
      </form>
    </div>
  );
}

