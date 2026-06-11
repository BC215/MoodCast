export function getPlainTextFromHtml(html) {
  if (!html) {
    return '';
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  } catch (error) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
  }
}

export function getEditorCaretIndex(editor) {
  if (!editor) {
    return -1;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return -1;
  }

  const anchorNode = selection.anchorNode;
  if (!anchorNode || !editor.contains(anchorNode)) {
    return -1;
  }

  try {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.setEnd(anchorNode, selection.anchorOffset);
    return range.toString().length;
  } catch (error) {
    return -1;
  }
}

export function getActiveMentionState(editor) {
  const caretIndex = getEditorCaretIndex(editor);
  if (caretIndex < 0) {
    return null;
  }

  const plainText = editor?.innerText?.replace(/\u00a0/g, ' ') ?? '';
  const textBeforeCaret = plainText.slice(0, caretIndex);
  const atIndex = textBeforeCaret.lastIndexOf('@');

  if (atIndex < 0) {
    return null;
  }

  const beforeAt = textBeforeCaret[atIndex - 1];
  if (atIndex > 0 && beforeAt && !/\s/.test(beforeAt)) {
    return null;
  }

  const query = textBeforeCaret.slice(atIndex + 1);
  if (/[\s\r\n]/.test(query)) {
    return null;
  }

  return {
    query,
    startIndex: atIndex,
    endIndex: caretIndex,
  };
}

export function createMentionSpan(candidate) {
  const span = document.createElement('span');
  span.dataset.mentionUserId = String(candidate?.memberId ?? candidate?.userId ?? '');
  span.dataset.mentionNickname = candidate?.nickname || candidate?.name || '';
  span.dataset.mentionText = candidate?.mentionText || `@${candidate?.nickname || candidate?.name || ''}`;
  span.contentEditable = 'false';
  span.style.color = '#7c4dff';
  span.style.fontWeight = '800';
  span.style.background = 'rgba(124, 77, 255, 0.09)';
  span.style.borderRadius = '8px';
  span.style.padding = '0 4px';
  span.style.display = 'inline-block';
  span.style.cursor = 'pointer';
  span.textContent = span.dataset.mentionText;
  return span;
}

export function insertMentionIntoEditor(editor, candidate) {
  if (!editor || !candidate) {
    return false;
  }

  const state = getActiveMentionState(editor);
  const selection = window.getSelection();
  if (!state || !selection || selection.rangeCount === 0) {
    return false;
  }

  const anchorNode = selection.anchorNode;
  if (!anchorNode || !editor.contains(anchorNode)) {
    return false;
  }

  const range = selection.getRangeAt(0);
  try {
    const preRange = document.createRange();
    preRange.selectNodeContents(editor);
    preRange.setEnd(selection.anchorNode, selection.anchorOffset);
    const currentCaretIndex = preRange.toString().length;
    const replacementStart = currentCaretIndex - (state.query.length + 1);
    if (replacementStart < 0) {
      return false;
    }

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let currentIndex = 0;
    let startContainer = null;
    let startOffset = 0;
    let endContainer = null;
    let endOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;

      if (node.nodeType === Node.TEXT_NODE) {
        const nextIndex = currentIndex + (node.textContent?.length || 0);
        if (startContainer === null && replacementStart >= currentIndex && replacementStart <= nextIndex) {
          startContainer = node;
          startOffset = replacementStart - currentIndex;
        }
        if (currentCaretIndex >= currentIndex && currentCaretIndex <= nextIndex) {
          endContainer = node;
          endOffset = currentCaretIndex - currentIndex;
          break;
        }
        currentIndex = nextIndex;
      } else if (node.nodeType === Node.ELEMENT_NODE && node.dataset?.mentionUserId) {
        const mentionLength = (node.textContent || '').length;
        const nextIndex = currentIndex + mentionLength;
        if (startContainer === null && replacementStart >= currentIndex && replacementStart <= nextIndex) {
          startContainer = node;
          startOffset = 0;
        }
        if (currentCaretIndex >= currentIndex && currentCaretIndex <= nextIndex) {
          endContainer = node;
          endOffset = mentionLength;
          break;
        }
        currentIndex = nextIndex;
      }
    }

    if (!startContainer || !endContainer) {
      return false;
    }

    const replaceRange = document.createRange();
    replaceRange.setStart(startContainer, startOffset);
    replaceRange.setEnd(endContainer, endOffset);
    replaceRange.deleteContents();

    const mentionSpan = createMentionSpan(candidate);
    const trailingSpace = document.createTextNode(' ');
    const fragment = document.createDocumentFragment();
    fragment.appendChild(mentionSpan);
    fragment.appendChild(trailingSpace);
    replaceRange.insertNode(fragment);

    const afterRange = document.createRange();
    afterRange.setStartAfter(trailingSpace);
    afterRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(afterRange);
    editor.focus();
    return true;
  } catch (error) {
    return false;
  }
}

