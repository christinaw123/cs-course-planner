import { TAG_FULL, TAG_CLASS, TAG_SHORT } from '../constants/tags';
import { fmt } from '../utils/courseUtils';

export default function CoursePopup({ course, fromLabel, onClose, onRemove }) {
  if (!course) return null;
  const tags = course.tags || course.sysTags || [];

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="popup" onClick={e => e.stopPropagation()}>
        <div className="popup-stripe" style={{ background: 'var(--crimson)' }} />
        <div className="popup-top">
          <div className="popup-from">{fromLabel}</div>
          <div className="popup-code">{course.code}</div>
          <div className="popup-title-el">{course.title}</div>
          {course.days && course.start
            ? <div className="popup-time-el">{course.days.join(' · ')} · {fmt(course.start)}–{fmt(course.end)}</div>
            : null}
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
          {course.hasConflict && (
            <div className="conflict-warn">
              <div className="conflict-warn-title">Time conflict detected</div>
              Adding {course.code} overlaps with an existing course. Some courses allow simultaneous enrollment — you can still add it.
            </div>
          )}
          {course.isTransfer && (
            <div style={{ fontSize: 11, color: 'var(--blue)', background: '#e8eaf8', border: '1px solid #b0b8e8', borderRadius: 'var(--r)', padding: '6px 10px' }}>
              Transfer credit
            </div>
          )}
        </div>
        <div className="popup-footer">
          {onRemove && (
            <button className="btn-remove" onClick={onRemove}>
              Remove from schedule
            </button>
          )}
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
