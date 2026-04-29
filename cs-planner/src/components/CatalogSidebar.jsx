import { useState, useMemo } from 'react';
import { TAG_SHORT, TAG_CLASS, TAG_FULL } from '../constants/tags';
import { filterCatalogBySem } from '../utils/catalogFilter';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_LABELS = { Mon: 'M', Tue: 'T', Wed: 'W', Thu: 'Th', Fri: 'F' };

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
  return sap === eap ? `${startStr}–${endStr}` : `${startStr}${sap}–${endStr}`;
}

const FILTERS = [
  { k: null, l: 'All' },
  { k: 'formal', l: 'Formal' },
  { k: 'systems', l: 'Systems' },
  { k: 'adv', l: 'Adv CS' },
  { k: 'ai', l: 'AI' },
  { k: 'world', l: 'C&W' },
];

export default function CatalogSidebar({
  termLabel,
  semLong,
  isUpcoming,
  catalogData,
  tagsData,
  activeScheduleName,
  addedCodes,
  shelvedCodes,
  takenCodes,
  reqStatus,
  activeReqFilter,
  onReqFilterChange,
  onOpenPopup,
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(null);
  const [filterMissing, setFilterMissing] = useState(false);
  const [hideTaken, setHideTaken] = useState(false);

  const courses = useMemo(
    () => filterCatalogBySem(catalogData, semLong, tagsData),
    [catalogData, tagsData, semLong]
  );

  // Compute tags corresponding to unsatisfied requirements
  const missingTags = useMemo(() => {
    if (!reqStatus) return new Set();
    const missing = new Set();
    Object.entries(reqStatus).forEach(([key, val]) => {
      if (key === '_summary') return;
      if (val && !val.satisfied) missing.add(key);
    });
    return missing;
  }, [reqStatus]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return courses.filter(c => {
      const tags = c.tags || [];

      // Active requirement filter from requirements panel click
      if (activeReqFilter && !tags.includes(activeReqFilter)) return false;

      // Tag pill filter
      const matchTag = !filter || tags.includes(filter);

      // Text search
      const matchSearch = !q || c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);

      // Only show courses that satisfy missing requirements
      if (filterMissing && missingTags.size > 0) {
        if (!tags.some(t => missingTags.has(t))) return false;
      }

      // Hide already-taken courses
      if (hideTaken && takenCodes?.has(c.code)) return false;

      return matchTag && matchSearch;
    });
  }, [courses, search, filter, filterMissing, hideTaken, missingTags, activeReqFilter, takenCodes]);

  const activeReqLabel = activeReqFilter ? (TAG_FULL[activeReqFilter] || activeReqFilter) : null;

  return (
    <>
      <div className="catalog-header">
        <div className="catalog-term">{termLabel}</div>
        <div className="catalog-header-title">{semLong}</div>
        <div className="catalog-header-sub">
          {isUpcoming
            ? <>Adding to <strong>{activeScheduleName}</strong>. CS courses only.</>
            : 'CS-numbered courses only.'}
        </div>
      </div>

      <div className="catalog-sticky-header">
        <input
          className="catalog-search"
          placeholder="Search CS courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="filter-row">
          {FILTERS.map(f => (
            <span
              key={String(f.k)}
              className={`fpill${filter === f.k ? ' active' : ''}`}
              onClick={() => setFilter(f.k)}
            >
              {f.l}
            </span>
          ))}
          <span
            className={`fpill${filterMissing ? ' active' : ''}`}
            onClick={() => setFilterMissing(v => !v)}
            title="Show only courses that satisfy missing requirements"
          >
            Gaps
          </span>
          <span
            className={`fpill${hideTaken ? ' active' : ''}`}
            onClick={() => setHideTaken(v => !v)}
            title="Hide courses already completed"
          >
            Hide taken
          </span>
        </div>

        {activeReqLabel && (
          <div className="filter-active-chip">
            {activeReqLabel}
            <button onClick={() => onReqFilterChange?.(null)}>×</button>
          </div>
        )}
      </div>

      {filtered.map(c => {
        const isAdded = addedCodes?.has(c.code);
        const isShelved = shelvedCodes?.has(c.code);
        const hasTime = !!(c.days && c.start);
        const activeDays = new Set(c.days || []);
        return (
          <div key={c.code + (c.section || '')} className="cat-entry" onClick={() => onOpenPopup(c)}>
            <div className="cat-entry-header">
              <div className="cat-code">{c.code}</div>
              {isAdded
                ? <span className="cat-added-label" style={{ color: 'var(--green)' }}>✓ Added</span>
                : isShelved && isUpcoming
                  ? <span className="cat-added-label" style={{ color: 'var(--teal)' }}>On shelf</span>
                  : hasTime && isUpcoming
                    ? <span style={{ fontSize: 9, color: 'var(--crimson)', fontWeight: 600 }}>+ Add</span>
                    : !hasTime
                      ? null
                      : null}
            </div>
            <div className="cat-title">{c.title}</div>
            {hasTime ? (
              <div className="cat-schedule-row">
                {ALL_DAYS.map(d => (
                  <span key={d} className={`day-pill${activeDays.has(d) ? ' active' : ''}`}>
                    {DAY_LABELS[d]}
                  </span>
                ))}
                <span className="cat-time-sep">·</span>
                <span className="cat-time-val">{fmtRange(c.start, c.end)}</span>
              </div>
            ) : (
              <div className="cat-time unavail">Schedule TBD</div>
            )}
            <div className="tag-row">
              {(c.tags || []).map(t => (
                <span key={t} className={`tag ${TAG_CLASS[t] || 'custom'}`}>
                  {TAG_SHORT[t] || t}
                </span>
              ))}
            </div>
            {c.prereqs?.length > 0 && (
              <div className="cat-meta">Prereqs: {c.prereqs.join(', ')}</div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--text3)', padding: '12px 0', fontStyle: 'italic' }}>
          No courses match.
        </div>
      )}
    </>
  );
}
