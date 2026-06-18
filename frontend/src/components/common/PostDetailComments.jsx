﻿import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FlagIcon from "@mui/icons-material/Flag";
import ReplyIcon from "@mui/icons-material/Reply";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";
import { apiClient } from "../../shared/api/client";
import { defaultAvatarSrc } from "../../shared/lib/defaultAvatar";
import { fetchMentionCandidates } from "../../shared/api/followApi";
import { RichTextContent } from "../../shared/ui/rich-text/RichTextContent";
import {
  getActiveMentionStateFromText,
  insertMentionIntoText,
  reconcileMentionsAfterTextChange,
} from "../../shared/lib/mentionUtils";
import { ReportModal } from "./ReportModal";
import styles from "./PostDetailComments.module.css";

function normalizeCommentAuthor(item, member) {
  const author = item?.author || item?.nickname || member?.nickname || "?";
  return author;
}

function normalizeCommentItem(item, member) {
  const memberId = item?.memberId ?? item?.member_id ?? null;
  return {
    ...item,
    memberId,
    profileLink: memberId ? `/app/user/${memberId}` : null,
    profileImageUrl: item?.profileImageUrl ?? item?.profile_image_url ?? null,
    author: normalizeCommentAuthor(item, member),
    content: item?.content ?? item?.text ?? "",
    time: item?.time ?? item?.createdAt ?? item?.created_at ?? "",
    replies: (item?.replies ?? []).map((reply) =>
      normalizeCommentItem(reply, member),
    ),
  };
}

