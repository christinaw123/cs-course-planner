import { useState } from 'react';

export default function AddHistoryCourseModal({ semLong, onAdd, onClose }) {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('cs');

  function handleAdd() {
    const trimCode = code.trim();
    const trimTitle = title.trim();
    if (!trimCode || !trimTitle) return;
    onAdd({ code: trimCode.toUpperCase(), title: trimTitle, type });
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
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="e.g. CS 124, MATH 21b"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div className="hist-field">
            <label>Course title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Data Structures & Algorithms"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div className="hist-field">
            <label>Type</label>
            <select value={type} onChange={e => setType(e.target.value)}>
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
