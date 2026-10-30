import type { Night } from '../digest/types.js';

const dash = '—';

export function DigestPage({ digest }: { digest: Night }) {
  return (
    <>
      <h1>digest · {digest.night}</h1>
      {digest.badLines > 0 && <p class="warn">{digest.badLines} line(s) didn't parse</p>}
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((r) => (
              <tr class={r.retries >= 3 || r.lastStatus === 'fail' ? 'warn' : undefined}>
                <td>{r.job}</td>
                <td>{r.owner ?? dash}</td>
                <td>{r.runs}</td>
                <td>{r.retries}</td>
                <td>{r.lastStatus}</td>
                <td>{r.lastError ?? dash}</td>
                <td>{r.firstAt}</td>
                <td>{r.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export function NotFound({ what }: { what: string }) {
  return (
    <>
      <h1>404</h1>
      <p class="mute">{what}</p>
    </>
  );
}
