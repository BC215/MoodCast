import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import axios from "axios";
import { AdminLayout } from "../common/AdminLayout";
import { EmptyState } from "../common/EmptyState";
import { EmptyTableRow, TableShell } from "../common/TableShell";
import { useAuthStore } from "../../../../stores/useAuthStore";
import { formatKoreanDate } from "../../../../shared/lib/dateTime";
import styles from "../../adminComponentsCss/userManagement/AdminCreatePage.module.css";

/* ==========================================================================
 * 관리자 권한 관리 페이지
 * --------------------------------------------------------------------------
 * 새 계정을 만드는 화면이 아니라, 이미 가입된 회원의 관리자 권한을
 * 부여하거나 해제하는 화면입니다.
 *
 * 해당 기능:
 * - 이름, 닉네임, 이메일 기준으로 회원 검색
 * - ACTIVE 상태인 일반 회원과 관리자를 검색 결과로 표시
 * - 검색 결과에서 권한을 변경할 회원 선택
 * - 일반 회원 / 관리자 중 하나를 선택해 등급 변경
 *
 * 큰 흐름:
 * 1. 관리자가 이름/닉네임/이메일 중 하나를 선택해서 회원을 검색합니다.
 * 2. 검색 결과 중 권한을 변경할 회원을 선택합니다.
 * 3. 일반 회원, 관리자 중 등급을 고릅니다.
 * 4. 백엔드 API로 role 변경 요청을 보냅니다.
 *
 * ========================================================================== */
