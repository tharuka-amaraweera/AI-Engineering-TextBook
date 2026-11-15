import { useState } from 'react';
import { Bars, Cap, Fan, Note, Slider, Stat, Stats, StepFlow, Tabs, Toggle, Two, int } from './kit.jsx';

/* 26 — embeddings as points */
const PTS = [
  ['The deployment failed last night', 0.9, 0.35, 'a'],
  ['The release broke yesterday evening', 0.84, 0.44, 'a'],
  ['We rolled back the new version', 0.93, 0.2, 'a'],
  ['I like pizza', -0.3, 0.9, 'c'],
  ['Lunch was pasta today', -0.18, 0.88, 'c'],
  ['The daily scrum starts at nine', 0.55, -0.75, 'e'],
  ['Our stand-up meeting is at 9:00', 0.62, -0.68, 'e'],
  ['Waiting for firewall access', -0.7, -0.5, 'b'],
];
const cosine = (a, b) => (a[1] * b[1] + a[2] * b[2]) / (Math.hypot(a[1], a[2]) * Math.hypot(b[1], b[2]));
function V26() {
  const [k, setK] = useState(0);
  const sel = PTS[k];
  const ranked = PTS.map((p, i) => ({ i, text: p[0], sim: cosine(sel, p) })).filter(r => r.i !== k).sort((a, b) => b.sim - a.sim);
  const X = v => 150 + v * 125, Y = v => 150 - v * 125;
  return (
    <Two>
      <svg viewBox="0 0 300 300" className="plot" role="img" aria-label="Sentences shown as points. Sentences with similar meaning are close together.">
        <line x1="150" y1="10" x2="150" y2="290" className="axis" /><line x1="10" y1="150" x2="290" y2="150" className="axis" />
        <line x1="150" y1="150" x2={X(sel[1])} y2={Y(sel[2])} className="ray" />
        <line x1="150" y1="150" x2={X(PTS[ranked[0].i][1])} y2={Y(PTS[ranked[0].i][2])} className="ray" />
        {PTS.map((p, i) => (
          <circle key={i} cx={X(p[1])} cy={Y(p[2])} r={i === k ? 9 : 7} className={`pt t-${p[3]}${i === k ? ' on' : ''}`} tabIndex={0} role="button" aria-label={p[0]}
            onClick={() => setK(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setK(i); } }} />
        ))}
      </svg>
      <div>
        <Cap>Selected sentence</Cap>
        <p><b>“{sel[0]}”</b></p>
        <Cap>Similarity to the others</Cap>
        <Bars rows={ranked.map(r => ({ label: r.text, value: Math.max(0, r.sim), tone: r.sim > 0.9 ? 'b' : 'n' }))} max={1} fmt={v => v.toFixed(2)} />
        <p className="note">Click a point. Real embeddings have hundreds of dimensions, not two, but the rule is the same: similar meaning points in a similar direction, even with different words.</p>
      </div>
    </Two>
  );
}

/* 27 — exact vs approximate search */
function V27() {
  const [e, setE] = useState(6);
  const n = Math.round(10 ** e);
  const hnsw = Math.round(40 * Math.log2(n));
  return (
    <div className="ctl">
      <Slider label="Vectors in the store" value={e} set={setE} min={3} max={8} step={0.5} fmt={() => int(n)} />
      <Bars rows={[{ label: 'Exact search: compare with all', value: Math.log10(n), tone: 'c' }, { label: 'HNSW index: follow the graph', value: Math.log10(hnsw), tone: 'a' }]} max={8} fmt={v => int(10 ** v)} />
      <Stats>
        <Stat label="comparisons, exact" value={int(n)} tone="c" />
        <Stat label="comparisons, HNSW (about)" value={int(hnsw)} tone="a" />
        <Stat label="work saved" value={Math.round(n / hnsw) + '×'} tone="b" />
      </Stats>
      <p className="note">Bars use a logarithmic scale. The HNSW figure is an illustration of how slowly it grows, not a measurement. The price is that the result is almost, not always exactly, the best match.</p>
    </div>
  );
}

