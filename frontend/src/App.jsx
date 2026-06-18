import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useIsDesktop } from "./hooks/useViewportWidth";
import { HomeFeedPage } from "./pages/HomeFeed/HomeFeedPage";
import { MobileFeedPage } from "./pages/MobileFeed/MobileFeedPage";
import { SavedPage } from "./pages/Saved/SavedPage";
import { MoodChatPage } from "./pages/MoodChat/MoodChatPage";
import { ProfilePage } from "./pages/Profile/ProfilePage";
import { ProfileEditPage } from "./pages/Profile/ProfileEditPage";
import { EditPostPage } from "./pages/PostEdit/EditPostPage";
import { FollowersPage } from "./pages/Follow/FollowersPage";
import { FollowingPage } from "./pages/Follow/FollowingPage";
import { SettingsPage } from "./pages/Settings/SettingsPage";
import { SearchPage } from "./pages/Search/SearchPage";
import { CreatePostPage } from "./pages/CreatePost/CreatePostPage";
import { PostDetailPage } from "./pages/PostDetail/PostDetailPage";
import { ProfileSetupPage } from "./pages/ProfileSetup/ProfileSetupPage";
import { LoginPage } from "./pages/Auth/LoginPage";
import { AccountRecoveryPage } from "./pages/Auth/AccountRecoveryPage";
import { SocialCallbackPage } from "./pages/Auth/SocialCallbackPage";
import { SocialExtraSignupPage } from "./pages/Auth/SocialExtraSignupPage";
import { AdminRoutes } from "./pages/Admin/AdminPages";
import { SignupPage } from "./pages/Auth/SignupPage";
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "./stores/useAuthStore";
import { RequireAuth } from "./components/common/RequireAuth";
import { useRealtimeAccountSanction } from "./hooks/useRealtimeAccountSanction";

function AppRoutes() {
  // 화면 너비에 따라 데스크톱 버전 또는 모바일 버전을 자동으로 선택합니다.
  const desktop = useIsDesktop();
  const [authChecked, setAuthChecked] = useState(false);
  const { accessToken, member, isLoggedIn, setAuthData, clearAuthData } = useAuthStore();
  const BACKSERVER = import.meta.env.VITE_BACKSERVER || "/api";
  const authRoute = (element) => (
    <RequireAuth authChecked={authChecked}>{element}</RequireAuth>
  );

  useRealtimeAccountSanction(isLoggedIn ? member?.memberId : null);

  /*
    새로고침 후 sessionStorage에 남아있는 accessToken이
    서버 기준으로 유효한지 확인한다.
  */
  useEffect(() => {
    const refreshLogin = async () => {
      const res = await axios.post(
        `${BACKSERVER}/auth/refresh`,
        {},
        {
          withCredentials: true,
          _skipAuthRefresh: true,
        },
      );

      setAuthData(res.data.accessToken, res.data.member);
    };

    const checkLogin = async () => {
      try {
        if (accessToken) {
          try {
            const res = await axios.get(`${BACKSERVER}/auth/me`, {
              headers: {
                Authorization: "Bearer " + accessToken,
              },
              _skipAuthRefresh: true,
            });

            const loginMember = res.data.member || res.data;
            setAuthData(accessToken, loginMember);
            return;
          } catch (meError) {
            await refreshLogin();
            return;
          }
        }

        await refreshLogin();
      } catch (err) {
        clearAuthData();
      } finally {
        setAuthChecked(true);
      }
    };
    checkLogin();
  }, [BACKSERVER, accessToken, setAuthData, clearAuthData]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/feed" replace />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/signup" element={<SignupPage />} />
      <Route path="/auth/recovery" element={<AccountRecoveryPage />} />
      <Route path="/auth/kakao/callback" element={<SocialCallbackPage />} />
      <Route path="/auth/google/callback" element={<SocialCallbackPage />} />
      <Route path="/auth/naver/callback" element={<SocialCallbackPage />} />
      <Route path="/auth/social/signup" element={<SocialExtraSignupPage />} />
      <Route path="/auth/setup" element={<ProfileSetupPage />} />
      <Route path="/app/login" element={<LoginPage />} />
      <Route path="/app/signup" element={<SignupPage />} />
      <Route path="/app/profile-setup" element={<ProfileSetupPage />} />
      <Route
        path="/app/feed"
        element={authRoute(desktop ? <HomeFeedPage /> : <MobileFeedPage />)}
      />
      <Route path="/app/mobile-feed" element={authRoute(<MobileFeedPage />)} />
      <Route path="/app/saved" element={authRoute(<SavedPage />)} />
      <Route path="/app/mood-chat" element={authRoute(<MoodChatPage />)} />
      <Route path="/app/chat" element={authRoute(<MoodChatPage />)} />
      <Route
        path="/app/group-chat"
        element={authRoute(<Navigate to="/app/mood-chat" replace />)}
      />
      {/* 마이페이지와 유저페이지를 ProfilePage 하나로 통합함 */}
      <Route path="/app/profile" element={authRoute(<ProfilePage />)} />
      <Route path="/app/profile-mobile" element={authRoute(<ProfilePage />)} />
      <Route path="/profile/:handle" element={authRoute(<ProfilePage />)} />
      <Route path="/profile" element={authRoute(<ProfilePage />)} />
      <Route
        path="/app/profile/edit"
        element={authRoute(<ProfileEditPage />)}
      />
      <Route
        path="/app/post/edit/:postId"
        element={authRoute(<EditPostPage />)}
      />
      <Route path="/app/followers" element={authRoute(<FollowersPage />)} />
      <Route
        path="/app/followers/:memberId"
        element={authRoute(<FollowersPage />)}
      />
      <Route path="/app/following" element={authRoute(<FollowingPage />)} />
      <Route
        path="/app/following/:memberId"
        element={authRoute(<FollowingPage />)}
      />
      <Route path="/app/user/:handle" element={authRoute(<ProfilePage />)} />
      <Route path="/app/settings" element={authRoute(<SettingsPage />)} />
      <Route path="/app/search" element={authRoute(<SearchPage />)} />
      <Route path="/app/write" element={authRoute(<CreatePostPage />)} />
      <Route path="/app/create" element={authRoute(<CreatePostPage />)} />
      <Route path="/app/post/:postId" element={authRoute(<PostDetailPage />)} />
      <Route
        path="/app/mood"
        element={authRoute(<Navigate to="/app/write" replace />)}
      />
      <Route
        path="/app/community"
        element={authRoute(<Navigate to="/app/feed" replace />)}
      />
      <Route path="/admin/*" element={authRoute(<AdminRoutes />)} />
      {/* 그 외 모든 경로는 기본 피드 홈으로 보냅니다. */}
      <Route path="*" element={<Navigate to="/app/feed" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}
