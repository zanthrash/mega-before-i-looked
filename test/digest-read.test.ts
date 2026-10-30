import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parseLines, readNight } from '../src/digest/read.js';

const tmp = mkdtempSync(join(tmpdir(), 'rig-read-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight('runs', '2026-10-28');

  it('has 5 jobs, sorted, and 1 bad line', () => {
    expect(night).not.toBeNull();
    expect(night!.night).toBe('2026-10-28');
    expect(night!.badLines).toBe(1);
    expect(night!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('counts runs and retries, keeps last status/error and times as written', () => {
    const refresh = night!.rows.find((r) => r.job === 'fixtures/refresh');
    expect(refresh).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    const backup = night!.rows.find((r) => r.job === 'notes/backup');
    expect(backup?.lastStatus).toBe('fail');
    expect(backup?.lastError).toMatch(/quota/);
  });

  it('keeps a row whose owner is null', () => {
    expect(night!.rows.find((r) => r.job === 'digest/render')?.owner).toBeNull();
  });
});

describe('readNight edge cases', () => {
  it('returns null when the file is missing', () => {
    expect(readNight(tmp, '1999-01-01')).toBeNull();
  });

  it('empty file gives no rows and no bad lines', () => {
    writeFileSync(join(tmp, 'empty.jsonl'), '');
    expect(readNight(tmp, 'empty')).toEqual({ night: 'empty', rows: [], badLines: 0 });
  });
});

describe('parseLines', () => {
  it('skips blank lines and counts wrong shapes as bad', () => {
    const text = [
      '{"at":"t1","job":"a","status":"ok","owner":null}',
      '',
      '{"at":"t2","job":"a","status":"nope","owner":"x"}',
      '{"at":"t3","job":"a","status":"ok"}',
      '[1,2]',
      '{"at":"t4","job":"a","status":"fail","owner":"x","error":42}',
      '',
    ].join('\n');
    const { lines, badLines } = parseLines(text);
    expect(lines).toHaveLength(1);
    expect(badLines).toBe(4);
  });
});
