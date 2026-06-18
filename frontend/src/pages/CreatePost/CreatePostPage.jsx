﻿import { DesktopShell } from "../../components/layout/DesktopShell";
import { MobileShell } from "../../components/layout/MobileShell";
import { useIsDesktop } from "../../hooks/useViewportWidth";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";
import { apiClient } from "../../shared/api/client";
import styles from "./CreatePostPage.module.css";
import { uploadImage } from "../../shared/lib/uploadImage";
import { fetchMentionCandidates } from "../../shared/api/followApi";
import { defaultAvatarSrc } from "../../shared/lib/defaultAvatar";
import { buildPostContent } from "../../shared/lib/postHelpers";
import {
  getActiveMentionStateFromText,
  insertMentionIntoText,
  reconcileMentionsAfterTextChange,
} from "../../shared/lib/mentionUtils";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import SpaIcon from "@mui/icons-material/Spa";
import MoodBadIcon from "@mui/icons-material/MoodBad";
import CelebrationIcon from "@mui/icons-material/Celebration";
import SentimentNeutralIcon from "@mui/icons-material/SentimentNeutral";

const EMOTIONS = [
  { id: 1, name: "행복해요", icon: EmojiEmotionsIcon, color: "#FFD700" },
  { id: 2, name: "슬퍼요", icon: SentimentDissatisfiedIcon, color: "#4A90E2" },
  { id: 3, name: "차분해요", icon: SpaIcon, color: "#F4A460" },
  { id: 4, name: "화가나요", icon: MoodBadIcon, color: "#E74C3C" },
  { id: 5, name: "신나요", icon: CelebrationIcon, color: "#FF69B4" },
  { id: 6, name: "무덤덤해요", icon: SentimentNeutralIcon, color: "#95A5A6" },
];

