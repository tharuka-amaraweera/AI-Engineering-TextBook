import { useState } from 'react';
import { Btn, Cap, Note, Slider, Stat, Stats, Tabs, Two, pct } from './kit.jsx';

/* 40 — same input, different outputs */
const ANS40 = [
  ['On 13 November.', true], ['SAP opened it on the 13th of November.', true], ['It was opened on 13 Nov, in the morning.', true],
  ['The firewall was opened on 13 November 2026.', true], ['On 12 November.', false],
];
function V40() {
  const [runs, setRuns] = useState(null);
  const go = () => setRuns(Array.from({ length: 5 }, () => ANS40[Math.random() < 0.2 ? 4 : Math.floor(Math.random() * 4)]));
  const exact = runs ? runs.filter(r => r[0] === ANS40[0][0]).length : 0;
  const right = runs ? runs.filter(r => r[1]).length : 0;
  return (
    <div className="ctl">
      <div className="row"><Btn onClick={go}>Run both tests 5 times</Btn></div>
      <Two>
        <div>
          <Cap>Normal code: add(40, 2)</Cap>
          <ul className="list">{[0, 1, 2, 3, 4].map(i => <li key={i}>{runs ? '42  ✓' : '…'}</li>)}</ul>
        </div>
        <div>
          <Cap>LLM: “When did SAP open the firewall?”</Cap>
          <ul className="list">
            {[0, 1, 2, 3, 4].map(i => (
              <li key={i} className={runs && !runs[i][1] ? 'bad' : ''}>
                {runs ? runs[i][0] : '…'}
                {runs && <small>{runs[i][0] === ANS40[0][0] ? 'exact match ✓' : 'exact match ✗'} · {runs[i][1] ? 'actually correct ✓' : 'actually wrong ✗'}</small>}
              </li>
            ))}
          </ul>
        </div>
      </Two>
      {runs && <Stats><Stat label="pass assertEquals" value={exact + ' of 5'} tone="c" /><Stat label="are really correct" value={right + ' of 5'} tone={right === 5 ? 'b' : 'd'} /></Stats>}
      <p className="note">An exact string comparison fails correct answers that use other words, and a wrong answer looks just as fluent as a right one. So you judge meaning, over many cases, and report a score.</p>
    </div>
  );
}

/* 41 — what an evaluation set contains */
const CASES41 = [
  ['find', 'When did SAP open the firewall?', 'On 13 November 2026.', 'LLM judge + cited meeting id (code)'],
  ['find', 'Who suggested raising the timeout?', 'Mario, on 12 November.', 'LLM judge'],
  ['count', 'List all open action items for Anna.', '2 items: runbook, SAP follow-up.', 'Code: compare the two lists'],
  ['count', 'How many blockers were raised this week?', '3', 'Code: number equals 3'],
  ['none', 'What did we decide about the Christmas freeze?', 'Not found in the meetings.', 'Code: answer says “not found”'],
  ['none', 'What is Lena’s phone number?', 'Not found in the meetings.', 'Code: answer says “not found”'],
  ['hard', 'Was ist mit dem Preisimport passiert? (German question, English data)', 'Blocked until 13 Nov, then running.', 'LLM judge'],
  ['hard', 'What is the timeout now? (changed twice)', '30 s, the later decision wins.', 'LLM judge'],
];
const TYPE41 = { find: ['Find a moment', 'a'], count: ['Count / list', 'e'], none: ['Not in the data', 'c'], hard: ['Hard case', 'd'] };
function V41() {
  const [f, setF] = useState('all');
  const rows = CASES41.filter(c => f === 'all' || c[0] === f);
  return (
    <div className="ctl">
      <Tabs value={f} set={setF} options={[['all', `All (${CASES41.length})`], ...Object.entries(TYPE41).map(([k, [l]]) => [k, l])]} />
      <ul className="list">
        {rows.map(([type, q, exp, how]) => (
          <li key={q}>
            <span><span className={'chip t-' + TYPE41[type][1]}>{TYPE41[type][0]}</span> <b>{q}</b></span>
            <span>Golden answer: {exp}</span>
            <small>Judged by: {how}</small>
          </li>
        ))}
      </ul>
      <p className="note">A good set mixes normal questions with ones that have no answer and ones that are hard on purpose. Wherever a plain code check can judge, use it; keep the LLM judge for free text.</p>
    </div>
  );
}

/* 42 — the judge at work */
const CAND42 = [
  ['They opened it on Friday the 13th of November.', 'PASS', 'The answer gives the same date as the reference, in other words. Nothing is added that contradicts it.'],
  ['SAP opened the firewall on 12 November.', 'FAIL', 'The reference says 13 November. The answer gives a different date, so a fact is wrong.'],
  ['On 13 November, after Mario escalated to the SAP manager.', 'FAIL', 'The date is right, but the escalation is not in the reference. An invented fact was added.'],
];
function V42() {
  const [k, setK] = useState(0);
  const [, verdict, why] = CAND42[k];
  return (
    <div className="ctl">
      <Two>
        <div className="bubble t-n"><small>Question</small>When did SAP open the firewall?</div>
        <div className="bubble t-e"><small>Reference answer</small>On 13 November 2026.</div>
      </Two>
      <Cap>Pick the assistant’s answer to grade</Cap>
      <div className="stack">{CAND42.map(([t], i) => <button type="button" key={i} className={'chip t-n' + (i === k ? ' on' : '')} onClick={() => setK(i)}>{t}</button>)}</div>
      <div className={'bubble t-' + (verdict === 'PASS' ? 'b' : 'd')}>
        <small>Judge: reasoning first</small>{why}
        <small style={{ marginTop: 6 }}>then the verdict</small><b>{verdict}</b>
      </div>
      <p className="note">The judge is a second model call with one clear rule and the reference in hand. It explains before it decides, and it only says PASS or FAIL.</p>
    </div>
  );
}

