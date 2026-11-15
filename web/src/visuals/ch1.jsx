import { useState } from 'react';
import { Bars, Btn, Cap, Ctl, Flow, Meter, Note, Slider, Stat, Stats, StepFlow, Tabs, Toggle, Two, int, pct, usd } from './kit.jsx';

/* 1 — nested circles */
const RINGS = [
  ['Artificial Intelligence', 'Any technique that lets a computer do a task that normally needs human intelligence.', 'a chess program with hand-written rules'],
  ['Machine Learning', 'The computer learns the rules from examples instead of a programmer writing them.', 'a spam filter trained on 100,000 marked emails'],
  ['Deep Learning', 'Machine learning that uses large neural networks with many layers.', 'recognising faces in photos'],
  ['Generative AI', 'Deep-learning models that create new content: text, images, audio, code.', 'an image generator'],
  ['Large Language Model', 'A generative model for text.', 'Claude, GPT, Gemini, Llama'],
];
function V1() {
  const [k, setK] = useState(4);
  const ring = i => (i >= RINGS.length ? null : (
    <div className={'ring' + (i === k ? ' on' : '')} role="button" tabIndex={0}
      onClick={e => { e.stopPropagation(); setK(i); }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setK(i); } }}>
      <span>{RINGS[i][0]}</span>
      {ring(i + 1)}
    </div>
  ));
  return (
    <Two>
      <div className="rings">{ring(0)}</div>
      <div>
        <h4>{RINGS[k][0]}</h4>
        <p>{RINGS[k][1]}</p>
        <p className="eg">Example: {RINGS[k][2]}.</p>
        <Cap>Traditional programming</Cap>
        <Flow steps={[{ t: 'rules + data' }, { t: 'answers', tone: 'a' }]} />
        <Cap>Machine learning</Cap>
        <Flow steps={[{ t: 'data + answers' }, { t: 'rules (the model)', tone: 'b' }]} />
      </div>
    </Two>
  );
}

/* 2 — a toy neural network you can train */
const LAYERS = [3, 4, 4, 2];
const randomWeights = () => LAYERS.slice(0, -1).map((n, l) => Array.from({ length: n * LAYERS[l + 1] }, () => Math.random() * 2 - 1));
function V2() {
  const [w, setW] = useState(randomWeights);
  const [loss, setLoss] = useState(1);
  const [n, setN] = useState(0);
  const train = () => {
    setW(ws => ws.map(a => a.map(v => Math.max(-1, Math.min(1, v + (Math.random() - 0.5) * 0.5)))));
    setLoss(l => Math.max(0.04, l * 0.75));
    setN(x => x + 1);
  };
  const reset = () => { setW(randomWeights()); setLoss(1); setN(0); };
  const X = l => 55 + l * 107;
  const Y = (j, cnt) => 88 + (j - (cnt - 1) / 2) * 40;
  const names = ['input', 'hidden layer', 'hidden layer', 'output'];
  return (
    <div className="ctl">
      <svg viewBox="0 0 430 185" className="nn" role="img" aria-label="A small neural network: input layer, two hidden layers, output layer. Line thickness shows the size of each weight.">
        {w.map((arr, l) => arr.map((v, idx) => {
          const i = Math.floor(idx / LAYERS[l + 1]), j = idx % LAYERS[l + 1];
          return <line key={l + '-' + idx} x1={X(l)} y1={Y(i, LAYERS[l])} x2={X(l + 1)} y2={Y(j, LAYERS[l + 1])} className={v >= 0 ? 'wp' : 'wn'} strokeWidth={0.4 + Math.abs(v) * 2.6} />;
        }))}
        {LAYERS.map((cnt, l) => Array.from({ length: cnt }, (_, j) => <circle key={l + 'n' + j} cx={X(l)} cy={Y(j, cnt)} r={9} className="nnode" />))}
        {names.map((t, l) => <text key={l} x={X(l)} y={180} textAnchor="middle" className="svgt">{t}</text>)}
      </svg>
      <Stats>
        <Stat label="training steps" value={n} />
        <Stat label="loss (how wrong)" value={loss.toFixed(2)} tone={loss < 0.2 ? 'b' : 'c'} />
        <Stat label="weights in this toy" value={w.flat().length} />
      </Stats>
      <div className="row">
        <Btn onClick={train}>Train one step</Btn>
        <button type="button" className="vbtn ghost" onClick={reset}>Reset to random weights</button>
      </div>
      <p className="note">Each line is one weight; thicker means a larger number. Training changes every weight a little so the loss goes down. Inference only reads the weights. A real LLM has billions of them. (This toy shows the idea; it does not compute real gradients.)</p>
    </div>
  );
}

