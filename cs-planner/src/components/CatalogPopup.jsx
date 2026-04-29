import { useState } from 'react';
import { TAG_FULL, TAG_CLASS } from '../constants/tags';
import { fmt } from '../utils/courseUtils';

export default function CatalogPopup({
  course,
  fromLabel,
  schedName,
  alreadyAdded,
  onShelf,
  hasConflict,
  existingCourses = [],
  onClose,
  onAdd,
  onAddToShelf,
}) {
  const [backupFor, setBackupFor] = useState('');

  if (!course) return null;
  const hasTime = !!(course.days && course.start);
  const tags = course.tags || [];
  const showBackupSelect = !!schedName && existingCourses.length > 0 && !alreadyAdded && hasTime;

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="popup" onClick={e => e.stopPropagation()}>
        <div className="popup-stripe" style={{ background: 'var(--crimson)' }} />
        <div className="popup-top">
          <div className="popup-from">{fromLabel}</div>
          <div className="popup-code">{course.code}</div>
          <div className="popup-title-el">{course.title}</div>
          {hasTime
            ? <div className="popup-time-el">{course.days.join(' · ')} · {fmt(course.start)}–{fmt(course.end)}</div>
            : <div className="unavail-note">Schedule not yet available</div>}
        </div>
        <div className="popup-divider" />
        <div className="popup-body">
          <div>
            <div className="popup-section-label">Requirement tags</div>
            <div className="tag-row">
              {tags.map(t => (
                <span key={t} className={`tag ${TAG_CLASS[t] || 'custom'}`}>
                  {TAG_FULL[t] || t}
                </span>
              ))}
              {tags.length === 0 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>None</span>}
            </div>
          </div>
          {course.prereqs?.length > 0 && (
            <div>
              <div className="popup-section-label">Prerequisites</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{course.prereqs.join(', ')}</div>
            </div>
          )}
          {course.pf && (
            <div>
              <div className="popup-section-label">Pass / fail</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{course.pf}</div>
            </div>
          )}
          {showBackupSelect && (
            <div>
              <div className="popup-section-label">Backup for (optional)</div>
              <select
                style={{ fontSize: 11, width: '100%', padding: '5px 7px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--font)', background: '#fff', color: 'var(--text1)', outline: 'none' }}
                value={backupFor}
                onChange={e => setBackupFor(e.target.value)}
              >
                <option value="">None — primary course</option>
                {existingCourses.filter(c => c.code !== course.code).map(c => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
              {backupFor && (
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                  Will be marked as a backup option for {backupFor}
                </div>
              )}
            </div>
          )}
          {hasConflict && (
            <div className="conflict-warn">
              <div className="conflict-warn-title">Time conflict detected</div>
              Adding {course.code} overlaps with an existing course. Some courses allow simultaneous enrollment — you can still add it.
            </div>
          )}
        </div>
        <div className="popup-footer">
          {alreadyAdded ? (
            <>
              <span className="added-badge-span">✓ Already in {schedName}</span>
              <button className="btn-ghost" onClick={onClose}>Close</button>
            </>
          ) : !hasTime ? (
            <>
              <button className="btn-shelf-cta" onClick={onAddToShelf}>
                {onShelf ? '✓ On shelf' : '+ Add to shelf'}
              </button>
              <button className="btn-ghost" onClick={onClose}>Close</button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button
                className={`btn-primary${hasConflict ? ' warn-btn' : ''}`}
                onClick={() => onAdd(backupFor || null)}
              >
                {hasConflict ? 'Add anyway' : `Add to ${schedName}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
