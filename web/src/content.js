// Loads the textbook Markdown files as they are and splits them into pages.
import readmeMd from '../../README.md?raw';
import c1 from '../../01-foundations.md?raw';
import c2 from '../../02-prompt-engineering.md?raw';
import c3 from '../../03-building-with-llms.md?raw';
import c4 from '../../04-rag.md?raw';
import c5 from '../../05-agents-and-integration.md?raw';
import c6 from '../../06-evaluation.md?raw';
import c7 from '../../07-production.md?raw';
import c8 from '../../08-advanced.md?raw';
import glossaryMd from '../../09-glossary.md?raw';
import storiesMd from '../../10-example-stories.md?raw';

const norm = s => s.replace(/\r\n/g, '\n');
const clean = s => s.trim().replace(/\n-{3,}\s*$/, '').replace(/^-{3,}\s*\n/, '').trim();
const listItems = md => [...(md || '').matchAll(/^\d+\.\s+(.+)$/gm)].map(m => m[1]);

// A quiz question is a numbered line. Its answer options are the indented lines
// "- A. text" below it. In the answers list, "**B.** text" names the correct
// option and gives the explanation. A question without options still works as a
// plain question with a hidden answer.
function parseQuiz(md) {
  if (!md) return { q: [], a: [], opts: [], correct: [], raw: '' };
  const [before, after = ''] = md.split('<details>');
  const q = [];
  const opts = [];
  for (const line of before.split('\n')) {
    const item = line.match(/^\d+\.\s+(.+)$/);
    if (item) { q.push(item[1]); opts.push([]); continue; }
    const opt = line.match(/^\s+-\s+([A-D])\.\s+(.+)$/);
    if (opt && opts.length) opts[opts.length - 1].push({ key: opt[1], text: opt[2] });
  }
  const a = [];
  const correct = [];
  for (const item of listItems(after)) {
    const m = item.match(/^\*\*([A-D])\.\*\*\s*(.*)$/);
    correct.push(m ? m[1] : null);
    a.push(m ? m[2] : item);
  }
  return { q, a, opts, correct, raw: md };
}

function parseChapter(src, idx) {
  const parts = norm(src).split(/^## /m);
  const head = parts[0];
  const fullTitle = (head.match(/^# (.*)$/m) || [])[1] || `Chapter ${idx + 1}`;
  const ch = {
    n: idx + 1,
    title: fullTitle.replace(/^Chapter \d+\s+—\s+/, ''),
    intro: clean(head.replace(/^# .*$/m, '')),
    concepts: [],
    extras: [],
    exercises: [],
    exercisesRaw: '',
    quiz: { q: [], a: [], opts: [], correct: [], raw: '' },
  };
  for (const part of parts.slice(1)) {
    const nl = part.indexOf('\n');
    const heading = part.slice(0, nl).trim();
    const body = clean(part.slice(nl + 1));
    const m = heading.match(/^(\d+)\.\s+(.*)$/);
    if (m) ch.concepts.push({ n: +m[1], title: m[2], body, chapter: ch.n });
    else if (/^exercises/i.test(heading)) { ch.exercises = listItems(body); ch.exercisesRaw = body; }
    else if (/^check yourself/i.test(heading)) ch.quiz = parseQuiz(body);
    else ch.extras.push({ title: heading, body });
  }
  return ch;
}

export const chapters = [c1, c2, c3, c4, c5, c6, c7, c8].map(parseChapter);
export const concepts = chapters.flatMap(ch => ch.concepts);
export const readme = norm(readmeMd);

export const glossary = [...norm(glossaryMd).matchAll(/^\| \*\*(.+?)\*\* \| (.+?) \| (.+?) \|$/gm)].map(m => ({
  term: m[1],
  meaning: m[2],
  sections: m[3].split(',').map(s => +s.trim()).filter(Boolean),
}));

// Example stories: one story per concept, all from building the same product.
// A concept with no story (or a story the parser cannot read) simply gets no button.
function parseStories(src) {
  const text = norm(src);
  const start = text.search(/^# Phase /m);
  if (start < 0) return { project: '', byConcept: {} };
  const section = text.slice(0, start).split(/^## /m).find(p => p.startsWith('The project')) || '';
  const project = clean(section.slice(section.indexOf('\n') + 1));
  const byConcept = {};
  for (const block of text.slice(start).split(/^# Phase /m).filter(Boolean)) {
    const head = block.match(/^(\d+) · Chapter \d+ · (.*)\n/);
    if (!head) continue;
    for (const part of block.split(/^## (?=\d+\. )/m).slice(1)) {
      const m = part.match(/^(\d+)\. .*\n\*\*Story: (.*)\*\* · \*Kind: (.*)\*\n/);
      if (!m) continue;
      const bits = part.slice(m[0].length).split(/^\*\*(What happens|The idea|What you do|If you miss it)\.\*\* ?/m);
      const parts = [];
      for (let i = 1; i < bits.length; i += 2) parts.push({ label: bits[i], body: bits[i + 1].trim() });
      if (parts.length) byConcept[+m[1]] = { title: m[2].trim(), kind: m[3].trim(), phase: +head[1], phaseTitle: head[2].trim(), parts };
    }
  }
  return { project, byConcept };
}

export const stories = parseStories(storiesMd);

// Reading order, used for the Previous / Next buttons.
export const pages = [{ path: '/', label: 'Start' }];
for (const ch of chapters) {
  pages.push({ path: `/chapter/${ch.n}`, label: `Chapter ${ch.n}: ${ch.title}`, ch: ch.n });
  for (const c of ch.concepts) pages.push({ path: `/c/${c.n}`, label: `${c.n}. ${c.title}`, ch: ch.n });
  ch.extras.forEach((e, k) => pages.push({ path: `/chapter/${ch.n}/extra/${k}`, label: e.title, ch: ch.n }));
  if (ch.exercisesRaw) pages.push({ path: `/chapter/${ch.n}/exercises`, label: `Chapter ${ch.n} exercises`, ch: ch.n });
  if (ch.quiz.raw) pages.push({ path: `/chapter/${ch.n}/quiz`, label: `Chapter ${ch.n} check yourself`, ch: ch.n });
}
pages.push({ path: '/glossary', label: 'Glossary' });