/* 3 — next-token loop */
const SEQ = [
  ['The capital of France is', [[' Paris', 0.92], [' the', 0.03], [' located', 0.02], [' a', 0.01]]],
  [' Paris', [[',', 0.44], ['.', 0.39], [' and', 0.07], [' which', 0.04]]],
  [',', [[' a', 0.33], [' which', 0.27], [' the', 0.2], [' known', 0.09]]],
  [' a', [[' city', 0.64], [' beautiful', 0.13], [' major', 0.1], [' place', 0.04]]],
  [' city', [[' known', 0.37], [' of', 0.24], [' famous', 0.2], [' on', 0.08]]],
  [' known', [[' for', 0.9], [' as', 0.06], [' to', 0.02], [' around', 0.01]]],
  [' for', [[' its', 0.71], [' the', 0.17], [' art', 0.04], [' being', 0.03]]],
];
function V3() {
  const [i, setI] = useState(0);
  const last = i === SEQ.length - 1;
  return (
    <div className="ctl">
      <div className="box"><p className="pre">{SEQ.slice(0, i).map(s => s[0]).join('')}<span className="mark">{SEQ[i][0]}</span>▍</p></div>
      <Cap>Probability of the next token (illustrative numbers)</Cap>
      <Bars rows={SEQ[i][1].map(([t, p], k) => ({ label: `“${t}”`, value: p, tone: k === 0 ? 'a' : 'n' }))} max={1} fmt={pct} />
      <div className="row">
        <Btn onClick={() => setI(i + 1)} disabled={last}>Pick the most likely token and predict again</Btn>
        <button type="button" className="vbtn ghost" onClick={() => setI(0)}>Start again</button>
      </div>
      <p className="note">{last ? '…and so on, one token at a time, until the model produces an “end” token or reaches the length limit.' : 'The whole text so far goes back in, and the model predicts the next token again. That loop is all an LLM does.'}</p>
    </div>
  );
}

/* 4 — an approximate tokenizer */
function roughTokens(text) {
  const out = [];
  for (const m of text.matchAll(/\s*[A-Za-zÀ-ÿ]+|\s*\d+|\s*[^\sA-Za-zÀ-ÿ\d]|\s+$/g)) {
    const s = m[0];
    const lead = s.match(/^\s*/)[0];
    const w = s.slice(lead.length);
    const size = /^\d+$/.test(w) ? 3 : 4;
    if (/^[A-Za-zÀ-ÿ\d]+$/.test(w) && w.length > (size === 3 ? 3 : 7)) {
      for (let p = 0; p < w.length; p += size) {
        const rest = w.length - (p + size);
        const piece = rest > 0 && rest < 2 ? w.slice(p) : w.slice(p, p + size);
        out.push((p === 0 ? lead : '') + piece);
        if (rest > 0 && rest < 2) break;
      }
    } else if (s) out.push(s);
  }
  return out;
}
const SAMPLES = [
  ['English', 'Yesterday I finished the price import fix and today I will start testing.'],
  ['German', 'Gestern habe ich die Preisimportkorrektur abgeschlossen und heute beginne ich mit dem Testen.'],
  ['JSON', '{"owner": "Anna", "task": "Update the runbook", "dueDate": "2026-11-20"}'],
];
function V4() {
  const [text, setText] = useState(SAMPLES[0][1]);
  const toks = roughTokens(text);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const tones = ['a', 'b', 'c', 'e'];
  return (
    <div className="ctl">
      <div className="row">{SAMPLES.map(([l, t]) => <button type="button" key={l} className="vbtn ghost" onClick={() => setText(t)}>{l} sample</button>)}</div>
      <textarea className="text-in" id="tok-text" value={text} onChange={e => setText(e.target.value)} aria-label="Text to split into tokens" />
      <div className="chips">{toks.map((t, k) => <span key={k} className={'chip t-' + tones[k % 4]}>{t.replace(/ /g, '·')}</span>)}</div>
      <Stats>
        <Stat label="characters" value={text.length} />
        <Stat label="words" value={words} />
        <Stat label="tokens (about)" value={toks.length} tone="a" />
        <Stat label="tokens per word" value={words ? (toks.length / words).toFixed(2) : '–'} />
      </Stats>
      <p className="note">A dot marks a space that belongs to the token. This is a rough imitation to show the idea: every real model has its own tokenizer and its counts will differ. Compare the samples: German and JSON need more tokens per word.</p>
    </div>
  );
}