/* 43 — retrieval metrics you can change */
const DIAG43 = {
  'good-good': ['b', 'Working. Nothing to fix.'],
  'bad-bad': ['d', 'The search failed. Fix chunking, filters, hybrid search or re-ranking. Changing the prompt will not help.'],
  'good-bad': ['c', 'The right passages were there, and the model misused them. Look at the prompt, the model, or too many noisy passages.'],
  'bad-good': ['d', 'Dangerous: the model answered from its own memory, not from your data. Tighten “use only the excerpts”.'],
};
function V43() {
  const [rel, setRel] = useState({ 2: true, 5: true, 9: true });
  const [k, setK] = useState(5);
  const [missed, setMissed] = useState(1);
  const [r, setR] = useState('good');
  const [a, setA] = useState('bad');
  const ranks = Array.from({ length: 10 }, (_, i) => i + 1);
  const hits = ranks.filter(x => x <= k && rel[x]).length;
  const total = ranks.filter(x => rel[x]).length + missed;
  const first = ranks.find(x => rel[x]);
  const [tone, text] = DIAG43[r + '-' + a];
  return (
    <div className="ctl">
      <Cap>Search results, best first. Click to mark the chunks that are really relevant.</Cap>
      <div className="chips">
        {ranks.map(x => <button type="button" key={x} aria-pressed={!!rel[x]} className={'chip t-' + (rel[x] ? 'b' : 'n') + (rel[x] ? ' on' : '')} style={{ opacity: x <= k ? 1 : 0.4 }} onClick={() => setRel(o => ({ ...o, [x]: !o[x] }))}>#{x}</button>)}
      </div>
      <Slider label="k (how many you keep)" value={k} set={setK} min={1} max={10} />
      <Slider label="Relevant chunks never found" value={missed} set={setMissed} min={0} max={4} />
      <Stats>
        <Stat label={`recall@${k}`} value={total ? pct(hits / total) : '–'} tone="a" />
        <Stat label={`precision@${k}`} value={pct(hits / k)} />
        <Stat label="MRR (1 ÷ first hit rank)" value={first ? (1 / first).toFixed(2) : '0'} />
      </Stats>
      <Cap>Diagnose a bad answer</Cap>
      <div className="row">
        <Tabs value={r} set={setR} options={[['good', 'Retrieval good'], ['bad', 'Retrieval bad']]} />
        <Tabs value={a} set={setA} options={[['good', 'Answer good'], ['bad', 'Answer bad']]} />
      </div>
      <Note tone={tone}>{text}</Note>
    </div>
  );
}

/* 44 — a score over time with a threshold */
const RUNS44 = [['a41f', 0.79, 'baseline'], ['c203', 0.83, 'context headers'], ['d77e', 0.8, 'new prompt'], ['e9b1', 0.87, 'hybrid search'], ['f310', 0.9, 're-ranking'], ['0a5c', 0.86, 'model update']];
function V44() {
  const [thr, setThr] = useState(85);
  const [k, setK] = useState(2);
  const X = i => 40 + i * 68, Y = v => 150 - ((v - 0.7) / 0.25) * 130;
  return (
    <div className="ctl">
      <Slider label="Required score" value={thr} set={setThr} min={75} max={92} fmt={v => v + '%'} />
      <svg viewBox="0 0 420 180" className="plot" role="img" aria-label="Evaluation score for six runs with a threshold line">
        <line x1="30" y1={Y(thr / 100)} x2="410" y2={Y(thr / 100)} className="thr" />
        <polyline className="ln" points={RUNS44.map((r, i) => `${X(i)},${Y(r[1])}`).join(' ')} />
        {RUNS44.map((r, i) => (
          <g key={i}>
            <circle cx={X(i)} cy={Y(r[1])} r={i === k ? 8 : 6} className={`pt t-${r[1] * 100 >= thr ? 'b' : 'd'}${i === k ? ' on' : ''}`} tabIndex={0} role="button" aria-label={`Run ${r[0]}: ${pct(r[1])}`}
              onClick={() => setK(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setK(i); } }} />
            <text x={X(i)} y={172} textAnchor="middle" className="svgt">{r[0]}</text>
          </g>
        ))}
      </svg>
      <Stats>
        <Stat label={'commit ' + RUNS44[k][0]} value={pct(RUNS44[k][1])} tone={RUNS44[k][1] * 100 >= thr ? 'b' : 'd'} />
        <Stat label="change" value={RUNS44[k][2]} />
        <Stat label="build" value={RUNS44[k][1] * 100 >= thr ? 'passes' : 'fails'} tone={RUNS44[k][1] * 100 >= thr ? 'b' : 'd'} />
      </Stats>
      <p className="note">Click a point. The third run is a new prompt that made things worse: with the eval in CI, it is caught before merging. The last one is a model update you did not write, and the score still moved. Example data.</p>
    </div>
  );
}

export default {
  40: { title: 'Run the same test five times', C: V40 },
  41: { title: 'Inside an evaluation set', C: V41 },
  42: { title: 'Watch the judge grade', C: V42 },
  43: { title: 'Recall and precision, live', C: V43 },
  44: { title: 'A score with a pass line', C: V44 },
};
