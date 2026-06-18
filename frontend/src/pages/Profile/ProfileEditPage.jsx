import axios from 'axios';
import { DesktopShell } from '../../components/layout/DesktopShell';
import { MobileShell } from '../../components/layout/MobileShell';
import { useIsDesktop } from '../../hooks/useViewportWidth';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { defaultAvatarSrc } from '../../shared/lib/defaultAvatar';
import { normalizeBackendUrl } from '../../shared/lib/postHelpers';
import styles from './ProfileEditPage.module.css';
import { uploadImage } from '../../shared/lib/uploadImage';

const defaultProfile = {
  nickname: 'Lena_Parks',
  bio: '감정을 기록하고 커뮤니티와 함께하는 라이프로그 스타일의 프로필입니다.',
};

export function ProfileEditPage() {
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const { member, accessToken, setAuthData } = useAuthStore();
  const [profile, setProfile] = useState(defaultProfile);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null); // 서버 저장된 URL
  const [photoUploading, setPhotoUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!member) return;
    setProfile((prev) => ({
      ...prev,
      nickname: member.nickname || prev.nickname,
      bio: member.bio || prev.bio,
    }));
    if (member.profileImageUrl) {
      const normalizedUrl = normalizeBackendUrl(member.profileImageUrl, BACKSERVER, 'user-images');
      setPhotoPreview(normalizedUrl);
      setProfileImageUrl(normalizedUrl);
    }
  }, [member]);

  const handleInput = (event) => {
    const { name, value } = event.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
    setSaved(false);
  };

  const BACKSERVER = import.meta.env.VITE_BACKSERVER || '/api';

  // 프로필 사진을 선택하면 우선 즉시 미리보기를 보여주고, 서버에 업로드를 진행합니다.
  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // 즉시 미리보기
    setPhotoPreview(URL.createObjectURL(file));
    setSaved(false);
    // 서버에 업로드
    setPhotoUploading(true);
    try {
      const effectiveToken = accessToken || window.sessionStorage.getItem('moodcast-access-token');
      const url = await uploadImage(file, effectiveToken, BACKSERVER, {
        maxWidth: 320,
        maxHeight: 320,
        quality: 0.9,
        cropSquare: true,
        folderType: 'user-images',
      });
      setProfileImageUrl(url);
    } catch (err) {
      if (err?.isAuthError) {
        return;
      }
      setErrorMessage(`프로필 사진 업로드 실패: ${err.message}`);
      setPhotoPreview(null);
    } finally {
      setPhotoUploading(false);
    }
  };

  // [저장 버튼 클릭 시 실행되는 함수]
  // 닉네임, 자기소개, 프로필 사진을 백엔드로 전송하고 로컬 상태를 업데이트합니다.
  const handleSave = () => {
    const newNickname = profile.nickname?.trim();
    
    // 1. 유효성 검사: 닉네임이 비어있는지 확인
    if (!newNickname) {
      setErrorMessage('닉네임을 입력해주세요.');
      setSaved(false);
      return;
    }

    // 2. 권한 확인: 로그인이 되어있는지 확인
    if (!member || !accessToken) {
      setErrorMessage('로그인이 필요합니다. 다시 로그인해주세요.');
      setSaved(false);
      return;
    }

    // 3. 백엔드로 보낼 데이터 구성
    const requestBody = {
      nickname: newNickname,
      bio: profile.bio,
      ...(profileImageUrl && { profileImageUrl }), // 업로드된 경우에만 포함
    };

    setLoading(true);
    setErrorMessage('');

    // 4. 백엔드 API (PUT /auth/profile) 호출
    axios
      .put(`${BACKSERVER}/auth/profile`, requestBody, {
        headers: {
          Authorization: `Bearer ${accessToken}`, // JWT 토큰을 헤더에 담아 보냅니다.
        },
        withCredentials: true,
      })
      .then((res) => {
        // 성공 시: 서버에서 돌려준 최신 사용자 정보를 내 로컬 상태(Store)에 업데이트
        if (res.data?.member) {
          setAuthData(accessToken, res.data.member);
        }
        setSaved(true); // "저장됨" 상태 표시
        setErrorMessage('');
        
        // 0.8초 후에 프로필 메인 화면으로 이동
        window.setTimeout(() => {
          navigate('/app/profile');
        }, 800);
      })
      .catch((error) => {
        // 실패 시: 에러 메시지를 화면에 보여줍니다.
        console.error('프로필 저장 실패', error);
        const responseMessage = error.response?.data?.message;
        const responseDetail = error.response?.data?.details;
        setErrorMessage(
          responseMessage
            ? `${responseMessage}${responseDetail ? ` (${responseDetail})` : ''}`
            : '프로필 저장에 실패했습니다. 다시 시도해주세요.'
        );
        setSaved(false);
      })
      .finally(() => {
        setLoading(false); // 로딩 종료
      });
  };

  const handleBack = () => {
    navigate('/app/profile');
  };

  const content = (
    <section className={styles.wrap}>
      <div className={styles.hero}>
        <strong>프로필 편집</strong>
        <p>닉네임, 자기소개, 프로필 사진을 수정할 수 있습니다.</p>
      </div>

      <div className={styles.card}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            <img src={photoPreview || profileImageUrl || defaultAvatarSrc} alt="프로필 사진 미리보기" />
          </div>
          <label className={styles.uploadButton}>
            사진 변경
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
          </label>
          <span className={styles.helper}>권장 이미지 크기: 320x320</span>
        </div>

        <div className={styles.field}>
          <label htmlFor="nickname">닉네임</label>
          <input
            id="nickname"
            name="nickname"
            value={profile.nickname}
            onChange={handleInput}
            placeholder="닉네임을 입력하세요"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="bio">자기소개</label>
          <textarea
            id="bio"
            name="bio"
            value={profile.bio}
            onChange={handleInput}
            placeholder="자기소개를 작성해보세요."
          />
        </div>

        <div className={styles.buttonRow}>
          <button type="button" className={styles.backButton} onClick={handleBack} disabled={loading || photoUploading}>
            취소
          </button>
          <button type="button" className={styles.saveButton} onClick={handleSave} disabled={loading || photoUploading}>
            {photoUploading ? '사진 업로드 중...' : loading ? '저장 중...' : '완료'}
          </button>
        </div>

        {saved ? <div className={styles.message}>프로필 변경 사항이 저장되었습니다.</div> : null}
        {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}
      </div>
    </section>
  );

  if (!desktop) return <MobileShell title="프로필 편집" hideSearch>{content}</MobileShell>;
  return <DesktopShell>{content}</DesktopShell>;
}