/* 5 — fill the context window */
function V5() {
  const [win, setWin] = useState(200000);
  const [sys, setSys] = useState(600);
  const [hist, setHist] = useState(10);
  const [meet, setMeet] = useState(3);
  const [out, setOut] = useState(1000);
  const segs = [
    { label: 'System prompt', value: sys, tone: 'e' },
    { label: 'Chat history', value: hist * 150, tone: 'a' },
    { label: 'Meeting transcripts', value: meet * 3500, tone: 'c' },
    { label: 'Room for the answer', value: out, tone: 'b' },
  ];
  const sum = segs.reduce((a, s) => a + s.value, 0);
  return (
    <div className="ctl">
      <Tabs value={win} set={setWin} options={[[8000, '8k window'], [32000, '32k'], [200000, '200k'], [1000000, '1M']]} />
      <Slider label="System prompt" value={sys} set={setSys} min={0} max={5000} step={100} fmt={v => int(v) + ' tok'} />
      <Slider label="Chat messages so far" value={hist} set={setHist} min={0} max={200} fmt={v => v + ' msgs'} />
      <Slider label="Scrum transcripts added" value={meet} set={setMeet} min={0} max={250} fmt={v => v + ' × 3,500'} />
      <Slider label="Answer limit" value={out} set={setOut} min={100} max={8000} step={100} fmt={v => int(v) + ' tok'} />
      <Meter segs={segs} total={win} />
      {sum > win
        ? <Note tone="d">{int(sum - win)} tokens too many. The call fails, or text is cut off. You must choose what to leave out.</Note>
        : <Note tone="b">Fits: {int(sum)} of {int(win)} tokens used ({pct(sum / win)}). Every one of them is paid for and processed on every call.</Note>}
    </div>
  );
}

/* 6 — how a chat model is made */
function V6() {
  return (
    <div className="ctl">
      <StepFlow steps={[
        { t: 'Pre-training', s: 'huge general text', note: 'The model reads an enormous amount of text and practises predicting the next token. Months of computing. Result: a base model that continues documents.' },
        { t: 'Fine-tuning', s: 'example conversations', tone: 'a', note: 'Further training on a much smaller set of good question-and-answer conversations. Now it behaves like an assistant.' },
        { t: 'Human preference', s: 'RLHF', tone: 'e', note: 'People compare answers and mark the better one; the model is adjusted towards helpful, honest, safe answers.' },
        { t: 'Chat model', s: '+ your system prompt', tone: 'b', note: 'This is what you call through the API. Training gave the general character; your prompt steers it for your task.' },
      ]} />
      <Cap>What the model can know</Cap>
      <Meter segs={[{ label: 'Inside the training data', value: 78, tone: 'a' }, { label: 'After the knowledge cutoff: unknown unless you put it in the context', value: 22, tone: 'n' }]} unit="%" />
    </div>
  );
}

