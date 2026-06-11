import axios from "axios";

const BACKSERVER = (import.meta.env.VITE_BACKSERVER || "http://localhost:8080").replace(/\/$/, "");
const NOTICE_VISIBLE_DAYS = 7;
const NOTICE_VISIBLE_MS = NOTICE_VISIBLE_DAYS * 24 * 60 * 60 * 1000;

export const NOTICE_CATEGORY = {
  GENERAL: "일반",
  UPDATE: "업데이트",
  URGENT: "긴급",
};

export const NOTICE_TYPE = {
  NORMAL: "NORMAL",
  UPDATE: "UPDATE",
  EMERGENCY: "EMERGENCY",
};

export const NOTICE_STATUS = {
  ACTIVE: "ACTIVE",
  DELETE: "DELETE",
};

export const NOTICE_WRITABLE_CATEGORIES = [
  NOTICE_CATEGORY.GENERAL,
  NOTICE_CATEGORY.UPDATE,
  NOTICE_CATEGORY.URGENT,
];

const categoryByType = {
  [NOTICE_TYPE.NORMAL]: NOTICE_CATEGORY.GENERAL,
  [NOTICE_TYPE.UPDATE]: NOTICE_CATEGORY.UPDATE,
  [NOTICE_TYPE.EMERGENCY]: NOTICE_CATEGORY.URGENT,
};

const typeByCategory = {
  [NOTICE_CATEGORY.GENERAL]: NOTICE_TYPE.NORMAL,
  [NOTICE_CATEGORY.UPDATE]: NOTICE_TYPE.UPDATE,
  [NOTICE_CATEGORY.URGENT]: NOTICE_TYPE.EMERGENCY,
};

const formatDateText = (value) => {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0] = value;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  return String(value).replace("T", " ").slice(0, 16);
};

const toTimestamp = (value, fallback = 0) => {
  if (!value) {
    return fallback;
  }

  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value;
    return new Date(year, month - 1, day, hour, minute, second).getTime();
  }

  const timestamp = new Date(String(value).replace(" ", "T")).getTime();
  return Number.isNaN(timestamp) ? fallback : timestamp;
};

const hasCenterWrapper = (content = "") => {
  return content.includes('data-notice-align="center"');
};

const allowedNoticeTags = new Set([
  "A",
  "B",
  "BR",
  "DIV",
  "LI",
  "OL",
  "P",
  "SPAN",
  "STRONG",
  "U",
  "UL",
]);

