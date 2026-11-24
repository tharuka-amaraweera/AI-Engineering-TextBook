import { useCallback, useEffect, useRef, useState } from 'react';
import { joinNotes } from './richnotes.js';

// Progress, notes and theme live in the browser's local storage.
// Optionally, notes and progress are also synced to one secret GitHub Gist, so
// they follow the reader to other browsers. The token never leaves this browser
// except in requests to api.github.com.

const KEY = 'ai-workbook-v1';
const SYNC_KEY = 'ai-workbook-sync'; // { token, gistId, dirty: [paths], first }
const FILE = 'ai-workbook-notes.json';
const API = 'https://api.github.com';
const SYNCED = ['notes', 'read', 'revise', 'ex', 'quiz']; // theme stays per browser

const readJson = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } };
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable: keep in memory */ } };
const clone = v => JSON.parse(JSON.stringify(v));

// A path names one synced value, for example "notes/c9" or "read/9".
const split = p => { const i = p.indexOf('/'); return [p.slice(0, i), p.slice(i + 1)]; };
const getAt = (s, p) => { const [k, id] = split(p); return s[k]?.[id]; };
const setAt = (s, p, v) => {
  const [k, id] = split(p);
  if (v === undefined) { if (s[k]) delete s[k][id]; } else { s[k] = s[k] || {}; s[k][id] = v; }
};
const allPaths = s => SYNCED.flatMap(k => Object.keys(s[k] || {}).map(id => k + '/' + id));
const changedPaths = (a, b) => [...new Set([...allPaths(a), ...allPaths(b)])].filter(p => getAt(a, p) !== getAt(b, p));

class SyncError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function gh(token, path, method = 'GET', body) {
  let res;
  try {
    res = await fetch(API + path, {
      method,
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body && JSON.stringify(body),
    });
  } catch {
    throw new SyncError('Cannot reach GitHub. Your notes are safe in this browser and will sync later.', 0);
  }
  if (!res.ok) {
    const msg = res.status === 401 ? 'GitHub did not accept the token. It may be wrong, expired or deleted.'
      : res.status === 403 ? 'The token has no permission for Gists, or GitHub is limiting requests.'
      : res.status === 404 ? 'GitHub could not find the notes Gist, or the token has no permission for Gists.'
      : 'GitHub answered with error ' + res.status + '.';
    throw new SyncError(msg, res.status);
  }
  return res.json();
}

async function findGist(token) {
  for (let page = 1; page <= 10; page++) {
    const list = await gh(token, `/gists?per_page=100&page=${page}`);
    const hit = list.find(g => g.files && g.files[FILE]);
    if (hit) return hit.id;
    if (list.length < 100) break;
  }
  return null;
}

async function readRemote(token, id) {
  const g = await gh(token, '/gists/' + id);
  const f = g.files?.[FILE];
  if (!f) return {};
  let text = f.content;
  if (f.truncated) text = await (await fetch(f.raw_url, { cache: 'no-store' })).text();
  try {
    const d = JSON.parse(text);
    if (d && typeof d === 'object') return d;
  } catch { /* handled below */ }
  // Never overwrite a file we cannot read.
  throw new SyncError('The notes file on GitHub is damaged. Open the Gist and fix or delete it.', -1);
}

const fileBody = data => ({ files: { [FILE]: { content: JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), ...data }, null, 2) } } });

