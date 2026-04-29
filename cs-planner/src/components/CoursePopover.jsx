import { useEffect, useRef } from 'react';
import { TAG_FULL, TAG_CLASS } from '../constants/tags';
import { fmt } from '../utils/courseUtils';

const POPOVER_WIDTH = 260;

export default function CoursePopover({ course, fromLabel, anchorRect, onClose, onRemove }) {
  if (!course || !anchorRect) return null;

  const tags = course.tags || course.sysTags || [];

  // Position: prefer right of block, fall back to left if too close to edge
  let left = anchorRect.right + 10;
  if (left + POPOVER_WIDTH > window.innerWidth - 8) {
    left = anchorRect.left - POPOVER_WIDTH - 10;
  }
  let top = anchorRect.top;
  // Clamp so it doesn't go below viewport
  const maxTop = window.innerHeight - 320;
  if (top > maxTop) top = maxTop;
  if (top < 8) top = 8;

  return (
    <>
      {/* Invisible click-catcher — no dark background */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 39 }}
        onClick={onClose}
      />
      <div
        className="course-popover"
        style={{ left, top }}
        onClick={e => e.stopPropagation()}
      >
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
          {course.hasConflict && (
            <div className="conflict-warn">
              <div className="conflict-warn-title">Time conflict detected</div>
              {course.code} overlaps with another course.
            </div>
          )}
        </div>
        <div className="popup-footer">
          {onRemove && (
            <button className="btn-remove" onClick={onRemove}>Remove</button>
          )}
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </>
  );
}
