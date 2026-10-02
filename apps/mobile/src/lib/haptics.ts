import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * The lightest tap feedback for a selection change.
 *
 * `selectionAsync` is already the softest tick iOS offers, but on Android it
 * drives the `Vibrator` directly — a 50ms buzz that reads as too much for a
 * picker row or a toggle. Android's own haptic engine (`performHapticFeedback`)
 * gives a much subtler tick and needs no `VIBRATE` permission, so use it there.
 */
export function tapHaptic(): void {
  if (Platform.OS === 'android') {
    void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick);
  } else {
    void Haptics.selectionAsync();
  }
}
