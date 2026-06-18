import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "../common/AdminLayout";
import { useAuthStore } from "../../../../stores/useAuthStore";
import styles from "../../adminComponentsCss/userManagement/AdminProfilePage.module.css";

/* ==========================================================================
 * 관리자 개인 정보 수정 페이지
 * --------------------------------------------------------------------------
 * 로그인한 관리자 본인의 프로필 정보를 수정하는 화면입니다.
 *
 * 수정 가능한 정보:
 * - 이름(실명)
 * - 닉네임
 * - 전화번호
 * - 현재 비밀번호 / 새 비밀번호 / 새 비밀번호 확인
 *
 * profileForm 상태 설명:
 * - DB에서 조회한 이름, 닉네임, 전화번호를 input value로 저장합니다.
 * - 사용자가 입력을 수정하면 이 상태 값이 같이 바뀝니다.
 *
 * 비밀번호 검증은 아직 추가하지 않습니다.
 * ========================================================================== */
export function AdminProfilePage() {
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({
    name: "",
    nickname: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roleChanging, setRoleChanging] = useState(false);
  const [message, setMessage] = useState("");
  const { accessToken, member, setAuthData } = useAuthStore();

  const BACKSERVER = (
    import.meta.env.VITE_BACKSERVER || "/api"
  ).replace(/\/$/, ""); // 프론트 .env의 백엔드 주소를 사용하고, 끝의 /는 제거합니다.

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    /* ========================================================================
     * 관리자 개인 정보 조회
     * ------------------------------------------------------------------------
     * 페이지가 처음 열릴 때 DB에 저장된 실명, 닉네임, 전화번호를 불러옵니다.
     *
     * Authorization 헤더를 보내는 이유:
     * - 백엔드는 이 토큰으로 "현재 로그인한 관리자가 누구인지" 확인합니다.
     * - 프론트에서 memberId를 직접 보내지 않아도 본인 정보만 조회됩니다.
     * ======================================================================== */
    setLoading(true);
    setMessage("");

    axios
      .get(`${BACKSERVER}/admin/api/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .then((res) => {
        const profile = res.data || {};

        setProfileForm((prev) => ({
          ...prev,
          name: profile.name || "",
          nickname: profile.nickname || "",
          phone: profile.phone || "",
        }));
        setAuthData(accessToken, {
          ...(member || {}),
          name: profile.name || member?.name,
          nickname: profile.nickname || member?.nickname,
          phone: profile.phone || member?.phone,
          profileImageUrl: null,
          profile_image_url: null,
        });
      })
      .catch(() => {
        setMessage("관리자 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [BACKSERVER, accessToken]);

  const handleProfileInputChange = (event) => {
    const { name, value } = event.target;

    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileCancel = () => {
    window.history.back();
  };

  const handleProfileSave = () => {
    if (!accessToken) {
      setMessage("로그인이 필요합니다.");
      return;
    }

    setSaving(true);
    setMessage("");

    /* ========================================================================
     * 관리자 개인 정보 수정
     * ------------------------------------------------------------------------
     * 현재 단계에서는 실명, 닉네임, 전화번호만 DB에 저장합니다.
     *
     * 비밀번호:
     * - input은 남겨두지만 아직 검증/저장 조건을 연결하지 않습니다.
     *
     * 관리자 페이지에서는 프로필 이미지 기능을 사용하지 않습니다.
     * ======================================================================== */
    axios
      .put(
        `${BACKSERVER}/admin/api/profile`,
        {
          name: profileForm.name,
          nickname: profileForm.nickname,
          phone: profileForm.phone,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )
      .then((res) => {
        const profile = res.data?.profile || {};

        setProfileForm((prev) => ({
          ...prev,
          name: profile.name || "",
          nickname: profile.nickname || "",
          phone: profile.phone || "",
        }));
        setAuthData(accessToken, {
          ...(member || {}),
          name: profile.name || member?.name,
          nickname: profile.nickname || member?.nickname,
          phone: profile.phone || member?.phone,
          profileImageUrl: null,
          profile_image_url: null,
        });
        setMessage(res.data?.message || "관리자 정보가 수정되었습니다.");
      })
      .catch(() => {
        setMessage("관리자 정보 수정에 실패했습니다.");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const handleDowngradeOwnRole = () => {
    if (!accessToken || !member?.memberId) {
      setMessage("로그인이 필요합니다.");
      return;
    }

    const confirmed = window.confirm(
      "관리자 권한을 일반 회원으로 변경하시겠습니까?\n\n" +
        "• 관리자 페이지 접근 권한이 제한됩니다.\n" +
        "• 회원 관리, 콘텐츠 관리, 신고 처리 등 관리자 기능을 사용할 수 없습니다.\n" +
        "• 권한 복구는 다른 관리자에 의해 다시 부여되어야 합니다.\n\n" +
        "권한 변경을 진행하시겠습니까?",
    );

    if (!confirmed) {
      return;
    }

    setRoleChanging(true);
    setMessage("");

    axios
      .put(
        `${BACKSERVER}/admin/api/members/${member.memberId}/role`,
        { role: "USER" },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )
      .then(() => {
        setAuthData(accessToken, { ...member, role: "USER" });
        navigate("/app/feed", { replace: true });
      })
      .catch(() => {
        setMessage("관리자 권한 변경에 실패했습니다.");
      })
      .finally(() => {
        setRoleChanging(false);
      });
  };

  return (
    <AdminLayout
      title="관리자 개인 정보 수정"
      description="관리자 프로필과 연락처 정보를 관리하세요."
    >
      <section className={`${styles.panel} ${styles.formPanel}`}>
        <div className={styles.panelHead}>
          <h2>프로필 정보</h2>
        </div>

        <div className={styles.profileEditLayout}>
          <form className={styles.adminForm}>
            <label>
              이름(실명)
              <input
                name="name"
                type="text"
                placeholder={loading ? "불러오는 중..." : "이름(실명)"}
                value={profileForm.name}
                onChange={handleProfileInputChange}
              />
            </label>

            <label>
              닉네임
              <input
                name="nickname"
                type="text"
                placeholder={loading ? "불러오는 중..." : "닉네임"}
                value={profileForm.nickname}
                onChange={handleProfileInputChange}
              />
            </label>

            <label>
              전화번호
              <input
                name="phone"
                type="tel"
                placeholder={loading ? "불러오는 중..." : "010-0000-0000"}
                value={profileForm.phone}
                onChange={handleProfileInputChange}
              />
            </label>

            <label>
              현재 비밀번호
              <input
                name="currentPassword"
                type="password"
                placeholder="현재 비밀번호"
                value={profileForm.currentPassword}
                onChange={handleProfileInputChange}
              />
            </label>

            <label>
              새 비밀번호
              <input
                name="newPassword"
                type="password"
                placeholder="새 비밀번호"
                value={profileForm.newPassword}
                onChange={handleProfileInputChange}
              />
            </label>

            <label>
              새 비밀번호 확인
              <input
                name="confirmPassword"
                type="password"
                placeholder="새 비밀번호 확인"
                value={profileForm.confirmPassword}
                onChange={handleProfileInputChange}
              />
            </label>

            {message ? <p className={styles.formMessage}>{message}</p> : null}

            {member?.role === "SUPER_ADMIN" && (
              <section className={styles.roleDangerBox}>
                <strong>관리자 권한 변경</strong>
                <p>
                  본인 계정을 일반 회원으로 변경하면 관리자 페이지 접근 권한이
                  즉시 제한됩니다.
                </p>
                <button
                  type="button"
                  onClick={handleDowngradeOwnRole}
                  disabled={roleChanging}
                >
                  {roleChanging ? "변경 중" : "내 권한을 일반 회원으로 변경"}
                </button>
              </section>
            )}

            <div className={styles.formActions}>
              <button type="button" onClick={handleProfileCancel}>
                취소
              </button>
              <button type="button" onClick={handleProfileSave} disabled={saving}>
                {saving ? "저장 중" : "저장"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </AdminLayout>
  );
}
