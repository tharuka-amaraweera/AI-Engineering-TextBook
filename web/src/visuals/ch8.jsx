import { useState } from 'react';
import { Bars, Cap, Cycle, Flow, Meter, Note, Slider, Stat, Stats, Tabs, Toggle, Two, int, usd } from './kit.jsx';

/* 51 — what to reach for, and LoRA */
const NEED51 = {
  know: [2, '“Know what was said in my meetings.” That is knowledge: use retrieval. A tuned model cannot cite a meeting or forget a deleted one.'],
  style: [1, '“Always answer in our summary format.” Show examples first. Fine-tune only if the format still does not hold.'],
  volume: [4, '“Classify 2 million short messages a day, cheaply.” A narrow task at high volume: here a small fine-tuned model pays off.'],
  facts: [2, '“Fewer wrong facts.” Ground the model in sources and measure with evals. Fine-tuning does not fix this.'],
};
const LADDER = [{ t: 'Better prompt', s: 'minutes' }, { t: 'Few-shot examples', s: 'minutes' }, { t: 'RAG / better context', s: 'days' }, { t: 'Stronger model', s: 'a config change' }, { t: 'Fine-tuning', s: 'weeks + upkeep' }];
function V51() {
  const [n, setN] = useState('know');
  const [share, setShare] = useState(0.5);
  return (
    <div className="ctl">
      <Cap>What do you need?</Cap>
      <Tabs value={n} set={setN} options={[['know', 'Knowledge'], ['style', 'Fixed style'], ['volume', 'Cheap at volume'], ['facts', 'Fewer wrong facts']]} />
      <Flow steps={LADDER.map((s, i) => ({ ...s, tone: i === NEED51[n][0] ? 'b' : 'n' }))} active={NEED51[n][0]} />
      <Note tone="a">{NEED51[n][1]}</Note>
      <Cap>LoRA: train a small adapter, freeze the rest</Cap>
      <Slider label="Share of weights trained" value={share} set={setShare} min={0.1} max={5} step={0.1} fmt={v => v.toFixed(1) + '%'} />
      <Meter segs={[{ label: 'Frozen base model', value: 100 - share, tone: 'n' }, { label: 'Trained adapter', value: share, tone: 'a' }]} unit="%" />
      <p className="note">Try the steps from left to right; go one further only when the one before is not enough. With LoRA only the thin adapter is trained, which is why it fits on one GPU.</p>
    </div>
  );
}

/* 52 — a model per step */
const STEPS52 = [['Route the question', 300, 20], ['Turn “last week” into filters', 350, 60], ['Rewrite the follow-up for search', 400, 50], ['Write the final answer', 4000, 350]];
const P52 = { large: [3, 15], small: [0.25, 1.25] };
function V52() {
  const [small, setSmall] = useState([true, true, true, false]);
  const cost = (i, s) => (STEPS52[i][1] * P52[s ? 'small' : 'large'][0] + STEPS52[i][2] * P52[s ? 'small' : 'large'][1]) / 1e6;
  const now = STEPS52.reduce((a, _, i) => a + cost(i, small[i]), 0);
  const allLarge = STEPS52.reduce((a, _, i) => a + cost(i, false), 0);
  return (
    <div className="ctl">
      <Cap>Tick the steps that run on the small model</Cap>
      {STEPS52.map(([name], i) => <Toggle key={name} label={`${name}: ${small[i] ? 'small' : 'large'} model, ${usd(cost(i, small[i]))}`} on={small[i]} set={v => setSmall(s => s.map((x, j) => (j === i ? v : x)))} />)}
      <Bars rows={[{ label: 'All steps on the large model', value: allLarge, tone: 'c' }, { label: 'Your mix', value: now, tone: 'b' }]} max={allLarge} fmt={usd} />
      {small[3]
        ? <Note tone="c">The final answer combines evidence and reasons over it. A small model is cheapest here, and most likely to fail. Let your eval set decide.</Note>
        : <Note tone="b">Simple steps on the small model, reasoning on the large one. The first three steps cost almost nothing either way; the saving is real at volume.</Note>}
      <Cap>Distillation</Cap>
      <Flow steps={[{ t: 'Large “teacher” model', s: 'answers thousands of real inputs' }, { t: 'Input / output pairs', tone: 'c' }, { t: 'Small “student” model', s: 'fine-tuned on the pairs', tone: 'b' }]} />
      <p className="note">Prices are made up (large $3 / $15, small $0.25 / $1.25 per million tokens).</p>
    </div>
  );
}

