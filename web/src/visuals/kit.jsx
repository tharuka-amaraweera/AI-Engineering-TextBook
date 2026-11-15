// Small building blocks shared by all concept pictures.
import { Fragment, useState } from 'react';

export const usd = v => '$' + (v < 1 ? v.toFixed(4) : v < 100 ? v.toFixed(2) : Math.round(v).toLocaleString('en-US'));
export const int = v => Math.round(v).toLocaleString('en-US');
export const pct = v => Math.round(v * 100) + '%';

export function Slider({ label, value, set, min, max, step = 1, fmt = v => v }) {
  return (
    <label className="sl">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => set(+e.target.value)} />
      <b>{fmt(value)}</b>
    </label>
  );
}

export function Toggle({ label, on, set }) {
  return (
    <label className="tg">
      <input type="checkbox" checked={on} onChange={e => set(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function Tabs({ options, value, set }) {
  return (
    <div className="tabs" role="tablist">
      {options.map(o => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        return <button type="button" key={v} role="tab" aria-selected={v === value} className={v === value ? 'on' : ''} onClick={() => set(v)}>{l}</button>;
      })}
    </div>
  );
}

export function Bars({ rows, max, fmt = v => v }) {
  const m = max ?? Math.max(...rows.map(r => r.value), 1e-9);
  return (
    <div className="bars">
      {rows.map((r, i) => (
        <div className={'bar' + (r.dim ? ' dim' : '')} key={i}>
          <span className="bl">{r.label}</span>
          <span className="bt"><i className={'t-' + (r.tone || 'a')} style={{ width: Math.max(0, Math.min(100, (r.value / m) * 100)) + '%' }} /></span>
          <span className="bv">{fmt(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Node({ s, cls = '', onClick }) {
  const c = `node t-${s.tone || 'n'} ${cls}`;
  const inner = <><b>{s.t}</b>{s.s && <small>{s.s}</small>}</>;
  return onClick ? <button type="button" className={c} onClick={onClick}>{inner}</button> : <div className={c}>{inner}</div>;
}

export function Flow({ steps, active = -1, onPick, vertical }) {
  return (
    <div className={'flow' + (vertical ? ' v' : '')}>
      {steps.map((s, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="arr" aria-hidden="true">{vertical ? '↓' : '→'}</span>}
          <Node s={s} cls={(i === active ? 'on' : '') + (active >= 0 && i > active ? ' later' : '')} onClick={onPick ? () => onPick(i) : undefined} />
        </Fragment>
      ))}
    </div>
  );
}

export function Stepper({ i, n, set }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => set(Math.max(0, i - 1))} disabled={i === 0}>← Back</button>
      <span>Step {i + 1} of {n}</span>
      <button type="button" className="pri" onClick={() => set(i === n - 1 ? 0 : i + 1)}>{i === n - 1 ? 'Start again' : 'Next →'}</button>
    </div>
  );
}

// A flow you can walk through; each step has a note.
export function StepFlow({ steps, vertical }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <Flow steps={steps} active={i} onPick={setI} vertical={vertical} />
      <Stepper i={i} n={steps.length} set={setI} />
      <p className="note">{steps[i].note}</p>
    </div>
  );
}

// A sequence diagram you can walk through. msgs: { from, to, text, note }
export function Sequence({ actors, msgs }) {
  const [i, setI] = useState(0);
  const W = 640, pad = 90, rowH = 46;
  const gap = actors.length > 1 ? (W - 2 * pad) / (actors.length - 1) : 0;
  const H = 62 + msgs.length * rowH;
  const x = k => pad + k * gap;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="seq" role="img" aria-label={'Sequence between ' + actors.join(', ')}>
        <defs>
          <marker id="seq-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className="seq-head" />
          </marker>
        </defs>
        {actors.map((a, k) => (
          <g key={k}>
            <line x1={x(k)} y1={36} x2={x(k)} y2={H - 6} className="seq-life" />
            <rect x={x(k) - 78} y={6} width={156} height={30} rx={7} className="seq-actor" />
            <text x={x(k)} y={26} textAnchor="middle" className="seq-at">{a}</text>
          </g>
        ))}
        {msgs.map((m, k) => {
          const y = 62 + k * rowH + 24;
          const x1 = x(m.from), x2 = x(m.to), self = m.from === m.to;
          return (
            <g key={k} className={'seq-m' + (k === i ? ' on' : k > i ? ' off' : '')}>
              {self
                ? <path d={`M${x1} ${y - 10} h30 v16 h-24`} className="seq-line" fill="none" markerEnd="url(#seq-arrow)" />
                : <line x1={x1} y1={y} x2={x2 + (x2 > x1 ? -4 : 4)} y2={y} className="seq-line" markerEnd="url(#seq-arrow)" />}
              <text x={self ? x1 + 38 : (x1 + x2) / 2} y={self ? y + 2 : y - 8} textAnchor={self ? 'start' : 'middle'} className="seq-mt">{m.text}</text>
            </g>
          );
        })}
      </svg>
      <Stepper i={i} n={msgs.length} set={setI} />
      <p className="note">{msgs[i].note}</p>
    </div>
  );
}

// Steps placed on a circle, for loops.
export function Cycle({ steps, active = -1 }) {
  const n = steps.length, cx = 160, cy = 105, R = 74;
  const pt = k => { const a = ((-90 + (k * 360) / n) * Math.PI) / 180; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; };
  return (
    <svg viewBox="0 0 320 210" className="cycle" role="img" aria-label={'A loop: ' + steps.join(', then ')}>
      <circle cx={cx} cy={cy} r={R} className="cy-ring" />
      {steps.map((s, k) => {
        const [px, py] = pt(k);
        return (
          <g key={k} className={k === active ? 'on' : ''}>
            <rect x={px - 52} y={py - 15} width={104} height={30} rx={15} className="cy-node" />
            <text x={px} y={py + 4} textAnchor="middle" className="cy-t">{s}</text>
          </g>
        );
      })}
    </svg>
  );
}

// One node fanning out to several, then joining again.
export function Fan({ from, mids, to, pick = -1 }) {
  return (
    <div className="fan">
      {from && <><Node s={from} /><span className="arr" aria-hidden="true">→</span></>}
      <div className="fan-mid">
        {mids.map((m, i) => <Node key={i} s={{ tone: 'a', ...m }} cls={pick >= 0 ? (i === pick ? 'on' : 'later') : ''} />)}
      </div>
      {to && <><span className="arr" aria-hidden="true">→</span><Node s={to} /></>}
    </div>
  );
}

// A stacked bar with an optional limit line.
export function Meter({ segs, total, unit = '' }) {
  const sum = segs.reduce((a, x) => a + x.value, 0);
  const base = Math.max(total || 0, sum) || 1;
  return (
    <div className="meter">
      <div className="mt-wrap">
        <div className="mt-track">
          {segs.map((x, i) => <i key={i} className={'t-' + x.tone} style={{ width: (x.value / base) * 100 + '%' }} title={x.label} />)}
        </div>
        {total ? <div className="mt-limit" style={{ left: (total / base) * 100 + '%' }}><span>limit</span></div> : null}
      </div>
      <div className="legend">
        {segs.map((x, i) => <span key={i}><i className={'dot t-' + x.tone} />{x.label} <b>{int(x.value)}{unit}</b></span>)}
      </div>
    </div>
  );
}

export function Stat({ label, value, tone }) {
  return <div className={'stat t-' + (tone || 'n')}><b>{value}</b><span>{label}</span></div>;
}
export function Stats({ children }) { return <div className="stats">{children}</div>; }
export function Note({ tone = 'a', children }) { return <p className={'callout t-' + tone}>{children}</p>; }
export function Ctl({ children }) { return <div className="ctl">{children}</div>; }
export function Two({ children }) { return <div className="two">{children}</div>; }
export function Btn({ children, onClick, disabled }) {
  return <button type="button" className="vbtn" onClick={onClick} disabled={disabled}>{children}</button>;
}
export function Cap({ children }) { return <p className="cap">{children}</p>; }
