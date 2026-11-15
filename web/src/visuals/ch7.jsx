import { useState } from 'react';
import { Bars, Btn, Cap, Flow, Note, Slider, Stat, Stats, Tabs, Toggle, usd } from './kit.jsx';

/* 45 — a trace of one question */
const SPANS = [
  ['Rewrite the question', 0, 320, 'Small model · prompt “rewrite” v3 · 210 input / 38 output tokens · stop: finished'],
  ['Vector + keyword search', 320, 90, '12 candidates · filter: last 14 days · no model call'],
  ['Re-rank', 410, 260, '12 passages in, 5 kept'],
  ['Generate the answer', 670, 2400, 'Large model · prompt “answer” v7 · 3,900 input / 310 output tokens · stop: finished'],
  ['Check citations', 3070, 15, '3 of 3 cited excerpts exist'],
];
function V45() {
  const [k, setK] = useState(3);
  const total = 3085;
  return (
    <div className="ctl">
      <div className="gantt">
        {SPANS.map(([name, start, dur], i) => (
          <button type="button" key={i} className={i === k ? 'on' : ''} onClick={() => setK(i)}>
            <span>{name}</span>
            <span className="lane"><i style={{ left: (start / total) * 100 + '%', width: (dur / total) * 100 + '%' }} /></span>
            <span className="bv">{dur} ms</span>
          </button>
        ))}
      </div>
      <Note tone="a"><b>{SPANS[k][0]}:</b> {SPANS[k][3]}</Note>
      <p className="note">One question, five steps, {(total / 1000).toFixed(1)} seconds. Click a step to see what was logged for it. The trace shows at once that generating the answer takes most of the time. Example data.</p>
    </div>
  );
}

/* 46 — cost levers, computed */
const PRICE = { large: [3, 15], small: [0.25, 1.25] };
function V46() {
  const [tier, setTier] = useState(false);
  const [chunks, setChunks] = useState(false);
  const [short, setShort] = useState(false);
  const [cache, setCache] = useState(false);
  const cost = (t, c, s, ca) => {
    const [ri, ro] = t ? PRICE.small : PRICE.large;
    const router = 500 * ri + 50 * ro;
    const input = c ? 3500 : 8000, output = s ? 300 : 600, cached = ca ? 2000 : 0;
    const answer = (input - cached) * PRICE.large[0] + cached * PRICE.large[0] * 0.1 + output * PRICE.large[1];
    return (router + answer) / 1e6;
  };
  const base = cost(false, false, false, false);
  const now = cost(tier, chunks, short, cache);
  return (
    <div className="ctl">
      <Toggle label="Small model for the routing step" on={tier} set={setTier} />
      <Toggle label="Send 5 re-ranked chunks instead of 12 (8,000 → 3,500 input tokens)" on={chunks} set={setChunks} />
      <Toggle label="Ask for a concise answer (600 → 300 output tokens)" on={short} set={setShort} />
      <Toggle label="Prompt caching for the 2,000-token stable start" on={cache} set={setCache} />
      <Bars rows={[{ label: 'Before', value: base, tone: 'c' }, { label: 'Now', value: now, tone: 'b' }]} max={base} fmt={usd} />
      <Stats>
        <Stat label="per question" value={usd(now)} tone="b" />
        <Stat label="saved" value={Math.round((1 - now / base) * 100) + '%'} />
        <Stat label="per month at 1,000 questions a day" value={usd(now * 30000)} />
      </Stats>
      <p className="note">Computed from the token counts with made-up prices (large model $3 in / $15 out per million tokens, small model $0.25 / $1.25, cached input at 10%). The method is what matters: measure, then pull one lever at a time.</p>
    </div>
  );
}

/* 47 — guardrails */
const CASES47 = {
  ok: [-1, 'A normal question passes every check and is answered.', 'b'],
  long: [0, 'Input check: 400 pages pasted into the question. Rejected for size before any model is called.', 'c'],
  inject: [3, 'The model was fooled by a sentence in the transcript and asked for the delete tool. The action check stops it: this user role has no delete tool.', 'd'],
  cite: [2, 'Output check: the answer cites “[7]”, but only 5 excerpts were given. The answer is rejected and generated again.', 'c'],
  del: [3, 'Action check: deleting a meeting changes data, so the application asks the user to confirm first.', 'c'],
};
function V47() {
  const [c, setC] = useState('inject');
  const [gate, text, tone] = CASES47[c];
  const steps = [{ t: 'Input checks', s: 'size · topic · personal data' }, { t: 'Model' }, { t: 'Output checks', s: 'schema · citations · content' }, { t: 'Action checks', s: 'allowed tools · confirmation' }];
  return (
    <div className="ctl">
      <Tabs value={c} set={setC} options={[['ok', 'Normal question'], ['long', 'Huge input'], ['inject', 'Injected instruction'], ['cite', 'Invented citation'], ['del', 'Delete request']]} />
      <Flow steps={steps.map((s, i) => ({ ...s, tone: i === gate ? 'd' : i === 1 ? 'a' : 'n' }))} active={gate} />
      <Note tone={tone}>{text}</Note>
    </div>
  );
}

