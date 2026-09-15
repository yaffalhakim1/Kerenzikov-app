import { describe, expect, test } from 'bun:test';
import type { ViewStyle } from 'react-native';

import { splitPressableStyle } from './pressable-host';

describe('pressable clip host', () => {
  test('moves the caller’s spacing onto the host instead of dropping it', () => {
    // The bug this guards: the options list spaced stacked pressables with
    // marginBottom, the key was deleted from the pressable and never placed
    // on the host, so on Android the rows touched.
    const { host, inner } = splitPressableStyle({ marginBottom: 10 }, 12);
    expect(host.marginBottom).toBe(10);
    expect(inner.marginBottom).toBeUndefined();
  });

  test('never leaves a placement key on both views', () => {
    const style: ViewStyle = {
      margin: 4,
      marginTop: 8,
      marginBottom: 6,
      position: 'absolute',
      left: 3,
      zIndex: 2,
      aspectRatio: 1,
    };
    const { host, inner } = splitPressableStyle(style, 8);
    for (const key of Object.keys(style)) {
      expect(host).toHaveProperty(key);
      expect(inner).not.toHaveProperty(key);
    }
  });

  test('mirrors sizing so the host fills the slot and the pressable fills the host', () => {
    const { host, inner } = splitPressableStyle(
      { flex: 1, minHeight: 44, borderTopLeftRadius: 6 },
      12,
    );
    expect(host.minHeight).toBe(44);
    expect(host.flex).toBe(1);
    expect(host.borderTopLeftRadius).toBe(6);
    // Mirrored, not moved: the pressable keeps them to fill the host.
    expect(inner.minHeight).toBe(44);
    expect(inner.flex).toBe(1);
  });

  test('keeps appearance on the pressable', () => {
    const { host, inner } = splitPressableStyle(
      { backgroundColor: '#111', borderWidth: 1, paddingHorizontal: 11, borderRadius: 12 },
      12,
    );
    expect(inner.backgroundColor).toBe('#111');
    expect(inner.paddingHorizontal).toBe(11);
    expect(inner.borderWidth).toBe(1);
    expect(host.backgroundColor).toBeUndefined();
    expect(host.paddingHorizontal).toBeUndefined();
  });

  test('clips the ripple to the resolved radius', () => {
    const { host } = splitPressableStyle({ borderRadius: 12 }, 12);
    expect(host.overflow).toBe('hidden');
    expect(host.borderRadius).toBe(12);
  });

  test('leaves absent keys alone rather than materializing them', () => {
    // `undefined` is not a value to copy: an empty host style must not gain
    // every key as `undefined`, which would defeat React Native's flattening.
    const { host, inner } = splitPressableStyle({ padding: 4 }, 6);
    expect(Object.keys(host).sort()).toEqual(['borderRadius', 'overflow']);
    expect(inner).toEqual({ padding: 4 });
  });
});
