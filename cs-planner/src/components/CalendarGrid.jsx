import { useMemo } from 'react';
import { DAYS, frac, fmt, PX, layoutDay } from '../utils/courseUtils';

const MW_DAYS = new Set(['Mon', 'Wed']);
const TTH_DAYS = new Set(['Tue', 'Thu']);

function dayGroupClass(d) {
  if (MW_DAYS.has(d)) return ' mw-day';
  if (TTH_DAYS.has(d)) return ' tth-day';
  return '';
}

// Smart time format: omit am/pm on start if same period as end
function fmtRange(start, end) {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const sap = sh < 12 ? 'am' : 'pm';
  const eap = eh < 12 ? 'am' : 'pm';
  const shh = sh > 12 ? sh - 12 : (sh === 0 ? 12 : sh);
  const ehh = eh > 12 ? eh - 12 : (eh === 0 ? 12 : eh);
  const startStr = sm === 0 ? `${shh}` : `${shh}:${String(sm).padStart(2, '0')}`;
  const endStr = em === 0 ? `${ehh}${eap}` : `${ehh}:${String(em).padStart(2, '0')}${eap}`;
  // If same am/pm period, omit period from start
  if (sap === eap) return `${startStr}–${endStr}`;
  return `${startStr}${sap}–${endStr}`;
}

export default function CalendarGrid({ courses = [], isCurrent = false, onCourseClick }) {
  const rows = [];
  for (let r = 0; r < 22; r++) {
    const half = r % 2 === 1;
    const hour = 8 + Math.floor(r / 2);
    rows.push({ r, half, hour });
  }

  // Pre-compute side-by-side column layout per day
  const dayLayouts = useMemo(() => {
    const layouts = {};
    DAYS.forEach(d => {
      const dayCourses = courses.filter(c => c.days?.includes(d) && c.start);
      layouts[d] = layoutDay(dayCourses);
    });
    return layouts;
  }, [courses]);

  return (
    <div className="cal-area">
      <div className="cal-grid">
        {/* Headers */}
        <div className="col-hdr col-hdr-corner" />
        {DAYS.map(d => (
          <div
            key={d}
            className={`col-hdr${isCurrent && d === 'Wed' ? ' today' : ''}${dayGroupClass(d)}`}
          >
            {d}
          </div>
        ))}

        {/* Time rows */}
        {rows.map(({ r, half, hour }) => (
          <>
            <div key={`t${r}`} className="time-slot">
              {!half ? (hour <= 12 ? `${hour}am` : `${hour - 12}pm`) : ''}
            </div>
            {DAYS.map(d => (
              <div
                key={`${r}${d}`}
                className={`day-cell${half ? ' half' : ''}${dayGroupClass(d)}`}
                style={d === 'Fri' ? { borderRight: 'none' } : undefined}
              >
                {!half && courses
                  .filter(c => c.days?.includes(d) && c.start)
                  .filter(c => Math.floor(frac(c.start)) === hour - 8)
                  .map(c => {
                    const sf = frac(c.start);
                    const ef = frac(c.end);
                    const hPx = (ef - sf) * PX;
                    const top = (sf - Math.floor(sf)) * PX;
                    const col = c.color || { bg: '#cde0f5', text: '#0f2e60', border: '#9ec4ec' };
                    const layout = dayLayouts[d]?.get(c.code) || { colIdx: 0, colCount: 1 };
                    const widthPct = 100 / layout.colCount;
                    const leftPct = layout.colIdx * widthPct;

                    return (
                      <button
                        key={c.code + c.start}
                        className={`cblock${c.hasConflict ? ' conflict-block' : ''}${c.backupFor ? ' backup-block' : ''}`}
                        style={{
                          top,
                          height: hPx,
                          left: `${leftPct}%`,
                          width: `calc(${widthPct}% - 2px)`,
                          right: 'auto',
                          background: col.bg,
                          color: col.text,
                          border: `1px solid ${col.border}`,
                        }}
                        onClick={e => onCourseClick?.(c, e)}
                      >
                        <div className="cb-code">
                          {c.code}
                          {c.hasConflict && <span className="conflict-pip" />}
                        </div>
                        {hPx > 34 && (
                          <div className="cb-time">{fmtRange(c.start, c.end)}</div>
                        )}
                        {hPx > 54 && (
                          <div className="cb-title">{c.title}</div>
                        )}
                        {c.backupFor && hPx > 28 && (
                          <div className="cb-backup-label">↩ {c.backupFor}</div>
                        )}
                      </button>
                    );
                  })}
              </div>
            ))}
          </>
        ))}
      </div>

      {courses.filter(c => c.days?.length && c.start).length === 0 && (
        <div className="empty-overlay">
          <div className="empty-overlay-title">No courses yet</div>
          <div className="empty-overlay-sub">Search the catalog to add courses to this schedule.</div>
        </div>
      )}
    </div>
  );
}