const isSafeNoticeUrl = (value = "") => {
  const trimmedValue = String(value).trim();

  if (!trimmedValue) return false;

  try {
    const parsedUrl = new URL(trimmedValue, window.location.origin);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

const sanitizeStyleValue = (styleValue = "") => {
  const safeDeclarations = String(styleValue)
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .filter((declaration) => {
      const [rawName, ...rawValueParts] = declaration.split(":");
      const name = rawName?.trim().toLowerCase();
      const value = rawValueParts.join(":").trim().toLowerCase();

      if (!name || !value) return false;
      if (value.includes("javascript:") || value.includes("expression(")) {
        return false;
      }

      return [
        "font-weight",
        "text-align",
        "text-decoration",
        "text-decoration-line",
      ].includes(name);
    });

  return safeDeclarations.join("; ");
};

export const sanitizeNoticeHtml = (content = "") => {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return String(content || "");
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(String(content || ""), "text/html");
  const elements = Array.from(documentNode.body.querySelectorAll("*"));

  elements.forEach((element) => {
    if (!allowedNoticeTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value;

      if (attributeName.startsWith("on")) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (element.tagName === "A" && attributeName === "href") {
        if (isSafeNoticeUrl(attributeValue)) {
          element.setAttribute("target", "_blank");
          element.setAttribute("rel", "noopener noreferrer");
        } else {
          element.removeAttribute(attribute.name);
        }
        return;
      }

      if (attributeName === "style") {
        const safeStyle = sanitizeStyleValue(attributeValue);
        if (safeStyle) {
          element.setAttribute("style", safeStyle);
        } else {
          element.removeAttribute(attribute.name);
        }
        return;
      }

      if (attributeName === "data-notice-align") {
        return;
      }

      if (["target", "rel"].includes(attributeName) && element.tagName === "A") {
        return;
      }

      element.removeAttribute(attribute.name);
    });
  });

  return documentNode.body.innerHTML;
};

export const stripNoticeAlignWrapper = (content = "") => {
  return content
    .replace(/^<div data-notice-align="center" style="text-align: center;">/i, "")
    .replace(/<\/div>$/i, "");
};

export const buildNoticeContent = (content, alignCenter) => {
  const normalizedContent = sanitizeNoticeHtml(stripNoticeAlignWrapper(content));

  if (!alignCenter) {
    return normalizedContent;
  }

  return `<div data-notice-align="center" style="text-align: center;">${normalizedContent}</div>`;
};

export const normalizeNotice = (notice) => {
  if (!notice) {
    return null;
  }

  const createdTimestamp = toTimestamp(notice.createdAt, Number(notice.noticeId) || Date.now());
  const updatedTimestamp = toTimestamp(notice.updatedAt, createdTimestamp);
  const deletedTimestamp = toTimestamp(notice.deletedAt, 0);
  const isDeleted = Boolean(notice.deletedAt);
  const isExpired = !isDeleted && Date.now() - createdTimestamp >= NOTICE_VISIBLE_MS;
  const adminDisplayName =
    notice.createdByAdminName ||
    notice.adminName ||
    notice.createdAdminName ||
    (notice.createdByAdminNickname ? `@${notice.createdByAdminNickname}` : "") ||
    "관리자";
  const adminEmail =
    notice.createdByAdminEmail || notice.adminEmail || notice.createdAdminEmail || "";

  return {
    id: notice.noticeId,
    noticeId: notice.noticeId,
    title: notice.title ?? "",
    category: categoryByType[notice.noticeType] ?? NOTICE_CATEGORY.GENERAL,
    noticeType: notice.noticeType ?? NOTICE_TYPE.NORMAL,
    content: sanitizeNoticeHtml(notice.content ?? ""),
    alignCenter: hasCenterWrapper(notice.content),
    status: isDeleted ? NOTICE_STATUS.DELETE : NOTICE_STATUS.ACTIVE,
    isExpired,
    createdAt: formatDateText(notice.createdAt),
    createdTimestamp,
    adminName: adminEmail ? `${adminDisplayName} (${adminEmail})` : adminDisplayName,
    adminDisplayName,
    adminEmail,
    updatedAt: formatDateText(notice.updatedAt),
    updatedTimestamp,
    deletedAt: formatDateText(notice.deletedAt),
    deletedTimestamp,
    version: updatedTimestamp || createdTimestamp,
  };
};

export const toNoticePayload = ({ title, category, content }, alignCenter = false) => ({
  title,
  content: buildNoticeContent(content, alignCenter),
  noticeType: typeByCategory[category] ?? NOTICE_TYPE.NORMAL,
});

const authConfig = (accessToken, extraConfig = {}) => ({
  ...extraConfig,
  headers: {
    ...(extraConfig.headers || {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  },
});

export const fetchAdminNotices = async (accessToken, status = "all") => {
  const response = await axios.get(
    `${BACKSERVER}/admin/api/notices`,
    authConfig(accessToken, { params: { status } }),
  );

  return (response.data.notices || []).map(normalizeNotice).filter(Boolean);
};

export const fetchLatestNotice = async (accessToken) => {
  const response = await axios.get(
    `${BACKSERVER}/admin/api/notices/latest`,
    authConfig(accessToken),
  );

  return normalizeNotice(response.data.notice);
};

export const createAdminNotice = async (accessToken, payload) => {
  const response = await axios.post(
    `${BACKSERVER}/admin/api/notices`,
    payload,
    authConfig(accessToken),
  );

  return normalizeNotice(response.data.notice);
};

export const updateAdminNotice = async (accessToken, noticeId, payload) => {
  const response = await axios.put(
    `${BACKSERVER}/admin/api/notices/${noticeId}`,
    payload,
    authConfig(accessToken),
  );

  return normalizeNotice(response.data.notice);
};

export const softDeleteAdminNotice = async (accessToken, noticeId) => {
  const response = await axios.put(
    `${BACKSERVER}/admin/api/notices/${noticeId}/delete`,
    null,
    authConfig(accessToken),
  );

  return normalizeNotice(response.data.notice);
};

export const getLatestActiveNotice = (notices) => {
  return notices
    .filter((notice) => notice.status === NOTICE_STATUS.ACTIVE)
    .sort((left, right) => right.createdTimestamp - left.createdTimestamp)[0];
};

export const formatCategoryTag = (category) => `[${category}]`;
