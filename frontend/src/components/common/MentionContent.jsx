import { useMemo } from 'react';
import { getPlainTextFromHtml } from '../../shared/lib/mentionUtils';

function normalizeMentions(mentions = []) {
  return [...mentions]
    .filter((mention) =>
      mention &&
      Number.isFinite(Number(mention.startIndex)) &&
      Number.isFinite(Number(mention.endIndex)) &&
      Number(mention.endIndex) > Number(mention.startIndex),
    )
    .sort((left, right) => Number(left.startIndex) - Number(right.startIndex));
}

export function MentionContent({ content, mentions = [], onMentionClick, className, mentionClassName }) {
  const text = useMemo(() => getPlainTextFromHtml(content), [content]);
  const orderedMentions = useMemo(() => normalizeMentions(mentions), [mentions]);

  const nodes = [];
  let cursor = 0;

  orderedMentions.forEach((mention, index) => {
    const startIndex = Number(mention.startIndex);
    const endIndex = Number(mention.endIndex);

    if (startIndex > cursor) {
      nodes.push(text.slice(cursor, startIndex));
    }

    const userId = mention.userId ?? mention.memberId ?? mention.mentionedUserId;
    const mentionText = text.slice(startIndex, endIndex) || mention.mentionText || mention.memberNick || '';
    nodes.push(
      <span
        key={`${userId ?? 'mention'}-${startIndex}-${index}`}
        className={mentionClassName}
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.stopPropagation();
          onMentionClick?.(mention);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
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
    nodes.push(text.slice(cursor));
  }

  return <span className={className}>{nodes.length > 0 ? nodes : text}</span>;
}
