import { useEffect, useState } from 'react';
import { Bars, Btn, Cap, Flow, Note, Sequence, Slider, Stat, Stats, Tabs, Toggle, Two } from './kit.jsx';

/* 19 — one HTTP call, and what streaming changes */
const WORDS19 = 'On 12 November the team decided to raise the timeout to 30 seconds.'.split(' ');
function V19() {
  const [t, setT] = useState(-1);
  useEffect(() => {
    if (t < 0 || t >= WORDS19.length) return undefined;
    const id = setTimeout(() => setT(x => x + 1), 240);
    return () => clearTimeout(id);
  }, [t]);
  const done = t >= WORDS19.length;
  return (
    <div className="ctl">
      <Sequence actors={['Your application', 'Model API']} msgs={[
        { from: 0, to: 1, text: 'POST: model, messages, max_tokens', note: 'A normal HTTP request with JSON. Hosted APIs also need your API key in a header.' },
        { from: 1, to: 1, text: 'generates tokens', note: 'The model produces the answer token by token. This is where the time goes.' },
        { from: 1, to: 0, text: 'content + stop reason + usage', note: 'Read all three: the answer, why it stopped (finished or cut off?), and the token counts you pay for.' },
      ]} />
      <Cap>Same answer, with and without streaming</Cap>
      <Two>
        <div className="box"><small>Without streaming</small><p className="pre">{done ? WORDS19.join(' ') : t >= 0 ? 'waiting…' : ' '}</p></div>
        <div className="box"><small>With streaming</small><p className="pre">{t >= 0 ? WORDS19.slice(0, t).join(' ') + (done ? '' : ' ▍') : ' '}</p></div>
      </Two>
      <div className="row"><Btn onClick={() => setT(0)} disabled={t >= 0 && !done}>{done ? 'Run again' : 'Run both'}</Btn></div>
      <p className="note">Both finish at the same moment. With streaming the person sees progress at once, so it feels much faster.</p>
    </div>
  );
}

/* 20 — quantization */
const QUALITY = { 32: 'Original', 16: 'Same in practice', 8: 'Almost identical', 4: 'Small loss: the usual choice', 2: 'Clear loss' };
function V20() {
  const [b, setB] = useState(7);
  const [bits, setBits] = useState(4);
  const size = x => (b * x) / 8;
  const fits = size(bits) * 1.2 <= 16;
  return (
    <div className="ctl">
      <Slider label="Model size" value={b} set={setB} min={1} max={70} fmt={v => v + 'B params'} />
      <Tabs value={bits} set={setBits} options={[[32, '32-bit'], [16, '16-bit'], [8, '8-bit'], [4, '4-bit'], [2, '2-bit']]} />
      <Bars rows={[32, 16, 8, 4, 2].map(x => ({ label: x + ' bits per weight', value: size(x), tone: x === bits ? 'a' : 'n', dim: x !== bits }))} fmt={v => v.toFixed(1) + ' GB'} />
      <Stats>
        <Stat label="file size" value={size(bits).toFixed(1) + ' GB'} tone="a" />
        <Stat label="quality" value={QUALITY[bits]} />
        <Stat label="16 GB laptop" value={fits ? 'fits' : 'too big'} tone={fits ? 'b' : 'd'} />
      </Stats>
      <p className="note">Size = parameters × bits ÷ 8. Storing each weight in fewer bits shrinks the file. Down to 4 bits the loss is small; below that it shows.</p>
    </div>
  );
}

/* 21 — Spring AI layers */
const CONF21 = {
  ollama: 'spring.ai.ollama.base-url=http://localhost:11434\nspring.ai.ollama.chat.options.model=llama3.2',
  hosted: 'spring.ai.<provider>.api-key=${API_KEY}\nspring.ai.<provider>.chat.options.model=<model-id>',
};
function V21() {
  const [p, setP] = useState('ollama');
  return (
    <div className="ctl">
      <Flow vertical steps={[
        { t: 'Your controller or service', s: 'business logic' },
        { t: 'ChatClient', s: 'prompt → call → content / entity', tone: 'a' },
        { t: 'Advisors', s: 'memory · RAG · logging (like filters)', tone: 'e' },
        { t: 'ChatModel', s: 'one interface for every provider', tone: 'a' },
        { t: p === 'ollama' ? 'Ollama on your machine' : 'Hosted model API', s: p === 'ollama' ? 'http://localhost:11434' : 'over the internet, with an API key', tone: 'b' },
      ]} />
      <Tabs value={p} set={setP} options={[['ollama', 'Provider: local Ollama'], ['hosted', 'Provider: hosted API']]} />
      <div className="box"><p className="pre">{CONF21[p]}</p></div>
      <Note tone="b">Switching the provider changes the starter dependency and these properties. Lines of Java changed: 0.</Note>
    </div>
  );
}