/* 48 — deletion must cascade */
const COPIES = [
  ['Raw transcript', true], ['Chunks and their embeddings', false], ['Extracted summary, decisions, action items', false],
  ['Cached answers', false], ['Prompt and response logs with the text', false], ['Backups', null],
];
function V48() {
  const [cascade, setCascade] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const left = COPIES.filter(([, always]) => always === false).length;
  return (
    <div className="ctl">
      <Toggle label="Design: every derived row carries the meeting id, so one delete cascades" on={cascade} set={v => { setCascade(v); setDeleted(false); }} />
      <div className="row">
        <Btn onClick={() => setDeleted(true)} disabled={deleted}>Delete meeting 42</Btn>
        <button type="button" className="vbtn ghost" onClick={() => setDeleted(false)}>Undo</button>
      </div>
      <ul className="list">
        {COPIES.map(([name, always]) => {
          const gone = deleted && (always === true || (always === false && cascade));
          const leak = deleted && always === false && !cascade;
          return (
            <li key={name} className={gone ? 'gone' : leak ? 'bad' : ''}>
              {name}
              {leak && <small>still contains what was said</small>}
              {deleted && always === null && <small>disappears when the backup retention time ends</small>}
            </li>
          );
        })}
      </ul>
      {deleted && (cascade
        ? <Note tone="b">Everything derived from the meeting is gone with one delete.</Note>
        : <Note tone="d">The transcript is gone, but {left} other places still hold its content. The meeting can still be found by search.</Note>)}
    </div>
  );
}

/* 49 — the shortest timeout wins */
function V49() {
  const [hops, setHops] = useState([['Browser / client', 120], ['Gateway', 30], ['Ingress', 60], ['HTTP client to the provider', 90]]);
  const [dur, setDur] = useState(45);
  const cut = hops.reduce((best, h) => (h[1] < dur && (!best || h[1] < best[1]) ? h : best), null);
  return (
    <div className="ctl">
      <Slider label="Time the model needs" value={dur} set={setDur} min={5} max={150} step={5} fmt={v => v + ' s'} />
      <Cap>Timeout at each hop (seconds)</Cap>
      {hops.map(([name, t], i) => (
        <label key={name} className="sl">
          <span>{name}</span>
          <input type="range" min={5} max={180} step={5} value={t} onChange={e => setHops(h => h.map((x, j) => (j === i ? [x[0], +e.target.value] : x)))} />
          <b className={t < dur ? 'mark-bad' : ''}>{t} s</b>
        </label>
      ))}
      {cut
        ? <Note tone="d">Cut off after {cut[1]} s at “{cut[0]}”. The user sees an error although the model was still working.</Note>
        : <Note tone="b">The answer arrives: every hop waits longer than the {dur} s the model needs.</Note>}
    </div>
  );
}

/* 50 — tenant isolation */
function V50() {
  const [mode, setMode] = useState('prompt');
  const top = mode === 'query' ? ['A', 'A', 'A', 'A', 'A'] : ['A', 'B', 'A', 'B', 'A'];
  const leaks = top.filter(t => t === 'B').length;
  return (
    <div className="ctl">
      <Cap>The vector store holds chunks of two teams</Cap>
      <div className="chips">
        {Array.from({ length: 8 }, (_, i) => <span key={'a' + i} className="chip t-a">Team A</span>)}
        {Array.from({ length: 8 }, (_, i) => <span key={'b' + i} className="chip t-c">Team B</span>)}
      </div>
      <div className="bubble t-n"><small>A user of Team A asks</small>What did we decide about the release?</div>
      <Tabs value={mode} set={setMode} options={[['prompt', 'Rule only in the prompt'], ['query', 'Filter in the query']]} />
      <div className="box"><p className="pre">{mode === 'query'
        ? 'SELECT content FROM segment\nWHERE tenant_id = :tenantFromSession\nORDER BY embedding <=> :q LIMIT 5;'
        : 'SELECT content FROM segment\nORDER BY embedding <=> :q LIMIT 5;\n\n-- and in the prompt: "Only use data from Team A."'}</p></div>
      <Cap>The 5 chunks that reach the model</Cap>
      <div className="chips">{top.map((t, i) => <span key={i} className={'chip t-' + (t === 'A' ? 'a' : 'd')}>{t === 'A' ? 'Team A' : 'Team B: leaked'}</span>)}</div>
      {leaks
        ? <Note tone="d">{leaks} chunks of Team B are in the context. The prompt asks the model to ignore them; nothing guarantees it will.</Note>
        : <Note tone="b">The query can only return Team A’s rows. There is nothing to leak, whatever the model does.</Note>}
    </div>
  );
}

export default {
  45: { title: 'One question as a trace', C: V45 },
  46: { title: 'Pull the cost levers', C: V46 },
  47: { title: 'Which check catches what', C: V47 },
  48: { title: 'Delete a meeting, see what stays', C: V48 },
  49: { title: 'Where a long answer gets cut', C: V49 },
  50: { title: 'A prompt is not a lock', C: V50 },
};
