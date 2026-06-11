import { useEffect, useMemo, useRef, useState } from "react";
import { AdminLayout } from "../common/AdminLayout";
import { EmptyState } from "../common/EmptyState";
import { SegmentedControl } from "../common/SegmentedControl";
import { useAuthStore } from "../../../../stores/useAuthStore";
import styles from "../../adminComponentsCss/noticeManagement/NoticeManagementPage.module.css";
import {
  createAdminNotice,
  fetchAdminNotices,
  formatCategoryTag,
  NOTICE_CATEGORY,
  NOTICE_STATUS,
  NOTICE_WRITABLE_CATEGORIES,
  sanitizeNoticeHtml,
  softDeleteAdminNotice,
  stripNoticeAlignWrapper,
  toNoticePayload,
  updateAdminNotice,
} from "./noticeStorage";

const noticeCategories = ["전체", "일반", "업데이트", "긴급", "삭제 공지"];
const RECENT_NOTICE_LIMIT = 10;

const initialNoticeForm = {
  title: "",
  category: NOTICE_CATEGORY.GENERAL,
  content: "",
};

const initialEditorMarks = {
  bold: false,
  underline: false,
  unorderedList: false,
  orderedList: false,
  link: false,
  alignCenter: false,
};

export function NoticeManagementPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [noticeForm, setNoticeForm] = useState(initialNoticeForm);
  const [notices, setNotices] = useState([]);
  const [editingNoticeId, setEditingNoticeId] = useState(null);
  const [openedNotice, setOpenedNotice] = useState(null);
  const [noticeResultPopup, setNoticeResultPopup] = useState(null);
  const [showAllNotices, setShowAllNotices] = useState(false);
  const [editorMarks, setEditorMarks] = useState(initialEditorMarks);
  const [editorLink, setEditorLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const editorRef = useRef(null);
  const savedSelectionRef = useRef(null);
  const listEnterCountRef = useRef(0);

  const loadNoticeList = async () => {
    if (!accessToken) {
      setNotices([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextNotices = await fetchAdminNotices(accessToken, "all");
      setNotices(nextNotices);
    } catch {
      setErrorMessage("공지사항 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNoticeList();
  }, [accessToken]);

  useEffect(() => {
    setShowAllNotices(false);
  }, [selectedCategory]);

  useEffect(() => {
    if (!openedNotice && !noticeResultPopup) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [openedNotice, noticeResultPopup]);

  const filteredNotices = useMemo(() => {
    if (selectedCategory === "삭제 공지") {
      return notices.filter((notice) => notice.status === NOTICE_STATUS.DELETE);
    }

    const activeNotices = notices.filter(
      (notice) => notice.status === NOTICE_STATUS.ACTIVE,
    );

    if (selectedCategory === "전체") {
      return activeNotices;
    }

    return activeNotices.filter(
      (notice) => notice.category === selectedCategory,
    );
  }, [notices, selectedCategory]);

  const isEditing = editingNoticeId !== null;
  const isDeletedNoticeTab = selectedCategory === "삭제 공지";
  const displayedNotices = showAllNotices
    ? filteredNotices
    : filteredNotices.slice(0, RECENT_NOTICE_LIMIT);
  const hasMoreNotices = filteredNotices.length > RECENT_NOTICE_LIMIT;

  const categoryClassMap = {
    [NOTICE_CATEGORY.GENERAL]: styles.categoryGeneral,
    [NOTICE_CATEGORY.UPDATE]: styles.categoryUpdate,
    [NOTICE_CATEGORY.URGENT]: styles.categoryUrgent,
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setNoticeForm((prevForm) => ({ ...prevForm, [name]: value }));
  };

  const saveEditorSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;

    if (
      !editor ||
      !selection ||
      selection.rangeCount === 0 ||
      !anchorNode ||
      !editor.contains(anchorNode)
    ) {
      return;
    }

    savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
  };

  const restoreEditorSelection = () => {
    const editor = editorRef.current;
    const range = savedSelectionRef.current;

    if (!editor) {
      return;
    }

    editor.focus();

    if (!range) {
      return;
    }

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const updateEditorContent = () => {
    if (!editorRef.current) {
      return;
    }

    setNoticeForm((prevForm) => ({
      ...prevForm,
      content: sanitizeNoticeHtml(editorRef.current.innerHTML),
    }));
  };

  const resetForm = () => {
    setNoticeForm(initialNoticeForm);
    setEditingNoticeId(null);
    setEditorMarks(initialEditorMarks);
    setEditorLink("");
    savedSelectionRef.current = null;
    listEnterCountRef.current = 0;

    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
  };

  const ensureEditorCommandState = (command, shouldBeActive) => {
    const isActive = document.queryCommandState(command);

    if (isActive !== shouldBeActive) {
      document.execCommand(command, false, null);
    }
  };

  const applyEditorState = (marks = editorMarks) => {
    restoreEditorSelection();

    document.execCommand("styleWithCSS", false, true);
    ensureEditorCommandState("bold", marks.bold);
    ensureEditorCommandState("underline", marks.underline);

    updateEditorContent();
    saveEditorSelection();
  };

  const toggleInlineMark = (markKey) => {
    const nextMarks = {
      ...editorMarks,
      [markKey]: !editorMarks[markKey],
    };

    setEditorMarks(nextMarks);
    applyEditorState(nextMarks);
  };

  const toggleListMark = (markKey, command) => {
    listEnterCountRef.current = 0;

    const oppositeKey = markKey === "unorderedList" ? "orderedList" : "unorderedList";
    const nextMarks = {
      ...editorMarks,
      [markKey]: !editorMarks[markKey],
      [oppositeKey]: false,
    };

    setEditorMarks(nextMarks);
    restoreEditorSelection();
    ensureEditorCommandState(command, nextMarks[markKey]);

    if (!nextMarks[markKey]) {
      applyEditorState(nextMarks);
      return;
    }

    const oppositeCommand =
      command === "insertUnorderedList" ? "insertOrderedList" : "insertUnorderedList";
    ensureEditorCommandState(oppositeCommand, false);
    applyEditorState(nextMarks);
  };

  const disableInlineMarksAfterEnter = () => {
    const nextMarks = {
      ...editorMarks,
      bold: false,
      underline: false,
    };

    setEditorMarks(nextMarks);
    applyEditorState(nextMarks);
  };

  const toggleLinkMark = () => {
    if (editorMarks.link) {
      setEditorMarks((prevMarks) => ({ ...prevMarks, link: false }));
      setEditorLink("");
      restoreEditorSelection();
      document.execCommand("unlink", false, null);
      updateEditorContent();
      saveEditorSelection();
      return;
    }

    const link = window.prompt("링크 주소를 입력하세요.", "https://");
    if (!link) {
      return;
    }

    const trimmedLink = link.trim();
    if (!/^(https?:\/\/|mailto:|tel:)/i.test(trimmedLink)) {
      setNoticeResultPopup({
        title: "처리 실패",
        message: "링크는 http, https, mailto, tel 주소만 사용할 수 있습니다.",
      });
      return;
    }

    setEditorMarks((prevMarks) => ({ ...prevMarks, link: true }));
    setEditorLink(trimmedLink);
    restoreEditorSelection();
    document.execCommand("createLink", false, trimmedLink);
    updateEditorContent();
    saveEditorSelection();
  };

  const handleToolbarMouseDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleEditorInput = () => {
    updateEditorContent();
    saveEditorSelection();
  };

  const handleEditorPaste = (event) => {
    event.preventDefault();

    const clipboardData = event.clipboardData;
    const htmlContent = clipboardData?.getData("text/html");
    const textContent = clipboardData?.getData("text/plain") || "";
    const safeContent = htmlContent
      ? sanitizeNoticeHtml(htmlContent)
      : textContent.replace(/\r?\n/g, "<br>");

    restoreEditorSelection();
    document.execCommand("insertHTML", false, safeContent);
    updateEditorContent();
    saveEditorSelection();
  };

  const handleEditorSelectionChange = () => {
    saveEditorSelection();
  };

  const handleEditorKeyDown = (event) => {
    if (event.key !== "Enter") {
      listEnterCountRef.current = 0;
      return;
    }

    const isListMode = editorMarks.unorderedList || editorMarks.orderedList;
    if (isListMode) {
      listEnterCountRef.current += 1;

      if (listEnterCountRef.current >= 2) {
        requestAnimationFrame(() => {
          const nextMarks = {
            ...editorMarks,
            unorderedList: false,
            orderedList: false,
          };

          setEditorMarks(nextMarks);
          restoreEditorSelection();
          ensureEditorCommandState("insertUnorderedList", false);
          ensureEditorCommandState("insertOrderedList", false);
          applyEditorState(nextMarks);
          updateEditorContent();
          saveEditorSelection();
          listEnterCountRef.current = 0;
        });
      }

      return;
    }

    listEnterCountRef.current = 0;

    if (!editorMarks.bold && !editorMarks.underline) {
      return;
    }

    requestAnimationFrame(disableInlineMarksAfterEnter);
  };

  const handleSubmitNotice = async (event) => {
    event.preventDefault();

    const trimmedTitle = noticeForm.title.trim();
    const plainContent = noticeForm.content.replace(/<[^>]*>/g, "").trim();

    if (!trimmedTitle || !plainContent) {
      return;
    }

    const payload = toNoticePayload(
      {
        ...noticeForm,
        title: trimmedTitle,
      },
      editorMarks.alignCenter,
    );

    try {
      if (isEditing) {
        await updateAdminNotice(accessToken, editingNoticeId, payload);
        setNoticeResultPopup({
          title: "수정 완료",
          message: "공지사항이 수정되었습니다.",
        });
      } else {
        await createAdminNotice(accessToken, payload);
        setNoticeResultPopup({
          title: "작성 완료",
          message: "공지사항이 작성되었습니다.",
        });
      }

      resetForm();
      await loadNoticeList();
    } catch {
      setNoticeResultPopup({
        title: "처리 실패",
        message: "공지사항 저장 중 문제가 발생했습니다.",
      });
    }
  };

  const handleEditNotice = (notice) => {
    if (notice.status === NOTICE_STATUS.DELETE) {
      return;
    }

    const editableContent = stripNoticeAlignWrapper(notice.content);

    setEditingNoticeId(notice.id);
    setNoticeForm({
      title: notice.title,
      category: notice.category,
      content: editableContent,
    });
    setEditorMarks({
      ...initialEditorMarks,
      alignCenter: Boolean(notice.alignCenter),
    });
    setEditorLink("");

    requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = editableContent;
        editorRef.current.focus();
        saveEditorSelection();
      }
    });
  };

  const handleDeleteNotice = async (noticeId) => {
    try {
      await softDeleteAdminNotice(accessToken, noticeId);
      await loadNoticeList();
      if (editingNoticeId === noticeId) {
        resetForm();
      }
      if (openedNotice?.id === noticeId) {
        setOpenedNotice(null);
      }
    } catch {
      setNoticeResultPopup({
        title: "처리 실패",
        message: "공지사항 삭제 중 문제가 발생했습니다.",
      });
    }
  };

  const editorButtons = [
    { key: "bold", label: "굵게", pressed: editorMarks.bold, onClick: () => toggleInlineMark("bold") },
    { key: "underline", label: "밑줄", pressed: editorMarks.underline, onClick: () => toggleInlineMark("underline") },
    { key: "unorderedList", label: "목록", pressed: editorMarks.unorderedList, onClick: () => toggleListMark("unorderedList", "insertUnorderedList") },
    { key: "orderedList", label: "번호", pressed: editorMarks.orderedList, onClick: () => toggleListMark("orderedList", "insertOrderedList") },
    { key: "link", label: "링크", pressed: editorMarks.link, onClick: toggleLinkMark },
    {
      key: "alignCenter",
      label: "가운데",
      pressed: editorMarks.alignCenter,
      onClick: () =>
        setEditorMarks((prevMarks) => ({
          ...prevMarks,
          alignCenter: !prevMarks.alignCenter,
        })),
    },
  ];

  return (
    <AdminLayout
      title="공지사항 관리"
      description="공지사항을 작성, 수정, 삭제하고 목록을 관리하세요."
    >
      <section className={styles.composePanel}>
        <div className={styles.composeHeader}>
          <div>
            <h2>{isEditing ? "공지사항 수정" : "공지사항 작성"}</h2>
          </div>
          <span className={styles.modeBadge}>
            {isEditing ? "수정 중" : "새 공지"}
          </span>
        </div>

        <form className={styles.noticeForm} onSubmit={handleSubmitNotice}>
          <label className={styles.titleField}>
            공지사항 제목
            <input
              name="title"
              type="text"
              value={noticeForm.title}
              placeholder="공지사항 제목을 입력하세요"
              onChange={handleFormChange}
            />
          </label>

          <label className={styles.categoryField}>
            공지사항 분류
            <select
              name="category"
              value={noticeForm.category}
              onChange={handleFormChange}
            >
              {NOTICE_WRITABLE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.fullField}>
            <span className={styles.fieldLabel}>공지사항 내용</span>
            <div className={styles.editorShell}>
              <div className={styles.editorToolbar}>
                {editorButtons.map((button) => (
                  <button
                    key={button.key}
                    type="button"
                    onMouseDown={handleToolbarMouseDown}
                    onClick={button.onClick}
                    aria-pressed={button.pressed}
                    title={
                      button.key === "link" && editorLink
                        ? editorLink
                        : button.label
                    }
                    className={button.pressed ? styles.editorButtonActive : ""}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
              <div
                ref={editorRef}
                className={styles.richEditor}
                contentEditable
                data-placeholder="공지사항 내용을 입력하세요"
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onPaste={handleEditorPaste}
                onFocus={handleEditorSelectionChange}
                onKeyUp={handleEditorSelectionChange}
                onKeyDown={handleEditorKeyDown}
                onMouseUp={handleEditorSelectionChange}
                aria-label="공지사항 텍스트 에디터"
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={resetForm}>
              {isEditing ? "수정 취소" : "초기화"}
            </button>
            <button type="submit" disabled={isLoading}>
              {isEditing ? "공지사항 수정" : "공지사항 작성"}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.toolbar}>
        <SegmentedControl
          labels={noticeCategories}
          selectedLabel={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>{isDeletedNoticeTab ? "삭제 공지 목록" : "공지사항 목록"}</h2>
            <span>
              {isDeletedNoticeTab
                ? "DELETE 상태 공지만 완전 삭제할 수 있습니다."
                : "최신 공지 1건만 대시보드 팝업에 노출됩니다."}
            </span>
          </div>
          {hasMoreNotices ? (
            <button
              type="button"
              className={styles.viewAllButton}
              onClick={() => setShowAllNotices((prevValue) => !prevValue)}
            >
              {showAllNotices ? "최근 10개 보기" : "전체 보기"}
            </button>
          ) : null}
        </div>

        {errorMessage ? <p className={styles.errorText}>{errorMessage}</p> : null}

        <div className={styles.tableWrap}>
          <table
            className={`${styles.noticeTable} ${
              isDeletedNoticeTab ? styles.deletedNoticeTable : ""
            }`}
          >
            <thead>
              <tr>
                <th>분류</th>
                <th>공지사항 제목</th>
                <th>작성일</th>
                <th>작성 관리자</th>
                {isDeletedNoticeTab ? <th>삭제일</th> : null}
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {displayedNotices.length > 0 ? (
                displayedNotices.map((notice) => (
                  <tr key={notice.id}>
                    <td>
                      <span
                        className={`${styles.categoryBadge} ${categoryClassMap[notice.category] || ""}`}
                      >
                        {formatCategoryTag(notice.category)}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.noticeTitleButton}
                        type="button"
                        onClick={() => setOpenedNotice(notice)}
                      >
                        {notice.title}
                      </button>
                    </td>
                    <td>
                      {notice.createdAt}
                      {notice.isExpired ? (
                        <span className={styles.expiredBadge}>만료</span>
                      ) : null}
                    </td>
                    <td>{notice.adminName}</td>
                    {isDeletedNoticeTab ? <td>{notice.deletedAt}</td> : null}
                    <td>
                      <div className={styles.rowActions}>
                        {isDeletedNoticeTab ? (
                          <span className={styles.actionMuted}>삭제됨</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditNotice(notice)}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNotice(notice.id)}
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isDeletedNoticeTab ? 6 : 5}>
                    <EmptyState
                      title={isDeletedNoticeTab ? "삭제 공지 없음" : "공지사항 없음"}
                      description={
                        isDeletedNoticeTab
                          ? "소프트 삭제 상태의 공지사항이 없습니다."
                          : "작성된 공지사항이 없거나 선택한 필터에 해당하는 공지사항이 없습니다."
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {openedNotice ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={() => setOpenedNotice(null)}
        >
          <section
            className={styles.noticeModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notice-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHead}>
              <div>
                <span
                  className={`${styles.categoryBadge} ${categoryClassMap[openedNotice.category] || ""}`}
                >
                  {formatCategoryTag(openedNotice.category)}
                </span>
                <h2 id="notice-modal-title">{openedNotice.title}</h2>
              </div>
              <button type="button" onClick={() => setOpenedNotice(null)}>
                닫기
              </button>
            </div>
            <div className={styles.modalMeta}>
              <span>작성일 {openedNotice.createdAt}</span>
              <span>작성 관리자 {openedNotice.adminName}</span>
              {openedNotice.updatedAt ? (
                <span>수정일 {openedNotice.updatedAt}</span>
              ) : null}
            </div>
            <div
              className={`${styles.modalContent} ${
                openedNotice.alignCenter ? styles.modalContentCenter : ""
              }`}
              dangerouslySetInnerHTML={{ __html: openedNotice.content }}
            />
          </section>
        </div>
      ) : null}

      {noticeResultPopup ? (
        <section
          className={styles.noticeResultLayer}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="notice-result-title"
        >
          <button
            type="button"
            className={styles.noticeResultDim}
            aria-label="공지사항 작성 결과 팝업 닫기"
            onClick={() => setNoticeResultPopup(null)}
          />

          <article className={styles.noticeResultPopup}>
            <span className={styles.noticeResultBadge}>
              {noticeResultPopup.title.includes("실패") ? "실패" : "성공"}
            </span>
            <h3 id="notice-result-title">{noticeResultPopup.title}</h3>
            <p>{noticeResultPopup.message}</p>
            <button type="button" onClick={() => setNoticeResultPopup(null)}>
              확인
            </button>
          </article>
        </section>
      ) : null}
    </AdminLayout>
  );
}
