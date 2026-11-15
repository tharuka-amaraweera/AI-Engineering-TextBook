import { useState } from 'react';
import { Bars, Btn, Cap, Cycle, Fan, Flow, Note, Sequence, Slider, Stat, Stats, Stepper, Tabs, Toggle, Two, int, pct } from './kit.jsx';

/* 34 — the agent loop with a trace */
const TRACE = [
  [0, 'think', 'I need the meetings that mention the price import.'],
  [1, 'act', 'searchMeetings("price import", last 14 days)'],
  [2, 'observe', '3 segments: blocked by firewall (10 and 12 Nov), running (13 Nov).'],
  [0, 'think', 'Who was handling the firewall request? Check the action items.'],
  [1, 'act', 'openActionItems("Anna")'],
  [2, 'observe', '“Follow up with SAP on the firewall”, closed on 13 Nov.'],
  [0, 'think', 'I have enough to answer.'],
  [-1, 'answer', 'The import was late because SAP had not opened the firewall. Anna followed up; talk to her.'],
];
const TONE34 = { think: 'e', act: 'a', observe: 'c', answer: 'b' };
function V34() {
  const [i, setI] = useState(0);
  const calls = TRACE.slice(0, i + 1).filter(t => t[1] === 'act').length;
  return (
    <div className="ctl">
      <div className="bubble t-n"><small>Task</small>Why is the price import late, and who should I talk to?</div>
      <Two>
        <Cycle steps={['Think', 'Act (call a tool)', 'Observe (read result)']} active={TRACE[i][0]} />
        <div className="stack">
          {TRACE.slice(0, i + 1).map(([, kind, text], k) => <div key={k} className={'bubble t-' + TONE34[kind]}><small>{kind}</small>{text}</div>)}
        </div>
      </Two>
      <Stepper i={i} n={TRACE.length} set={setI} />
      <Stats><Stat label="tool calls so far" value={calls} /><Stat label="step limit" value="10" /></Stats>
      <p className="note">Nobody wrote these steps in code. The model chose each one after reading the result of the one before. That freedom is what makes it an agent, and why it needs a step limit.</p>
    </div>
  );
}

/* 35 — patterns and compounding errors */
function V35() {
  const [p, setP] = useState('chain');
  const [rel, setRel] = useState(95);
  const [n, setN] = useState(10);
  const all = (rel / 100) ** n;
  return (
    <div className="ctl">
      <Tabs value={p} set={setP} options={[['chain', 'Chaining'], ['route', 'Routing'], ['par', 'Parallel'], ['orch', 'Orchestrator'], ['eval', 'Evaluator']]} />
      {p === 'chain' && <Flow steps={[{ t: 'Clean transcript' }, { t: 'Extract items', tone: 'a' }, { t: 'Write summary', tone: 'b' }]} />}
      {p === 'route' && <Fan pick={1} from={{ t: 'Classify the question' }} mids={[{ t: 'SQL route' }, { t: 'RAG route' }, { t: 'Full transcript' }]} to={{ t: 'Answer', tone: 'b' }} />}
      {p === 'par' && <Fan from={{ t: 'Transcript' }} mids={[{ t: 'Extract decisions' }, { t: 'Extract action items' }, { t: 'Extract blockers' }]} to={{ t: 'Combine', tone: 'b' }} />}
      {p === 'orch' && <Fan from={{ t: 'Orchestrator', s: 'splits the task at run time' }} mids={[{ t: 'Worker 1' }, { t: 'Worker 2' }, { t: 'Worker …' }]} to={{ t: 'Orchestrator', s: 'combines results', tone: 'b' }} />}
      {p === 'eval' && <Flow steps={[{ t: 'Write summary', tone: 'a' }, { t: 'Check against rules', s: 'every item in the transcript?', tone: 'c' }, { t: 'Fix and check again', s: 'until it passes', tone: 'b' }]} />}
      <p className="note">{{
        chain: 'Fixed steps, each using the output of the one before. The simplest pattern, and often enough.',
        route: 'Classify first, then run only the matching handler (highlighted). Each handler can stay simple.',
        par: 'Independent calls run at the same time and are combined. Faster, and each prompt has one job.',
        orch: 'One model decides the sub-tasks while running and hands them to workers. Flexible, costs more.',
        eval: 'One call produces, another checks against clear criteria, and the loop repeats until it is good enough.',
      }[p]}</p>
      <Cap>Why long chains need checks</Cap>
      <Slider label="Reliability of each step" value={rel} set={setRel} min={80} max={99} fmt={v => v + '%'} />
      <Slider label="Steps in a row" value={n} set={setN} min={1} max={20} />
      <Stats><Stat label="chance that all steps are right" value={pct(all)} tone={all > 0.85 ? 'b' : all > 0.6 ? 'c' : 'd'} /></Stats>
    </div>
  );
}

