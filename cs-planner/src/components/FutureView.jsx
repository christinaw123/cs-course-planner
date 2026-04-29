import { useState, useMemo } from 'react';
import { TAG_SHORT, TAG_CLASS, TAG_FULL } from '../constants/tags';
import { semLong } from '../constants/semesters';
import RequirementsPanel from './RequirementsPanel';

const FILTERS = [
  { k: null, l: 'All' },
  { k: 'formal', l: 'Formal' },
  { k: 'systems', l: 'Systems' },
  { k: 'adv', l: 'Adv CS' },
  { k: 'ai', l: 'AI' },
  { k: 'world', l: 'C&W' },
];

export default function FutureView({
  semId,
  fourYearData,
  tagsData,
  unscheduled,
  reqStatus,
  reqOverrides,
  track,
  activeReqFilter,
  onReqFilterChange,
  onAdd,
  onRemove,
  onOverride,
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(null);

  const semName = semLong(semId);
  const planned = new Set((unscheduled || []).map(c => c.code));

  const expected = useMemo(() => {
    const fy = fourYearData?.[semId] || [];
    return fy.map(c => ({
      ...c,
      tags: c.tags || tagsData[c.code] || [],
    }));
  }, [fourYearData, tagsData, semId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return expected.filter(c => {
      const tags = c.tags || [];
      if (activeReqFilter && !tags.includes(activeReqFilter)) return false;
      const matchTag = !filter || tags.includes(filter);
      const matchSearch = !q || c.code.toLowerCase().includes(q) || (c.title || '').toLowerCase().includes(q);
      return matchTag && matchSearch;
    });
  }, [expected, search, filter, activeReqFilter]);

  const activeReqLabel = activeReqFilter ? (TAG_FULL[activeReqFilter] || activeReqFilter) : null;

  return (
    <div className="future-area">
      <div className="future-view-inner">
        <div className="future-main">
          <div className="fut-shelf">
            <div className="fut-shelf-title">Planned for {semName}</div>
            <div className="fut-shelf-sub">These move to your calendar when confirmed times are published.</div>
            {(unscheduled || []).length === 0 ? (
              <div className="fut-shelf-empty">Nothing planned yet.</div>
            ) : (
              (unscheduled || []).map(c => (
                <div key={c.code} className="fut-shelf-item">
                  <div>
                    <div className="fut-shelf-code">{c.code}</div>
                    <div className="fut-shelf-title-text">{c.title}</div>
                  </div>
                  <button className="fut-shelf-rm" onClick={() => onRemove(c.code)}>×</button>
                </div>
              ))
            )}
          </div>

          <div className="future-intro-box">
            <div className="future-intro-label">Future semester · {semName}</div>
            <div className="future-intro-text">No confirmed schedule yet. Expected offerings based on historical patterns. Use "+ Plan" to save courses.</div>
          </div>

          <input
            className="future-search"
            placeholder="Search expected courses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div className="filter-row" style={{ marginBottom: 14 }}>
            {FILTERS.map(f => (
              <span
                key={String(f.k)}
                className={`fpill${filter === f.k ? ' active' : ''}`}
                onClick={() => setFilter(f.k)}
              >
                {f.l}
              </span>
            ))}
          </div>

          {activeReqLabel && (
            <div className="filter-active-chip" style={{ marginBottom: 10 }}>
              {activeReqLabel}
              <button onClick={() => onReqFilterChange?.(null)}>×</button>
            </div>
          )}

          <div className="section-label">Expected offerings</div>
          <div className="expected-list">
            {filtered.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text3)', padding: '12px 0', fontStyle: 'italic' }}>No courses match.</div>
            )}
            {filtered.map(c => (
              <div key={c.code} className="expected-row">
                <div className="expected-info">
                  <div className="expected-code">{c.code}</div>
                  <div className="expected-title">{c.title}</div>
                  {c.instructor && <div className="expected-instructor">{c.instructor}</div>}
                  <div className="tag-row" style={{ marginTop: 5 }}>
                    {(c.tags || []).map(t => (
                      <span key={t} className={`tag ${TAG_CLASS[t] || 'custom'}`}>
                        {TAG_SHORT[t] || t}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  className={`plan-btn${planned.has(c.code) ? ' planned' : ''}`}
                  onClick={() => !planned.has(c.code) && onAdd(c)}
                >
                  {planned.has(c.code) ? 'Planned ✓' : '+ Plan'}
                </button>
              </div>
            ))}
          </div>

        </div>

        <div className="future-sidebar">
          <RequirementsPanel
            track={track}
            reqStatus={reqStatus}
            reqOverrides={reqOverrides}
            onOverride={onOverride}
            activeReqFilter={activeReqFilter}
            onReqFilterChange={onReqFilterChange}
          />
        </div>
      </div>
    </div>
  );
}