export function PostDetailComments({
  post,
  onCommentCountChange,
  targetCommentId = null,
}) {
  const navigate = useNavigate();
  const { member, accessToken } = useAuthStore();
  const [comment, setComment] = useState("");
  const [localComments, setLocalComments] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [replyingToId, setReplyingToId] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingComment, setReportingComment] = useState(null);
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
  const [expandedReplies, setExpandedReplies] = useState({});
  const menuRef = useRef(null);
  const commentTextareaRef = useRef(null);
  const replyTextareaRef = useRef(null);
  const submittingRef = useRef(false);

  const postId = post?.postId ?? post?.id;
  const countComments = (comments) =>
    comments.reduce(
      (acc, current) => acc + 1 + countComments(current.replies ?? []),
      0,
    );
  const totalCount = useMemo(
    () => countComments(localComments),
    [localComments],
  );

  useEffect(() => {
    if (!postId) return;

    let active = true;
    const loadComments = async () => {
      try {
        const response = await apiClient.get(`/posts/${postId}/comments`);
        const items = response.data?.results || [];
        if (!active) return;

        setLocalComments(
          items.map((item) => normalizeCommentItem(item, member)),
        );
      } catch (error) {
        if (!active) return;
        console.error("댓글을 불러오는 중 오류가 발생했습니다.", error);
        setLocalComments([]);
      }
    };

    loadComments();
    return () => {
      active = false;
    };
  }, [member, postId]);

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
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpenId]);

  useEffect(() => {
    if (onCommentCountChange) {
      onCommentCountChange(totalCount);
    }
  }, [onCommentCountChange, totalCount]);

  useEffect(() => {
    if (!targetCommentId || !localComments.length) {
      return undefined;
    }

    const targetId = String(targetCommentId);
    const expandPath = [];

    const findPath = (items, parents = []) => {
      for (const item of items) {
        const itemId = String(item.commentId ?? item.id);
        const nextParents = [...parents, itemId];

        if (itemId === targetId) {
          return nextParents;
        }

        if (item.replies?.length) {
          const found = findPath(item.replies, nextParents);
          if (found) {
            return found;
          }
        }
      }

      return null;
    };

    const path = findPath(localComments);
    if (!path) {
      return undefined;
    }

    path.slice(0, -1).forEach((id) => {
      expandPath.push(id);
    });

    if (expandPath.length > 0) {
      setExpandedReplies((prev) => {
        const next = { ...prev };
        expandPath.forEach((id) => {
          next[id] = true;
        });
        return next;
      });
    }

    const timerId = window.setTimeout(() => {
      const element = document.getElementById(`comment-item-${targetId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);

    return () => window.clearTimeout(timerId);
  }, [localComments, targetCommentId]);

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

  const handleAuthorNavigation = (event, link) => {
    event.stopPropagation();
    if (link) navigate(link);
  };

  const updateCommentContent = (comments, commentId, newContent) =>
    comments.map((item) => {
      if (item.commentId === commentId) return { ...item, content: newContent };
      return {
        ...item,
        replies: updateCommentContent(
          item.replies ?? [],
          commentId,
          newContent,
        ),
      };
    });

  const handleEditSave = async (commentId) => {
    if (!editText.trim()) return;

    try {
      await apiClient.put(`/posts/comments/${commentId}`, {
        content: editText.trim(),
      });

      setLocalComments((prev) =>
        updateCommentContent(prev, commentId, editText.trim()),
      );
      setEditingId(null);
    } catch {
      alert("댓글 수정에 실패했습니다.");
    }
  };

  const removeCommentById = (comments, commentId) =>
    comments
      .filter((item) => item.commentId !== commentId)
      .map((item) => ({
        ...item,
        replies: removeCommentById(item.replies ?? [], commentId),
      }));

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      await apiClient.delete(`/posts/comments/${commentId}`);

      setLocalComments((prev) => removeCommentById(prev, commentId));
      setMenuOpenId(null);
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
      const response = await apiClient.post(`/posts/${postId}/comments`, {
        content: replyText.trim(),
        parentCommentId,
        mentions: replyMentions,
      });
      const newReply = normalizeCommentItem(response.data.comment, member);
      newReply.mentions = response.data.comment?.mentions ?? replyMentions;

      setLocalComments((prev) =>
        appendReplyToComments(prev, parentCommentId, newReply),
      );
      setExpandedReplies((prev) => ({ ...prev, [parentCommentId]: true }));
      setReplyingToId(null);
      setReplyText("");
      setReplyMentions([]);
      closeReplyMentionBox();
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
      await apiClient.post(`/reports`, {
        commentId: reportingComment.commentId,
        reason,
      });

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const value = comment.trim();
    if (!value) return;

    submittingRef.current = true;
    try {
      const response = await apiClient.post(`/posts/${postId}/comments`, {
        content: value,
        mentions: commentMentions,
      });

      const nextComment = normalizeCommentItem(response.data.comment, member);
      nextComment.mentions = response.data.comment?.mentions ?? commentMentions;
      setLocalComments((prev) => [...prev, nextComment]);
      setComment("");
      setCommentMentions([]);
      closeCommentMentionBox();
      setExpandedReplies((prev) => ({
        ...prev,
        [nextComment.commentId]: true,
      }));
    } catch (error) {
      console.error("댓글 등록에 실패했습니다.", error);
      alert("댓글 등록에 실패했습니다.");
    } finally {
      submittingRef.current = false;
    }
  };

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
      <article
        id={`comment-item-${id}`}
        key={id}
        className={isReply ? styles.replyItem : styles.item}
      >
        <div className={styles.itemHead}>
          <div className={styles.meta}>
            <div
              className={isReply ? styles.replyAvatar : styles.commentAvatar}
              onClick={(event) =>
                handleAuthorNavigation(event, commentProfileLink)
              }
              style={commentProfileLink ? { cursor: "pointer" } : {}}
            >
              {item.profileImageUrl ? (
                <img src={item.profileImageUrl} alt={item.author || "?"} />
              ) : (
                (item.author?.[0] ?? "?")
              )}
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
                      <EditIcon fontSize="small" />
                      수정
                    </button>
                    <button
                      type="button"
                      className={styles.danger}
                      onClick={() => handleDeleteComment(id)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                      삭제
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={styles.danger}
                    onClick={() => handleReportComment(item)}
                  >
                    <FlagIcon fontSize="small" />
                    신고
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
              onChange={(event) => setEditText(event.target.value)}
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
                setExpandedReplies((prev) => ({
                  ...prev,
                  [id]: !prev[id],
                }))
              }
            >
              {expandedReplies[id]
                ? "답글 접기"
                : `답글 ${item.replies.length}개 보기`}
            </button>
          )}
        </div>

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
                placeholder={`@${item.author}에게 답글`}
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
                <SendOutlinedIcon fontSize="small" />
                등록
              </button>
            </div>
          </div>
        )}

        {item.replies?.length > 0 && expandedReplies[id] && (
          <div className={styles.repliesList}>
            {item.replies.map((reply) => renderCommentItem(reply, id))}
          </div>
        )}
      </article>
    );
  };

  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <strong>댓글</strong>
        <span>{totalCount}개</span>
      </header>

      <div className={styles.list}>
        {localComments.length ? (
          localComments.map((item) => renderCommentItem(item))
        ) : (
          <div className={styles.emptyState}>
            아직 댓글이 없습니다. 가장 먼저 댓글을 남겨보세요.
          </div>
        )}
      </div>

      <form className={styles.composer} onSubmit={handleSubmit}>
        <div className={styles.footer}>
          <span>{comment.length}/200</span>
        </div>
        <div className={styles.composerRow}>
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
          <button type="submit" className={styles.send}>
            <SendOutlinedIcon />
            등록
          </button>
        </div>
      </form>
      <ReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSubmit={handleReportSubmit}
        targetId={reportingComment?.commentId}
        targetType="comment"
      />
    </section>
  );
}
