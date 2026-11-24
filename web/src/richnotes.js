// Notes are plain text by default. A note edited in the note editor is stored as
// HTML with this marker in front, so old plain notes keep working.
export const MARK = '<!--rich-->';
export const isRich = note => typeof note === 'string' && note.startsWith(MARK);

// The one highlight colour and the text colours the editor offers. The values
// are the light-theme colours; styles.css maps them to the current theme.
export const HIGHLIGHT = 'rgb(255, 232, 115)';
export const COLORS = [
  { name: 'Red', value: 'rgb(191, 58, 45)' },
  { name: 'Green', value: 'rgb(27, 127, 80)' },
  { name: 'Blue', value: 'rgb(36, 71, 214)' },
  { name: 'Orange', value: 'rgb(168, 98, 0)' },
  { name: 'Violet', value: 'rgb(116, 64, 194)' },
];
const COLOR_VALUES = COLORS.map(c => c.value);

const KEEP = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'SPAN', 'UL', 'OL', 'LI', 'BR', 'DIV', 'P']);
// Removed together with everything inside them. Other unknown tags are unwrapped.
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE', 'NOSCRIPT', 'TEXTAREA', 'SELECT', 'TITLE', 'HEAD', 'LINK', 'META', 'BASE', 'FORM', 'AUDIO', 'VIDEO', 'CANVAS']);

function cleanNode(node) {
  for (const el of [...node.children]) {
    if (DROP.has(el.tagName.toUpperCase())) { el.remove(); continue; }
    cleanNode(el);
    const tag = el.tagName.toUpperCase();
    const st = el.style;
    const keep = [];
    if (st) {
      if (st.fontWeight === 'bold' || +st.fontWeight >= 600) keep.push('font-weight: bold');
      if (st.fontStyle === 'italic') keep.push('font-style: italic');
      if ((st.textDecorationLine || st.textDecoration || '').includes('underline')) keep.push('text-decoration: underline');
      const color = st.color || (tag === 'FONT' ? colorOf(el.getAttribute('color')) : '');
      if (COLOR_VALUES.includes(color)) keep.push('color: ' + color);
      if (st.backgroundColor === HIGHLIGHT) keep.push('background-color: ' + HIGHLIGHT);
    }
    let target = el;
    if (!KEEP.has(tag)) {
      // Unknown tag: keep its content. Keep its allowed styles in a span.
      if (keep.length) {
        target = el.ownerDocument.createElement('span');
        target.append(...el.childNodes);
        el.replaceWith(target);
      } else { el.replaceWith(...el.childNodes); continue; }
    }
    for (const a of [...target.attributes]) target.removeAttribute(a.name);
    if (keep.length) target.setAttribute('style', keep.join('; '));
  }
}

function colorOf(value) {
  if (!value) return '';
  const probe = document.createElement('span');
  probe.style.color = value;
  return probe.style.color;
}

// Returns HTML that is safe to show: only basic formatting tags, no attributes
// except a short list of style values. Notes can arrive from the synced Gist, so
// every note passes through here before it is shown.
export function cleanHtml(html) {
  const doc = new DOMParser().parseFromString('<!doctype html><body>' + String(html || ''), 'text/html');
  cleanNode(doc.body);
  return doc.body.innerHTML;
}

export const hasText = html => {
  const doc = new DOMParser().parseFromString('<!doctype html><body>' + html, 'text/html');
  return doc.body.textContent.trim() !== '';
};

export const textToHtml = text => String(text || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .split('\n').join('<br>');

// Any note, plain or rich, as safe HTML.
export const noteToHtml = note => (isRich(note) ? cleanHtml(note.slice(MARK.length)) : textToHtml(note));

// Used on the first sync of a browser, when both sides have a different note.
export function joinNotes(a, b) {
  if (!isRich(a) && !isRich(b)) return a + '\n\n' + b;
  return MARK + noteToHtml(a) + '<br><br>' + noteToHtml(b);
}
