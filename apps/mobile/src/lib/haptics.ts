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

/**
 * The deliberate-action confirm: fired synchronously with the press, not
 * after the action's async result, so the haptic reads as part of the
 * gesture (Zeron's `HapticFeedbackType.Confirm`). Outcomes keep their own
 * longer-delay notification buzzes.
 */
export function confirmHaptic(): void {
  if (Platform.OS === 'android') {
    void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Keyboard_Tap);
  } else {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

/**
 * A long press opened something: slightly firmer than a tick so the gesture
 * that revealed a menu is distinguishable from the taps inside it.
 */
export function longPressHaptic(): void {
  if (Platform.OS === 'android') {
    void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press);
  } else {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
}