/* 7 — attention */
const WORDS = ['The', 'animal', "didn't", 'cross', 'the', 'street', 'because', 'it', 'was', 'too', 'tired'];
const ATT = {
  7: { 1: 0.62, 10: 0.16, 5: 0.08, 3: 0.05 },
  10: { 1: 0.42, 7: 0.33, 9: 0.15 },
  3: { 1: 0.34, 5: 0.4, 2: 0.16 },
  1: { 0: 0.3, 3: 0.26, 10: 0.24 },
  5: { 4: 0.36, 3: 0.4 },
};
function V7() {
  const [k, setK] = useState(7);
  const w = ATT[k] || { [k - 1]: 0.35, [k + 1]: 0.35 };
  return (
    <div className="ctl">
      <div className="attn">
        {WORDS.map((word, i) => (
          <button type="button" key={i} className={i === k ? 'on' : ''} onClick={() => setK(i)} aria-pressed={i === k}>
            <i style={{ height: i === k ? 0 : Math.round((w[i] || 0) * 60) + 'px' }} />
            <span>{word}</span>
            <small>{i === k ? 'selected' : w[i] ? pct(w[i]) : ''}</small>
          </button>
        ))}
      </div>
      <p className="note">Click a word. The bars show how much that word “looks at” each other word to work out its meaning (illustrative numbers). Try <b>it</b>: most of its attention goes to <b>animal</b>, not <b>street</b>.</p>
    </div>
  );
}

/* 8 — model size and memory */
function V8() {
  const [b, setB] = useState(7);
  const q4 = b * 0.6 + 1, full = b * 2 + 1;
  const devices = [['Laptop, 16 GB', 16], ['Workstation, 64 GB', 64], ['GPU server, 192 GB', 192]];
  return (
    <div className="ctl">
      <Slider label="Model size" value={b} set={setB} min={1} max={120} fmt={v => v + 'B params'} />
      <Bars rows={[{ label: 'Memory, full precision (16-bit)', value: full, tone: 'c' }, { label: 'Memory, compressed (4-bit)', value: q4, tone: 'a' }]} max={250} fmt={v => Math.round(v) + ' GB'} />
      <Cap>Does the compressed model fit?</Cap>
      <div className="row">
        {devices.map(([name, gb]) => <span key={name} className={'chip t-' + (q4 <= gb ? 'b' : 'd')}>{q4 <= gb ? '✓' : '✗'} {name}</span>)}
      </div>
      <p className="note">Rough rule: a 4-bit model needs a bit under 1 GB per billion parameters. Bigger models reason better but need hardware most people do not have, which is why the largest ones are used through an API.</p>
    </div>
  );
}

/* 9 — temperature and top-p */
const LOGITS = [[' Paris', 5], [' the', 2.4], [' located', 2], [' a', 1.5], [' one', 1], [' Lyon', 0.6]];
function distribution(T, P) {
  let pr;
  if (T < 0.05) pr = LOGITS.map((_, i) => (i === 0 ? 1 : 0));
  else {
    const e = LOGITS.map(([, l]) => Math.exp(l / T));
    const sum = e.reduce((a, v) => a + v, 0);
    pr = e.map(v => v / sum);
  }
  let cum = 0;
  const keep = pr.map(v => { const k = cum < P; cum += v; return k; });
  const kept = pr.reduce((a, v, i) => a + (keep[i] ? v : 0), 0);
  return pr.map((v, i) => (keep[i] ? v / kept : 0));
}
function V9() {
  const [T, setT] = useState(0.7);
  const [P, setP] = useState(1);
  const [draws, setDraws] = useState(null);
  const pr = distribution(T, P);
  const sample = () => {
    const counts = LOGITS.map(() => 0);
    for (let n = 0; n < 20; n++) {
      let r = Math.random(), i = 0;
      while (i < pr.length - 1 && r > pr[i]) { r -= pr[i]; i++; }
      counts[i]++;
    }
    setDraws(counts);
  };
  return (
    <div className="ctl">
      <p>Next token after “The capital of France is”:</p>
      <Slider label="Temperature" value={T} set={v => { setT(v); setDraws(null); }} min={0} max={2} step={0.1} fmt={v => v.toFixed(1)} />
      <Slider label="Top-p" value={P} set={v => { setP(v); setDraws(null); }} min={0.1} max={1} step={0.05} fmt={v => v.toFixed(2)} />
      <Bars rows={LOGITS.map(([t], i) => ({ label: `“${t}”`, value: pr[i], dim: pr[i] === 0, tone: i === 0 ? 'a' : 'e' }))} max={1} fmt={pct} />
      <div className="row">
        <Btn onClick={sample}>Draw 20 tokens</Btn>
        {draws && <div className="chips">{LOGITS.map(([t], i) => draws[i] > 0 && <span key={t} className="chip t-a">{t.trim()} × {draws[i]}</span>)}</div>}
      </div>
      <p className="note">{T < 0.05 ? 'Temperature 0: always the most likely token. Focused and repeatable.' : T <= 0.5 ? 'Low temperature: the top token wins almost every time. Good for facts and data.' : T <= 1.1 ? 'Medium: mostly the top token, sometimes another. Good for general writing.' : 'High temperature: unlikely tokens such as “Lyon” get a real chance. More variety, more mistakes.'} Faded bars are cut off by top-p.</p>
    </div>
  );
}

