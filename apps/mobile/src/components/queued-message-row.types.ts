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
  // `alignSelf: 'stretch'` is what makes a row as wide as the composer card it
  // sits above, and it lands on whatever wraps the row: the `MenuView` on
  // Android, the `Host` on iOS. Neither platform sizes the row itself — the
  // Android `MenuView` is a bare view around its Compose host and the iOS
  // SwiftUI `Menu` asks its label for an intrinsic width, which for a short
  // label is the label. Stretching the wrapper is what makes a one-word
  // follow-up and a paragraph render at the same width, and is why the label
  // can then be ellipsized rather than setting the row's size.
  menu: { alignSelf: 'stretch', marginBottom: 6 },
  row: {
    alignItems: 'center',
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
