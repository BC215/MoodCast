import { DesktopShell } from "../../components/layout/DesktopShell";
import { MobileShell } from "../../components/layout/MobileShell";
import { useIsDesktop } from "../../hooks/useViewportWidth";
import { useRef, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";
import { apiClient } from "../../shared/api/client";
import styles from "./EditPostPage.module.css";
import { uploadImage } from "../../shared/lib/uploadImage";
import { fetchMentionCandidates } from "../../shared/api/followApi";
import {
  buildPostContent,
  extractImageUrls,
  stripHtml,
} from "../../shared/lib/postHelpers";
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

export function EditPostPage() {
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const { postId } = useParams();
  const editorRef = useRef(null);
  const tagInputRef = useRef(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagList, setTagList] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  // 수정 화면도 본문 글과 첨부 이미지를 분리해서 보여주기 위한 상태임
  const [attachedImages, setAttachedImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { accessToken: token, member } = useAuthStore();
  const [mentionKeyword, setMentionKeyword] = useState("");
  const [mentionCandidates, setMentionCandidates] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionRange, setMentionRange] = useState(null);
  const [mentions, setMentions] = useState([]);

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

  // 게시물 정보 불러오기
  // 수정하려는 게시물 내용을 서버에서 읽어와서 화면에 표시합니다.
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await apiClient.get(`/posts/${postId}`);
        const post = response.data;

        setTitle(post.title || "");
        // 서버에 저장된 HTML에서 글자만 뽑아 textarea에 넣는 처리임
        setContent(stripHtml(post.content || ""));
        setMentions(post.mentions || []);
        // 저장된 img 태그의 src만 따로 뽑아 첨부 이미지 목록으로 보여줌
        setAttachedImages(extractImageUrls(post.content || ""));

        // 태그 파싱 (공백으로 구분된 문자열을 배열로 변환
        if (post.tags) {
          const tags = post.tags
            .trim()
            .split(/\s+/)
            .filter((t) => t);
          setTagList(tags);
        }

        // 감정 설정
        if (post.emotionId) {
          const emotion = EMOTIONS.find((e) => e.id === post.emotionId);
          if (emotion) setSelectedEmotion(emotion);
        }

        setLoading(false);
      } catch (error) {
        console.error("[게시물 수정] 불러오기 실패:", error);
        alert("게시물을 불러오지 못했습니다.");
        navigate("/app");
      }
    };

    fetchPost();
  }, [postId, navigate]);

  // 수정 중인 게시물 본문에 이미지를 업로드합니다.
  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      try {
        const url = await uploadImage(file, { folderType: "post-images" });
        // 새로 올린 이미지도 본문 textarea에는 넣지 않고 목록으로만 관리함
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
    setTagInput(e.target.value);
  };

  const handleTagKeyDown = (e) => {
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const tag = tagInput.trim();
      const cleanTag = tag.startsWith("#") ? tag : `#${tag}`;
      const normalizedTag = cleanTag.toLowerCase();

      if (normalizedTag.length > 1 && !tagList.includes(normalizedTag)) {
        setTagList([...tagList, normalizedTag]);
        setTagInput("");
        tagInputRef.current?.focus();
      } else if (tagList.includes(normalizedTag)) {
        alert("이미 추가된 해시태그입니다.");
        setTagInput("");
      }
    }
  };

  const getFileNameFromUrl = (url) => {
    if (!url) return "이미지";
    const cleaned = url.split("?")[0].split("/").pop() || "이미지";
    return cleaned.length > 18 ? `${cleaned.slice(0, 15)}...` : cleaned;
  };

  const handleRemoveTag = (indexToRemove) => {
    setTagList(tagList.filter((_, index) => index !== indexToRemove));
  };

  const handleImageRemove = (indexToRemove) => {
    // 첨부 이미지 삭제는 목록에서 제거한 뒤 저장 시 최종 반영됨
    setAttachedImages((prev) =>
      prev.filter((_, index) => index !== indexToRemove),
    );
  };

  // 게시물 수정 완료 버튼을 눌렀을 때 백엔드에 수정 요청을 보냅니다.
  const handleSubmit = async () => {
    const effectiveToken =
      token || window.sessionStorage.getItem("moodcast-access-token");
    if (!effectiveToken) {
      alert("로그인이 필요합니다.");
      navigate("/auth/login");
      return;
    }

    // 수정 저장 직전에만 글과 이미지 태그를 다시 합쳐 HTML 본문을 만듦
    const editorContent = buildPostContent(content, attachedImages);

    if (!title.trim() && !editorContent.trim()) {
      alert("제목 또는 본문을 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const tagsString = tagList.join(" ");

      const requestData = {
        title: title.trim(),
        content: editorContent,
        tags: tagsString,
        emotionId: selectedEmotion?.id || null,
        mentions,
      };

      await apiClient.put(`/posts/${postId}`, requestData);

      alert("게시물이 수정되었습니다.");
      navigate("/app");
    } catch (error) {
      console.error("[게시물 수정] 저장 오류:", error);
      console.error("[게시물 수정] 오류 응답:", error.response?.data);
      alert(
        error.response?.data?.message ||
          error.message ||
          "게시물 수정에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>로딩 중...</div>
    );
  }

  const contentArea = (
    <section className={styles.wrap}>
      <div className={styles.hero}>
        <strong>게시물 수정</strong>
        <p>게시물의 내용을 수정할 수 있습니다.</p>
      </div>
      <div className={styles.card}>
        <div className={styles.field}>
          <label htmlFor="postTitle">제목</label>
          <input
            id="postTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="게시물 제목을 입력하세요."
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
                  onClick={() => setSelectedEmotion(emotion)}
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
        </div>

        <div className={styles.field}>
          <label htmlFor="postContent">본문</label>
          <div className={styles.mentionField}>
            <textarea
              id="postContent"
              ref={editorRef}
              className={styles.editor}
              value={content}
              placeholder="오늘의 감정과 생각을 적어보세요."
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
            {mentionOpen ? (
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
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleMentionSelect(candidate)}
                    >
                      <span className={styles.mentionText}>
                        {candidate.nickname || `회원 ${candidate.userId}`}
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
              본문에 들어갈 사진을 선택하세요.
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
                    <div className={styles.imageName}>
                      {getFileNameFromUrl(src)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="postTags">해시태그</label>

          {tagList.length > 0 && (
            <div className={styles.tagContainer}>
              {tagList.map((tag, index) => (
                <div key={index} className={styles.tagChip}>
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(index)}
                    className={styles.tagChipButton}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

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

          <small className={styles.tagHelpText}>
            추가된 태그: {tagList.length}개
            {tagList.length > 0 && ` (${tagList.join(", ")})`}
          </small>
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => navigate("/app")}
          >
            취소
          </button>
          <button
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
          >
            수정하기
          </button>
        </div>
        {saving ? (
          <div className={styles.message}>게시물을 수정하는 중입니다...</div>
        ) : null}
      </div>
    </section>
  );

  if (!desktop)
    return (
      <MobileShell title="게시물 수정" hideSearch>
        {contentArea}
      </MobileShell>
    );
  return <DesktopShell>{contentArea}</DesktopShell>;
}
