import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import ReactDOMClient from 'react-dom/client';
import { useGuildRealtime } from './useGuildRealtime.ts';

const originalWebSocket = globalThis.WebSocket;
const originalGetAppState = globalThis.fetch;

class MockWebSocket {
  static OPEN = 1;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(_url: string) {
    setTimeout(() => {
      this.onopen?.();
    }, 0);
  }

  send(_value: string) {}
  close() {
    this.onclose?.();
  }

  emitMessage(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test('coalesces attendance update refreshes while a realtime request is already in flight', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);

  let socket: MockWebSocket | null = null;
  let resolveFetch: (() => void) | null = null;
  let fetchCount = 0;
  let applyCount = 0;

  globalThis.WebSocket = class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      socket = this;
    }
  } as any;

  globalThis.fetch = (async () => {
    fetchCount += 1;
    await new Promise<void>(resolve => {
      resolveFetch = resolve;
    });
    return {
      ok: true,
      json: async () => ({
        guild: { id: 'guild-1', discordGuildId: '123456789012345678' },
        permissions: ['view:guild'],
      }),
    } as Response;
  }) as typeof fetch;

  function Harness() {
    useGuildRealtime({
      isAuthenticated: true,
      isAuthorized: true,
      currentGuild: { id: 'guild-1', discordGuildId: '123456789012345678', name: 'Guild', icon: null },
      lastSyncedAt: null,
      applyAppState: async () => {
        applyCount += 1;
      },
      setIsAuthorized: () => true as any,
      setBlockedReason: () => true as any,
      setLastSyncedAt: () => true as any,
      mergeMemberDelta: () => undefined,
      replaceMemberPool: () => undefined,
      refreshLineupLock: async () => undefined,
      refreshGvgParticipationStats: async () => undefined,
      refreshSnapshots: async () => undefined,
      realtimeDebugEnabled: false,
    });
    return null;
  }

  root.render(React.createElement(Harness));
  await wait(20);

  socket?.emitMessage({ type: 'guild_app_state_changed', guildId: 'guild-1', reason: 'attendance_updated', updatedAt: new Date().toISOString() });
  socket?.emitMessage({ type: 'guild_app_state_changed', guildId: 'guild-1', reason: 'attendance_updated', updatedAt: new Date().toISOString() });
  await wait(350);

  assert.equal(fetchCount, 1);

  socket?.emitMessage({ type: 'guild_app_state_changed', guildId: 'guild-1', reason: 'attendance_updated', updatedAt: new Date().toISOString() });
  await wait(20);
  assert.equal(fetchCount, 1);

  resolveFetch?.();
  await wait(350);

  assert.equal(fetchCount, 2);
  assert.equal(applyCount, 2);

  root.unmount();
  container.remove();
});

afterEach(() => {
  globalThis.WebSocket = originalWebSocket;
  globalThis.fetch = originalGetAppState;
});
