const DEFAULT_API_BASE = "/api";

export function getApiBaseUrl() {
  const raw = String(
    import.meta.env.VITE_BACKSERVER || DEFAULT_API_BASE,
  ).trim();

  if (/^https?:\/\//i.test(raw)) {
    const hostname =
      typeof window !== "undefined" ? window.location.hostname : "";

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".local")
    ) {
      return raw.replace(/\/+$/, "") || DEFAULT_API_BASE;
    }

    return DEFAULT_API_BASE;
  }

  return raw.replace(/\/+$/, "") || DEFAULT_API_BASE;
}