/* 22 — structured output */
function V22() {
  const [allow, setAllow] = useState(true);
  return (
    <div className="ctl">
      <Two>
        <div>
          <Cap>Transcript (fuzzy language)</Cap>
          <div className="box"><p className="pre">Anna: I finished the import fix.{'\n'}Anna: Someone should update the runbook.</p></div>
          <Toggle label="Schema allows null and empty lists" on={allow} set={setAllow} />
        </div>
        <div>
          <Cap>ScrumSummary (typed data)</Cap>
          <div className="box"><p className="pre">
            {'{\n  "actionItems": [{\n    "task": "Update the runbook",\n    "owner": '}
            {allow ? <span className="mark-good">null</span> : <span className="mark-bad">"Anna"</span>}
            {',\n    "dueDate": '}
            {allow ? <span className="mark-good">null</span> : <span className="mark-bad">"2026-11-14"</span>}
            {'\n  }],\n  "blockers": []\n}'}
          </p></div>
        </div>
      </Two>
      {allow
        ? <Note tone="b">Nobody was named and no date was given, so the model returns null. Your code can show “no owner yet”.</Note>
        : <Note tone="d">Every field is required, so the model fills the gaps with invented values. Valid JSON, wrong content.</Note>}
    </div>
  );
}

/* 23 — tool calling */
function V23() {
  return (
    <Sequence actors={['Your application', 'Model', 'Your Java method']} msgs={[
      { from: 0, to: 1, text: 'question + list of tools', note: 'You send the question and the tool list: name, description and parameters of each.' },
      { from: 1, to: 0, text: 'call findMeetings(from, to)', note: 'The model does not answer yet. It writes a request to call a tool, with arguments. It runs nothing itself.' },
      { from: 0, to: 2, text: 'validate, then run', note: 'Your code checks the arguments and the user’s permissions, then runs the method. This is your control point.' },
      { from: 2, to: 0, text: '3 meetings', note: 'A normal Java return value. Keep it small: it goes into the context window.' },
      { from: 0, to: 1, text: 'tool result', note: 'You send the result back to the model as a new message.' },
      { from: 1, to: 0, text: 'final answer in words', note: 'Now the model answers the user, using the real data.' },
    ]} />
  );
}

/* 24 — conversation memory */
const M24 = [
  ['user', "Hi, I'm Tharuka."], ['assistant', 'Hello Tharuka!'],
  ['user', "Summarise today's scrum."], ['assistant', 'Anna finished the import fix…'],
  ['user', 'Who is blocked?'], ['assistant', 'Mario, by the firewall.'],
  ['user', 'Since when?'], ['assistant', 'Since 10 November.'],
  ['user', 'Any decisions?'], ['assistant', 'Timeout raised to 30 s.'],
];
function V24() {
  const [mode, setMode] = useState('window');
  const [n, setN] = useState(4);
  const from = mode === 'full' ? 0 : M24.length - n;
  const summary = mode === 'summary' && from > 0;
  const knows = from === 0 || summary;
  return (
    <div className="ctl">
      <Tabs value={mode} set={setMode} options={[['full', 'Full history'], ['window', 'Sliding window'], ['summary', 'Summary + window']]} />
      {mode !== 'full' && <Slider label="Keep the last" value={n} set={setN} min={2} max={10} step={2} fmt={v => v + ' messages'} />}
      <ul className="list">
        {summary && <li className="on"><small>summary of older messages</small>The user is Tharuka. Talked about today’s scrum and Mario’s blocker.</li>}
        {M24.map(([r, t], i) => <li key={i} className={i >= from ? 'on' : 'off'}><small>{r}</small>{t}</li>)}
      </ul>
      <Stats>
        <Stat label="messages sent with the next call" value={M24.length - from + (summary ? 1 : 0)} />
        <Stat label="“What is my name?”" value={knows ? 'Tharuka' : 'unknown'} tone={knows ? 'b' : 'd'} />
      </Stats>
      <p className="note">Highlighted messages are sent again with the next call; the faded ones are forgotten. Full history never forgets but keeps growing. A window is cheap but loses early facts. A summary keeps the gist.</p>
    </div>
  );
}

/* 25 — retries with backoff */
const ERR25 = [['429 rate limit', true], ['500 / 503 provider error', true], ['Timeout', true], ['400 input too long', false], ['401 bad API key', false]];
function V25() {
  const [base, setBase] = useState(1);
  const [tries, setTries] = useState(4);
  const waits = Array.from({ length: tries }, (_, i) => base * 2 ** i);
  const total = waits.reduce((a, v) => a + v, 0);
  return (
    <div className="ctl">
      <Slider label="First wait" value={base} set={setBase} min={0.5} max={4} step={0.5} fmt={v => v + ' s'} />
      <Slider label="Maximum retries" value={tries} set={setTries} min={1} max={6} fmt={v => v + '×'} />
      <Bars rows={waits.map((w, i) => ({ label: `Wait before retry ${i + 1}`, value: w, tone: 'a' }))} fmt={v => v + ' s ± jitter'} />
      <Stats><Stat label="longest total wait" value={total + ' s'} tone={total > 60 ? 'c' : 'n'} /></Stats>
      <Cap>Retry or not?</Cap>
      <div className="chips">{ERR25.map(([e, ok]) => <span key={e} className={'chip t-' + (ok ? 'b' : 'd')}>{ok ? 'retry' : 'never retry'} · {e}</span>)}</div>
      <p className="note">Each wait doubles. A small random part (“jitter”) is added so that many clients do not all retry at the same moment. Errors caused by your request will fail again however often you retry.</p>
    </div>
  );
}

export default {
  19: { title: 'One call, step by step', C: V19 },
  20: { title: 'Fewer bits, smaller file', C: V20 },
  21: { title: 'The layers of a Spring AI call', C: V21 },
  22: { title: 'From sentences to typed data', C: V22 },
  23: { title: 'Who does what in a tool call', C: V23 },
  24: { title: 'What the model still sees', C: V24 },
  25: { title: 'Waiting longer each time', C: V25 },
};
