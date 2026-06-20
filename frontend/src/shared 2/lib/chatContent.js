const DIRECT_LEAVE_PREFIX = "__MOODCAST_DIRECT_LEAVE__::";

export function parseChatContent(rawContent) {
  if (typeof rawContent !== "string") {
    return {
      text: "",
      imageUrls: [],
    };
  }

  const trimmedContent = rawContent.trim();
  if (!trimmedContent) {
    return {
      text: "",
      imageUrls: [],
    };
  }

  try {
    const parsedContent = JSON.parse(trimmedContent);
    if (parsedContent && typeof parsedContent === "object" && !Array.isArray(parsedContent)) {
      const imageUrls = Array.isArray(parsedContent.imageUrls)
        ? parsedContent.imageUrls.filter((url) => typeof url === "string" && url.trim().length > 0)
        : [];

      return {
        text: typeof parsedContent.text === "string" ? parsedContent.text : "",
        imageUrls,
      };
    }
  } catch (error) {
    if (trimmedContent.startsWith(DIRECT_LEAVE_PREFIX)) {
      return {
        text: trimmedContent.slice(DIRECT_LEAVE_PREFIX.length),
        imageUrls: [],
        isSystem: true,
      };
    }

    return {
      text: trimmedContent,
      imageUrls: [],
    };
  }

  if (trimmedContent.startsWith(DIRECT_LEAVE_PREFIX)) {
    return {
      text: trimmedContent.slice(DIRECT_LEAVE_PREFIX.length),
      imageUrls: [],
      isSystem: true,
    };
  }

  return {
    text: trimmedContent,
    imageUrls: [],
  };
}

export function serializeChatContent({ text = "", imageUrls = [] } = {}) {
  const normalizedText = typeof text === "string" ? text.trim() : "";
  const normalizedImageUrls = Array.isArray(imageUrls)
    ? Array.from(
        new Set(
          imageUrls.filter((url) => typeof url === "string" && url.trim().length > 0),
        ),
      )
    : [];

  if (normalizedImageUrls.length === 0) {
    return normalizedText;
  }

  return JSON.stringify({
    text: normalizedText,
    imageUrls: normalizedImageUrls,
  });
}

export function formatChatPreview(rawContent) {
  const { text, imageUrls } = parseChatContent(rawContent);

  if (text) {
    return text;
  }

  if (imageUrls.length === 1) {
    return "이미지 1장";
  }

  if (imageUrls.length > 1) {
    return `이미지 ${imageUrls.length}장`;
  }

  return typeof rawContent === "string" ? rawContent : "";
}