/* 28 — chunking */
const TURNS = [
  ['Anna', 'Yesterday I finished the price import fix and merged it. Today I will write the tests.'],
  ['Mario', 'I am still blocked by the firewall. SAP has not answered the change request yet.'],
  ['Anna', 'I can ask their team lead after this meeting.'],
  ['Lena', 'The release is planned for Friday. It depends on the firewall, so it may move to Monday.'],
];
function V28() {
  const [mode, setMode] = useState('fixed');
  const [size, setSize] = useState(14);
  const [over, setOver] = useState(3);
  const [head, setHead] = useState(true);
  const words = TURNS.flatMap(([sp, t]) => (sp + ': ' + t).split(' '));
  const step = Math.max(1, size - Math.min(over, size - 1));
  const chunks = [];
  for (let s = 0; s < words.length; s += step) { chunks.push([s, Math.min(words.length, s + size)]); if (s + size >= words.length) break; }
  const tones = ['a', 'b', 'c', 'e'];
  return (
    <div className="ctl">
      <Tabs value={mode} set={setMode} options={[['fixed', 'Fixed size'], ['turn', 'By speaker turn']]} />
      {mode === 'fixed' ? (
        <>
          <Slider label="Chunk size" value={size} set={setSize} min={6} max={40} fmt={v => v + ' words'} />
          <Slider label="Overlap" value={over} set={setOver} min={0} max={10} fmt={v => v + ' words'} />
          <div className="stack">
            {chunks.map(([a, b], i) => (
              <div key={i} className={'bubble t-' + tones[i % 4]}><small>chunk {i + 1}</small>
                {words.slice(a, b).map((w, j) => (i > 0 && a + j < chunks[i - 1][1] ? <span key={j} className="mark">{w} </span> : w + ' '))}
              </div>
            ))}
          </div>
          <p className="note">{chunks.length} chunks. Highlighted words are the overlap, repeated from the chunk before. Notice how fixed cuts split a person’s update in the middle.</p>
        </>
      ) : (
        <>
          <Toggle label="Add a context header to each chunk" on={head} set={setHead} />
          <div className="stack">
            {TURNS.map(([sp, t], i) => (
              <div key={i} className={'bubble t-' + tones[i % 4]}><small>chunk {i + 1}</small>
                {head && <span className="mark">[Daily scrum, 2026-11-12, speaker: {sp}] </span>}{t}
              </div>
            ))}
          </div>
          <p className="note">{head ? 'Each chunk is one complete update and explains itself: date and speaker travel with it into the vector.' : 'One update per chunk, but chunk 3 alone (“I can ask their team lead…”) no longer says who speaks or when.'}</p>
        </>
      )}
    </div>
  );
}

/* 29 — the two phases of RAG */
const PHASES = {
  index: [
    { t: 'Transcript', note: 'A finished meeting arrives. This phase runs once per meeting, in the background.' },
    { t: 'Clean + chunk', tone: 'c', note: 'Fix names, then cut along natural borders such as speaker turns. Add a header to each chunk.' },
    { t: 'Embed', tone: 'e', note: 'The embedding model turns each chunk into a vector.' },
    { t: 'Store', tone: 'b', note: 'Text, vector and metadata (meeting, date, speaker, time) go into the vector store.' },
  ],
  query: [
    { t: 'Question', note: 'The user asks. This phase runs on every question and must be fast.' },
    { t: 'Embed', tone: 'e', note: 'The same embedding model turns the question into a vector.' },
    { t: 'Search top-k', tone: 'c', note: 'The store returns the few chunks closest in meaning, narrowed by filters such as date.' },
    { t: 'Build prompt', tone: 'a', note: 'Numbered excerpts plus the question plus the rule “answer only from these”.' },
    { t: 'Answer + sources', tone: 'b', note: 'The model writes the answer and cites the excerpts it used.' },
  ],
};
function V29() {
  const [p, setP] = useState('index');
  return (
    <div className="ctl">
      <Tabs value={p} set={setP} options={[['index', 'Phase 1: indexing'], ['query', 'Phase 2: query']]} />
      <StepFlow key={p} steps={PHASES[p]} />
    </div>
  );
}

