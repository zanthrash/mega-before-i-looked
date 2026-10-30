import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const line = (at: string, job: string, status: string, owner: string | null, error?: string) =>
  JSON.stringify({ at, job, status, owner, ...(error ? { error } : {}) });

let dir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
  const real = [
    line('2026-10-01T01:00:00+01:00', 'zeta-sync', 'ok', 'sam'),
    line('2026-10-01T01:05:00+01:00', 'alpha-backup', 'retry', null, 'timeout'),
    line('2026-10-01T01:10:00+01:00', 'alpha-backup', 'ok', null),
    line('2026-10-01T02:00:00+01:00', 'mid-clean', 'fail', 'kim', 'disk full'),
  ];
  writeFileSync(join(dir, '2026-10-01.jsonl'), real.join('\n') + '\n');
  writeFileSync(join(dir, '2026-10-02.jsonl'), '');
  writeFileSync(join(dir, '2026-10-03.jsonl'), [real[0], 'not json at all', real[3]].join('\n') + '\n');
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir: dir,
  });
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

// Job cells are the first <td> of each body row.
const pageJobs = (html: string) => [...html.matchAll(/<tr[^>]*><td>([^<]*)<\/td>/g)].map((m) => m[1]);

describe('GET /digest/:night', () => {
  it('200 for a real night', async () => {
    const res = await app.request('/digest/2026-10-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('digest · 2026-10-01');
    expect(html).toContain('disk full');
  });

  it('404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-10-09');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('no digest for 2026-10-09');
  });

  it('says nothing ran on the empty night', async () => {
    const res = await app.request('/digest/2026-10-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still renders with a bad line', async () => {
    const res = await app.request('/digest/2026-10-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('1 line(s) didn&#39;t parse');
    expect(pageJobs(html)).toEqual(['mid-clean', 'zeta-sync']);
  });
});

describe('GET /api/digest/:night', () => {
  it('200 for a real night', async () => {
    const res = await app.request('/api/digest/2026-10-01');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.night).toBe('2026-10-01');
    expect(body.badLines).toBe(0);
    expect(body.rows).toHaveLength(3);
  });

  it('404 for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-10-09');
    expect(res.status).toBe(404);
  });

  it('empty night has rows []', async () => {
    const res = await app.request('/api/digest/2026-10-02');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: '2026-10-02', rows: [], badLines: 0 });
  });

  it('bad line is counted in badLines', async () => {
    const res = await app.request('/api/digest/2026-10-03');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(1);
    expect(body.rows).toHaveLength(2);
  });
});

describe('page and JSON agree', () => {
  it.each(['2026-10-01', '2026-10-03'])('same jobs, same order for %s', async (night) => {
    const html = await (await app.request(`/digest/${night}`)).text();
    const body = (await (await app.request(`/api/digest/${night}`)).json()) as Night;
    expect(pageJobs(html)).toEqual(body.rows.map((r) => r.job));
  });
});