/* 36 — single agent vs multi-agent */
function V36() {
  const [m, setM] = useState('multi');
  const rows = m === 'single'
    ? [{ label: 'One agent: everything in one context', value: 150000, tone: 'c' }]
    : [{ label: 'Orchestrator context', value: 25000, tone: 'b' }, { label: 'Sub-agent 1 (own context)', value: 55000, tone: 'a' }, { label: 'Sub-agent 2 (own context)', value: 55000, tone: 'a' }, { label: 'Sub-agent 3 (own context)', value: 55000, tone: 'a' }];
  const total = rows.reduce((a, r) => a + r.value, 0);
  return (
    <div className="ctl">
      <Tabs value={m} set={setM} options={[['single', 'Single agent'], ['multi', 'Orchestrator + 3 sub-agents']]} />
      {m === 'multi' && <Fan from={{ t: 'Orchestrator', s: 'writes three task briefs' }} mids={[{ t: 'Sub-agent 1', s: 'reads a lot' }, { t: 'Sub-agent 2', s: 'reads a lot' }, { t: 'Sub-agent 3', s: 'reads a lot' }]} to={{ t: 'Orchestrator', s: 'gets three short summaries', tone: 'b' }} />}
      <Bars rows={rows} max={200000} fmt={v => int(v) + ' tok'} />
      <Stats><Stat label="tokens in total" value={int(total)} tone={m === 'multi' ? 'c' : 'n'} /><Stat label="largest single context" value={int(Math.max(...rows.map(r => r.value)))} tone={m === 'multi' ? 'b' : 'c'} /></Stats>
      <p className="note">{m === 'single' ? 'Everything the agent reads piles up in one context: it gets slow, costly, and details get lost.' : 'Each sub-agent reads in its own context and returns a few lines, so the orchestrator stays small and clear. The price: more tokens in total, and whatever is not in a brief or a summary is lost.'} Numbers are illustrative.</p>
    </div>
  );
}

/* 37 — MCP */
function V37() {
  return (
    <div className="ctl">
      <Fan mids={[{ t: 'Claude Code' }, { t: 'Your IDE' }, { t: 'Your own UI' }]} to={{ t: 'Your MCP server', s: 'tools · resources · prompts', tone: 'b' }} />
      <p className="note">One server, many applications. Without a standard you would wire your tools into each application separately.</p>
      <Sequence actors={['Host app + MCP client', 'Your MCP server']} msgs={[
        { from: 0, to: 1, text: 'Which tools do you have?', note: 'On connect, the client asks the server what it offers.' },
        { from: 1, to: 0, text: 'names, descriptions, schemas', note: 'The server answers. The host passes these tools to its model like any other tool.' },
        { from: 0, to: 1, text: 'call findMeetings(from, to)', note: 'When the model asks for a tool, the client sends the call to your server.' },
        { from: 1, to: 0, text: 'result', note: 'Your server runs the Java method and returns the result, which goes back to the model.' },
      ]} />
    </div>
  );
}

