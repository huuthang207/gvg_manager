import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import express from 'express';
import { createGvgLineupRoutes, type GvgLineupRouteDependencies } from './gvgLineupRoutes.js';

type RouteContext = {
  access: {
    guild: { id: string };
    role: string;
  };
};

type RouteDependencies = {
  context: RouteContext | null;
  lineup?: unknown;
  saveResult?: { status: number; body: unknown };
  clearResult?: { status: number; body: unknown };
};

type RouteCalls = {
  access: Array<'view:guild'>;
  save: Array<{ guildId: string; body: unknown }>;
  clear: Array<{ guildId: string; squadNumber: number }>;
  published: Parameters<GvgLineupRouteDependencies['publishGuildAppStateChanged']>[0][];
};

async function withLineupApi(dependencies: RouteDependencies, run: (baseUrl: string, calls: RouteCalls) => Promise<void>) {
  const calls: RouteCalls = { access: [], save: [], clear: [], published: [] };
  const routeDependencies: Partial<GvgLineupRouteDependencies> = {
    requireGuildAccess: async (_req, _res, permission) => {
      calls.access.push(permission as 'view:guild');
      return dependencies.context as never;
    },
    ensureGvgLineup: async guildId => {
      assert.equal(guildId, dependencies.context?.access.guild.id);
      return (dependencies.lineup ?? { divisions: [] }) as never;
    },
    saveGvgLineup: async (guildId, body) => {
      calls.save.push({ guildId, body });
      return (dependencies.saveResult ?? { status: 200, body: dependencies.lineup ?? { divisions: [] } }) as never;
    },
    clearGvgLineupSquad: async (guildId, squadNumber) => {
      calls.clear.push({ guildId, squadNumber });
      return (dependencies.clearResult ?? { status: 200, body: dependencies.lineup ?? { divisions: [] } }) as never;
    },
    publishGuildAppStateChanged: payload => {
      calls.published.push(payload);
    },
  };
  const app = express();
  app.use(express.json());
  app.use(createGvgLineupRoutes(routeDependencies));

  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP listener');

  try {
    await run(`http://127.0.0.1:${address.port}`, calls);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

const viewerContext: RouteContext = { access: { guild: { id: 'guild-1' }, role: 'member' } };
const ownerContext: RouteContext = { access: { guild: { id: 'guild-1' }, role: 'owner' } };
const layout = { divisions: [{ id: 'division-1', orderIndex: 0, squads: [] }] };

test('returns the initialized layout to authorized viewers', async () => {
  await withLineupApi({ context: viewerContext, lineup: layout }, async (baseUrl, calls) => {
    const response = await fetch(`${baseUrl}/api/gvg-lineup`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), layout);
    assert.deepEqual(calls.access, ['view:guild']);
    assert.deepEqual(calls.save, []);
    assert.deepEqual(calls.published, []);
  });
});

test('saves a valid owner layout and publishes the lineup update', async () => {
  const body = { divisions: [{ squads: [] }] };
  await withLineupApi({ context: ownerContext, lineup: layout }, async (baseUrl, calls) => {
    const response = await fetch(`${baseUrl}/api/gvg-lineup`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), layout);
    assert.deepEqual(calls.save, [{ guildId: 'guild-1', body }]);
    assert.deepEqual(calls.published, [{ guildId: 'guild-1', reason: 'gvg_lineup_updated' }]);
  });
});

test('rejects non-owner layout saves without persisting or publishing', async () => {
  await withLineupApi({ context: viewerContext, lineup: layout }, async (baseUrl, calls) => {
    const response = await fetch(`${baseUrl}/api/gvg-lineup`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ divisions: [] }),
    });

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: 'Chỉ bang chủ có quyền chỉnh sửa đội hình Bang Chiến.' });
    assert.deepEqual(calls.save, []);
    assert.deepEqual(calls.published, []);
  });
});

test('forwards rejected layout saves without publishing', async () => {
  const result = { status: 400, body: { error: 'Đội hình không hợp lệ.' } };
  await withLineupApi({ context: ownerContext, saveResult: result }, async (baseUrl, calls) => {
    const response = await fetch(`${baseUrl}/api/gvg-lineup`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ divisions: [] }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), result.body);
    assert.equal(calls.save.length, 1);
    assert.deepEqual(calls.published, []);
  });
});

test('clears an owner squad and publishes the lineup update', async () => {
  await withLineupApi({ context: ownerContext, lineup: layout }, async (baseUrl, calls) => {
    const response = await fetch(`${baseUrl}/api/gvg-lineup/squads/7/clear`, { method: 'POST' });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), layout);
    assert.deepEqual(calls.clear, [{ guildId: 'guild-1', squadNumber: 7 }]);
    assert.deepEqual(calls.published, [{ guildId: 'guild-1', reason: 'gvg_lineup_updated' }]);
  });
});

test('forwards rejected squad clears without publishing', async () => {
  const result = { status: 400, body: { error: 'Tổ đội không hợp lệ.' } };
  await withLineupApi({ context: ownerContext, clearResult: result }, async (baseUrl, calls) => {
    const response = await fetch(`${baseUrl}/api/gvg-lineup/squads/x/clear`, { method: 'POST' });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), result.body);
    assert.deepEqual(calls.clear, [{ guildId: 'guild-1', squadNumber: Number.NaN }]);
    assert.deepEqual(calls.published, []);
  });
});
