import { useEffect, useMemo, useState } from 'react';
import Md from './Markdown.jsx';
import { chapters, concepts, glossary, pages, readme } from './content.js';
import { visuals } from './visuals/index.js';

const KEY = 'ai-workbook-v1';

function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

// Progress, notes and theme live in the browser's local storage.
function useStore() {
  const [state, setState] = useState(loadState);
  const update = fn => setState(prev => {
    const next = JSON.parse(JSON.stringify(prev));
    fn(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable: keep in memory */ }
    return next;
  });
  return [state, update];
}

function useHashPath() {
  const read = () => decodeURI(location.hash.slice(1)) || '/';
  const [path, setPath] = useState(read);
  useEffect(() => {
    const onChange = () => { setPath(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

// Small notebook sign for concepts marked "revise again".
const NoteIcon = () => (
  <svg className="note-ico" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="3.5" y="1.5" width="10" height="13" rx="2" fill="currentColor" />
    <path d="M1.5 4.5h3.5M1.5 8h3.5M1.5 11.5h3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M7.5 5h4M7.5 7.5h2.5" stroke="var(--paper)" strokeWidth="1.3" strokeLinecap="round" fill="none" />
  </svg>
);

const readCount = (s, list) => list.filter(c => s.read?.[c.n]).length;

function Progress({ value, max }) {
  return (
    <div className="prog" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <i style={{ width: (max ? (value / max) * 100 : 0) + '%' }} />
    </div>
  );
}

function Notes({ id, s, update, label = 'My notes' }) {
  return (
    <div className="notes">
      <label htmlFor={'notes-' + id}>{label}</label>
      <textarea
        id={'notes-' + id}
        value={s.notes?.[id] || ''}
        placeholder="Write the idea in your own words, or paste a link to your work. Saved in this browser."
        onChange={e => update(d => { d.notes = d.notes || {}; d.notes[id] = e.target.value; })}
      />
    </div>
  );
}

/* ---------- pages ---------- */

function Home({ s }) {
  const done = readCount(s, concepts);
  const next = concepts.find(c => !s.read?.[c.n]);
  return (
    <article>
      <header className="hero">
        <p className="eyebrow">Self-study workbook</p>
        <h1>AI Engineering</h1>
        <p className="lead">From “what is a token?” to running an AI service in production. 55 concepts, each with a picture you can play with.</p>
        <div className="hero-row">
          <a className="btn primary" href={`#/c/${next ? next.n : 1}`}>
            {done === 0 ? 'Start with concept 1' : next ? `Continue with ${next.n}. ${next.title}` : 'Review from the start'}
          </a>
          <span className="muted">{done} of {concepts.length} concepts understood</span>
        </div>
        <Progress value={done} max={concepts.length} />
      </header>
      <div className="cards">
        {chapters.map(ch => {
          const d = readCount(s, ch.concepts);
          return (
            <a className="card" key={ch.n} href={`#/chapter/${ch.n}`}>
              <span className="card-n">Chapter {ch.n}</span>
              <b>{ch.title}</b>
              <span className="muted">Concepts {ch.concepts[0].n}–{ch.concepts[ch.concepts.length - 1].n} · {d}/{ch.concepts.length} done</span>
              <Progress value={d} max={ch.concepts.length} />
            </a>
          );
        })}
      </div>
      <div className="md"><Md>{readme.replace(/^# .*\n/, '')}</Md></div>
    </article>
  );
}

function ChapterPage({ ch, s }) {
  return (
    <article>
      <p className="crumb"><a href="#/">Start</a> / Chapter {ch.n}</p>
      <h1>{ch.title}</h1>
      <div className="md"><Md>{ch.intro}</Md></div>
      <h2 className="sec">In this chapter</h2>
      <ol className="toc">
        {ch.concepts.map(c => (
          <li key={c.n} className={s.read?.[c.n] ? 'done' : s.revise?.[c.n] ? 'revise' : ''}>
            <a href={`#/c/${c.n}`}><span className="toc-n">{c.n}</span>{c.title}<span className={'tick' + (s.revise?.[c.n] ? ' again' : '')} aria-hidden="true">{s.read?.[c.n] ? '✓' : s.revise?.[c.n] ? <NoteIcon /> : ''}</span></a>
          </li>
        ))}
      </ol>
      <div className="row">
        {ch.extras.map((e, k) => <a className="btn" key={k} href={`#/chapter/${ch.n}/extra/${k}`}>{e.title}</a>)}
        {ch.exercisesRaw && <a className="btn" href={`#/chapter/${ch.n}/exercises`}>Exercises ({ch.exercises.length})</a>}
        {ch.quiz.raw && <a className="btn" href={`#/chapter/${ch.n}/quiz`}>Check yourself ({ch.quiz.q.length})</a>}
      </div>
    </article>
  );
}

function splitForVisual(body) {
  const first = body.indexOf('### ');
  const second = first >= 0 ? body.indexOf('\n### ', first + 4) : -1;
  return second > 0 ? [body.slice(0, second), body.slice(second)] : [body, ''];
}

function ConceptPage({ c, s, update }) {
  const ch = chapters[c.chapter - 1];
  const V = visuals[c.n];
  const [before, after] = splitForVisual(c.body);
  const done = !!s.read?.[c.n];
  const again = !!s.revise?.[c.n];
  // A concept is either understood or marked to revise again, never both.
  const setMark = (key, other, on) => update(d => {
    d[key] = d[key] || {};
    if (on) { d[key][c.n] = true; if (d[other]) delete d[other][c.n]; } else delete d[key][c.n];
  });
  return (
    <article>
      <p className="crumb"><a href={`#/chapter/${ch.n}`}>Chapter {ch.n} · {ch.title}</a></p>
      <h1><span className="num">{c.n}</span>{c.title}</h1>
      <div className="md"><Md>{before}</Md></div>
      {V && (
        <figure className="viz">
          <figcaption><span className="viz-tag">Picture it</span>{V.title}</figcaption>
          <V.C />
        </figure>
      )}
      {after && <div className="md"><Md>{after}</Md></div>}
      <Notes id={'c' + c.n} s={s} update={update} />
      <div className="row">
        <button type="button" className={'btn mark' + (done ? ' done' : '')} aria-pressed={done}
          onClick={() => setMark('read', 'revise', !done)}>
          {done ? '✓ Understood (click to undo)' : 'Mark as understood'}
        </button>
        <button type="button" className={'btn mark' + (again ? ' on-warn' : '')} aria-pressed={again}
          onClick={() => setMark('revise', 'read', !again)}>
          {again ? <span className="with-ico"><NoteIcon />Revise again (click to undo)</span> : 'Revise again'}
        </button>
      </div>
    </article>
  );
}

function ExtraPage({ ch, extra }) {
  return (
    <article>
      <p className="crumb"><a href={`#/chapter/${ch.n}`}>Chapter {ch.n} · {ch.title}</a></p>
      <h1>{extra.title}</h1>
      <div className="md"><Md>{extra.body}</Md></div>
    </article>
  );
}

function ExercisesPage({ ch, s, update }) {
  const done = ch.exercises.filter((_, i) => s.ex?.[`${ch.n}-${i}`]).length;
  return (
    <article>
      <p className="crumb"><a href={`#/chapter/${ch.n}`}>Chapter {ch.n} · {ch.title}</a></p>
      <h1>Exercises</h1>
      <p className="muted">Do them, do not only read them. {done} of {ch.exercises.length} done.</p>
      <Progress value={done} max={ch.exercises.length} />
      <ol className="exs">
        {ch.exercises.map((text, i) => {
          const id = `${ch.n}-${i}`;
          const on = !!s.ex?.[id];
          return (
            <li key={id} className={on ? 'done' : ''}>
              <label className="ex-head">
                <input type="checkbox" checked={on} onChange={e => update(d => { d.ex = d.ex || {}; if (e.target.checked) d.ex[id] = true; else delete d.ex[id]; })} />
                <div className="md"><Md>{text}</Md></div>
              </label>
              <Notes id={'ex' + id} s={s} update={update} label="What I did / link to my work" />
            </li>
          );
        })}
      </ol>
    </article>
  );
}

function QuizPage({ ch, s, update }) {
  const [open, setOpen] = useState({});
  const { q, a, raw } = ch.quiz;
  const usable = q.length > 0 && q.length === a.length;
  const known = q.filter((_, i) => s.quiz?.[`${ch.n}-${i}`] === 'ok').length;
  return (
    <article>
      <p className="crumb"><a href={`#/chapter/${ch.n}`}>Chapter {ch.n} · {ch.title}</a></p>
      <h1>Check yourself</h1>
      {!usable ? <div className="md"><Md>{raw}</Md></div> : (
        <>
          <p className="muted">Answer from memory first, then open the answer and grade yourself. {known} of {q.length} known.</p>
          <Progress value={known} max={q.length} />
          <ol className="quiz">
            {q.map((question, i) => {
              const id = `${ch.n}-${i}`;
              const st = s.quiz?.[id];
              const set = v => update(d => { d.quiz = d.quiz || {}; d.quiz[id] = v; });
              return (
                <li key={id} className={st || ''}>
                  <div className="md q"><Md>{question}</Md></div>
                  {!open[id] ? (
                    <button type="button" className="btn" onClick={() => setOpen(o => ({ ...o, [id]: true }))}>Show answer</button>
                  ) : (
                    <>
                      <div className="md ans"><Md>{a[i]}</Md></div>
                      <div className="row">
                        <button type="button" className={'btn' + (st === 'ok' ? ' on-good' : '')} onClick={() => set('ok')}>I knew it</button>
                        <button type="button" className={'btn' + (st === 'again' ? ' on-warn' : '')} onClick={() => set('again')}>Review again</button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </article>
  );
}

function GlossaryPage() {
  const [q, setQ] = useState('');
  const rows = glossary.filter(g => (g.term + ' ' + g.meaning).toLowerCase().includes(q.toLowerCase()));
  return (
    <article>
      <p className="crumb"><a href="#/">Start</a> / Glossary</p>
      <h1>Glossary</h1>
      <input className="field" id="glossary-filter" type="search" placeholder={`Filter ${glossary.length} terms…`} value={q} onChange={e => setQ(e.target.value)} aria-label="Filter glossary" />
      <dl className="gloss">
        {rows.map(g => (
          <div key={g.term}>
            <dt>{g.term}</dt>
            <dd>{g.meaning} {g.sections.map(n => <a key={n} className="pill" href={`#/c/${n}`}>§{n}</a>)}</dd>
          </div>
        ))}
        {rows.length === 0 && <p className="muted">No term matches “{q}”.</p>}
      </dl>
    </article>
  );
}

/* ---------- shell ---------- */

function Sidebar({ s, cur, theme, toggleTheme }) {
  const [q, setQ] = useState('');
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return null;
    return concepts.filter(c => (c.title + ' ' + c.body).toLowerCase().includes(t)).slice(0, 14);
  }, [q]);
  const done = readCount(s, concepts);
  return (
    <nav className="side" aria-label="Contents">
      <a className="brand" href="#/"><b>AI Engineering</b><span>Self-study workbook</span></a>
      <input className="field" id="search" type="search" placeholder="Search concepts…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search concepts" />
      <div className="side-prog"><span>{done}/{concepts.length} understood</span><Progress value={done} max={concepts.length} /></div>
      {hits ? (
        <ul className="nav">
          {hits.length === 0 && <li className="muted pad">Nothing found.</li>}
          {hits.map(c => <li key={c.n}><a href={`#/c/${c.n}`} onClick={() => setQ('')}><span className="toc-n">{c.n}</span>{c.title}</a></li>)}
        </ul>
      ) : (
        <ul className="nav">
          {chapters.map(ch => {
            const open = cur?.ch === ch.n;
            return (
              <li key={ch.n}>
                <a className={'nav-ch' + (cur?.path === `/chapter/${ch.n}` ? ' here' : '')} href={`#/chapter/${ch.n}`}>
                  <span className="toc-n">{ch.n}</span>{ch.title}
                  <span className="count">{readCount(s, ch.concepts)}/{ch.concepts.length}</span>
                </a>
                {open && (
                  <ul className="sub">
                    {ch.concepts.map(c => (
                      <li key={c.n}>
                        <a className={(cur.path === `/c/${c.n}` ? 'here ' : '') + (s.read?.[c.n] ? 'done' : s.revise?.[c.n] ? 'revise' : '')} href={`#/c/${c.n}`}>
                          <span className="toc-n">{s.read?.[c.n] ? '✓' : s.revise?.[c.n] ? <NoteIcon /> : c.n}</span>{c.title}
                        </a>
                      </li>
                    ))}
                    {ch.extras.map((e, k) => <li key={'e' + k}><a className={cur.path === `/chapter/${ch.n}/extra/${k}` ? 'here' : ''} href={`#/chapter/${ch.n}/extra/${k}`}><span className="toc-n">＋</span>{e.title}</a></li>)}
                    {ch.exercisesRaw && <li><a className={cur.path === `/chapter/${ch.n}/exercises` ? 'here' : ''} href={`#/chapter/${ch.n}/exercises`}><span className="toc-n">✎</span>Exercises</a></li>}
                    {ch.quiz.raw && <li><a className={cur.path === `/chapter/${ch.n}/quiz` ? 'here' : ''} href={`#/chapter/${ch.n}/quiz`}><span className="toc-n">?</span>Check yourself</a></li>}
                  </ul>
                )}
              </li>
            );
          })}
          <li><a className={'nav-ch' + (cur?.path === '/glossary' ? ' here' : '')} href="#/glossary"><span className="toc-n">A</span>Glossary</a></li>
        </ul>
      )}
      <button type="button" className="btn theme" onClick={toggleTheme}>{theme === 'dark' ? 'Switch to light' : 'Switch to dark'}</button>
    </nav>
  );
}

export default function App() {
  const path = useHashPath();
  const [s, update] = useStore();
  const [menu, setMenu] = useState(false);

  const systemDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = s.theme || (systemDark ? 'dark' : 'light');
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { setMenu(false); }, [path]);

  const idx = pages.findIndex(p => p.path === path);
  const cur = pages[idx];
  const prev = idx > 0 ? pages[idx - 1] : null;
  const next = idx >= 0 && idx < pages.length - 1 ? pages[idx + 1] : null;

  useEffect(() => {
    const onKey = e => {
      if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight' && next) location.hash = next.path;
      if (e.key === 'ArrowLeft' && prev) location.hash = prev.path;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  let page;
  const m = path.match(/^\/chapter\/(\d+)(?:\/(exercises|quiz|extra)(?:\/(\d+))?)?$/);
  const cm = path.match(/^\/c\/(\d+)$/);
  const ch = m && chapters[+m[1] - 1];
  const concept = cm && concepts.find(c => c.n === +cm[1]);
  if (path === '/') page = <Home s={s} />;
  else if (path === '/glossary') page = <GlossaryPage />;
  else if (concept) page = <ConceptPage key={concept.n} c={concept} s={s} update={update} />;
  else if (ch && !m[2]) page = <ChapterPage ch={ch} s={s} />;
  else if (ch && m[2] === 'exercises') page = <ExercisesPage key={ch.n} ch={ch} s={s} update={update} />;
  else if (ch && m[2] === 'quiz') page = <QuizPage key={ch.n} ch={ch} s={s} update={update} />;
  else if (ch && m[2] === 'extra' && ch.extras[+m[3]]) page = <ExtraPage ch={ch} extra={ch.extras[+m[3]]} />;
  else page = <article><h1>Page not found</h1><p><a href="#/">Back to the start</a></p></article>;

  return (
    <div className={'app' + (menu ? ' menu-open' : '')}>
      <header className="top">
        <button type="button" className="btn" onClick={() => setMenu(v => !v)} aria-expanded={menu}>{menu ? 'Close' : 'Contents'}</button>
        <a href="#/"><b>AI Engineering</b></a>
      </header>
      <Sidebar s={s} cur={cur} theme={theme} toggleTheme={() => update(d => { d.theme = theme === 'dark' ? 'light' : 'dark'; })} />
      <main>
        {page}
        <nav className="pager" aria-label="Previous and next page">
          {prev ? <a className="btn" href={'#' + prev.path}><small>← Previous</small>{prev.label}</a> : <span />}
          {next ? <a className="btn next" href={'#' + next.path}><small>Next →</small>{next.label}</a> : <span />}
        </nav>
      </main>
    </div>
  );
}
