import type { ProviderKind } from '@waku/client';

export interface AgentPresetMenuProps {
  provider: ProviderKind;
  agentPreset: string | null;
  onApply: (selection: { agentPreset: string | null }) => void;
  /**
   * `chip` is the bordered, self-contained button the new-task screen uses.
   * `inline` drops the border and the icon and tints the name with the brand,
   * for the composer header where it sits beside the model name. `icon` is a
   * bare circle holding the person glyph, so the control reads as one of the
   * composer's round actions rather than as a labelled chip.
   */
  variant?: 'chip' | 'inline' | 'icon';
}