/* 30 — hybrid search with reciprocal rank fusion */
const DOCS30 = {
  A: 'TCB-7598: price import blocked', B: 'Firewall request sent to SAP', C: 'TCB-7598 retested after the fix',
  D: 'Network access still pending', E: 'Release plan for Friday',
};
const VEC30 = ['B', 'D', 'A', 'E'], KEY30 = ['A', 'C', 'B'];
function V30() {
  const [mode, setMode] = useState('hybrid');
  const score = id => (VEC30.includes(id) ? 1 / (60 + VEC30.indexOf(id) + 1) : 0) + (KEY30.includes(id) ? 1 / (60 + KEY30.indexOf(id) + 1) : 0);
  const fused = Object.keys(DOCS30).map(id => ({ id, s: score(id) })).sort((a, b) => b.s - a.s);
  const final = mode === 'vector' ? VEC30 : mode === 'keyword' ? KEY30 : fused.map(f => f.id);
  const List = ({ title, ids, tone }) => (
    <div><Cap>{title}</Cap><ol className="list">{ids.map((id, i) => <li key={id} className={'box t-' + tone}><small>rank {i + 1}</small>{DOCS30[id]}</li>)}</ol></div>
  );
  return (
    <div className="ctl">
      <div className="bubble t-n"><small>Search</small>TCB-7598 firewall</div>
      <Two>
        <List title="Vector search (meaning)" ids={VEC30} tone="e" />
        <List title="Keyword search (exact words)" ids={KEY30} tone="c" />
      </Two>
      <Tabs value={mode} set={setMode} options={[['vector', 'Use vector only'], ['keyword', 'Use keyword only'], ['hybrid', 'Hybrid (fused)']]} />
      <Bars rows={final.map(id => ({ label: DOCS30[id], value: mode === 'hybrid' ? score(id) : 1 / (60 + final.indexOf(id) + 1), tone: 'a' }))} max={0.035} fmt={v => v.toFixed(4)} />
      <p className="note">{mode === 'vector' ? 'Vector search understands “firewall” but ranks the passage with the ticket number only third, and misses the retest completely.' : mode === 'keyword' ? 'Keyword search finds the exact ticket number but misses “network access still pending”, which uses other words.' : 'Fusion: each result scores 1 ÷ (60 + rank) in every list where it appears. Passages found by both searches rise to the top.'}</p>
    </div>
  );
}

/* 31 — re-ranking */
const P31 = [
  ['Price list for the autumn catalogue is ready', 0.82, 0.12],
  ['Import of new suppliers finished late on Monday', 0.8, 0.2],
  ['Price import blocked: SAP firewall is not open', 0.78, 0.96],
  ['Anna: still waiting for SAP, the import cannot start', 0.74, 0.9],
  ['Late delivery of the test data', 0.7, 0.3],
  ['Mario: firewall opened, import running since this morning', 0.66, 0.85],
  ['Prices in the UI are rounded wrongly', 0.6, 0.1],
  ['Release moved to Friday', 0.5, 0.15],
];
function V31() {
  const [rr, setRr] = useState(false);
  const col = rr ? 2 : 1;
  const rows = [...P31].sort((a, b) => b[col] - a[col]);
  return (
    <div className="ctl">
      <div className="bubble t-n"><small>Question</small>Why is the price import late?</div>
      <Toggle label="Re-rank the candidates before building the prompt" on={rr} set={setRr} />
      <Bars rows={rows.map((r, i) => ({ label: r[0], value: r[col], tone: i < 3 ? 'b' : 'n', dim: i >= 3 }))} max={1} fmt={v => v.toFixed(2)} />
      <p className="note">{rr ? 'The re-ranker read the question together with each passage. The three passages that really explain the delay are now on top.' : 'First search only: passages that share words like “price”, “import” and “late” score highest, although two of the top three are about something else.'} The top 3 (green) go into the prompt. Scores are illustrative.</p>
    </div>
  );
}