/* 10 — grounding against hallucination */
function V10() {
  const [ground, setGround] = useState(false);
  const [idk, setIdk] = useState(false);
  return (
    <div className="ctl">
      <div className="bubble t-n"><small>Question</small>When did SAP open the firewall for the price import?</div>
      <Toggle label="Put the meeting transcripts into the context (grounding)" on={ground} set={setGround} />
      <Toggle label="Tell the model: “If the answer is not in the transcripts, say so.”" on={idk} set={setIdk} />
      {ground ? (
        <div className="bubble t-b"><small>Answer: grounded</small>SAP opened the firewall on the morning of 13 November. <span className="mark-good">Source: daily scrum 13 Nov, Mario</span></div>
      ) : idk ? (
        <div className="bubble t-c"><small>Answer: honest</small>I could not find this in the meetings I was given.</div>
      ) : (
        <div className="bubble t-d"><small>Answer: fluent, confident, invented</small>SAP opened the firewall on <span className="mark-bad">10 November</span>, right after the change request was <span className="mark-bad">approved by the network team</span>.</div>
      )}
      <p className="note">Without the facts, the most likely continuation is something that only looks right. Give the model the source, allow “I don’t know”, and show where the answer came from.</p>
    </div>
  );
}

/* 11 — choosing a model */
const TIERS = [
  { id: 'local', name: 'Local open model', cap: 2, speed: 2, cost: 0.4, note: 'Data stays on your machine. Free per call. Weaker.' },
  { id: 'small', name: 'Small hosted model', cap: 3, speed: 5, cost: 1, note: 'Fast and cheap. Good for simple steps.' },
  { id: 'medium', name: 'Medium hosted model', cap: 4, speed: 4, cost: 3, note: 'A good default for most features.' },
  { id: 'large', name: 'Large hosted model', cap: 5, speed: 2.5, cost: 5, note: 'Best reasoning. Slowest and most expensive.' },
];
function V11() {
  const [need, setNeed] = useState({});
  const set = k => v => setNeed(n => ({ ...n, [k]: v }));
  let pick = 'medium', why = 'No special needs: start in the middle, then try a cheaper model and keep it if your tests still pass.';
  if (need.private) { pick = 'local'; why = 'The data may not leave your machine, so a local model is the only choice. Test hard tasks carefully.'; }
  else if (need.hard) { pick = 'large'; why = need.volume ? 'Hard reasoning needs the large model. With high volume, use a small model for the easy steps and the large one only where it matters.' : 'Multi-step reasoning is where large models are clearly better.'; }
  else if (need.volume || need.fast) { pick = 'small'; why = 'Simple work at high volume or with a waiting user: a small model is fast and cheap enough.'; }
  return (
    <Two>
      <div className="ctl">
        <Cap>What does your task need?</Cap>
        <Toggle label="The data must not leave my machine" on={!!need.private} set={set('private')} />
        <Toggle label="Hard, multi-step reasoning" on={!!need.hard} set={set('hard')} />
        <Toggle label="Thousands of calls a day" on={!!need.volume} set={set('volume')} />
        <Toggle label="A person waits for the answer" on={!!need.fast} set={set('fast')} />
        <Note tone="a">{why}</Note>
      </div>
      <ul className="list">
        {TIERS.map(t => (
          <li key={t.id} className={t.id === pick ? 'on' : ''}>
            <b>{t.name}{t.id === pick ? '  ← start here' : ''}</b>
            <Bars rows={[{ label: 'Capability', value: t.cap, tone: 'a' }, { label: 'Speed', value: t.speed, tone: 'b' }, { label: 'Cost per call', value: t.cost, tone: 'c' }]} max={5} fmt={() => ''} />
            <small>{t.note}</small>
          </li>
        ))}
      </ul>
    </Two>
  );
}

