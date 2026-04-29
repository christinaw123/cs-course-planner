import { useState } from 'react';
import { TRACKS } from '../data/requirements';

const TRACK_OPTS = ['Basic', 'Honors', 'Joint', 'MBB'];

export default function RequirementsPanel({
  track,
  reqStatus,
  reqOverrides,
  onOverride,
  onTrackChange,
  isUpcoming = false,
  schedName = '',
  schedStarred = true,
  activeReqFilter = null,
  onReqFilterChange,
}) {
  const [expanded, setExpanded] = useState({});
  const [openMenu, setOpenMenu] = useState(null);

  const trackConfig = TRACKS[track];
  if (!trackConfig || !reqStatus) {
    return <div style={{ fontSize: 11, color: 'var(--text3)', padding: 12 }}>Loading...</div>;
  }

  const summary = reqStatus._summary || { satisfied: 0, total: 0, remaining: 0 };

  function toggle(key) {
    setExpanded(p => ({ ...p, [key]: !p[key] }));
    setOpenMenu(null);
  }

  function toggleMenu(key, e) {
    e.stopPropagation();
    setOpenMenu(p => p === key ? null : key);
  }

  function handleReqClick(reqKey) {
    if (onReqFilterChange) {
      onReqFilterChange(activeReqFilter === reqKey ? null : reqKey);
    }
  }

  function ReqRow({ reqKey, label, count }) {
    const result = reqStatus[reqKey];
    const override = reqOverrides[reqKey];
    if (!result) return null;

    const isDone = result.satisfied && !override;
    const isOverride = override?.type === 'satisfied';
    const isWaived = override?.type === 'waived';
    const isPartial = !result.satisfied && !override && result.by && result.by.length > 0;
    const isActive = activeReqFilter === reqKey;

    const indicatorClass = isOverride ? 'override' : isWaived ? 'waived' : isDone ? 'done' : isPartial ? 'partial' : 'todo';
    const indicatorText = isOverride ? '✓' : isWaived ? '–' : isDone ? '✓' : isPartial ? '···' : '';

    return (
      <div
        className={`req-row-wrap${isActive ? ' req-row-active' : ''}`}
        onClick={() => setOpenMenu(null)}
      >
        <div className="req-row">
          <div className={`req-check ${indicatorClass}`}>{indicatorText}</div>
          <div
            className="req-name"
            onClick={() => handleReqClick(reqKey)}
            title="Click to filter catalog"
          >
            {label}
          </div>
          {count && <div className="req-count">{count}</div>}
          <button className="req-expand-btn" onClick={() => toggle(reqKey)}>
            {expanded[reqKey] ? '▲' : '▼'}
          </button>
          {!isUpcoming && (
            <button className="req-menu-btn" onClick={e => toggleMenu(reqKey, e)}>···</button>
          )}
        </div>

        {openMenu === reqKey && (
          <div className="req-action-menu" onClick={e => e.stopPropagation()}>
            {!override ? (
              <>
                <button className="req-action-item" onClick={() => { onOverride(reqKey, 'satisfied'); setOpenMenu(null); }}>Mark as satisfied</button>
                <button className="req-action-item" onClick={() => { onOverride(reqKey, 'waived'); setOpenMenu(null); }}>Mark as waived</button>
              </>
            ) : (
              <button className="req-action-item danger" onClick={() => { onOverride(reqKey, null); setOpenMenu(null); }}>Remove override</button>
            )}
          </div>
        )}

        {expanded[reqKey] && (
          <div className="req-detail">
            {override
              ? <><strong>{override.type === 'waived' ? 'Waived' : 'Manually satisfied'}</strong> — {override.note}</>
              : result.satisfied
                ? `Satisfied by: ${result.by.join(', ') || '—'}`
                : result.by.length > 0
                  ? `Partially: ${result.by.join(', ')} (${result.remaining} more needed)`
                  : 'Not yet satisfied'}
          </div>
        )}
      </div>
    );
  }

  const tags = trackConfig.tags;
  const progTags = Object.entries(tags).filter(([k]) => k === 'prog1' || k === 'prog2');
  const formalTags = Object.entries(tags).filter(([k]) =>
    ['discmath', 'complim', 'alg', 'intalg', 'formal3'].includes(k)
  );
  const otherTags = Object.entries(tags).filter(([k]) =>
    ['systems', 'world', 'ai'].includes(k)
  );
  const advTags = Object.entries(tags).filter(([k]) => k === 'adv');

  return (
    <div>
      <div className="req-panel-title">Requirements</div>

      {onTrackChange && (
        <div className="req-track-row">
          <span className="req-track-label">Track</span>
          <select
            className="req-track-select"
            value={track}
            onChange={e => onTrackChange(e.target.value)}
          >
            {TRACK_OPTS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      )}

      <div className="req-summary-chip" style={{
        color: summary.remaining === 0 ? 'var(--green)' : 'var(--amber)',
        borderColor: summary.remaining === 0 ? '#9dd4bc' : '#f0c080',
        background: summary.remaining === 0 ? '#ceeadc' : '#fce4c0',
      }}>
        {summary.remaining === 0
          ? '✓ All requirements satisfied'
          : `${summary.remaining} requirement${summary.remaining !== 1 ? 's' : ''} remaining`}
        <span style={{ fontSize: 9, opacity: 0.75, marginLeft: 6 }}>
          {summary.satisfied}/{summary.total}
        </span>
      </div>

      {activeReqFilter && (
        <div className="filter-active-chip" style={{ margin: '0 0 10px' }}>
          Filtering catalog by requirement
          <button onClick={() => onReqFilterChange?.(null)}>×</button>
        </div>
      )}

      {isUpcoming && !schedStarred && (
        <div className="upcoming-preview-warn">
          Preview for <strong>{schedName}</strong>. Star it to count toward overall requirements.
        </div>
      )}

      {/* Math */}
      <div className="req-section">
        <div className="req-section-title">Mathematical preparation</div>
        <ReqRow reqKey="calc" label="Pre-calculus / calculus" count="0–3" />
        <ReqRow reqKey="linalg" label="Linear Algebra" count="1" />
        <ReqRow reqKey="prob" label="Probability" count="1" />
      </div>

      {progTags.length > 0 && (
        <div className="req-section">
          <div className="req-section-title">CS core — Programming</div>
          {progTags.map(([k, r]) => (
            <ReqRow key={k} reqKey={k} label={r.label} count={String(r.count)} />
          ))}
        </div>
      )}

      {formalTags.length > 0 && (
        <div className="req-section">
          <div className="req-section-title">CS core — Formal Reasoning</div>
          {formalTags.map(([k, r]) => (
            <ReqRow key={k} reqKey={k} label={r.label} count={String(r.count)} />
          ))}
        </div>
      )}

      {otherTags.length > 0 && (
        <div className="req-section">
          <div className="req-section-title">CS core — Other tags</div>
          {otherTags.map(([k, r]) => (
            <ReqRow key={k} reqKey={k} label={r.label} count={String(r.count)} />
          ))}
        </div>
      )}

      {advTags.length > 0 && (
        <div className="req-section">
          <div className="req-section-title">CS core — Advanced CS</div>
          {advTags.map(([k, r]) => (
            <ReqRow key={k} reqKey={k} label={r.label} count={`${r.count} needed`} />
          ))}
        </div>
      )}

      <div className="req-section">
        <div className="req-section-title">CS core count</div>
        <ReqRow reqKey="corecount" label="Total CS core" count={`${trackConfig.coreCount} needed`} />
        <ReqRow reqKey="harvardcs" label="Harvard CS-numbered" count={`${trackConfig.harvardCSMin} needed`} />
      </div>

      {trackConfig.thesis && (
        <div className="req-section">
          <div className="req-section-title">Senior thesis</div>
          <ReqRow
            reqKey="thesis"
            label={`Senior thesis${trackConfig.thesis === 'optional' ? ' (optional)' : ''}`}
            count={trackConfig.thesis === 'required' ? 'required' : 'optional'}
          />
        </div>
      )}

      {trackConfig.mbb && (
        <div className="req-section">
          <div className="req-section-title">MBB requirements</div>
          <ReqRow reqKey="neuro80" label="NEURO 80 or equivalent" count="1" />
          <ReqRow reqKey="relatedField" label="Related field course" count="1" />
          <ReqRow reqKey="juniorTutorial" label="Junior tutorial" count="1" />
        </div>
      )}

      {isUpcoming && (
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6, fontFamily: 'var(--mono)' }}>
          ~ = would satisfy if enrolled
        </div>
      )}
    </div>
  );
}
