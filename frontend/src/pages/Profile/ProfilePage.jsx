import { DesktopShell } from "../../components/layout/DesktopShell";
import { MobileShell } from "../../components/layout/MobileShell";
import { useIsDesktop } from "../../hooks/useViewportWidth";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { useAuthStore } from "../../stores/useAuthStore";
import { FeedCard } from "../../components/common/FeedCard";
import { defaultAvatarSrc } from "../../shared/lib/defaultAvatar";
import {
  normalizeBackendUrl,
  normalizePostDataArray,
} from "../../shared/lib/postHelpers";
import { Card, CardContent, Typography, Box } from "@mui/material";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import BedtimeIcon from "@mui/icons-material/Bedtime";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GradeIcon from "@mui/icons-material/Grade";
import SeedlingIcon from "@mui/icons-material/Spa";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import SpaIcon from "@mui/icons-material/Spa";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import CelebrationIcon from "@mui/icons-material/Celebration";
import SentimentNeutralIcon from "@mui/icons-material/SentimentNeutral";
import styles from "./ProfilePage.module.css";

// 감정 설정 - 직관적 컬러 시스템 (긍정/부정/중립)
const EMOTION_CONFIG = {
  1: {
    label: "행복해요",
    icon: EmojiEmotionsIcon,
    color: "#FDB500", // 밝은 황금색 (긍정)
  },
  2: {
    label: "슬퍼요",
    icon: SentimentDissatisfiedIcon,
    color: "#5B8DEE", // 파란색 (부정)
  },
  3: {
    label: "차분해요",
    icon: SpaIcon,
    color: "#9B8B7E", // 갈색 (중립)
  },
  4: {
    label: "화가 나요",
    icon: SentimentVeryDissatisfiedIcon,
    color: "#EF4444", // 밝은 빨강 (강한 부정, 직관적)
  },
  5: {
    label: "신나요",
    icon: CelebrationIcon,
    color: "#EC4899", // 생생한 핑크 (긍정)
  },
  6: {
    label: "무덤덤해요",
    icon: SentimentNeutralIcon,
    color: "#A0AEC0", // 회색 (중립)
  },
};

