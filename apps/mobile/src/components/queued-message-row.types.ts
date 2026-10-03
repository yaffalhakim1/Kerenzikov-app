import type { QueuedMessage } from '@waku/client';
import { StyleSheet } from 'react-native';

import { Radius } from '@/constants/theme';

export interface QueuedMessageRowProps {
  /** Whether a queued follow-up can be delivered into the live turn right now,
   *  which decides if its Send now action is offered. */
  canSteer: boolean;
  message: QueuedMessage;
  onEdit: () => void;
  onRemove: () => void;
  onSendNow: () => void;
}

/** The text a queued row shows: the typed draft when it differs from the
 *  provider-facing prompt, else the attachment names, else the raw content. */
export function queuedMessageLabel(message: QueuedMessage): string {
  return message.display_content?.trim()
    || message.attachments?.map((attachment) => attachment.name).join(', ')
    || message.content;
}

/** Shared by both platform wrappers so the row cannot drift between them. */
export const queuedMessageRowStyles = StyleSheet.create({
  menu: { marginBottom: 6 },
  row: {
    alignItems: 'center',
    borderRadius: Radius.small,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  text: { flex: 1, fontSize: 12.5 },
});
