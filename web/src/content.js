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

const norm = s => s.replace(/\r\n/g, '\n');
const clean = s => s.trim().replace(/\n-{3,}\s*$/, '').replace(/^-{3,}\s*\n/, '').trim();
const listItems = md => [...(md || '').matchAll(/^\d+\.\s+(.+)$/gm)].map(m => m[1]);

function parseQuiz(md) {
  if (!md) return { q: [], a: [], raw: '' };
  const [before, after = ''] = md.split('<details>');
  return { q: listItems(before), a: listItems(after), raw: md };
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
    quiz: { q: [], a: [], raw: '' },
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