export function ProfilePage() {
  // 프로필 화면: 마이 프로필과 다른 사용자 프로필을 모두 처리합니다.
  // 무드 필터, 주간/월간 통계, 팔로우 상태, 게시물 목록을 보여줍니다.
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const { handle } = useParams(); // URL 파라미터 :handle (memberId)
  const sanitizedHandle =
    handle === "undefined" || handle === "null" ? null : handle;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [selectedMoodFilter, setSelectedMoodFilter] = useState(null);
  const [selectedMoodPeriod, setSelectedMoodPeriod] = useState("all");
  const [moodStatsByPeriod, setMoodStatsByPeriod] = useState({
    all: null,
    month: null,
    week: null,
  });
  const [periodLoading, setPeriodLoading] = useState(false);
  const [hoveredEmotion, setHoveredEmotion] = useState(null); // 호버 상태 관리
  const [followInfo, setFollowInfo] = useState({
    following: false,
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    savedCount: 0,
    emotionEmpathyRate: 0,
    weeklyReactions: 0,
  });

  const filteredPosts = useMemo(() => {
    if (!selectedMoodFilter) return posts;
    return posts.filter(
      (post) => String(post.emotionId) === String(selectedMoodFilter),
    );
  }, [posts, selectedMoodFilter]);

  const visibleMoodStats = moodStatsByPeriod[selectedMoodPeriod] || [];

  const {
    member: currentMember,
    accessToken: token,
    isLoggedIn,
  } = useAuthStore();
  const BACKSERVER = import.meta.env.VITE_BACKSERVER || "http://localhost:8080";

  // 실제 조회할 ID 결정 (파라미터 없으면 내 ID)
  const targetId = sanitizedHandle || currentMember?.memberId;
  const waitingForAuth = !sanitizedHandle && token && !currentMember;

  // 팔로우 상태 및 카운트 조회 함수
  const fetchFollowStatus = useCallback(() => {
    if (!targetId) return;

    // 프로필 페이지에서 내 통계도 정확하게 보여주기 위해 토큰을 함께 보냄
    const config = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {};

    axios
      .get(`${BACKSERVER}/auth/follow/status/${targetId}`, config)
      .then((res) => {
        if (res.data.success) {
          setFollowInfo({
            following: res.data.following,
            followerCount: res.data.followerCount,
            followingCount: res.data.followingCount,
            postCount: res.data.postCount,
            savedCount: res.data.savedCount,
            emotionEmpathyRate: res.data.emotionEmpathyRate || 0,
            weeklyReactions: res.data.weeklyReactions || 0,
          });
        }
      })
      .catch((err) => console.error("팔로우 상태 조회 실패:", err));
  }, [targetId, BACKSERVER, token]);

  // 감정 통계 조회 함수
  const fetchMoodStats = useCallback(
    (periodKey) => {
      if (!targetId) return;
      if (moodStatsByPeriod[periodKey] !== null) return;

      setPeriodLoading(true);
      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};
      const params = periodKey !== "all" ? { period: periodKey } : {};

      axios
        .get(`${BACKSERVER}/posts/emotion-stats/${targetId}`, {
          params,
          ...config,
        })
        .then((res) => {
          if (res.data.success && res.data.stats) {
            const total = res.data.stats.reduce(
              (sum, stat) => sum + (stat.count || 0),
              0,
            );
            const statsWithPercentage = res.data.stats
              .map((stat) => ({
                emotionId: stat.emotionId,
                count: stat.count || 0,
                percentage:
                  total > 0 ? Math.round((stat.count / total) * 100) : 0,
              }))
              .sort((a, b) => b.count - a.count);

            setMoodStatsByPeriod((prev) => ({
              ...prev,
              [periodKey]: statsWithPercentage,
            }));
          } else {
            setMoodStatsByPeriod((prev) => ({
              ...prev,
              [periodKey]: [],
            }));
          }
        })
        .catch((err) => {
          console.error("감정 통계 조회 실패:", err);
          setMoodStatsByPeriod((prev) => ({
            ...prev,
            [periodKey]: [],
          }));
        })
        .finally(() => setPeriodLoading(false));
    },
    [targetId, BACKSERVER, token, moodStatsByPeriod],
  );

  useEffect(() => {
    if (!targetId) {
      if (waitingForAuth) {
        return;
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    // 1. 사용자 기본 정보 조회
    axios
      .get(`${BACKSERVER}/auth/member/${targetId}`)
      .then((res) => {
        if (res.data.success) {
          setUser(res.data.member);
          // 2. 팔로우 정보 조회 (실제 데이터)
          fetchFollowStatus();
        }
      })
      .catch((err) => {
        console.error("사용자 정보 조회 실패:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [targetId, BACKSERVER, fetchFollowStatus, waitingForAuth]);

  useEffect(() => {
    if (!targetId) return;
    fetchMoodStats(selectedMoodPeriod);
  }, [selectedMoodPeriod, targetId, fetchMoodStats]);

  useEffect(() => {
    if (!targetId) {
      if (waitingForAuth) {
        return;
      }
      setPosts([]);
      setPostsLoading(false);
      return;
    }

    setPostsLoading(true);
    const config = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {};
    axios
      .get(`${BACKSERVER}/posts`, { params: { memberId: targetId }, ...config })
      .then((res) => {
        if (res.data.success) {
          setPosts(normalizePostDataArray(res.data.results || []));
        } else {
          setPosts([]);
        }
      })
      .catch((err) => {
        console.error("프로필 게시물 조회 실패:", err);
        setPosts([]);
      })
      .finally(() => {
        setPostsLoading(false);
      });
  }, [targetId, BACKSERVER, waitingForAuth]);

  // 자신의 프로필인지 확인 (user.memberId가 있으면 그것을 우선 사용, 없으면 currentMember 사용)
  const isOwnProfile =
    (user?.memberId &&
      currentMember?.memberId &&
      String(user.memberId) === String(currentMember.memberId)) ||
    (currentMember && String(currentMember.memberId) === String(targetId));

  const effectiveUser = isOwnProfile
    ? {
        ...user,
        profileImageUrl:
          currentMember?.profileImageUrl ||
          currentMember?.profile_image_url ||
          user?.profileImageUrl ||
          user?.profile_image_url,
        profile_image_url:
          currentMember?.profileImageUrl ||
          currentMember?.profile_image_url ||
          user?.profileImageUrl ||
          user?.profile_image_url,
      }
    : user;

  const normalizeUploadViewUrl = (url) => {
    return normalizeBackendUrl(url, BACKSERVER, "user-images");
  };

  // 팔로우 처리 함수
  // 팔로우 버튼을 눌렀을 때 실행됩니다.
  // 로그인되지 않은 경우 로그인 화면으로 안내하고, 그 외에는 팔로우 상태를 토글합니다.
  const handleFollowToggle = () => {
    if (!token) {
      alert("로그인이 필요한 서비스입니다.");
      navigate("/auth/login");
      return;
    }

    axios
      .post(
        `${BACKSERVER}/auth/follow/${targetId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      .then((res) => {
        if (res.data.success) {
          // 성공 시 로컬 상태 업데이트
          fetchFollowStatus();
        }
      })
      .catch((err) => {
        console.error("팔로우 처리 실패:", err);
        alert(
          err.response?.data?.message || "팔로우 처리 중 오류가 발생했습니다.",
        );
      });
  };

  // 통계 카드 클릭 시 연관된 화면으로 이동합니다.
  const handleStatClick = (label) => {
    if (label === "저장됨" && isOwnProfile) navigate("/app/saved");
    if (label === "팔로워") {
      const id = targetId || currentMember?.memberId;
      navigate(`/app/followers/${id}`);
    }
    if (label === "팔로잉") {
      const id = targetId || currentMember?.memberId;
      navigate(`/app/following/${id}`);
    }
  };

  // 활발함 상태 결정
  const getActivityStatus = () => {
    const reactions = followInfo.weeklyReactions;
    if (reactions >= 10) return { emoji: "🔥", text: "활발함" };
    if (reactions >= 5) return { emoji: "⭐", text: "활동중" };
    return { emoji: "😴", text: "조용함" };
  };

  // 가입 기간(일수) 상태 결정
  const getPopularityStatus = () => {
    const joinedAtRaw =
      effectiveUser?.createdAt ||
      effectiveUser?.created_at ||
      effectiveUser?.joinedAt ||
      effectiveUser?.joined_at ||
      effectiveUser?.joinDate ||
      effectiveUser?.join_date ||
      effectiveUser?.signupAt ||
      effectiveUser?.signup_at ||
      effectiveUser?.registeredAt ||
      effectiveUser?.registered_at ||
      effectiveUser?.regDate ||
      effectiveUser?.reg_date;

    if (!joinedAtRaw) {
      return { headline: "-", text: "가입일 정보 없음" };
    }

    const joinedAt = new Date(joinedAtRaw);
    if (Number.isNaN(joinedAt.getTime())) {
      return { headline: "-", text: "가입일 정보 없음" };
    }

    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const joinedStart = new Date(
      joinedAt.getFullYear(),
      joinedAt.getMonth(),
      joinedAt.getDate(),
    );
    const days = Math.max(
      1,
      Math.floor((todayStart - joinedStart) / (1000 * 60 * 60 * 24)) + 1,
    );

    return { headline: `${days}일`, text: "가입 후" };
  };

  const orderedMoodStats = useMemo(() => {
    return [...visibleMoodStats].sort((left, right) => {
      if ((right.count || 0) !== (left.count || 0)) {
        return (right.count || 0) - (left.count || 0);
      }
      return (left.emotionId || 0) - (right.emotionId || 0);
    });
  }, [visibleMoodStats]);

  const displayName =
    effectiveUser?.nickname || effectiveUser?.name || "MoodCast 사용자";
  const displayInitial = displayName.charAt(0).toUpperCase();
  const displayText =
    effectiveUser?.bio ||
    (isOwnProfile
      ? "감성을 기록하고 커뮤니티 참여를 즐기는 MoodCast 프로필입니다."
      : "안녕하세요! MoodCast 사용자입니다.");
  const moodPeriodTitle =
    selectedMoodPeriod === "month"
      ? "월간 감정 분포"
      : selectedMoodPeriod === "week"
        ? "주간 감정 분포"
        : "전체 감정 분포";
  const profileImageUrl = normalizeUploadViewUrl(
    effectiveUser?.profileImageUrl ||
      effectiveUser?.profile_image_url ||
      effectiveUser?.avatarUrl ||
      effectiveUser?.avatar_url ||
      effectiveUser?.imageUrl ||
      effectiveUser?.image_url ||
      effectiveUser?.photoUrl ||
      effectiveUser?.photo ||
      effectiveUser?.pictureUrl ||
      effectiveUser?.picture ||
      null,
  );
  const profileAvatarSrc = profileImageUrl || defaultAvatarSrc;

  if (loading) {
    const loader = (
      <div style={{ padding: "20px", textAlign: "center" }}>
        프로필을 불러오는 중...
      </div>
    );
    if (!desktop)
      return (
        <MobileShell title="프로필" hideSearch>
          {loader}
        </MobileShell>
      );
    return <DesktopShell>{loader}</DesktopShell>;
  }

  if (!user) {
    const noUser = (
      <div style={{ padding: "20px", textAlign: "center" }}>
        사용자를 찾을 수 없습니다.
      </div>
    );
    if (!desktop)
      return (
        <MobileShell title="프로필" hideSearch>
          {noUser}
        </MobileShell>
      );
    return <DesktopShell>{noUser}</DesktopShell>;
  }

  const handleChatClick = () => {
    const searchParams = new URLSearchParams({
      partnerId: String(targetId),
      partnerName: displayName,
    });

    navigate(`/app/chat?${searchParams.toString()}`);
  };

  const content = (
    <section className={styles.wrap}>
      {/* 히어로 섹션 - 풍성하게 수정함 */}
      <article className={styles.hero}>
        <div className={styles.avatar}>
          <img
            src={profileAvatarSrc}
            alt={displayName}
            onError={(event) => {
              console.error("[ProfilePage] profile image load failed", {
                attemptedSrc:
                  event.currentTarget.currentSrc || event.currentTarget.src,
                profileAvatarSrc,
                rawUserProfileImage:
                  user?.profileImageUrl || user?.profile_image_url || null,
                rawCurrentMemberProfileImage:
                  currentMember?.profileImageUrl ||
                  currentMember?.profile_image_url ||
                  null,
              });
              event.currentTarget.onerror = null;
              event.currentTarget.src = defaultAvatarSrc;
            }}
          />
        </div>
        <div className={styles.heroContent}>
          <strong>{displayName}</strong>
          <p>{displayText}</p>
          <span className={styles.handle}>
            @
            {user?.email
              ? user.email.split("@")[0]
              : user?.memberId || targetId}
          </span>
        </div>

        {isOwnProfile ? (
          <button
            type="button"
            className={styles.editBtnRich}
            onClick={() => navigate("/app/profile/edit")}
          >
            프로필 편집
          </button>
        ) : isLoggedIn ? (
          <div className={styles.actionsRich}>
            <button
              type="button"
              className={
                followInfo.following
                  ? styles.unfollowBtnRich
                  : styles.followBtnRich
              }
              onClick={handleFollowToggle}
            >
              {followInfo.following ? "언팔로우" : "팔로우"}
            </button>
            <button
              type="button"
              className={styles.chatBtn}
              onClick={handleChatClick}
            >
              채팅하기
            </button>
          </div>
        ) : null}
      </article>

      {/* 통계 섹션 - MUI Grid로 개선 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "10px",
        }}
      >
        {[
          { label: "게시물", value: followInfo.postCount },
          { label: "저장됨", value: followInfo.savedCount },
          { label: "팔로워", value: followInfo.followerCount },
          { label: "팔로잉", value: followInfo.followingCount },
        ].map((item) => {
          const isClickable = ["저장됨", "팔로워", "팔로잉"].includes(
            item.label,
          );
          const canClick =
            isClickable && (item.label !== "저장됨" || isOwnProfile);
          return (
            <Card
              key={item.label}
              onClick={() => canClick && handleStatClick(item.label)}
              sx={{
                cursor: canClick ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "108px",
                background: "rgba(255, 255, 255, 0.28)",
                border: "1px solid rgba(17, 24, 39, 0.085)",
                borderRadius: "16px",
                boxShadow: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  background: canClick ? "#f8f9ff" : undefined,
                  transform: canClick ? "translateY(-2px)" : "none",
                  boxShadow: canClick
                    ? "0 4px 12px rgba(17, 24, 39, 0.1)"
                    : "none",
                },
              }}
            >
              <CardContent
                sx={{
                  textAlign: "center",
                  padding: "16px 10px !important",
                  width: "100%",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 900,
                    color: "#111111",
                    fontSize: "1.9rem",
                    lineHeight: 1,
                  }}
                >
                  {item.label === "저장됨" && !isOwnProfile ? "0" : item.value}
                </Typography>
                <Typography
                  sx={{
                    color: "#444444",
                    display: "block",
                    marginTop: "8px",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                  }}
                >
                  {item.label}
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* 하이라이트 섹션 - 4개 개별 카드 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "10px",
        }}
      >
        {/* 감정 공감률 */}
        <Card
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "108px",
            background: "rgba(255,255,255,0.28)",
            border: "1px solid rgba(17,24,39,0.085)",
            borderRadius: "16px",
            boxShadow: "none",
          }}
        >
          <CardContent
            sx={{
              textAlign: "center",
              padding: "16px 10px !important",
              width: "100%",
            }}
          >
            <Typography
              sx={{
                fontWeight: 900,
                color: "#111111",
                fontSize: "1.9rem",
                lineHeight: 1,
              }}
            >
              {followInfo.emotionEmpathyRate}%
            </Typography>
            <Typography
              sx={{
                color: "#444444",
                marginTop: "8px",
                fontWeight: 600,
                fontSize: "0.8rem",
              }}
            >
              감정 공감률
            </Typography>
          </CardContent>
        </Card>

        {/* 주간 반응 */}
        <Card
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "108px",
            background: "rgba(255,255,255,0.28)",
            border: "1px solid rgba(17,24,39,0.085)",
            borderRadius: "16px",
            boxShadow: "none",
          }}
        >
          <CardContent
            sx={{
              textAlign: "center",
              padding: "16px 10px !important",
              width: "100%",
            }}
          >
            <Typography
              sx={{
                fontWeight: 900,
                color: "#111111",
                fontSize: "1.9rem",
                lineHeight: 1,
              }}
            >
              {followInfo.weeklyReactions}
            </Typography>
            <Typography
              sx={{
                color: "#444444",
                marginTop: "8px",
                fontWeight: 600,
                fontSize: "0.8rem",
              }}
            >
              주간 반응
            </Typography>
          </CardContent>
        </Card>

        {/* 활동 상태 */}
        {(() => {
          const activity = getActivityStatus();
          return (
            <Card
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "108px",
                background: "rgba(255,255,255,0.28)",
                border: "1px solid rgba(17,24,39,0.085)",
                borderRadius: "16px",
                boxShadow: "none",
              }}
            >
              <CardContent
                sx={{
                  textAlign: "center",
                  padding: "16px 10px !important",
                  width: "100%",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 600,
                    color: "#111111",
                    fontSize: "1.5rem",
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {activity.text}
                </Typography>
                <Typography
                  sx={{
                    color: "#555555",
                    marginTop: "6px",
                    fontWeight: 500,
                    fontSize: "0.75rem",
                  }}
                >
                  활동 상태
                </Typography>
              </CardContent>
            </Card>
          );
        })()}

        {/* 가입 기간 상태 */}
        {(() => {
          const popularity = getPopularityStatus();
          return (
            <Card
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "108px",
                background: "rgba(255,255,255,0.28)",
                border: "1px solid rgba(17,24,39,0.085)",
                borderRadius: "16px",
                boxShadow: "none",
              }}
            >
              <CardContent
                sx={{
                  textAlign: "center",
                  padding: "16px 10px !important",
                  width: "100%",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 600,
                    color: "#111111",
                    fontSize: "1.5rem",
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {popularity.headline}
                </Typography>
                <Typography
                  sx={{
                    color: "#555555",
                    marginTop: "6px",
                    fontWeight: 500,
                    fontSize: "0.75rem",
                  }}
                >
                  {popularity.text}
                </Typography>
              </CardContent>
            </Card>
          );
        })()}
      </Box>

      {/* 감정 통계 섹션 */}
      <Card
        sx={{
          background: "rgba(255,255,255,0.28)",
          border: "1px solid rgba(17,24,39,0.085)",
          borderRadius: "24px",
          boxShadow: "none",
          padding: { xs: "18px", md: "24px" },
        }}
      >
        <div className={styles.moodStatsHeader}>
          <Typography
            sx={{ fontWeight: 800, color: "#111827", fontSize: "1.1rem" }}
          >
            {moodPeriodTitle}
          </Typography>
          <div className={styles.moodPeriodTabs}>
            {[
              { key: "all", label: "전체" },
              { key: "month", label: "월간" },
              { key: "week", label: "주간" },
            ].map((period) => (
              <button
                key={period.key}
                type="button"
                className={`${styles.moodPeriodTab} ${selectedMoodPeriod === period.key ? styles.activeMoodPeriodTab : ""}`}
                onClick={() => setSelectedMoodPeriod(period.key)}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
        {periodLoading ? (
          <div
            style={{ textAlign: "center", padding: "20px", color: "#667085" }}
          >
            감정 통계를 불러오는 중입니다...
          </div>
        ) : visibleMoodStats.length > 0 ? (
          <div className={styles.moodStatsContainer}>
            {/* 차트 영역 */}
            <div
              className={styles.moodChartArea}
              onMouseLeave={() => {
                setHoveredEmotion(null);
              }}
            >
              <svg viewBox="0 0 200 200" className={styles.moodPieChart}>
                {(() => {
                  let currentAngle = -90;
                  const radius = 80;
                  const centerX = 100;
                  const centerY = 100;
                  const totalCount = orderedMoodStats.reduce(
                    (sum, stat) => sum + (stat.count || 0),
                    0,
                  );

                  return orderedMoodStats.map((stat) => {
                    const countRatio =
                      totalCount > 0 ? stat.count / totalCount : 0;
                    const angle = countRatio * 360;
                    const startAngle = currentAngle * (Math.PI / 180);
                    const endAngle = (currentAngle + angle) * (Math.PI / 180);

                    // 반지름을 기반으로 정확한 좌표 계산
                    const x1 = centerX + radius * Math.cos(startAngle);
                    const y1 = centerY + radius * Math.sin(startAngle);
                    const x2 = centerX + radius * Math.cos(endAngle);
                    const y2 = centerY + radius * Math.sin(endAngle);

                    // 180도 이상일 때 large-arc-flag를 1로 설정 (정확한 비율)
                    const largeArc = angle > 180 ? 1 : 0;
                    const emotion = EMOTION_CONFIG[stat.emotionId];
                    currentAngle += angle;
                    const isHovered = hoveredEmotion === stat.emotionId;

                    const slice =
                      angle >= 359.999 ? (
                        <circle
                          cx={centerX}
                          cy={centerY}
                          r={radius}
                          fill={emotion?.color || "#ccc"}
                          stroke="rgba(255,255,255,1)"
                          strokeWidth="2"
                          opacity={isHovered ? 1 : 0.85}
                        />
                      ) : (
                        <path
                          d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={emotion?.color || "#ccc"}
                          stroke="rgba(255,255,255,1)"
                          strokeWidth="2"
                          opacity={isHovered ? 1 : 0.85}
                          style={{ transition: "all 0.25s ease" }}
                        />
                      );

                    return (
                      <g
                        key={stat.emotionId}
                        onMouseEnter={() => setHoveredEmotion(stat.emotionId)}
                        onMouseLeave={() => setHoveredEmotion(null)}
                        style={{ cursor: "pointer" }}
                      >
                        {slice}
                      </g>
                    );
                  });
                })()}
              </svg>
              {hoveredEmotion && (
                <div className={styles.moodChartTooltip}>
                  {(() => {
                    const stat = visibleMoodStats.find(
                      (s) => s.emotionId === hoveredEmotion,
                    );
                    const emotion = EMOTION_CONFIG[hoveredEmotion];
                    return (
                      <>
                        <div className={styles.tooltipLabel}>
                          {emotion?.label}
                        </div>
                        <div className={styles.tooltipValue}>
                          {stat?.percentage}%
                        </div>
                        <div className={styles.tooltipCount}>
                          {stat?.count}개
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* 범례 */}
            <div className={styles.moodLegend}>
              {orderedMoodStats.map((stat) => {
                const emotion = EMOTION_CONFIG[stat.emotionId];
                const isHighlighted = hoveredEmotion === stat.emotionId;
                return (
                  <div
                    key={stat.emotionId}
                    className={styles.moodLegendItem}
                    style={{
                      // 차트에서 호버할 때만 폰트 강조, 배경은 제거
                      fontWeight: isHighlighted ? 700 : 500,
                      opacity: isHighlighted ? 1 : 0.8,
                    }}
                    onMouseEnter={() => setHoveredEmotion(stat.emotionId)}
                    onMouseLeave={() => setHoveredEmotion(null)}
                  >
                    <div
                      className={styles.moodLegendColor}
                      style={{ backgroundColor: emotion?.color }}
                    ></div>
                    <div className={styles.moodLegendInfo}>
                      <div className={styles.moodLegendLabel}>
                        {emotion?.label}
                      </div>
                      <div className={styles.moodLegendValue}>
                        {stat.percentage}% ({stat.count})
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 우측 통계 정보 */}
            <div className={styles.moodStatsInfo}>
              {/* 총 포스트 */}
              <div className={styles.moodStatItem}>
                <div className={styles.moodStatLabel}>총 포스트</div>
                <div className={styles.moodStatValue}>
                  {orderedMoodStats.reduce((sum, stat) => sum + stat.count, 0)}
                </div>
              </div>

              {/* 대표 감정 */}
              <div className={styles.moodStatItem}>
                <div className={styles.moodStatLabel}>대표 감정</div>
                <div
                  className={styles.moodStatValue}
                  style={{ fontSize: "1.02rem" }}
                >
                  {EMOTION_CONFIG[orderedMoodStats[0]?.emotionId]?.label || "-"}
                </div>
              </div>

              {/* 최고 비율 */}
              <div className={styles.moodStatItem}>
                <div className={styles.moodStatLabel}>최고 비율</div>
                <div className={styles.moodStatValue}>
                  {orderedMoodStats[0]?.percentage || 0}%
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Zero State - 데이터 없을 때
          <div className={styles.moodEmptyState}>
            <div className={styles.moodEmptyIcon}>📊</div>
            <div className={styles.moodEmptyTitle}>
              아직 기록된 감정이 없습니다
            </div>
            <div className={styles.moodEmptyDesc}>
              감정을 담은 게시물을 작성하면 통계가 표시됩니다
            </div>
            {isOwnProfile && (
              <button
                className={styles.moodEmptyBtn}
                onClick={() => navigate("/app/write")}
              >
                첫 게시물 작성하기
              </button>
            )}
          </div>
        )}
      </Card>

      {/* 최근 게시물 섹션 추가함 */}
      <section className={styles.recent}>
        <div className={styles.sectionHeader}>
          <h2>최근 게시물</h2>
          {isOwnProfile && (
            <button type="button" onClick={() => navigate("/app/write")}>
              + 새 게시물
            </button>
          )}
        </div>
        <div className={styles.moodFilterBar}>
          <button
            type="button"
            className={`${styles.moodFilterChip} ${selectedMoodFilter === null ? styles.activeMoodFilter : ""}`}
            onClick={() => setSelectedMoodFilter(null)}
          >
            전체
          </button>
          {Object.entries(EMOTION_CONFIG).map(([emotionId, emotion]) => (
            <button
              key={emotionId}
              type="button"
              className={`${styles.moodFilterChip} ${String(selectedMoodFilter) === String(emotionId) ? styles.activeMoodFilter : ""}`}
              style={{
                borderColor: emotion.color,
                color:
                  selectedMoodFilter === Number(emotionId)
                    ? "#111827"
                    : emotion.color,
              }}
              onClick={() => setSelectedMoodFilter(Number(emotionId))}
            >
              {emotion.label}
            </button>
          ))}
        </div>
        <div className={styles.postList}>
          {postsLoading ? (
            <div className={styles.emptyState}>
              게시물을 불러오는 중입니다...
            </div>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <FeedCard key={post.postId} post={post} compact />
            ))
          ) : posts.length > 0 ? (
            <div className={styles.emptyState}>
              선택한 무드의 게시물이 없습니다.
            </div>
          ) : (
            <div className={styles.emptyState}>작성한 게시물이 없습니다.</div>
          )}
        </div>
      </section>
    </section>
  );

  if (!desktop)
    return (
      <MobileShell title="프로필" hideSearch>
        {content}
      </MobileShell>
    );
  return <DesktopShell>{content}</DesktopShell>;
}
