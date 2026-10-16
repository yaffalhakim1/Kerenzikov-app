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
  // Stretched, not sized to its content. The Android wrapper is a bare view
  // around a Compose host, and Compose lays that content out against the
  // window: left to itself the row settled as a 166pt pill in a 340pt slot.
  // This is the parent-sized box the row fills, so the two agree.
  menu: { alignSelf: 'stretch', marginBottom: 6 },
  row: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: Radius.small,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  // `flex: 1` (grow, shrink and a zero basis) so a long label gives way to the
  // trailing actions rather than pushing them out; `numberOfLines={1}` on the
  // text is what truncates it.
  text: { flex: 1, fontSize: 12.5 },
});
