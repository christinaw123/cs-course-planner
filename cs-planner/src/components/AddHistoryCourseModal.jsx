import { useState } from 'react';
import { TAG_AUTO, COURSE_TITLE } from '../constants/tags';
import { normCode } from '../utils/courseUtils';
import CourseAutocomplete from './CourseAutocomplete';

export default function AddHistoryCourseModal({ semLong, onAdd, onClose }) {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('cs');
  const [error, setError] = useState('');

  function handleAdd() {
    const trimCode = code.trim();
    const trimTitle = title.trim();
    if (!trimCode) { setError('Enter a course code.'); return; }
    const normalized = normCode(trimCode.toUpperCase());
    if (type === 'cs' && !(normalized in TAG_AUTO)) {
      setError(`"${normalized}" isn't a recognized requirement course. Use Custom for unlisted courses.`);
      return;
    }
    if (!trimTitle && !COURSE_TITLE[normalized]) { setError('Enter a course title.'); return; }
    setError('');
    onAdd({ code: normalized, title: trimTitle || COURSE_TITLE[normalized] || '', type });
    onClose();
  }

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="popup hist-modal" onClick={e => e.stopPropagation()}>
        <div className="popup-stripe" style={{ background: 'var(--crimson)' }} />
        <div className="hist-modal-body">
          <div className="hist-modal-title">Add course to {semLong}</div>
          <div className="hist-modal-sub">Add a missed course or transferred credit. Tags will be mapped automatically.</div>
          <div className="hist-field">
            <label>Course code</label>
            <CourseAutocomplete
              value={code}
              onChange={v => { setCode(v); setError(''); }}
              onSelect={c => { setCode(c.code); setTitle(COURSE_TITLE[c.code] || c.title || ''); setError(''); }}
              onEnter={handleAdd}
              placeholder="e.g. CS 124, MATH 21b"
            />
          </div>
          <div className="hist-field">
            <label>Course title</label>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              placeholder="e.g. Data Structures & Algorithms"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          {error && <div className="err-msg" style={{ marginTop: -4, marginBottom: 6 }}>{error}</div>}
          <div className="hist-field">
            <label>Type</label>
            <select value={type} onChange={e => { setType(e.target.value); setError(''); }}>
              <option value="cs">CS course</option>
              <option value="transfer">Transfer / AP credit</option>
              <option value="custom">Custom / non-CS course</option>
            </select>
          </div>
          {type === 'transfer' && (
            <div className="transfer-note">Transfer credits will be marked with a badge. You may need to manually assign requirement tags.</div>
          )}
        </div>
        <div className="settings-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleAdd}>Add course</button>
        </div>
      </div>
    </div>
  );
}
