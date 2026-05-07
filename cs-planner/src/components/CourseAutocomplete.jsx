import { useState, useEffect } from 'react';
import { TAG_AUTO, COURSE_TITLE, TAG_SHORT, TAG_CLASS } from '../constants/tags';

const COURSE_LIST = Object.keys(TAG_AUTO).map(code => ({
  code,
  title: COURSE_TITLE[code] || '',
  tags: TAG_AUTO[code] || [],
}));

// Controlled course-code input with a filtered dropdown from TAG_AUTO (or a custom courseList).
// Props:
//   value / onChange(string)  — controlled input value
//   onSelect(course)          — called when user picks a suggestion
//   onEnter()                 — called when Enter is pressed with no suggestion highlighted (parent validates)
//   placeholder               — input placeholder text
//   inputRef                  — forwarded ref for the underlying <input> element
//   courseList                — optional override list; each item: { code, title, tags, ...rest }
export default function CourseAutocomplete({ value, onChange, onSelect, onEnter, placeholder, inputRef, courseList }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);

  const list = courseList || COURSE_LIST;
  const query = (value || '').trim().toUpperCase();
  const matches = query.length === 0 ? [] : list.filter(c =>
    c.code.toUpperCase().includes(query) || (c.title || '').toUpperCase().includes(query)
  ).slice(0, 8);

  useEffect(() => { setHi(0); }, [value]);

  const showDrop = open && matches.length > 0;

  function handleKeyDown(e) {
    if (showDrop) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, matches.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); return; }
      if (e.key === 'Enter')     { e.preventDefault(); onSelect(matches[hi]); setOpen(false); return; }
      if (e.key === 'Escape')    { setOpen(false); return; }
    }
    if (e.key === 'Enter') onEnter?.();
  }

  return (
    <div className="ac-wrap">
      <input
        ref={inputRef}
        value={value || ''}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (query) setOpen(true); }}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {showDrop && (
        <div className="ac-dropdown">
          {matches.map((c, i) => (
            <div
              key={c.code}
              className={`ac-item${i === hi ? ' ac-hi' : ''}`}
              onMouseDown={e => { e.preventDefault(); onSelect(c); setOpen(false); }}
              onMouseEnter={() => setHi(i)}
            >
              <div className="ac-row">
                <span className="ac-code">{c.code}</span>
                {c.tags.map(t => (
                  <span key={t} className={`tag ${TAG_CLASS[t] || 'custom'}`}>{TAG_SHORT[t] || t}</span>
                ))}
              </div>
              {c.title && <div className="ac-title">{c.title}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