/* 12 — cost and latency calculator */
function V12() {
  const [inTok, setIn] = useState(4000);
  const [outTok, setOut] = useState(300);
  const [calls, setCalls] = useState(100);
  const [pIn, setPIn] = useState(3);
  const [pOut, setPOut] = useState(15);
  const [tps, setTps] = useState(60);
  const perCall = (inTok * pIn + outTok * pOut) / 1e6;
  const secs = 0.6 + outTok / tps;
  return (
    <div className="ctl">
      <Slider label="Input tokens per call" value={inTok} set={setIn} min={500} max={50000} step={500} fmt={int} />
      <Slider label="Output tokens per call" value={outTok} set={setOut} min={50} max={4000} step={50} fmt={int} />
      <Slider label="Calls per day" value={calls} set={setCalls} min={1} max={5000} fmt={int} />
      <Slider label="Price, input ($ per 1M)" value={pIn} set={setPIn} min={0.25} max={15} step={0.25} fmt={v => '$' + v.toFixed(2)} />
      <Slider label="Price, output ($ per 1M)" value={pOut} set={setPOut} min={1} max={75} step={1} fmt={v => '$' + v.toFixed(2)} />
      <Stats>
        <Stat label="per call" value={usd(perCall)} tone="a" />
        <Stat label="per day" value={usd(perCall * calls)} />
        <Stat label="per month" value={usd(perCall * calls * 30)} />
        <Stat label="per year" value={usd(perCall * calls * 365)} tone="c" />
      </Stats>
      <Bars rows={[{ label: 'Input share of cost', value: inTok * pIn, tone: 'a' }, { label: 'Output share of cost', value: outTok * pOut, tone: 'c' }]} fmt={v => usd(v / 1e6)} />
      <Slider label="Model speed" value={tps} set={setTps} min={20} max={200} step={5} fmt={v => v + ' tok/s'} />
      <Note tone="n">Time for one answer: about {secs.toFixed(1)} s (0.6 s to the first token + {int(outTok)} tokens ÷ {tps} per second). Shorter answers are the easiest way to be faster. Prices here are sliders, not real quotes: look up the current ones.</Note>
    </div>
  );
}

export default {
  1: { title: 'Circles inside circles — click one', C: V1 },
  2: { title: 'A tiny network you can train', C: V2 },
  3: { title: 'Watch the prediction loop', C: V3 },
  4: { title: 'Type text, see tokens', C: V4 },
  5: { title: 'Fill the context window', C: V5 },
  6: { title: 'Three training stages', C: V6 },
  7: { title: 'Which words does a word look at?', C: V7 },
  8: { title: 'Size against memory', C: V8 },
  9: { title: 'Turn the temperature knob', C: V9 },
  10: { title: 'Same question, with and without the facts', C: V10 },
  11: { title: 'A model chooser', C: V11 },
  12: { title: 'Cost and speed calculator', C: V12 },
};
