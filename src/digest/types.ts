// Plan morning-digest § 1. The contract every part of § 2 builds against.
export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl.
export type RunLine = { at: string; job: string; status: RunStatus; owner: string | null; error?: string };

// One row per job. Times keep the log's offset (styleguide).
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

// null = no file for that night. badLines = lines that didn't parse (counted, never thrown).
export type Night = { night: string; rows: DigestRow[]; badLines: number };

export type ReadNight = (runsDir: string, night: string) => Night | null;
