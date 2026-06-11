import { useMemo } from "react";
import { getPlainTextFromHtml } from "../../lib/mentionUtils";
import styles from "./RichTextContent.module.css";

function normalizeMentions(mentions = []) {
  return [...mentions]
    .filter(
      (mention) =>
        mention &&
        Number.isFinite(Number(mention.startIndex)) &&
        Number.isFinite(Number(mention.endIndex)) &&
        Number(mention.endIndex) > Number(mention.startIndex),
    )
    .sort((left, right) => Number(left.startIndex) - Number(right.startIndex));
}

function isLikelyUrl(text) {
  return /^(https?:\/\/|www\.)/i.test(text) || /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#][^\s<]*)?$/i.test(text);
}

function normalizeHref(rawUrl) {
  if (!rawUrl) {
    return "";
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^www\./i.test(trimmed) || isLikelyUrl(trimmed)) {
    return `https://${trimmed}`;
  }

  return "";
}

function trimTrailingPunctuation(value) {
  let endIndex = value.length;
  while (endIndex > 0 && /[),.!?;:]+$/.test(value.slice(0, endIndex))) {
    const lastChar = value[endIndex - 1];
    if (!/[),.!?;:]/.test(lastChar)) {
      break;
    }
    endIndex -= 1;
  }

  return {
    text: value.slice(0, endIndex),
    trailing: value.slice(endIndex),
  };
}

function tokenizeLinks(text) {
  const urlPattern =
    /(https?:\/\/[^\s<>"'`]+|www\.[^\s<>"'`]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"'`]*)?)/gi;
  const tokens = [];
  let lastIndex = 0;
  let match;

  while ((match = urlPattern.exec(text)) !== null) {
    const startIndex = match.index;
    if (startIndex > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, startIndex) });
    }

    const rawValue = match[0];
    const { text: urlText, trailing } = trimTrailingPunctuation(rawValue);
    const href = normalizeHref(urlText);

    if (href) {
      tokens.push({
        type: "link",
        value: urlText,
        href,
      });
    } else {
      tokens.push({ type: "text", value: rawValue });
    }

    if (trailing) {
      tokens.push({ type: "text", value: trailing });
    }

    lastIndex = startIndex + rawValue.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens;
}

function renderTextWithLinks(text, linkClassName) {
  return tokenizeLinks(text).map((token, index) => {
    if (token.type === "link") {
      return (
        <a
          key={`link-${index}-${token.href}`}
          className={linkClassName || styles.link}
          href={token.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          {token.value}
        </a>
      );
    }

    return token.value;
  });
}

export function RichTextContent({
  content,
  mentions = [],
  onMentionClick,
  className,
  mentionClassName,
  linkClassName,
}) {
  const text = useMemo(() => getPlainTextFromHtml(content), [content]);
  const orderedMentions = useMemo(() => normalizeMentions(mentions), [mentions]);

  const nodes = [];
  let cursor = 0;

  orderedMentions.forEach((mention, index) => {
    const startIndex = Number(mention.startIndex);
    const endIndex = Number(mention.endIndex);

    if (startIndex > cursor) {
      nodes.push(...renderTextWithLinks(text.slice(cursor, startIndex), linkClassName));
    }

    const userId = mention.userId ?? mention.memberId ?? mention.mentionedUserId;
    const mentionText = text.slice(startIndex, endIndex) || mention.mentionText || mention.memberNick || "";
    nodes.push(
      <span
        key={`${userId ?? "mention"}-${startIndex}-${index}`}
        className={mentionClassName}
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.stopPropagation();
          onMentionClick?.(mention);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onMentionClick?.(mention);
          }
        }}
      >
        {mentionText}
      </span>,
    );

    cursor = endIndex;
  });

  if (cursor < text.length) {
    nodes.push(...renderTextWithLinks(text.slice(cursor), linkClassName));
  }

  return <span className={className}>{nodes.length > 0 ? nodes : renderTextWithLinks(text, linkClassName)}</span>;
}
