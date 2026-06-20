export const KOREAN_TIME_ZONE = "Asia/Seoul";
export const KOREAN_LOCALE = "ko-KR";

function toValidDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const rawValue = String(value).trim();
  if (!rawValue) {
    return null;
  }

  const hasTimeZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(rawValue);
  const normalizedValue = hasTimeZone
    ? rawValue
    : rawValue.includes("T")
      ? `${rawValue}+09:00`
      : rawValue;

  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatKoreanDate(value) {
  const date = toValidDate(value);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat(KOREAN_LOCALE, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: KOREAN_TIME_ZONE,
  }).format(date);
}

export function formatKoreanTime(value) {
  const date = toValidDate(value);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(KOREAN_LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: KOREAN_TIME_ZONE,
  }).format(date);
}
