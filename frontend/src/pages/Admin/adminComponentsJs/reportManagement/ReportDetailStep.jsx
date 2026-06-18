import { useState } from "react";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import {
  extractImageUrls,
  normalizeBackendUrl,
  stripHtml,
} from "../../../../shared/lib/postHelpers";
import { DrawerHeader } from "./ReportDrawerHeader";
import styles from "../../adminComponentsCss/reportManagement/ReportDetailStep.module.css";

export function ReportDetailStep({ report, onClose, onProcess }) {
  const [isReporterModalOpen, setIsReporterModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isPostDetailModalOpen, setIsPostDetailModalOpen] = useState(false);
  const visibleActivities = (report.activities || []).slice(0, 5);
  const isCommentReport = report.type === "댓글";
  const BACKSERVER = import.meta.env.VITE_BACKSERVER || "/api";
  const postImageSrcs = getPostImageSrcs(report, BACKSERVER);
  const targetText = stripHtml(report.targetContent || report.detail || "");
  const commentText = stripHtml(report.commentContent || "");

  return (
    <>
      <DrawerHeader title={report.title} onClose={onClose} />

      <div className={styles.drawerBody}>
        <section className={styles.detailSection}>
          <h3>신고 개요</h3>
          <div className={styles.overviewCard}>
            <div className={styles.profileThumb}>
              <PersonOutlineOutlinedIcon />
            </div>
            <dl>
              <div>
                <dt>신고 대상</dt>
                <dd>
                  <strong>{report.targetName}</strong>
                  <span>{report.targetHandle}</span>
                </dd>
              </div>
              <div>
                <dt>신고 수</dt>
                <dd>{report.reportCount}건</dd>
              </div>
              <div>
                <dt>최초 신고</dt>
                <dd>{report.firstReportedAt}</dd>
              </div>
              <div>
                <dt>최근 신고</dt>
                <dd>{report.latestReportedAt}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className={styles.detailSection}>
          <h3>신고 사유</h3>
          <strong className={styles.reasonText}>{report.reason}</strong>
          {isCommentReport ? (
            <div className={styles.reportedContentBox}>
              <span>게시글</span>
              <strong>{report.title}</strong>
              <button
                className={styles.inlineDetailButton}
                type="button"
                onClick={() => setIsPostDetailModalOpen(true)}
              >
                게시글 상세 보기
              </button>
              <span>댓글 내용</span>
              <p>{commentText || "-"}</p>
            </div>
          ) : (
            <div className={styles.reportedContentBox}>
              <div className={styles.reportedContentHead}>
                <span>게시글 내용</span>
                <button
                  className={styles.inlineDetailButton}
                  type="button"
                  onClick={() => setIsPostDetailModalOpen(true)}
                >
                  게시글 상세 보기
                </button>
              </div>
              {postImageSrcs.length > 0 && (
                <ReportImageGallery images={postImageSrcs} title={report.title} />
              )}
              <p>{targetText || "-"}</p>
            </div>
          )}
        </section>

        <section className={styles.detailSection}>
          <div className={styles.sectionHead}>
            <h3>신고자({report.reporterCount})</h3>
            <button type="button" onClick={() => setIsReporterModalOpen(true)}>
              전체 보기
            </button>
          </div>
          <div className={styles.reporterList}>
            {(report.reporters || []).slice(0, 3).map((reporter, index) => (
              <div key={reporter.id || `${reporter.name}-${index}`}>
                <span>{index + 1}</span>
                <strong>{reporter.name}</strong>
                {reporter.handle && <em>{reporter.handle}</em>}
                <small>
                  {reporter.reportCount > 1
                    ? `${reporter.reportCount}건 · ${reporter.reportedAt}`
                    : reporter.reportedAt}
                </small>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.detailSection}>
          <h3>대상 사용자 정보</h3>
          <div className={styles.userInfoCard}>
            <div className={styles.userInfoIdentity}>
              <strong>{report.targetName}</strong>
              <span>{report.targetHandle}</span>
              <dl>
                <div>
                  <dt>가입일</dt>
                  <dd>{report.joinedAt}</dd>
                </div>
              </dl>
            </div>
            <dl className={styles.userInfoStatsRow}>
              <div>
                <dt>게시글</dt>
                <dd>{report.postCount}</dd>
              </div>
              <div>
                <dt>댓글</dt>
                <dd>{report.commentCount}</dd>
              </div>
              <div>
                <dt>좋아요</dt>
                <dd>{report.likeCount}</dd>
              </div>
            </dl>
            <dl className={styles.userInfoStatsRow}>
              <div>
                <dt>신고 횟수</dt>
                <dd>{report.targetReportCount}</dd>
              </div>
              <div>
                <dt>경고 횟수</dt>
                <dd>{report.targetWarningCount}</dd>
              </div>
              <div>
                <dt>정지 횟수</dt>
                <dd>{report.targetSuspendCount}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className={styles.detailSection}>
          <div className={styles.sectionHead}>
            <h3>최근 활동</h3>
            <button type="button" onClick={() => setIsActivityModalOpen(true)}>
              전체 보기
            </button>
          </div>
          <ul className={styles.activityList}>
            {visibleActivities.length > 0 ? (
              visibleActivities.map((activity) => (
                <li key={activity.id || `${activity.type}-${activity.time}`}>
                  <strong>{activity.type}</strong>
                  <span>{activity.text}</span>
                  <time>{activity.time}</time>
                </li>
              ))
            ) : (
              <li className={styles.emptyActivity}>최근 활동이 없습니다.</li>
            )}
          </ul>
        </section>
      </div>

      <footer className={styles.drawerFooter}>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() => setIsActivityModalOpen(true)}
        >
          전체 활동 보기
        </button>
        <button className={styles.primaryButton} type="button" onClick={onProcess}>
          신고 검토 및 처리
        </button>
      </footer>

      {isReporterModalOpen && (
        <DetailListModal
          title="신고자 전체 보기"
          onClose={() => setIsReporterModalOpen(false)}
        >
          <div className={styles.modalList}>
            {(report.reporters || []).map((reporter, index) => (
              <div
                className={styles.modalListItem}
                key={reporter.id || `${reporter.name}-${index}`}
              >
                <div>
                  <strong>
                    {index + 1}. {reporter.name}
                  </strong>
                  {reporter.handle && <small>{reporter.handle}</small>}
                  {reporter.reportCount > 1 && (
                    <small>신고 {reporter.reportCount}건</small>
                  )}
                </div>
                <span>{reporter.reportedAt}</span>
              </div>
            ))}
          </div>
        </DetailListModal>
      )}

      {isActivityModalOpen && (
        <DetailListModal
          title="전체 활동 보기"
          onClose={() => setIsActivityModalOpen(false)}
        >
          <ul className={`${styles.activityList} ${styles.modalActivityList}`}>
            {(report.activities || []).length > 0 ? (
              (report.activities || []).map((activity) => (
                <li key={`modal-${activity.id || `${activity.type}-${activity.time}`}`}>
                  <strong>{activity.type}</strong>
                  <span>{activity.text}</span>
                  <time>{activity.time}</time>
                </li>
              ))
            ) : (
              <li className={styles.emptyActivity}>최근 활동이 없습니다.</li>
            )}
          </ul>
        </DetailListModal>
      )}

      {isPostDetailModalOpen && (
        <DetailListModal
          title="게시글 상세 보기"
          onClose={() => setIsPostDetailModalOpen(false)}
        >
          <article className={styles.postDetailModalContent}>
            <div>
              <span>유형</span>
              <strong>{report.type}</strong>
            </div>
            <div>
              <span>제목</span>
              <strong>{report.title}</strong>
            </div>
            {report.postTags && (
              <div>
                <span>해시태그</span>
                <strong>{report.postTags}</strong>
              </div>
            )}
            <div>
              <span>신고 대상</span>
              <strong>{report.targetName}</strong>
              <small>{report.targetHandle}</small>
            </div>
            <div>
              <span>{isCommentReport ? "댓글 내용" : "게시글 내용"}</span>
              <p>
                {isCommentReport
                  ? commentText || "-"
                  : targetText || "-"}
              </p>
            </div>
            {postImageSrcs.length > 0 && (
              <div>
                <span>게시글 이미지</span>
                <ReportImageGallery images={postImageSrcs} title={report.title} />
              </div>
            )}
            {isCommentReport && (
              <div>
                <span>원 게시글 내용</span>
                <p>{targetText || "-"}</p>
              </div>
            )}
            <div>
              <span>신고 사유</span>
              <p>{report.reason}</p>
            </div>
          </article>
        </DetailListModal>
      )}
    </>
  );
}

function getPostImageSrcs(report, backserver) {
  const imageCandidates = [
    ...extractImageUrls(report?.targetContent || ""),
    ...extractImageUrls(report?.detail || ""),
  ];

  return Array.from(new Set(
    imageCandidates
      .filter(Boolean)
      .map((src) => normalizeBackendUrl(src, backserver, "post-images")),
  ));
}

function ReportImageGallery({ images, title }) {
  return (
    <div className={styles.reportImageGallery}>
      {images.map((imageSrc, index) => (
        <img
          key={`${imageSrc}-${index}`}
          src={imageSrc}
          alt={`${title || "신고 게시글 이미지"} ${index + 1}`}
          loading="lazy"
        />
      ))}
    </div>
  );
}

function DetailListModal({ title, children, onClose }) {
  return (
    <div className={styles.detailModalOverlay} role="dialog" aria-modal="true">
      <div className={styles.detailModal}>
        <div className={styles.detailModalHeader}>
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className={styles.detailModalBody}>{children}</div>
      </div>
    </div>
  );
}
