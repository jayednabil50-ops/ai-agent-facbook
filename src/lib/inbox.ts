import type { Conversation, Message } from '@/types';

const PREVIEW_TIME_SKEW_MS = 2000;

const attachmentLabels: Record<string, string> = {
  image: '📷 Image',
  audio: '🎤 Voice message',
  video: '🎥 Video',
  file: '📎 File',
};

const normalizeText = (value?: string | null) => value?.trim() ?? '';

const toTimestamp = (value?: string) => {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
};

const matchesConversationPreview = (message: Message | undefined, conversation: Conversation) => {
  if (!message) return false;

  const previewText = normalizeText(conversation.lastMessage);
  const messageText = normalizeText(message.content);
  const attachmentLabel = message.attachmentType ? attachmentLabels[message.attachmentType] : '';

  return previewText === messageText || (!!attachmentLabel && previewText === attachmentLabel);
};

export function mergeConversationPreviewMessage(conversation: Conversation | undefined, messages: Message[]) {
  if (!conversation) return [];

  const sortedMessages = [...messages].sort((a, b) => toTimestamp(a.timestamp) - toTimestamp(b.timestamp));
  const latestMessage = sortedMessages.at(-1);
  const conversationTime = toTimestamp(conversation.lastMessageTime);
  const latestMessageTime = toTimestamp(latestMessage?.timestamp);
  const hasRenderablePreview = !!normalizeText(conversation.lastMessage) || !!conversationTime;

  if (!hasRenderablePreview) return sortedMessages;

  const shouldAppendPreview =
    !latestMessage ||
    conversationTime > latestMessageTime + PREVIEW_TIME_SKEW_MS ||
    !matchesConversationPreview(latestMessage, conversation);

  if (!shouldAppendPreview) return sortedMessages;

  return [
    ...sortedMessages,
    {
      id: `preview-${conversation.id}-${conversation.lastMessageTime}`,
      conversationId: conversation.id,
      content: conversation.lastMessage,
      sender: conversation.unreadCount > 0 ? 'contact' : (latestMessage?.sender ?? 'contact'),
      timestamp: conversation.lastMessageTime,
    },
  ];
}