/* 32 — citations */
const SRC32 = [
  ['10 Nov · Anna', 'The firewall change request was sent to the SAP team.'],
  ['12 Nov · Anna', 'The price import is still blocked; no answer from SAP.'],
  ['13 Nov · Mario', 'SAP opened the firewall this morning, the import is running.'],
];
function V32() {
  const [q, setQ] = useState('found');
  const [hot, setHot] = useState(1);
  const Cite = ({ n }) => <button type="button" className={'chip t-a' + (hot === n ? ' on' : '')} onClick={() => setHot(n)}>[{n + 1}]</button>;
  return (
    <div className="ctl">
      <Tabs value={q} set={setQ} options={[['found', 'A question the meetings can answer'], ['missing', 'A question they cannot answer']]} />
      {q === 'found' ? (
        <Two>
          <div>
            <div className="bubble t-n"><small>Question</small>What happened with the price import this week?</div>
            <Cap>Answer</Cap>
            <div className="bubble t-b"><small>assistant</small>The change request went to SAP on 10 November <Cite n={0} />. On 12 November the import was still blocked <Cite n={1} />. SAP opened the firewall on 13 November and the import is running <Cite n={2} />.</div>
          </div>
          <div>
            <Cap>Excerpts given to the model</Cap>
            <ol className="list">{SRC32.map(([m, t], i) => <li key={i} className={hot === i ? 'on' : ''}><small>[{i + 1}] {m}</small>{t}</li>)}</ol>
          </div>
        </Two>
      ) : (
        <>
          <div className="bubble t-n"><small>Question</small>What did we decide about the Christmas release freeze?</div>
          <div className="bubble t-c"><small>assistant</small>I could not find this in your meetings.</div>
        </>
      )}
      <p className="note">{q === 'found' ? 'Click a citation: every statement points to the excerpt that supports it, so checking takes seconds.' : 'No excerpt mentions it, so the right answer is “not found”. An assistant that always answers is an assistant that sometimes invents.'}</p>
    </div>
  );
}

/* 33 — pick the route per question */
const Q33 = [
  ["Summarise today's scrum", 0, 'One meeting fits easily into the context window. Give the model the whole transcript.'],
  ['When did we talk about the timeout?', 1, 'You need to find a moment among many meetings: search by meaning, then answer from the passages.'],
  ['List all open action items for Anna', 2, 'A complete list cannot come from a top-5 search. Query the extracted action items with SQL.'],
  ['How many times was the import blocked this year?', 2, 'Counting needs all rows, not the five most similar ones. SQL over the extracted blockers.'],
  ['What exactly did Mario say about SAP?', 1, 'Find the passages by person and meaning: metadata filter plus vector search.'],
  ['What did the team decide in the last meeting?', 0, 'One known meeting: put its transcript, or its extracted decisions, straight into the context.'],
];
function V33() {
  const [k, setK] = useState(1);
  return (
    <div className="ctl">
      <Cap>Pick a question</Cap>
      <div className="chips">{Q33.map(([t], i) => <button type="button" key={i} className={'chip t-n' + (i === k ? ' on' : '')} onClick={() => setK(i)}>{t}</button>)}</div>
      <Fan pick={Q33[k][1]} from={{ t: 'Router', s: 'a small model call' }} to={{ t: 'Answer', tone: 'b' }}
        mids={[{ t: 'Full transcript in the context', s: 'one meeting' }, { t: 'RAG over segments', s: 'find passages' }, { t: 'SQL over extracted items', s: 'count, list, trend' }]} />
      <Note tone="a">{Q33[k][2]}</Note>
    </div>
  );
}

export default {
  26: { title: 'Meaning as points in space', C: V26 },
  27: { title: 'Why an index is needed', C: V27 },
  28: { title: 'Cut the transcript into chunks', C: V28 },
  29: { title: 'Index once, query many times', C: V29 },
  30: { title: 'Two searches, one ranking', C: V30 },
  31: { title: 'Fetch wide, keep narrow', C: V31 },
  32: { title: 'Every statement points to a source', C: V32 },
  33: { title: 'Which route for which question', C: V33 },
};