export function CreatePostPage() {
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const tagInputRef = useRef(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  // textarea에는 글만 보여주고, 첨부 이미지는 따로 관리하기 위한 상태임
  const [attachedImages, setAttachedImages] = useState([]);
  const [tagList, setTagList] = useState([]); // 배열로 관리
  const [tagInput, setTagInput] = useState(""); // 현재 입력 중인 값
  const [selectedEmotion, setSelectedEmotion] = useState(null); // 선택한 감정
  const [emotionError, setEmotionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [mentionKeyword, setMentionKeyword] = useState("");
  const [mentionCandidates, setMentionCandidates] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionRange, setMentionRange] = useState(null);
  const [mentions, setMentions] = useState([]);
  const mentionMode = mentionOpen;
  const { accessToken: token, member } = useAuthStore();

  const closeMentionBox = () => {
    setMentionKeyword("");
    setMentionOpen(false);
    setMentionRange(null);
  };

  useEffect(() => {
    const loadMentionCandidates = async () => {
      const currentMemberId = member?.memberId;
      if (!currentMemberId || !mentionOpen) {
        setMentionCandidates([]);
        return;
      }

      setMentionLoading(true);
      try {
        const candidates = await fetchMentionCandidates(
          currentMemberId,
          mentionKeyword,
          token || window.sessionStorage.getItem("moodcast-access-token"),
        );
        setMentionCandidates(candidates);
      } catch (error) {
        console.error("멘션 후보 조회 실패", error);
        setMentionCandidates([]);
      } finally {
        setMentionLoading(false);
      }
    };

    loadMentionCandidates();
  }, [mentionKeyword, mentionOpen, token, member]);

  const syncMentionState = (value, caretIndex) => {
    const state = getActiveMentionStateFromText(value, caretIndex);
    if (!state) {
      closeMentionBox();
      return;
    }

    setMentionKeyword(state.query);
    setMentionRange(state);
    setMentionOpen(true);
  };

  const handleContentChange = (event) => {
    const nextContent = event.target.value;
    const nextMentions = reconcileMentionsAfterTextChange(
      content,
      nextContent,
      mentions,
    );
    setContent(nextContent);
    setMentions(nextMentions);
    syncMentionState(
      nextContent,
      event.target.selectionStart ?? nextContent.length,
    );
  };

  const handleMentionSelect = (candidate) => {
    const inserted = insertMentionIntoText(
      content,
      mentionRange,
      candidate,
      mentions,
    );
    if (!inserted) {
      return;
    }

    setContent(inserted.content);
    setMentions(inserted.mentions);
    setMentionKeyword("");
    setMentionOpen(false);
    setMentionRange(null);
    setMentionCandidates([]);

    window.requestAnimationFrame(() => {
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(
        inserted.caretIndex,
        inserted.caretIndex,
      );
    });
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      try {
        const url = await uploadImage(file, { folderType: "post-images" });
        // 업로드한 이미지는 본문 문자열에 넣지 않고 미리보기 목록에만 추가함
        setAttachedImages((prev) => [...prev, url]);
      } catch (err) {
        if (err?.isAuthError) {
          return;
        }
        alert(`이미지 업로드 실패: ${err.message}`);
      }
    }

    event.target.value = "";
  };

  const handleTagInput = (e) => {
    const value = e.target.value;
    setTagInput(value);
  };

  // 태그 입력 필드에서 엔터를 누르면 해시태그를 추가합니다.
  const handleTagKeyDown = (e) => {
    // 한글 조합 중인 경우 엔터를 처리하지 않습니다.
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const tag = tagInput.trim();

      // # 기호가 없으면 추가하고, 있으면 그대로 소문자로 정규화합니다.
      const cleanTag = tag.startsWith("#") ? tag : `#${tag}`;
      const normalizedTag = cleanTag.toLowerCase();

      // 유효성 검사: 빈 태그와 중복 태그를 제외합니다.
      if (normalizedTag.length > 1 && !tagList.includes(normalizedTag)) {
        setTagList([...tagList, normalizedTag]);
        setTagInput(""); // 입력 값 초기화
        tagInputRef.current?.focus(); // 포커스 유지
      } else if (tagList.includes(normalizedTag)) {
        alert("이미 추가한 해시태그입니다.");
        setTagInput("");
      }
    }
  };

  const handleRemoveTag = (indexToRemove) => {
    setTagList(tagList.filter((_, index) => index !== indexToRemove));
  };

  const handleImageRemove = (indexToRemove) => {
    // 사용자가 지운 이미지는 첨부 목록에서만 제거하면 됨
    setAttachedImages((prev) =>
      prev.filter((_, index) => index !== indexToRemove),
    );
  };

  // 게시물 작성 완료 버튼을 눌렀을 때 서버로 저장 요청을 보냅니다.
  const handleSubmit = async () => {
    const effectiveToken =
      token || window.sessionStorage.getItem("moodcast-access-token");
    if (!effectiveToken) {
      alert("로그인이 필요합니다.");
      navigate("/auth/login");
      return;
    }

    // 저장 직전에만 글 + 이미지 HTML을 합쳐서 서버로 보냄
    const editorContent = buildPostContent(content, attachedImages);

    if (!title.trim() && !editorContent.trim()) {
      alert("제목 또는 본문을 입력해 주세요.");
      return;
    }

    if (!selectedEmotion) {
      setEmotionError("오늘의 감정을 선택해 주세요.");
      return;
    }

    setEmotionError("");
    setSaving(true);
    try {
      // 태그 배열을 공백 구분 문자열로 변환합니다.
      const tagsString = tagList.join(" ");

      const requestData = {
        title: title.trim(),
        content: editorContent,
        tags: tagsString,
        emotionId: selectedEmotion.id, // 선택한 감정 ID
        mentions,
      };

      await apiClient.post(`/posts`, requestData, {
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
        },
      });

      setTitle("");
      setContent("");
      setAttachedImages([]);
      setTagList([]);
      setTagInput("");
      setSelectedEmotion(null); // 감정 초기화      setMentionKeyword('');
      setMentionCandidates([]);
      setMentionOpen(false);
      setMentionRange(null);
      setMentionLoading(false);
      setMentions([]);
      window.alert("게시물이 저장되었습니다.");
      navigate("/app");
    } catch (error) {
      console.error("[게시물 작성] 저장 오류:", error);
      console.error("[게시물 작성] 오류 응답:", error.response?.data);
      alert(
        error.response?.data?.message ||
          error.message ||
          "게시물 저장에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  const contentArea = (
    <section className={styles.wrap}>
      <div className={styles.hero}>
        <strong>게시물 작성</strong>
        <p>감정, 사진, 태그까지 함께 넣어 게시물을 만들 수 있습니다.</p>
      </div>
      <div className={styles.card}>
        <div className={styles.field}>
          <label htmlFor="postTitle">제목</label>
          <input
            id="postTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="게시물 제목을 입력하세요"
          />
        </div>

        <div className={styles.field}>
          <label>오늘의 감정</label>
          <div className={styles.emotionGrid}>
            {EMOTIONS.map((emotion) => {
              const IconComponent = emotion.icon;
              return (
                <button
                  key={emotion.id}
                  type="button"
                  className={`${styles.emotionButton} ${selectedEmotion?.id === emotion.id ? styles.emotionSelected : ""}`}
                  onClick={() => {
                    setSelectedEmotion(emotion);
                    setEmotionError("");
                  }}
                  style={
                    selectedEmotion?.id === emotion.id
                      ? {
                          borderColor: emotion.color,
                          backgroundColor: emotion.color + "20",
                        }
                      : {}
                  }
                >
                  <IconComponent
                    sx={{ fontSize: "1.8rem", color: emotion.color }}
                  />
                  <span className={styles.emotionName}>{emotion.name}</span>
                </button>
              );
            })}
          </div>
          {emotionError ? (
            <p className={styles.fieldError}>{emotionError}</p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="postContent">본문</label>
          <div className={styles.mentionInputWrap}>
            <textarea
              id="postContent"
              ref={editorRef}
              className={styles.editor}
              value={content}
              placeholder="오늘의 감정과 생각을 적어보세요"
              onChange={handleContentChange}
              onKeyUp={(event) =>
                syncMentionState(
                  event.currentTarget.value,
                  event.currentTarget.selectionStart,
                )
              }
              onClick={(event) =>
                syncMentionState(
                  event.currentTarget.value,
                  event.currentTarget.selectionStart,
                )
              }
            />
            {mentionMode ? (
              <div className={styles.mentionBox}>
                {mentionLoading ? (
                  <div className={styles.mentionItem}>
                    <span className={styles.mentionText}>
                      멘션 후보를 불러오는 중입니다.
                    </span>
                  </div>
                ) : mentionCandidates.length > 0 ? (
                  mentionCandidates.map((candidate) => (
                    <button
                      key={candidate.userId}
                      type="button"
                      className={styles.mentionItem}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleMentionSelect(candidate);
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
        </div>

        <div className={`${styles.uploadSection} ${styles.bodyUploadSection}`}>
          <div className={styles.uploadGroup}>
            <label className={styles.uploadButton}>
              사진 첨부
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
            </label>
            <span className={styles.uploadDescription}>
              본문에 들어갈 사진을 선택하세요
            </span>
          </div>

          {attachedImages.length > 0 && (
            <div className={styles.imageList}>
              <strong>첨부된 사진</strong>
              <div className={styles.imageGrid}>
                {attachedImages.map((src, index) => (
                  <div key={`${src}-${index}`} className={styles.imageItem}>
                    <div className={styles.imageThumbWrap}>
                      <img
                        src={src}
                        alt={`첨부 이미지 ${index + 1}`}
                        className={styles.imageThumb}
                      />
                      <button
                        type="button"
                        className={styles.imageRemoveButton}
                        onClick={() => handleImageRemove(index)}
                        aria-label={`첨부 이미지 ${index + 1} 삭제`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="postTags">해시태그</label>

          {/* 추가한 해시태그 표시 */}
          {tagList.length > 0 && (
            <div className={styles.tagContainer}>
              {tagList.map((tag, index) => (
                <div key={index} className={styles.tagChip}>
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(index)}
                    className={styles.tagChipButton}
                    aria-label={`${tag} 태그 삭제`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 해시태그 입력 필드 */}
          <input
            ref={tagInputRef}
            id="postTags"
            value={tagInput}
            onChange={handleTagInput}
            onKeyDown={handleTagKeyDown}
            placeholder={
              tagList.length === 0
                ? "#태그를 입력하고 엔터를 누르세요"
                : "추가할 태그를 입력하고 엔터"
            }
            style={{ width: "100%" }}
          />

          {/* 입력 안내문 */}
          <small className={styles.tagHelpText}>
            추가한 태그: {tagList.length}개
            {tagList.length > 0 && ` (${tagList.join(", ")})`}
          </small>
        </div>

        <button
          type="button"
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={saving || !selectedEmotion}
        >
          게시하기
        </button>
        {saving ? (
          <div className={styles.message}>게시물을 저장하는 중입니다...</div>
        ) : null}
      </div>
    </section>
  );

  if (!desktop)
    return (
      <MobileShell title="게시물 작성" hideSearch>
        {contentArea}
      </MobileShell>
    );
  return <DesktopShell>{contentArea}</DesktopShell>;
}
