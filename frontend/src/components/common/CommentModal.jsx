﻿import CloseIcon from "@mui/icons-material/Close";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FlagIcon from "@mui/icons-material/Flag";
import ReplyIcon from "@mui/icons-material/Reply";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../../stores/useAuthStore";
import { defaultAvatarSrc } from "../../shared/lib/defaultAvatar";
import { fetchMentionCandidates } from "../../shared/api/followApi";
import { RichTextContent } from "../../shared/ui/rich-text/RichTextContent";
import {
  getActiveMentionStateFromText,
  insertMentionIntoText,
  reconcileMentionsAfterTextChange,
} from "../../shared/lib/mentionUtils";
import { HashtagRow } from "./HashtagRow";
import { ReportModal } from "./ReportModal";
import styles from "./CommentModal.module.css";

export function CommentModal({
  open,
  post,
  comments,
  onClose,
  onSubmit,
  onLike,
  onCommentUpdate,
}) {
  const navigate = useNavigate();
  const { member, accessToken } = useAuthStore();
  const BACKSERVER =
    import.meta.env.VITE_BACKSERVER ?? "http://localhost:8080/api";
  const [comment, setComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [localComments, setLocalComments] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  // 대댓글 관련 state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingComment, setReportingComment] = useState(null);
  const [replyingToId, setReplyingToId] = useState(null); // 어느 댓글에 답글을 쓰는지
  const [replyText, setReplyText] = useState("");
  const [commentMentionKeyword, setCommentMentionKeyword] = useState("");
  const [commentMentionCandidates, setCommentMentionCandidates] = useState([]);
  const [commentMentionLoading, setCommentMentionLoading] = useState(false);
  const [commentMentionOpen, setCommentMentionOpen] = useState(false);
  const [commentMentionRange, setCommentMentionRange] = useState(null);
  const [commentMentions, setCommentMentions] = useState([]);
  const [replyMentionKeyword, setReplyMentionKeyword] = useState("");
  const [replyMentionCandidates, setReplyMentionCandidates] = useState([]);
  const [replyMentionLoading, setReplyMentionLoading] = useState(false);
  const [replyMentionOpen, setReplyMentionOpen] = useState(false);
  const [replyMentionRange, setReplyMentionRange] = useState(null);
  const [replyMentions, setReplyMentions] = useState([]);
  const [expandedReplies, setExpandedReplies] = useState({}); // 답글 펼침 여부
  const menuRef = useRef(null);
  const commentTextareaRef = useRef(null);
  const replyTextareaRef = useRef(null);
  const submittingRef = useRef(false);
  const ignoreOverlayClickRef = useRef(false);

  useEffect(() => {
    if (open && post) {
      setLiked(Boolean(post.likedByMe));
      setLikesCount(post.likes ?? 0);
    }
  }, [open, post]);

  useEffect(() => {
    if (!open || !post?.postId) {
      return undefined;
    }

    let active = true;

    const loadComments = async () => {
      try {
        const response = await axios.get(
          `${BACKSERVER}/posts/${post.postId}/comments`,
        );
        const items = response.data?.results || [];
        if (!active) return;

        const normalizeComment = (item) => ({
          ...item,
          profileImageUrl:
            item.profileImageUrl ??
            item.profile_image_url ??
            item.avatarUrl ??
            item.avatar_url ??
            item.imageUrl ??
            item.image_url ??
            item.photoUrl ??
            item.photo ??
            null,
          replies: (item.replies ?? []).map((r) => normalizeComment(r)),
        });

        setLocalComments(items.map((item) => normalizeComment(item)));
      } catch (error) {
        if (!active) return;
        console.error("댓글을 불러오는 중 오류가 발생했습니다.", error);
      }
    };

    loadComments();

    return () => {
      active = false;
    };
  }, [BACKSERVER, open, post?.postId]);

  useEffect(() => {
    const collectExpandableIds = (items, ids = []) => {
      for (const item of items) {
        if (item.replies?.length > 0) {
          const id = item.commentId ?? item.id;
          if (id != null) {
            ids.push(String(id));
          }
          collectExpandableIds(item.replies, ids);
        }
      }
      return ids;
    };

    const expandableIds = collectExpandableIds(localComments);
    if (expandableIds.length === 0) {
      return;
    }

    setExpandedReplies((prev) => {
      const next = { ...prev };
      expandableIds.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
  }, [localComments]);

  useEffect(() => {
    if (!menuOpenId) return undefined;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpenId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpenId]);

  useEffect(() => {
    if (!open) return undefined;

    const { body, documentElement } = document;
    const prevBody = body.style.overflow;
    const prevHtml = documentElement.style.overflow;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    body.classList.add("comment-modal-open");

    return () => {
      body.style.overflow = prevBody;
      documentElement.style.overflow = prevHtml;
      body.classList.remove("comment-modal-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setComment("");
      setCommentMentions([]);
      setReplyMentions([]);
      closeCommentMentionBox();
      closeReplyMentionBox();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      ignoreOverlayClickRef.current = false;
      return undefined;
    }

    ignoreOverlayClickRef.current = true;
    const timerId = window.setTimeout(() => {
      ignoreOverlayClickRef.current = false;
    }, 250);

    return () => window.clearTimeout(timerId);
  }, [open]);

  useEffect(() => {
    const loadCommentMentionCandidates = async () => {
      if (!member?.memberId || !commentMentionOpen) {
        setCommentMentionCandidates([]);
        return;
      }

      setCommentMentionLoading(true);
      try {
        const candidates = await fetchMentionCandidates(
          member.memberId,
          commentMentionKeyword,
        );
        setCommentMentionCandidates(candidates);
      } catch (error) {
        console.error("댓글 멘션 후보 조회 실패", error);
        setCommentMentionCandidates([]);
      } finally {
        setCommentMentionLoading(false);
      }
    };

    loadCommentMentionCandidates();
  }, [commentMentionKeyword, commentMentionOpen, member?.memberId]);

  useEffect(() => {
    const loadReplyMentionCandidates = async () => {
      if (!member?.memberId || !replyMentionOpen) {
        setReplyMentionCandidates([]);
        return;
      }

      setReplyMentionLoading(true);
      try {
        const candidates = await fetchMentionCandidates(
          member.memberId,
          replyMentionKeyword,
        );
        setReplyMentionCandidates(candidates);
      } catch (error) {
        console.error("대댓글 멘션 후보 조회 실패", error);
        setReplyMentionCandidates([]);
      } finally {
        setReplyMentionLoading(false);
      }
    };

    loadReplyMentionCandidates();
  }, [member?.memberId, replyMentionKeyword, replyMentionOpen]);

  const closeCommentMentionBox = () => {
    setCommentMentionKeyword("");
    setCommentMentionOpen(false);
    setCommentMentionRange(null);
    setCommentMentionCandidates([]);
    setCommentMentionLoading(false);
  };

  const closeReplyMentionBox = () => {
    setReplyMentionKeyword("");
    setReplyMentionOpen(false);
    setReplyMentionRange(null);
    setReplyMentionCandidates([]);
    setReplyMentionLoading(false);
  };

  const syncCommentMentionState = (value, caretIndex) => {
    const state = getActiveMentionStateFromText(value, caretIndex);
    if (!state) {
      closeCommentMentionBox();
      return;
    }

    setCommentMentionKeyword(state.query);
    setCommentMentionRange(state);
    setCommentMentionOpen(true);
  };

  const syncReplyMentionState = (value, caretIndex) => {
    const state = getActiveMentionStateFromText(value, caretIndex);
    if (!state) {
      closeReplyMentionBox();
      return;
    }

    setReplyMentionKeyword(state.query);
    setReplyMentionRange(state);
    setReplyMentionOpen(true);
  };

  const handleCommentMentionSelect = (candidate) => {
    const inserted = insertMentionIntoText(
      comment,
      commentMentionRange,
      candidate,
      commentMentions,
    );
    if (!inserted) {
      return;
    }

    setComment(inserted.content);
    setCommentMentions(inserted.mentions);
    closeCommentMentionBox();

    window.requestAnimationFrame(() => {
      commentTextareaRef.current?.focus();
      commentTextareaRef.current?.setSelectionRange(
        inserted.caretIndex,
        inserted.caretIndex,
      );
    });
  };

  const handleReplyMentionSelect = (candidate) => {
    const inserted = insertMentionIntoText(
      replyText,
      replyMentionRange,
      candidate,
      replyMentions,
    );
    if (!inserted) {
      return;
    }

    setReplyText(inserted.content);
    setReplyMentions(inserted.mentions);
    closeReplyMentionBox();

    window.requestAnimationFrame(() => {
      replyTextareaRef.current?.focus();
      replyTextareaRef.current?.setSelectionRange(
        inserted.caretIndex,
        inserted.caretIndex,
      );
    });
  };
  if (!open || !post) return null;

  const postProfileLink =
    post.profileLink ?? (post.memberId ? `/app/user/${post.memberId}` : null);

  const handleEditSave = async (commentId) => {
    if (!editText.trim()) return;
    try {
      await axios.put(
        `${BACKSERVER}/posts/comments/${commentId}`,
        { content: editText.trim() },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const updateContent = (comments) =>
        comments.map((c) => {
          if (c.commentId === commentId)
            return { ...c, content: editText.trim() };
          return { ...c, replies: updateContent(c.replies ?? []) };
        });
      setLocalComments((prev) => updateContent(prev));
      setEditingId(null);
      if (onCommentUpdate) onCommentUpdate();
    } catch {
      alert("댓글 수정에 실패했습니다.");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`${BACKSERVER}/posts/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const removeById = (list) =>
        list
          .filter((c) => c.commentId !== commentId)
          .map((c) => ({ ...c, replies: removeById(c.replies ?? []) }));
      setLocalComments((prev) => removeById(prev));
      setMenuOpenId(null);
      if (onCommentUpdate) onCommentUpdate();
    } catch {
      alert("댓글 삭제에 실패했습니다.");
    }
  };

  const appendReplyToComments = (comments, parentCommentId, newReply) =>
    comments.map((comment) => {
      if (comment.commentId === parentCommentId) {
        return {
          ...comment,
          replies: [...(comment.replies ?? []), newReply],
        };
      }
      return {
        ...comment,
        replies: appendReplyToComments(
          comment.replies ?? [],
          parentCommentId,
          newReply,
        ),
      };
    });

  const handleReplySubmit = async (parentCommentId) => {
    if (!replyText.trim() || submittingRef.current) return;

    submittingRef.current = true;
    try {
      const res = await axios.post(
        `${BACKSERVER}/posts/${post.postId}/comments`,
        {
          content: replyText.trim(),
          parentCommentId,
          mentions: replyMentions,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const newReply = res.data.comment;
      newReply.mentions = newReply.mentions ?? replyMentions;
      newReply.profileImageUrl =
        newReply.profileImageUrl ??
        newReply.profile_image_url ??
        newReply.avatarUrl ??
        newReply.avatar_url ??
        newReply.imageUrl ??
        newReply.image_url ??
        newReply.photoUrl ??
        newReply.photo ??
        null;
      newReply.author = newReply.author ?? member?.nickname;
      setLocalComments((prev) =>
        appendReplyToComments(prev, parentCommentId, newReply),
      );
      setExpandedReplies((prev) => ({ ...prev, [parentCommentId]: true }));
      setReplyingToId(null);
      setReplyText("");
      setReplyMentions([]);
      closeReplyMentionBox();
      if (onCommentUpdate) onCommentUpdate();
    } catch {
      alert("답글 작성에 실패했습니다.");
    } finally {
      submittingRef.current = false;
    }
  };

  const handleReportComment = (commentToReport) => {
    if (!accessToken) {
      alert("로그인이 필요합니다.");
      return;
    }
    setReportingComment(commentToReport);
    setReportModalOpen(true);
    setMenuOpenId(null);
  };

  const handleReportSubmit = async ({ reason }) => {
    if (!accessToken || !reportingComment) {
      alert("오류가 발생했습니다. 다시 시도해주세요.");
      return;
    }
    try {
      await axios.post(
        `${BACKSERVER}/reports`,
        { commentId: reportingComment.commentId, reason },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      setReportModalOpen(false);
      alert("댓글 신고가 정상적으로 접수되었습니다.");
    } catch (error) {
      setReportModalOpen(false);
      const errorMessage = error.response?.data?.message || "";
      // 409 상태 코드 또는 응답 메시지에 '이미 신고'가 포함된 경우를 중복으로 처리
      if (
        error.response?.status === 409 ||
        errorMessage.includes("이미 신고")
      ) {
        alert(errorMessage || "이미 신고된 내용입니다.");
      } else {
        console.error("신고 제출 실패:", error);
        alert("신고 접수에 실패했습니다. 다시 시도해주세요.");
      }
    }
  };

  const handleAuthorNavigation = (event, link) => {
    event.stopPropagation();
    if (link) {
      navigate(link);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const value = comment.trim();
    if (!value) return;

    submittingRef.current = true;
    try {
      const nextComment = await onSubmit({
        content: value,
        mentions: commentMentions,
      });
      if (nextComment) {
        setComment("");
        setCommentMentions([]);
        closeCommentMentionBox();
      }
    } finally {
      submittingRef.current = false;
    }
  };

  const countComments = (list) =>
    list.reduce((acc, c) => acc + 1 + countComments(c.replies ?? []), 0);
  const totalCount = countComments(localComments);

  const renderCommentItem = (item, parentCommentId = null) => {
    const id = item.commentId ?? item.id;
    const commentProfileLink =
      item.profileLink ?? (item.memberId ? `/app/user/${item.memberId}` : null);
    const isMyComment =
      member &&
      item.memberId &&
      String(item.memberId) === String(member.memberId);
    const isReply = parentCommentId !== null;

    return (
      <article key={id} className={isReply ? styles.replyItem : styles.item}>
        <div className={styles.itemHead}>
          <div className={styles.meta}>
            <div
              className={isReply ? styles.replyAvatar : styles.commentAvatar}
              onClick={(event) =>
                handleAuthorNavigation(event, commentProfileLink)
              }
              style={commentProfileLink ? { cursor: "pointer" } : {}}
            >
              <img
                src={item.profileImageUrl || defaultAvatarSrc}
                alt={item.author || "?"}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = defaultAvatarSrc;
                }}
              />
            </div>
            <div>
              <strong
                onClick={(event) =>
                  handleAuthorNavigation(event, commentProfileLink)
                }
                style={commentProfileLink ? { cursor: "pointer" } : {}}
              >
                {item.author}
              </strong>
              <p>{item.time ?? item.createdAt}</p>
            </div>
          </div>
          <div
            className={styles.commentMenuWrap}
            ref={menuOpenId === id ? menuRef : null}
          >
            <button
              type="button"
              className={styles.commentMenuBtn}
              onClick={() => setMenuOpenId(menuOpenId === id ? null : id)}
            >
              <MoreHorizIcon fontSize="small" />
            </button>
            {menuOpenId === id && (
              <div className={styles.commentMenu}>
                {isMyComment ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(id);
                        setEditText(item.content ?? item.text ?? "");
                        setMenuOpenId(null);
                      }}
                    >
                      <EditIcon fontSize="small" /> 수정
                    </button>
                    <button
                      type="button"
                      className={styles.danger}
                      onClick={() => handleDeleteComment(id)}
                    >
                      <DeleteOutlineIcon fontSize="small" /> 삭제
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={styles.danger}
                    onClick={() => handleReportComment(item)}
                  >
                    <FlagIcon fontSize="small" /> 신고
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {editingId === id ? (
          <div className={styles.editArea}>
            <textarea
              className={styles.editInput}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              autoFocus
            />
            <div className={styles.editActions}>
              <button
                type="button"
                className={styles.editCancel}
                onClick={() => setEditingId(null)}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.editSave}
                onClick={() => handleEditSave(id)}
              >
                저장
              </button>
            </div>
          </div>
        ) : (
          <p className={styles.commentText}>
            <RichTextContent
              content={item.content ?? item.text ?? ""}
              mentions={item.mentions ?? []}
              onMentionClick={(mention) => {
                const userId = mention?.userId ?? mention?.mentionedUserId;
                if (userId) {
                  navigate(`/app/user/${userId}`);
                }
              }}
              className={styles.commentTextContent}
              mentionClassName={styles.mentionText}
            />
          </p>
        )}

        <div className={styles.replyActions}>
          <button
            type="button"
            className={styles.replyBtn}
            onClick={() => {
              closeReplyMentionBox();
              setReplyMentions([]);
              setReplyingToId(replyingToId === id ? null : id);
              setReplyText("");
            }}
          >
            <ReplyIcon fontSize="small" />
            답글 쓰기
          </button>
          {item.replies?.length > 0 && (
            <button
              type="button"
              className={styles.toggleRepliesBtn}
              onClick={() =>
                setExpandedReplies((prev) => ({ ...prev, [id]: !prev[id] }))
              }
            >
              {expandedReplies[id]
                ? "답글 접기"
                : `답글 ${item.replies.length}개 보기`}
            </button>
          )}
        </div>

        {/* 이미지 올리기 버튼*/}
        {replyingToId === id && (
          <div className={styles.replyComposer}>
            <div className={styles.mentionField}>
              <textarea
                ref={replyTextareaRef}
                className={styles.replyInput}
                value={replyText}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setReplyText(nextValue);
                  setReplyMentions((prevMentions) =>
                    reconcileMentionsAfterTextChange(
                      replyText,
                      nextValue,
                      prevMentions,
                    ),
                  );
                  syncReplyMentionState(
                    nextValue,
                    event.target.selectionStart ?? nextValue.length,
                  );
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.stopPropagation();
                    handleReplySubmit(id);
                  }
                }}
                onKeyUp={(event) =>
                  syncReplyMentionState(
                    event.currentTarget.value,
                    event.currentTarget.selectionStart ??
                      event.currentTarget.value.length,
                  )
                }
                onClick={(event) =>
                  syncReplyMentionState(
                    event.currentTarget.value,
                    event.currentTarget.selectionStart ??
                      event.currentTarget.value.length,
                  )
                }
                placeholder={`@${item.author}에게 답글 쓰기`}
                rows={2}
                autoFocus
              />
              {replyMentionOpen ? (
                <div className={styles.mentionBox}>
                  {replyMentionLoading ? (
                    <div className={styles.mentionItem}>
                      <span className={styles.mentionText}>
                        멤버를 불러오는 중입니다.
                      </span>
                    </div>
                  ) : replyMentionCandidates.length > 0 ? (
                    replyMentionCandidates.map((candidate) => (
                      <button
                        key={candidate.userId}
                        type="button"
                        className={styles.mentionItem}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          handleReplyMentionSelect(candidate);
                        }}
                      >
                        <span className={styles.mentionCandidateAvatar}>
                          <img
                            src={candidate.profileImage || defaultAvatarSrc}
                            alt={candidate.nickname || "회원"}
                          />
                        </span>
                        <span className={styles.mentionCandidateMeta}>
                          <strong>
                            {candidate.nickname || `회원 ${candidate.userId}`}
                          </strong>
                          <span>{`@${candidate.nickname || ""}`}</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className={styles.mentionItem}>
                      <span className={styles.mentionText}>
                        일치하는 멘션 후보가 없습니다.
                      </span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className={styles.replyComposerActions}>
              <button
                type="button"
                className={styles.editCancel}
                onClick={() => setReplyingToId(null)}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.editSave}
                onClick={() => handleReplySubmit(id)}
              >
                <SendOutlinedIcon fontSize="small" /> 등록
              </button>
            </div>
          </div>
        )}

        {/* 대댓글 목록 */}
        {item.replies?.length > 0 && expandedReplies[id] && (
          <div className={styles.repliesList}>
            {item.replies.map((reply) => renderCommentItem(reply, id))}
          </div>
        )}
      </article>
    );
  };

  return createPortal(
    <div
      className={styles.overlay}
      onClick={() => {
        if (ignoreOverlayClickRef.current) {
          return;
        }
        onClose();
      }}
      role="presentation"
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerMeta}>
            <div
              className={styles.avatar}
              onClick={(event) =>
                handleAuthorNavigation(event, postProfileLink)
              }
              style={postProfileLink ? { cursor: "pointer" } : {}}
            >
              <img
                src={post.profileImageUrl || defaultAvatarSrc}
                alt={post.author || "?"}
              />
            </div>
            <div>
              <strong
                onClick={(event) =>
                  handleAuthorNavigation(event, postProfileLink)
                }
                style={postProfileLink ? { cursor: "pointer" } : {}}
              >
                {post.author}
              </strong>
              <p>{post.time}</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="닫기"
          >
            <CloseIcon />
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.postSection}>
            <p className={styles.postText}>
              <RichTextContent
                content={post.text}
                className={styles.postTextContent}
              />
            </p>
            {post.imageSrc ? (
              <div
                className={styles.postImageArea}
                onClick={() =>
                  post.postId && navigate(`/app/post/${post.postId}`)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    post.postId && navigate(`/app/post/${post.postId}`);
                }}
                style={{ cursor: "pointer" }}
              >
                <img
                  className={styles.detailPostImage}
                  src={post.imageSrc}
                  alt={post.imageAlt ?? post.author}
                />
              </div>
            ) : null}
            <HashtagRow tags={post.tags} variant="modal" />
            <div className={styles.actionRow} aria-label="게시글 반응 영역">
              <button
                type="button"
                className={styles.actionButton}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (onLike) {
                    const result = await onLike(e);
                    if (result !== undefined) {
                      setLiked(result.liked);
                      setLikesCount(result.likes);
                    }
                  }
                }}
              >
                {liked ? (
                  <FavoriteIcon style={{ color: "#e74c3c" }} />
                ) : (
                  <FavoriteBorderIcon style={{ color: "#e74c3c" }} />
                )}
                <span>{likesCount}</span>
              </button>
              <button type="button" className={styles.actionButton}>
                <ChatBubbleOutlineIcon />
                <span>{totalCount}</span>
              </button>
              <button type="button" className={styles.actionButton}>
                <ShareOutlinedIcon />
                <span>공유</span>
              </button>
            </div>
          </section>

          <section className={styles.commentsSection}>
            <div className={styles.sectionTitle}>
              <strong>댓글</strong>
              <span>{totalCount}개</span>
            </div>
            <div className={styles.list}>
              {localComments.length ? (
                localComments.map((item) => renderCommentItem(item))
              ) : (
                <div className={styles.emptyState}>
                  아직 댓글이 없습니다. 가장 먼저 댓글을 남겨보세요.
                </div>
              )}
            </div>
          </section>
        </div>

        <form className={styles.composer} onSubmit={handleSubmit}>
          <div className={styles.mentionField}>
            <textarea
              ref={commentTextareaRef}
              className={styles.replyInput}
              rows={2}
              value={comment}
              onChange={(event) => {
                const nextValue = event.target.value;
                setComment(nextValue);
                setCommentMentions((prevMentions) =>
                  reconcileMentionsAfterTextChange(
                    comment,
                    nextValue,
                    prevMentions,
                  ),
                );
                syncCommentMentionState(
                  nextValue,
                  event.target.selectionStart ?? nextValue.length,
                );
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.stopPropagation();
                  handleSubmit(event);
                }
              }}
              onKeyUp={(event) =>
                syncCommentMentionState(
                  event.currentTarget.value,
                  event.currentTarget.selectionStart ??
                    event.currentTarget.value.length,
                )
              }
              onClick={(event) =>
                syncCommentMentionState(
                  event.currentTarget.value,
                  event.currentTarget.selectionStart ??
                    event.currentTarget.value.length,
                )
              }
              placeholder="댓글을 입력해 주세요."
            />
            {commentMentionOpen ? (
              <div className={styles.mentionBox}>
                {commentMentionLoading ? (
                  <div className={styles.mentionItem}>
                    <span className={styles.mentionText}>
                      멤버를 불러오는 중입니다.
                    </span>
                  </div>
                ) : commentMentionCandidates.length > 0 ? (
                  commentMentionCandidates.map((candidate) => (
                    <button
                      key={candidate.userId}
                      type="button"
                      className={styles.mentionItem}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleCommentMentionSelect(candidate);
                      }}
                    >
                      <span className={styles.mentionCandidateAvatar}>
                        <img
                          src={candidate.profileImage || defaultAvatarSrc}
                          alt={candidate.nickname || "회원"}
                        />
                      </span>
                      <span className={styles.mentionCandidateMeta}>
                        <strong>
                          {candidate.nickname || `회원 ${candidate.userId}`}
                        </strong>
                        <span>{`@${candidate.nickname || ""}`}</span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className={styles.mentionItem}>
                    <span className={styles.mentionText}>
                      일치하는 멘션 후보가 없습니다.
                    </span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <div className={styles.footer}>
            <span>{comment.length}/200</span>
            <button type="submit" className={styles.send}>
              <SendOutlinedIcon />
              등록
            </button>
          </div>
        </form>
      </section>
      <ReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSubmit={handleReportSubmit}
        targetId={reportingComment?.commentId}
        targetType="comment"
      />
    </div>,
    document.body,
  );
}
