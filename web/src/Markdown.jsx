import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';

// Links between the Markdown files become links between pages of the site.
function localHref(href) {
  const m = href && href.match(/^(\d\d)-[\w-]+\.md$/);
  if (!m) return null;
  return m[1] === '09' ? '#/glossary' : `#/chapter/${+m[1]}`;
}

const text = node => (Array.isArray(node) ? node.map(text).join('') : typeof node === 'string' ? node : '');

const components = {
  a: ({ href, children }) => {
    const local = localHref(href);
    return local ? <a href={local}>{children}</a> : <a href={href} target="_blank" rel="noreferrer">{children}</a>;
  },
  table: ({ children }) => <div className="tbl"><table>{children}</table></div>,
  h3: ({ children }) => {
    const t = text(children).toLowerCase();
    const kind = t.startsWith('remember') ? 'k-remember' : t.startsWith('common mistake') ? 'k-mistake' : undefined;
    return <h3 className={kind}>{children}</h3>;
  },
};

export default function Md({ children }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeHighlight, { aliases: { ini: ['properties'] } }]]}
      components={components}
    >
      {children}
    </ReactMarkdown>
  );
}