export function useStore() {
  const [state, setState] = useState(() => readJson(KEY));
  const stateRef = useRef(state);
  const cfg = useRef(readJson(SYNC_KEY));
  const [status, setStatus] = useState(() => (cfg.current.token ? { kind: 'idle' } : { kind: 'off' }));
  const busy = useRef(false);
  const again = useRef(false);
  const timer = useRef(0);
  const run = useRef(() => {});

  const commit = next => { stateRef.current = next; writeJson(KEY, next); setState(next); };
  const saveCfg = patch => { cfg.current = { ...cfg.current, ...patch }; writeJson(SYNC_KEY, cfg.current); };
  const schedule = (ms = 1500) => { clearTimeout(timer.current); timer.current = setTimeout(() => run.current(), ms); };

  run.current = async () => {
    const { token } = cfg.current;
    if (!token) return;
    if (busy.current) { again.current = true; return; }
    busy.current = true;
    clearTimeout(timer.current);
    setStatus({ kind: 'busy' });
    try {
      let id = cfg.current.gistId || await findGist(token);
      let remote = {};
      if (id) {
        try { remote = await readRemote(token, id); }
        catch (e) { if (e.status === 404 && cfg.current.gistId) id = null; else throw e; }
      }
      const sent = clone(stateRef.current);
      const first = !!cfg.current.first;
      // No Gist yet: upload everything. Otherwise only what changed in this browser.
      const dirty = id ? (cfg.current.dirty || []) : allPaths(sent);

      const merged = {};
      SYNCED.forEach(k => { merged[k] = { ...(remote[k] || {}) }; });
      for (const p of dirty) {
        let v = getAt(sent, p);
        const [k, key] = split(p);
        if (first && k === 'notes') {
          // First connection of this browser: never lose a note from either side.
          const r = getAt(merged, p);
          if (!v) continue;
          if (r && r !== v) v = joinNotes(r, v);
        }
        setAt(merged, p, v);
        // A concept is either understood or marked to revise again, never both.
        if (v && k === 'read') delete merged.revise[key];
        if (v && k === 'revise') delete merged.read[key];
      }

      if (!id) id = (await gh(token, '/gists', 'POST', { description: 'AI Engineering workbook: my notes and progress', public: false, ...fileBody(merged) })).id;
      else if (changedPaths(remote, merged).length) await gh(token, '/gists/' + id, 'PATCH', fileBody(merged));

      // Keep anything typed while we were talking to GitHub.
      const now = stateRef.current;
      const still = changedPaths(sent, now);
      const next = { ...now };
      SYNCED.forEach(k => { next[k] = clone(merged[k]); });
      still.forEach(p => setAt(next, p, getAt(now, p)));
      saveCfg({ gistId: id, dirty: still, first: false });
      commit(next);
      setStatus({ kind: 'ok', at: Date.now() });
      if (still.length) schedule();
    } catch (e) {
      setStatus({ kind: 'error', msg: e instanceof SyncError ? e.message : 'Sync failed: ' + (e?.message || 'unknown error') });
    } finally {
      busy.current = false;
      if (again.current) { again.current = false; schedule(300); }
    }
  };

  const update = useCallback(fn => {
    const prev = stateRef.current;
    const next = clone(prev);
    fn(next);
    if (cfg.current.token) {
      const changed = changedPaths(prev, next);
      if (changed.length) {
        saveCfg({ dirty: [...new Set([...(cfg.current.dirty || []), ...changed])] });
        schedule();
      }
    }
    commit(next);
  }, []);

  useEffect(() => {
    const pull = () => { if (document.visibilityState === 'visible') run.current(); };
    pull();
    document.addEventListener('visibilitychange', pull);
    window.addEventListener('online', pull);
    return () => {
      document.removeEventListener('visibilitychange', pull);
      window.removeEventListener('online', pull);
      clearTimeout(timer.current);
    };
  }, []);

  const sync = {
    status,
    connected: !!cfg.current.token,
    gistId: cfg.current.gistId || null,
    connect: token => {
      cfg.current = {};
      saveCfg({ token: token.trim(), gistId: null, dirty: allPaths(stateRef.current), first: true });
      run.current();
    },
    disconnect: () => {
      clearTimeout(timer.current);
      cfg.current = {};
      try { localStorage.removeItem(SYNC_KEY); } catch { /* nothing to remove */ }
      setStatus({ kind: 'off' });
    },
    now: () => run.current(),
  };

  return [state, update, sync];
}