/* 53 — images become tokens */
function V53() {
  const [side, setSide] = useState(768);
  const [audio, setAudio] = useState('pipe');
  const n = Math.round(side / 32);
  const shown = Math.min(n, 24);
  return (
    <div className="ctl">
      <Two>
        <div className="cells" style={{ gridTemplateColumns: `repeat(${shown}, 1fr)` }} role="img" aria-label={`An image cut into ${n} by ${n} patches`}>
          {Array.from({ length: shown * shown }, (_, i) => <i key={i} />)}
        </div>
        <div className="ctl">
          <Slider label="Image size" value={side} set={setSide} min={256} max={2048} step={64} fmt={v => v + ' px'} />
          <Stats><Stat label="patches" value={`${n} × ${n}`} /><Stat label="tokens (about)" value={int(n * n)} tone="a" /></Stats>
          <p className="note">The image is cut into patches and each patch becomes tokens the model reads next to the text. A bigger image costs more. Illustration with 32-pixel patches: real models count in their own way.</p>
        </div>
      </Two>
      <Cap>Two designs for audio</Cap>
      <Tabs value={audio} set={setAudio} options={[['pipe', 'Pipeline'], ['native', 'Audio-native model']]} />
      {audio === 'pipe'
        ? <Flow steps={[{ t: 'Audio' }, { t: 'Speech to text', tone: 'a' }, { t: 'Transcript', s: 'small, searchable, easy to cite', tone: 'b' }, { t: 'Text model', tone: 'a' }]} />
        : <Flow steps={[{ t: 'Audio' }, { t: 'Model that hears audio', s: 'catches tone and emphasis', tone: 'e' }, { t: 'Answer', tone: 'b' }]} />}
      <p className="note">{audio === 'pipe' ? 'Your design today. Tone of voice is lost, but you keep a transcript you can store, search and cite.' : 'The model hears how something was said. It costs more, and there is no transcript to search unless you make one as well.'}</p>
    </div>
  );
}

/* 54 — the feedback loop and the economics */
function V54() {
  const [team, setTeam] = useState(8);
  const [meet, setMeet] = useState(1);
  const [q, setQ] = useState(10);
  const [cm, setCm] = useState(0.05);
  const [cq, setCq] = useState(0.02);
  const [price, setPrice] = useState(10);
  const cost = (meet * 22 * cm) / team + q * 22 * cq;
  return (
    <div className="ctl">
      <Two>
        <Cycle steps={['Real use', 'Feedback', 'Eval set', 'Improvements']} />
        <p className="note">Every thumbs-down and every correction is a free test case. Teams that close this loop improve every week.</p>
      </Two>
      <Cap>Cost per user per month</Cap>
      <Slider label="Team size" value={team} set={setTeam} min={1} max={30} fmt={v => v + ' people'} />
      <Slider label="Meetings per working day" value={meet} set={setMeet} min={1} max={5} />
      <Slider label="Questions per person per day" value={q} set={setQ} min={0} max={30} />
      <Slider label="Model cost per meeting" value={cm} set={setCm} min={0.01} max={0.2} step={0.01} fmt={v => '$' + v.toFixed(2)} />
      <Slider label="Model cost per question" value={cq} set={setCq} min={0.005} max={0.1} step={0.005} fmt={v => '$' + v.toFixed(3)} />
      <Slider label="Price per user per month" value={price} set={setPrice} min={0} max={30} fmt={v => '$' + v} />
      <Stats>
        <Stat label="model cost per user" value={'$' + cost.toFixed(2)} tone="c" />
        <Stat label="left after model cost" value={'$' + (price - cost).toFixed(2)} tone={price - cost > 0 ? 'b' : 'd'} />
        <Stat label="share of price spent on models" value={price ? Math.round((cost / price) * 100) + '%' : '–'} />
      </Stats>
      <p className="note">22 working days a month. Questions, not meetings, drive the cost: move that slider and watch. The cost levers of chapter 7 are your margin.</p>
    </div>
  );
}

/* 55 — one hour a week, and five questions */
const Q55 = ['Context window and maximum output: changed?', 'Price per million input and output tokens?', 'New abilities: tools, structured output, images, reasoning?', 'Behaviour changes or removed settings that touch my prompts?', 'How does it score on my own eval set?'];
function V55() {
  const [done, setDone] = useState({});
  const n = Q55.filter((_, i) => done[i]).length;
  return (
    <div className="ctl">
      <Cap>One hour a week</Cap>
      <Meter segs={[{ label: 'Release notes of the tools you use', value: 20, tone: 'a' }, { label: 'One or two good sources', value: 15, tone: 'e' }, { label: 'Build something small', value: 25, tone: 'b' }]} unit=" min" />
      <Cap>A new model is announced. Go through the five questions.</Cap>
      {Q55.map((t, i) => <Toggle key={i} label={t} on={!!done[i]} set={v => setDone(d => ({ ...d, [i]: v }))} />)}
      {n === 5
        ? <Note tone="b">Now you can decide. The last question is the only one that settles it.</Note>
        : <Note tone="n">{5 - n} to go. A place on a leaderboard answers none of them for your task.</Note>}
    </div>
  );
}

export default {
  51: { title: 'Which tool for which need', C: V51 },
  52: { title: 'A model for each step', C: V52 },
  53: { title: 'How a model reads an image', C: V53 },
  54: { title: 'The loop and the numbers', C: V54 },
  55: { title: 'A routine you can keep', C: V55 },
};
