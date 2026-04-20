import type { Conversation, Message } from '@/types';

const toTimestamp = (value?: string) => {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
};

export function mergeConversationPreviewMessage(conversation: Conversation | undefined, messages: Message[]) {
  if (!conversation) return [];

  // Show only persisted rows from `messages`.
  // Conversation preview fields are used in the list panel, not as chat bubbles.
  return [...messages].sort((a, b) => toTimestamp(a.timestamp) - toTimestamp(b.timestamp));
}
