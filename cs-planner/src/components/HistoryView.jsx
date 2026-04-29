import { useState } from 'react';
import { TAG_SHORT, TAG_CLASS, TAG_FULL, TAG_AUTO, COURSE_TITLE } from '../constants/tags';
import { BLOCK_COLORS, nextColor } from '../constants/colors';
import { normCode } from '../utils/courseUtils';
import { SEM_POOL, getSemIdx, semLong, getPastSemsForYear } from '../constants/semesters';
import AddHistoryCourseModal from './AddHistoryCourseModal';

export default function HistoryView({ plan, currentSemId, userYear, onUpdateSem }) {
  const [addModal, setAddModal] = useState(null);

  const curIdx = getSemIdx(currentSemId);

  // Only show semesters within expected attendance window + any with courses
  const expectedSemIds = new Set(
    userYear ? getPastSemsForYear(userYear, currentSemId) : []
  );
  const relevantSems = SEM_POOL.slice(0, curIdx)
    .filter(s => expectedSemIds.has(s.id) || (plan[s.id] || []).length > 0)
    .reverse();

  const totalCS = relevantSems.reduce((acc, s) =>
    acc + (plan[s.id] || []).filter(c => !c.isCustom).length, 0
  );

  function handleAdd(semId, { code, title, type }) {
    const normalized = normCode(code);
    const tags = type === 'custom' ? [] : (TAG_AUTO[normalized] || []);
    const resolvedTitle = COURSE_TITLE[normalized] || title;
    const existing = plan[semId] || [];
    const usedColors = existing.map(c => c.colorIdx ?? 0);
    const colorIdx = nextColor(usedColors);
    const course = {
      code: normalized,
      title: resolvedTitle,
      tags,
      colorIdx,
      color: BLOCK_COLORS[colorIdx],
      isCustom: type === 'custom',
      isTransfer: type === 'transfer',
      days: null,
      start: null,
      end: null,
    };
    onUpdateSem(semId, [...existing, course]);
  }

  function handleRemove(semId, code) {
    const existing = plan[semId] || [];
    onUpdateSem(semId, existing.filter(c => c.code !== code));
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="history-intro-bar">
        {relevantSems.length} semester{relevantSems.length !== 1 ? 's' : ''} &nbsp;·&nbsp; {totalCS} CS course{totalCS !== 1 ? 's' : ''} recorded
      </div>

      <div className="history-kanban">
        {relevantSems.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', padding: 8 }}>
            No history yet. Add courses using the button in each semester card.
          </div>
        )}

        {relevantSems.map(sem => {
          const courses = plan[sem.id] || [];
          const csCourses = courses.filter(c => !c.isCustom);
          const customCourses = courses.filter(c => c.isCustom);
          const allTags = [...new Set(courses.flatMap(c => c.tags || []))];

          return (
            <div key={sem.id} className="sem-block">
              <div className="sem-block-header">
                <div className="sem-block-title">{sem.long}</div>
                <div className="sem-block-meta">
                  {csCourses.length} CS{customCourses.length > 0 ? ` · ${customCourses.length} custom` : ''}
                </div>
              </div>
              <div className="courses-list">
                {courses.map(c => (
                  <div key={c.code} className="course-row">
                    <div
                      className="color-bar"
                      style={{
                        background: (c.color || BLOCK_COLORS[0]).bg,
                        border: `1px solid ${(c.color || BLOCK_COLORS[0]).border}`,
                      }}
                    />
                    <div className="course-row-info">
                      <div className="course-row-code">
                        {c.code}
                        {c.isTransfer && <span className="transfer-badge">transfer</span>}
                      </div>
                      <div className="course-row-title">{c.title}</div>
                      {(c.tags || []).length > 0 && (
                        <div className="tag-row" style={{ marginTop: 4 }}>
                          {c.tags.map(t => (
                            <span key={t} className={`tag ${TAG_CLASS[t] || 'custom'}`}>
                              {TAG_SHORT[t] || t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button className="rm-btn" onClick={() => handleRemove(sem.id, c.code)}>×</button>
                  </div>
                ))}
                <button className="add-hist-btn" onClick={() => setAddModal(sem.id)}>
                  + Add course
                </button>
              </div>
              {allTags.length > 0 && (
                <div className="req-chips-row">
                  {allTags.map(t => (
                    <span key={t} className="req-chip">✓ {TAG_FULL[t] || t}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {addModal && (
        <AddHistoryCourseModal
          semLong={semLong(addModal)}
          onAdd={(data) => handleAdd(addModal, data)}
          onClose={() => setAddModal(null)}
        />
      )}
    </div>
  );
}
