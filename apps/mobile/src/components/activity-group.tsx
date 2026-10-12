import type { TranscriptBlock } from '@waku/client';
import { activitiesForBlock } from '@waku/client/event-reducer';
import { activityHeaderTitle } from '@waku/client/transcript-presentation';
import { Item } from 'panelui-native/components/item';
import { memo } from 'react';

import { useActivitySheet } from './activity-sheet';
import { AppSymbol } from './app-symbol';

import { useTheme } from '@/hooks/use-theme';

/**
 * The transcript's view of a tool group is the desktop's collapsed summary
 * line — the live activity's title while streaming, "Ran N commands · …"
 * once settled — and nothing else. Tapping it opens the group in the native
 * activity sheet (`ActivitySheetHost`) rather than unfolding cards in
 * place: a phone transcript stays a readable feed, and the inverted,
 * anchored list never has to absorb an in-place layout change.
 */
export const ActivityGroup = memo(function ActivityGroup({
  block,
  blockIndex,
  live,
}: {
  block: TranscriptBlock;
  blockIndex: number;
  live: boolean;
}) {
  const theme = useTheme();
  const openSheet = useActivitySheet();
  const activities = activitiesForBlock(block);
  if (!activities.length) return null;
  return (
    // `min-h-7 gap-1.5 p-0` is the row's own metrics, not a restyle: 28dp tall
    // with a 6dp gap, exactly the desktop trigger's `h-7 gap-1.5`. The item's
    // padding and radius exist for card-shaped rows, and a transcript line is
    // full-bleed inside a list that already carries the horizontal padding.
    // `pressOpacity` + `pressScale={1}` is the same dim-don't-shrink pair
    // PanelUI's own text-shaped rows use: a full-bleed line scaling to 0.97
    // reads as a layout jump.
    <Item
      accessibilityHint="Opens the activity list"
      className="min-h-7 gap-1.5 p-0"
      hitSlop={{ top: 6, bottom: 6 }}
      pressOpacity={0.6}
      pressScale={1}
      onPress={() => openSheet({
        blockIndex,
        turnId: block.turn_id,
        afterMessage: block.after_message,
      })}>
      <Item.Content>
        <Item.Title
          className="text-[13px] text-secondary-foreground"
          numberOfLines={1}>
          {activityHeaderTitle(activities, live)}
        </Item.Title>
      </Item.Content>
      <Item.Actions>
        <AppSymbol
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={10}
          tintColor={theme.textGhost}
        />
      </Item.Actions>
    </Item>
  );
});
