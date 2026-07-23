import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import express from 'express';
import { createGvgLineupRoutes, type GvgLineupRouteDependencies } from './gvgLineupRoutes.js';

const ownerContext = { access: { guild: { id: 'guild-1' }, role: 'owner' } };
const viewerContext = { access: { guild: { id: 'guild-1' }, role: 'member' } };
const layout = { divisions: [] };

type Calls = { published: Parameters<GvgLineupRouteDependencies['publishGuildAppStateChanged']>[0][]; createDivision: string[]; createSquad: Array<{ guildId: string; divisionId: string }>; updateDivisionNote: Array<{ guildId: string; divisionId: string; note: unknown }> };

async function withApi(context: typeof ownerContext | typeof viewerContext, run: (baseUrl: string, calls: Calls) => Promise<void>) {
  const calls: Calls = { published: [], createDivision: [], createSquad: [], updateDivisionNote: [] };
  const routes: Partial<GvgLineupRouteDependencies> = {
    requireGuildAccess: async () => context as never,
    getGvgLineup: async () => layout as never,
    createGvgLineupDivision: async guildId => { calls.createDivision.push(guildId); return { status: 201, body: layout } as never; },
    createGvgLineupSquad: async (guildId, divisionId) => { calls.createSquad.push({ guildId, divisionId }); return { status: 201, body: layout } as never; },
    deleteGvgLineupDivisionResource: async () => ({ status: 200, body: layout } as never),
    deleteGvgLineupSquad: async () => ({ status: 200, body: layout } as never),
    moveGvgLineupSquad: async () => ({ status: 200, body: layout } as never),
    reorderGvgLineupDivisions: async () => ({ status: 200, body: layout } as never),
    reorderGvgLineupSquads: async () => ({ status: 200, body: layout } as never),
    updateGvgLineupSquadSlots: async () => ({ status: 200, body: layout } as never),
    clearGvgLineupSquadById: async () => ({ status: 200, body: layout } as never),
    updateGvgLineupDivisionNote: async (guildId, divisionId, note) => { calls.updateDivisionNote.push({ guildId, divisionId, note }); return { status: 200, body: layout } as never; },
    updateGvgLineupSquadName: async () => ({ status: 200, body: layout } as never),
    publishGuildAppStateChanged: payload => calls.published.push(payload),
  };
  const app = express();
  app.use(express.json());
  app.use(createGvgLineupRoutes(routes));
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected listener');
  try { await run(`http://127.0.0.1:${address.port}`, calls); } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

test('returns an empty uninitialized lineup to viewers', async () => {
  await withApi(viewerContext, async (baseUrl, calls) => {
    const response = await fetch(`${baseUrl}/api/gvg-lineup`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), layout);
    assert.deepEqual(calls.published, []);
  });
});

test('owner creates an empty division and publishes update', async () => {
  await withApi(ownerContext, async (baseUrl, calls) => {
    const response = await fetch(`${baseUrl}/api/gvg-lineup/divisions`, { method: 'POST' });
    assert.equal(response.status, 201);
    assert.deepEqual(calls.createDivision, ['guild-1']);
    assert.deepEqual(calls.published, [{ guildId: 'guild-1', reason: 'gvg_lineup_updated' }]);
  });
});

test('owner creates a squad inside a division and publishes update', async () => {
  await withApi(ownerContext, async (baseUrl, calls) => {
    const response = await fetch(`${baseUrl}/api/gvg-lineup/divisions/division-1/squads`, { method: 'POST' });
    assert.equal(response.status, 201);
    assert.deepEqual(calls.createSquad, [{ guildId: 'guild-1', divisionId: 'division-1' }]);
    assert.deepEqual(calls.published, [{ guildId: 'guild-1', reason: 'gvg_lineup_updated' }]);
  });
});

test('owner updates a division note and publishes update', async () => {
  await withApi(ownerContext, async (baseUrl, calls) => {
    const response = await fetch(`${baseUrl}/api/gvg-lineup/divisions/division-1/note`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: 'Giữ cổng trái\nKhông tách đội' }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(calls.updateDivisionNote, [{ guildId: 'guild-1', divisionId: 'division-1', note: 'Giữ cổng trái\nKhông tách đội' }]);
    assert.deepEqual(calls.published, [{ guildId: 'guild-1', reason: 'gvg_lineup_updated' }]);
  });
});

test('rejects non-owner division-note updates without publishing', async () => {
  await withApi(viewerContext, async (baseUrl, calls) => {
    const response = await fetch(`${baseUrl}/api/gvg-lineup/divisions/division-1/note`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: 'Không được phép' }),
    });
    assert.equal(response.status, 403);
    assert.deepEqual(calls.updateDivisionNote, []);
    assert.deepEqual(calls.published, []);
  });
});

test('rejects non-owner creation without publishing', async () => {
  await withApi(viewerContext, async (baseUrl, calls) => {
    const response = await fetch(`${baseUrl}/api/gvg-lineup/divisions`, { method: 'POST' });
    assert.equal(response.status, 403);
    assert.deepEqual(calls.createDivision, []);
    assert.deepEqual(calls.published, []);
  });
});