export function extractMentionsFromEditor(editor) {
  const mentions = [];
  if (!editor) {
    return mentions;
  }

  let cursorIndex = 0;

  const walk = (node) => {
    if (!node) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      cursorIndex += node.textContent?.length || 0;
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const mentionUserId = node.dataset?.mentionUserId;
    if (mentionUserId) {
      const mentionText = node.dataset?.mentionText || node.textContent || '';
      const startIndex = cursorIndex;
      const endIndex = cursorIndex + mentionText.length;
      mentions.push({
        userId: Number(mentionUserId),
        nickname: node.dataset?.mentionNickname || '',
        mentionText,
        startIndex,
        endIndex,
      });
      cursorIndex = endIndex;
      return;
    }

    Array.from(node.childNodes).forEach(walk);
  };

  Array.from(editor.childNodes).forEach(walk);
  return mentions;
}

export function serializeEditorContent(editor) {
  if (!editor) {
    return {
      content: '',
      mentions: [],
      plainText: '',
    };
  }

  return {
    content: editor.innerHTML,
    mentions: extractMentionsFromEditor(editor),
    plainText: editor.innerText?.replace(/\u00a0/g, ' ') ?? '',
  };
}

export function normalizeMentionCandidate(candidate) {
  const userId = candidate?.userId ?? candidate?.memberId ?? candidate?.mentionedUserId;
  const nickname = candidate?.nickname ?? candidate?.memberNick ?? candidate?.name ?? '';

  return {
    ...candidate,
    userId: userId ? Number(userId) : null,
    nickname,
    profileImage: candidate?.profileImage ?? candidate?.profileImageUrl ?? candidate?.profile_image_url ?? '',
  };
}

export function getActiveMentionStateFromText(value, caretIndex) {
  if (typeof value !== 'string' || caretIndex < 0) {
    return null;
  }

  const textBeforeCaret = value.slice(0, caretIndex);
  const atIndex = textBeforeCaret.lastIndexOf('@');
  if (atIndex < 0) {
    return null;
  }

  const beforeAt = textBeforeCaret[atIndex - 1];
  if (atIndex > 0 && beforeAt && !/\s/.test(beforeAt)) {
    return null;
  }

  const query = textBeforeCaret.slice(atIndex + 1);
  if (/[\s\r\n]/.test(query)) {
    return null;
  }

  return {
    query,
    startIndex: atIndex,
    endIndex: caretIndex,
  };
}

export function reconcileMentionsAfterTextChange(previousValue, nextValue, mentions = []) {
  const previous = previousValue ?? '';
  const next = nextValue ?? '';
  const lengthDelta = next.length - previous.length;

  return mentions
    .map((mention) => {
      const mentionText = mention?.mentionText ?? '';
      if (!mentionText) {
        return null;
      }

      const expectedStart = Math.max(0, Number(mention.startIndex) + lengthDelta);
      const nearbyStart = Math.max(0, expectedStart - Math.abs(lengthDelta) - mentionText.length);
      const nearbyEnd = Math.min(next.length, expectedStart + Math.abs(lengthDelta) + mentionText.length);
      const nearbyIndex = next.slice(nearbyStart, nearbyEnd).indexOf(mentionText);
      const foundIndex = nearbyIndex >= 0 ? nearbyStart + nearbyIndex : next.indexOf(mentionText);

      if (foundIndex < 0) {
        return null;
      }

      return {
        ...mention,
        startIndex: foundIndex,
        endIndex: foundIndex + mentionText.length,
      };
    })
    .filter(Boolean)
    .sort((left, right) => Number(left.startIndex) - Number(right.startIndex));
}

export function insertMentionIntoText(value, mentionRange, candidate, mentions = []) {
  const normalizedCandidate = normalizeMentionCandidate(candidate);
  const nickname = normalizedCandidate.nickname;
  const userId = normalizedCandidate.userId;

  if (!nickname || !userId || !mentionRange) {
    return null;
  }

  const mentionText = `@${nickname}`;
  const startIndex = Number(mentionRange.startIndex);
  const endIndex = Number(mentionRange.endIndex);
  const previousValue = value ?? '';
  const nextValue = `${previousValue.slice(0, startIndex)}${mentionText} ${previousValue.slice(endIndex)}`;
  const delta = mentionText.length + 1 - (endIndex - startIndex);

  const nextMentions = mentions
    .filter((mention) => Number(mention.endIndex) <= startIndex || Number(mention.startIndex) >= endIndex)
    .map((mention) => {
      if (Number(mention.startIndex) >= endIndex) {
        return {
          ...mention,
          startIndex: Number(mention.startIndex) + delta,
          endIndex: Number(mention.endIndex) + delta,
        };
      }

      return mention;
    });

  nextMentions.push({
    userId,
    nickname,
    mentionText,
    startIndex,
    endIndex: startIndex + mentionText.length,
  });

  return {
    content: nextValue,
    caretIndex: startIndex + mentionText.length + 1,
    mentions: nextMentions.sort((left, right) => Number(left.startIndex) - Number(right.startIndex)),
  };
}