/* 38 — the speech pipeline and its errors */
const SEG38 = [
  ['09:02:11', 0, 'Ich habe den Preisimport gestern fertig gemacht.', 'I finished the price import yesterday.'],
  ['09:02:19', 1, 'Der {Preisreport|Preisimport} ist bei mir noch blockiert, wegen {TCB 75 98|TCB-7598}.', 'The {price report|price import} is still blocked for me, because of {TCB 75 98|TCB-7598}.'],
  ['09:02:31', 0, 'Ich frage nach dem Meeting bei SAP nach.', 'I will ask SAP after the meeting.'],
];
function fix(text, vocab) {
  return text.split(/(\{[^}]+\})/).map((part, i) => {
    const m = part.match(/^\{(.+)\|(.+)\}$/);
    if (!m) return part;
    return vocab ? <span key={i} className="mark-good">{m[2]}</span> : <span key={i} className="mark-bad">{m[1]}</span>;
  });
}
function V38() {
  const [vocab, setVocab] = useState(false);
  const [names, setNames] = useState(false);
  const who = k => (names ? ['Anna', 'Mario'][k] : 'Speaker ' + (k + 1));
  return (
    <div className="ctl">
      <Flow steps={[{ t: 'Audio' }, { t: 'Speech to text', tone: 'a' }, { t: 'Diarization', s: 'who spoke when', tone: 'e' }, { t: 'Translation', tone: 'c' }, { t: 'Stored segments', tone: 'b' }]} />
      <Toggle label="Give the speech service a word list (names, products, ticket format)" on={vocab} set={setVocab} />
      <Toggle label="Map speaker labels to real names" on={names} set={setNames} />
      <ul className="list">
        {SEG38.map(([time, sp, de, en], i) => (
          <li key={i}><small>{time} · {who(sp)}</small><span>{fix(de, vocab)}</span><span className="eg">{fix(en, vocab)}</span></li>
        ))}
      </ul>
      <p className="note">{vocab ? 'With the word list, the special terms come out right, and so does everything built on them.' : 'Red marks are typical errors: a similar-sounding word and a ticket number split apart. Search, summaries and answers all inherit them.'} Each segment keeps its time, speaker, original text and translation.</p>
    </div>
  );
}

/* 39 — a background pipeline that survives failures */
const ST39 = ['RECEIVED', 'EXTRACTED', 'EMBEDDED', 'READY'];
function V39() {
  const [at, setAt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [log, setLog] = useState(['Message arrives: meeting 42 finished. Raw transcript stored.']);
  const add = line => setLog(l => [...l, line].slice(-5));
  const done = at === ST39.length - 1;
  const run = () => { setFailed(false); setAt(at + 1); add(`Step done. Status is now ${ST39[at + 1]}.`); };
  const fail = () => { setFailed(true); add(`Step to ${ST39[at + 1]} failed (model timeout). Status stays ${ST39[at]}.`); };
  const dup = () => add(`Same message delivered again. Meeting 42 is already at ${ST39[at]}: nothing is duplicated.`);
  const reset = () => { setAt(0); setFailed(false); setLog(['Message arrives: meeting 42 finished. Raw transcript stored.']); };
  return (
    <div className="ctl">
      <Flow active={at} steps={ST39.map((s, i) => ({ t: s, tone: failed && i === at + 1 ? 'd' : i <= at ? 'b' : 'n' }))} />
      <div className="row">
        <Btn onClick={run} disabled={done}>{failed ? 'Retry from the failed step' : 'Run next step'}</Btn>
        <button type="button" className="vbtn ghost" onClick={fail} disabled={done || failed}>Make the next step fail</button>
        <button type="button" className="vbtn ghost" onClick={dup}>Deliver the message again</button>
        <button type="button" className="vbtn ghost" onClick={reset}>Reset</button>
      </div>
      <ul className="list">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
      <p className="note">Because progress is saved per step, a retry continues where it failed and does not pay for finished steps again. Because the meeting id is the key, a duplicate message changes nothing.</p>
    </div>
  );
}

export default {
  34: { title: 'Think, act, observe, repeat', C: V34 },
  35: { title: 'Five patterns, and why chains break', C: V35 },
  36: { title: 'Where the context goes', C: V36 },
  37: { title: 'One server, many clients', C: V37 },
  38: { title: 'From sound to stored segments', C: V38 },
  39: { title: 'A pipeline you can break and retry', C: V39 },
};
