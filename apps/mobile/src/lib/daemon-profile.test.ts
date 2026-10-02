import { describe, expect, test } from 'bun:test';

import {
  displayHost,
  isDaemonPairingLink,
  isPrivateDaemonAddress,
  isTailscaleAddress,
  isTailscaleDaemonAddress,
  normalizeDaemonAddress,
  normalizeDaemonProfile,
  parseDaemonPairingLink,
  parseDaemonProfiles,
  profileInitials,
} from './daemon-profile';

describe('daemon profiles', () => {
  test('normalizes host, HTTP aliases, and protocol paths', () => {
    expect(normalizeDaemonAddress('waku.local:34123')).toBe('ws://waku.local:34123');
    expect(normalizeDaemonAddress('https://waku.example.com/v1?old=1')).toBe(
      'wss://waku.example.com',
    );
  });

  test('rejects unsupported schemes and embedded credentials', () => {
    expect(() => normalizeDaemonAddress('ftp://waku.local')).toThrow('ws:// or wss://');
    expect(() => normalizeDaemonAddress('ws://user:secret@waku.local')).toThrow('no credentials');
  });

  test('derives a useful default name without losing timestamps', () => {
    const profile = normalizeDaemonProfile(
      { name: '', address: 'wss://work.example.com', token: 'secret' },
      undefined,
      'daemon-id',
      100,
    );
    expect(profile).toEqual({
      id: 'daemon-id',
      name: 'work.example.com',
      address: 'wss://work.example.com',
      createdAt: 100,
      updatedAt: 100,
      lastConnectedAt: null,
    });
    expect(displayHost('ws://10.0.0.4:34123/v1')).toBe('10.0.0.4:34123');
  });

  test('identifies LAN and tailnet addresses', () => {
    expect(isPrivateDaemonAddress('ws://192.168.1.8:34123')).toBe(true);
    expect(isPrivateDaemonAddress('ws://100.100.12.8:34123')).toBe(true);
    expect(isPrivateDaemonAddress('ws://workstation:34123')).toBe(true);
    expect(isPrivateDaemonAddress('ws://[::1]:34123')).toBe(true);
    expect(isPrivateDaemonAddress('ws://[2001:db8::8]:34123')).toBe(false);
    expect(isPrivateDaemonAddress('wss://waku.example.com')).toBe(false);
  });

  test('recognises a tailnet address and nothing adjacent to it', () => {
    // The CGNAT block Tailscale assigns from, checked at both edges.
    expect(isTailscaleAddress('100.64.0.1')).toBe(true);
    expect(isTailscaleAddress('100.100.12.8')).toBe(true);
    expect(isTailscaleAddress('100.127.255.254')).toBe(true);
    // Neighbouring public ranges and a plain LAN address are not tailnet.
    expect(isTailscaleAddress('100.63.0.1')).toBe(false);
    expect(isTailscaleAddress('100.128.0.1')).toBe(false);
    expect(isTailscaleAddress('192.168.1.8')).toBe(false);

    // The editor runs this on keystrokes, so an unparseable value is false,
    // never a throw.
    expect(isTailscaleDaemonAddress('ws://100.100.12.8:34123')).toBe(true);
    expect(isTailscaleDaemonAddress('ws://192.168.1.8:34123')).toBe(false);
    expect(isTailscaleDaemonAddress('not an address')).toBe(false);
  });

  test('creates compact initials', () => {
    expect(profileInitials('Home Mac')).toBe('HM');
    expect(profileInitials('studio')).toBe('ST');
  });

  test('splits a pairing link into address and token', () => {
    // The exact shape the desktop's `daemon_pairing_link` writes: the token in
    // the userinfo position and the transport as an explicit hint.
    expect(parseDaemonPairingLink('waku://abc123@192.168.1.10:34123/pair?transport=ws'))
      .toEqual({ address: 'ws://192.168.1.10:34123', token: 'abc123' });
    expect(parseDaemonPairingLink('waku://tok@waku.example.test/pair?transport=wss'))
      .toEqual({ address: 'wss://waku.example.test', token: 'tok' });
  });

  test('only a waku:// value counts as a pairing link', () => {
    expect(isDaemonPairingLink('waku://t@host:1/pair')).toBe(true);
    expect(isDaemonPairingLink('  waku://t@host:1/pair')).toBe(true);
    expect(isDaemonPairingLink('ws://host:1')).toBe(false);
    expect(isDaemonPairingLink('192.168.1.10:34123')).toBe(false);
  });

  test('rejects a malformed pairing link with a readable reason', () => {
    expect(() => parseDaemonPairingLink('ws://host:1')).toThrow('waku://');
    expect(() => parseDaemonPairingLink('waku://host:1/pair')).toThrow('missing');
  });

  test('recovers valid profiles from a partially corrupt registry', () => {
    expect(parseDaemonProfiles([
      {
        id: 'one',
        name: 'Home',
        address: 'home.local:34123',
        createdAt: 1,
        updatedAt: 2,
        lastConnectedAt: null,
      },
      { id: 'broken' },
    ])).toEqual([
      {
        id: 'one',
        name: 'Home',
        address: 'ws://home.local:34123',
        createdAt: 1,
        updatedAt: 2,
        lastConnectedAt: null,
      },
    ]);
  });
});
