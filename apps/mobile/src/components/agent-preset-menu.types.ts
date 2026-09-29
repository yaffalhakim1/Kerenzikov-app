import type { ProviderKind } from '@waku/client';

export interface AgentPresetMenuProps {
  provider: ProviderKind;
  agentPreset: string | null;
  onApply: (selection: { agentPreset: string | null }) => void;
  /**
   * `chip` is the bordered, self-contained button the new-task screen uses.
   * `inline` drops the border and the icon and tints the name with the brand,
   * for the composer header where it sits beside the model name.
   */
  variant?: 'chip' | 'inline';
}