export function AdminCreatePage() {
  const [searchType, setSearchType] = useState("name"); // 현재 선택한 검색 기준입니다. name, nickname, email 중 하나입니다.
  const [searchKeyword, setSearchKeyword] = useState(""); // 검색 input에 사용자가 입력한 검색어입니다.
  const [searched, setSearched] = useState(false); // 검색 버튼을 한 번이라도 눌렀는지 기억해서 빈 상태 문구를 다르게 보여줍니다.
  const [searchLoading, setSearchLoading] = useState(false); // 회원 검색 API 호출 중인지 표시합니다.
  const [promoteLoading, setPromoteLoading] = useState(false); // 관리자 권한 변경 API 호출 중인지 표시합니다.
  const [searchError, setSearchError] = useState(""); // 검색 또는 권한 변경 실패 메시지를 저장합니다.
  const [successMessage, setSuccessMessage] = useState(""); // 권한 변경 성공 메시지를 저장합니다.
  const [roleResultPopup, setRoleResultPopup] = useState(null); // 권한 변경 성공/실패 결과를 중앙 팝업으로 보여줍니다.
  const [members, setMembers] = useState([]); // 검색 결과로 받은 회원 목록입니다.
  const [selectedMemberId, setSelectedMemberId] = useState(null); // 라디오 버튼으로 선택한 권한 변경 대상 회원 id입니다.
  const [selectedRole, setSelectedRole] = useState("SUPER_ADMIN"); // 선택한 관리자 등급입니다.
  const { accessToken } = useAuthStore(); // 관리자 API 호출에 필요한 JWT 토큰입니다.

  const BACKSERVER = (
    import.meta.env.VITE_BACKSERVER || "/api"
  ).replace(/\/$/, ""); // 프론트 .env의 백엔드 주소를 사용하고, 끝의 /는 제거합니다.

  const roleDescription =
    selectedRole === "USER"
      ? "일반 회원은 관리자 페이지에 접근할 수 없습니다."
      : "관리자는 관리자 권한 부여와 해제까지 사용할 수 있습니다.";

  const searchPlaceholder = {
    name: "회원 이름",
    nickname: "회원 닉네임",
    email: "member@moodcast.com",
  };

  const getRoleLabel = (role) => {
    if (role === "SUPER_ADMIN") {
      return "관리자";
    }

    if (role === "USER" || role === "MEMBER") {
      return "일반 회원";
    }

    return role || "-";
  };

  const getSelectedMemberName = () => {
    const selectedMember = members.find(
      (memberItem) => memberItem.memberId === selectedMemberId,
    );

    return selectedMember?.name || "선택한 회원";
  };

  const fetchMembers = (keyword = searchKeyword) => {
    if (!accessToken) {
      setSearched(true);
      setMembers([]);
      setSelectedMemberId(null);
      setSuccessMessage("");
      setSearchError("로그인 정보가 없어 회원을 검색할 수 없습니다.");
      return;
    }

    const trimmedKeyword = keyword.trim(); // 검색어가 비어 있으면 전체 권한 관리 대상 회원을 조회합니다.

    setSearched(true);
    setSearchLoading(true);
    setSearchError("");
    setSuccessMessage("");
    setSelectedMemberId(null);

    axios
      .get(`${BACKSERVER}/admin/api/members/admin-promotion/search`, {
        headers: {
          Authorization: `Bearer ${accessToken}`, // 백엔드에서 관리자 권한을 확인할 수 있도록 토큰을 보냅니다.
        },
        params: {
          searchType, // name, nickname, email 중 현재 선택한 검색 기준입니다.
          keyword: trimmedKeyword, // 검색어가 비어 있으면 백엔드에서 전체 권한 관리 대상 회원을 조회합니다.
        },
      })
      .then((res) => {
        const nextMembers = Array.isArray(res.data?.members)
          ? res.data.members
          : [];

        setMembers(nextMembers);
      })
      .catch(() => {
        setMembers([]);
        setSearchError("회원 검색 중 문제가 발생했습니다.");
      })
      .finally(() => {
        setSearchLoading(false);
      });
  };

  useEffect(() => {
    fetchMembers("");
    // 최초 진입 시 전체 회원을 한 번만 조회하기 위한 effect입니다.
    // searchType 변경마다 자동 조회하면 사용자가 입력 중인 검색 흐름과 충돌할 수 있어 의존성은 로그인 정보와 서버 주소만 둡니다.
  }, [BACKSERVER, accessToken]);

  useEffect(() => {
    if (!roleResultPopup) {
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
  }, [roleResultPopup]);

  const resetSelection = () => {
    setSelectedMemberId(null); // 선택된 회원을 비웁니다.
    setSelectedRole("SUPER_ADMIN"); // 권한 선택은 기본값인 관리자로 되돌립니다.
    setSearchError(""); // 이전 오류 메시지를 지웁니다.
    setSuccessMessage(""); // 이전 성공 메시지를 지웁니다.
  };

  const handleSearchTypeChange = (event) => {
    setSearchType(event.target.value); // 사용자가 선택한 검색 기준을 저장합니다.
    setSearchKeyword(""); // 기준이 바뀌면 이전 검색어가 헷갈리지 않도록 비웁니다.
    setSearchError(""); // 이전 오류 메시지를 지웁니다.
    setSuccessMessage(""); // 이전 성공 메시지를 지웁니다.
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault(); // form submit 시 페이지가 새로고침되는 기본 동작을 막습니다.
    fetchMembers();
  };

  const handlePromoteMember = () => {
    if (!selectedMemberId) {
      setSearchError("권한을 변경할 회원을 먼저 선택해주세요.");
      return;
    }

    if (!accessToken) {
      setSearchError("로그인 정보가 없어 관리자 등급을 변경할 수 없습니다.");
      return;
    }

    const selectedName = getSelectedMemberName();
    const selectedRoleLabel = getRoleLabel(selectedRole);
    const confirmMessage =
      selectedRole === "USER"
        ? `관리자 권한을 일반 회원으로 변경하시겠습니까?\n\n• 관리자 페이지 접근 권한이 제한됩니다.\n• 회원 관리, 콘텐츠 관리, 신고 처리 등 관리자 기능을 사용할 수 없습니다.\n• 권한 복구는 다른 관리자에 의해 다시 부여되어야 합니다.\n\n권한 변경을 진행하시겠습니까?`
        : `${selectedName} 회원을 ${selectedRoleLabel}로 변경하시겠습니까?`;
    const confirmed = window.confirm(confirmMessage);

    if (!confirmed) {
      return;
    }

    setPromoteLoading(true);
    setSearchError("");
    setSuccessMessage("");

    axios
      .put(
        `${BACKSERVER}/admin/api/members/${selectedMemberId}/role`,
        {
          role: selectedRole, // USER, SUPER_ADMIN 중 선택한 값입니다.
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )
      .then(() => {
        setRoleResultPopup({
          type: "success",
          title: "처리 완료",
          message: `${selectedName} 회원의 권한이 변경되었습니다.`,
        });
        setMembers((prevMembers) =>
          prevMembers.map((memberItem) =>
            memberItem.memberId === selectedMemberId
              ? { ...memberItem, role: selectedRole }
              : memberItem,
          ),
        );
        setSelectedMemberId(null);
        setSelectedRole("SUPER_ADMIN");
      })
      .catch((error) => {
        setRoleResultPopup({
          type: "error",
          title: "처리 실패",
          message:
            error.response?.data?.message ||
            "관리자 등급 변경 중 문제가 발생했습니다.",
        });
      })
      .finally(() => {
        setPromoteLoading(false);
      });
  };

  return (
    <AdminLayout
      title="관리자 권한 관리"
      description="가입된 회원을 검색한 뒤 관리자 권한을 부여하거나 해제하세요."
    >
      <section className={`${styles.panel} ${styles.formPanel}`}>
        <div className={styles.panelHead}>
          <h2>회원 검색</h2>
          <NavLink className={styles.secondaryLinkButton} to="/admin/users">
            사용자 관리로 돌아가기
          </NavLink>
        </div>

        <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
          <label>
            검색 기준
            <select
              value={searchType}
              onChange={handleSearchTypeChange}
            >
              <option value="name">이름</option>
              <option value="nickname">닉네임</option>
              <option value="email">이메일</option>
            </select>
          </label>

          <label>
            검색어
            <input
              type={searchType === "email" ? "email" : "text"}
              inputMode={searchType === "email" ? "email" : "text"}
              lang={searchType === "email" ? "en" : "ko"}
              autoCapitalize="none"
              spellCheck={false}
              placeholder={searchPlaceholder[searchType]}
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
            />
          </label>

          <button type="submit" disabled={searchLoading}>
            {searchLoading ? "검색 중" : "회원 검색"}
          </button>
        </form>

        {searchError && <p className={styles.errorText}>{searchError}</p>}
        {successMessage && <p className={styles.successText}>{successMessage}</p>}

        {!searched && (
          <EmptyState
            title="검색 전"
            description="이름, 닉네임, 이메일로 ACTIVE 상태의 일반 회원과 관리자를 검색할 수 있습니다."
          />
        )}
      </section>

      <TableShell
        title="권한 변경 대상 선택"
        columns={["회원", "이메일", "현재 권한", "가입일", "선택"]}
      >
        {searched && !searchLoading && members.length === 0 && (
          <EmptyTableRow colSpan={5} label="검색된 회원 데이터 없음" />
        )}

        {searchLoading && <EmptyTableRow colSpan={5} label="회원 검색 중" />}

        {members.map((memberItem) => (
          <tr key={memberItem.memberId}>
            <td>
              <strong>{memberItem.name || "-"}</strong>
              <span className={styles.memberNickname}>
                {memberItem.nickname ? `@${memberItem.nickname}` : "닉네임 없음"}
              </span>
            </td>
            <td>{memberItem.email || "-"}</td>
            <td>{getRoleLabel(memberItem.role)}</td>
            <td>{formatKoreanDate(memberItem.createdAt)}</td>
            <td>
              <label className={styles.selectMemberLabel}>
                <input
                  type="radio"
                  name="selectedMember"
                  checked={selectedMemberId === memberItem.memberId}
                  onChange={() => setSelectedMemberId(memberItem.memberId)}
                />
                선택
              </label>
            </td>
          </tr>
        ))}
      </TableShell>

      <section className={`${styles.panel} ${styles.formPanel}`}>
        <div className={styles.panelHead}>
          <h2>관리자 등급 설정</h2>
        </div>

        <form className={styles.adminForm}>
          <fieldset>
            <legend>관리자 등급</legend>
            <label>
              <input
                type="radio"
                name="adminRole"
                checked={selectedRole === "USER"}
                onChange={() => setSelectedRole("USER")}
              />
              일반 회원
            </label>
            <label>
              <input
                type="radio"
                name="adminRole"
                checked={selectedRole === "SUPER_ADMIN"}
                onChange={() => setSelectedRole("SUPER_ADMIN")}
              />
              관리자
            </label>
          </fieldset>

          <div className={styles.roleGuide}>
            <strong>
              {selectedRole === "USER"
                ? "일반 회원 권한"
                : "관리자 권한"}
            </strong>
            <p>{roleDescription}</p>
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={resetSelection}>
              선택 초기화
            </button>
            <button
              type="button"
              disabled={!selectedMemberId || promoteLoading}
              onClick={handlePromoteMember}
            >
              {promoteLoading ? "변경 중" : "관리자 등급 변경"}
            </button>
          </div>
        </form>
      </section>

      {roleResultPopup ? (
        <section
          className={styles.roleResultLayer}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="role-result-title"
        >
          <button
            type="button"
            className={styles.roleResultDim}
            aria-label="권한 변경 결과 팝업 닫기"
            onClick={() => setRoleResultPopup(null)}
          />

          <article className={styles.roleResultPopup}>
            <span
              className={`${styles.roleResultBadge} ${
                roleResultPopup.type === "error" ? styles.roleResultError : ""
              }`}
            >
              {roleResultPopup.type === "error" ? "실패" : "성공"}
            </span>
            <h3 id="role-result-title">{roleResultPopup.title}</h3>
            <p>{roleResultPopup.message}</p>
            <button type="button" onClick={() => setRoleResultPopup(null)}>
              확인
            </button>
          </article>
        </section>
      ) : null}
    </AdminLayout>
  );
}
