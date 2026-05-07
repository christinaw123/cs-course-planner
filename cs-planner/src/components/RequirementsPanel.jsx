import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { TRACKS } from '../data/requirements';

const TRACK_OPTS = ['Basic', 'Honors', 'Joint', 'MBB'];

function IconDone({ color = '#1D9E75' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <polyline points="2,7 5.5,10.5 12,3" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPending() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="7" fill="#EF9F27" />
      <circle cx="7" cy="7" r="5" stroke="white" strokeWidth="1" />
      <line x1="7" y1="7" x2="4.4" y2="5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="7" x2="10.5" y2="5" stroke="white" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function IconTodo() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="6" stroke="#C8C8C8" strokeWidth="1.5" />
    </svg>
  );
}

function ReqRow({ reqKey, label, count, ctx, rowRef }) {
  if (!ctx) return null;
  const {
    reqStatus, reqOverrides, expanded, openMenu, isUpcoming, activeReqFilter,
    onToggle, onToggleMenu, onOverride, onReqClick, onCloseMenu,
  } = ctx;
  const result = reqStatus[reqKey];
  const override = reqOverrides[reqKey];
  if (!result) return null;

  const isDone = result.satisfied && !override;
  const isOverride = override?.type === 'satisfied';
  const isWaived = override?.type === 'waived';
  const isPending = !result.satisfied && !override && !!result.pending;
  const isActive = activeReqFilter === reqKey;

  let icon;
  if (isDone || isOverride) icon = <IconDone />;
  else if (isWaived) icon = <IconDone color="#9CA3AF" />;
  else if (isPending) icon = <IconPending />;
  else icon = <IconTodo />;

  return (
    <div
      ref={rowRef}
      className={`req-row-wrap${isActive ? ' req-row-active' : ''}${isPending ? ' req-row-pending' : ''}`}
      onClick={onCloseMenu}
    >
      <div className="req-row">
        {icon}
        <div
          className="req-name"
          onClick={() => onReqClick(reqKey)}
          title="Click to filter catalog"
          style={isPending ? { color: '#633806' } : undefined}
        >
          {label}
        </div>
        {isPending
          ? <span className="req-status-label req-status-planned">planned</span>
          : (isDone || isOverride || isWaived)
            ? <span className="req-status-label req-status-done">done</span>
            : count
              ? <div className="req-count">{count}</div>
              : null}
        <button className="req-expand-btn" onClick={() => onToggle(reqKey)}>
          {expanded[reqKey] ? '▲' : '▼'}
        </button>
        {!isUpcoming && (
          <button className="req-menu-btn" onClick={e => onToggleMenu(reqKey, e)}>···</button>
        )}
      </div>

      {openMenu === reqKey && (
        <div className="req-action-menu" onClick={e => e.stopPropagation()}>
          {!override ? (
            <>
              <button className="req-action-item" onClick={() => { onOverride(reqKey, 'satisfied'); onCloseMenu(); }}>Mark as satisfied</button>
              <button className="req-action-item" onClick={() => { onOverride(reqKey, 'waived'); onCloseMenu(); }}>Mark as waived</button>
            </>
          ) : (
            <button className="req-action-item danger" onClick={() => { onOverride(reqKey, null); onCloseMenu(); }}>Remove override</button>
          )}
        </div>
      )}

      {expanded[reqKey] && (
        <div className="req-detail">
          {override
            ? <><strong>{override.type === 'waived' ? 'Waived' : 'Manually satisfied'}</strong> — {override.note}</>
            : result.satisfied
              ? `Satisfied by: ${result.by.join(', ') || '—'}`
              : result.by?.length > 0
                ? `Partially: ${result.by.join(', ')} (${result.remaining} more needed)`
                : 'Not yet satisfied'}
        </div>
      )}
    </div>
  );
}

const RequirementsPanel = forwardRef(function RequirementsPanel({
  track,
  reqStatus,
  reqOverrides,
  onOverride,
  onTrackChange,
  isUpcoming = false,
  schedName = '',
  activeReqFilter = null,
  onReqFilterChange,
}, ref) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('reqPanelCollapsed') === 'true'
  );
  const [expanded, setExpanded] = useState({});
  const [openMenu, setOpenMenu] = useState(null);
  const flashTimer = useRef(null);
  const rowRefs = useRef({});
  const prevPendingRef = useRef(new Set());

  useEffect(() => {
    if (!reqStatus) return;
    const nowPending = new Set(
      Object.entries(reqStatus)
        .filter(([k, v]) => k !== '_summary' && v?.pending)
        .map(([k]) => k)
    );
    const newlyPending = [...nowPending].filter(k => !prevPendingRef.current.has(k));
    if (newlyPending.length > 0) {
      rowRefs.current[newlyPending[0]]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    prevPendingRef.current = nowPending;
  }, [reqStatus]);

  useImperativeHandle(ref, () => ({
    flashExpand() {
      if (!collapsed) return;
      setCollapsed(false);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => {
        setCollapsed(true);
        localStorage.setItem('reqPanelCollapsed', 'true');
      }, 1500);
    },
  }));

  function handleToggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('reqPanelCollapsed', String(next));
    clearTimeout(flashTimer.current);
  }

  const trackConfig = TRACKS[track];
  const summary = reqStatus?._summary || { satisfied: 0, total: 0, remaining: 0, pending: 0 };

  const rowCtx = trackConfig && reqStatus ? {
    reqStatus,
    reqOverrides,
    expanded,
    openMenu,
    isUpcoming,
    activeReqFilter,
    onToggle: key => { setExpanded(p => ({ ...p, [key]: !p[key] })); setOpenMenu(null); },
    onToggleMenu: (key, e) => { e.stopPropagation(); setOpenMenu(p => p === key ? null : key); },
    onOverride,
    onReqClick: reqKey => { if (onReqFilterChange) onReqFilterChange(activeReqFilter === reqKey ? null : reqKey); },
    onCloseMenu: () => setOpenMenu(null),
  } : null;

  const tags = trackConfig?.tags || {};
  const progTags = Object.entries(tags).filter(([k]) => k === 'prog1' || k === 'prog2');
  const formalTags = Object.entries(tags).filter(([k]) =>
    ['discmath', 'complim', 'alg', 'intalg', 'formal3'].includes(k)
  );
  const otherTags = Object.entries(tags).filter(([k]) => ['systems', 'world', 'ai'].includes(k));
  const advTags = Object.entries(tags).filter(([k]) => k === 'adv');

  return (
    <div
      className={`req-panel-outer${collapsed ? ' req-panel-collapsed' : ''}`}
      style={{ width: collapsed ? 32 : 256, transition: 'width 0.2s ease' }}
    >
      {collapsed ? (
        <div className="req-rail">
          <button className="req-rail-chevron" onClick={handleToggleCollapse} title="Expand">›</button>
          <div className="req-rail-text">Requirements</div>
          {summary.remaining > 0 && (
            <div className="req-rail-badge">{summary.remaining}<br/>left</div>
          )}
        </div>
      ) : (
        <div className="sidebar-body-wrap">
          {!trackConfig || !reqStatus ? (
            <div style={{ fontSize: 11, color: 'var(--text3)', padding: 12 }}>Loading...</div>
          ) : (
            <>
              <div className="req-panel-title">
                <span>
                  Requirements
                  {isUpcoming && schedName && (
                    <span className="req-panel-sched-label"> for {schedName}</span>
                  )}
                </span>
                <button className="req-collapse-btn" onClick={handleToggleCollapse} title="Collapse">‹</button>
              </div>

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
                  : `${summary.remaining} remaining`}
                <span style={{ fontSize: 9, opacity: 0.75, marginLeft: 6 }}>
                  {summary.satisfied}/{summary.total}
                </span>
              </div>

              {activeReqFilter && (
                <div className="filter-active-chip" style={{ margin: '0 0 10px' }}>
                  Filtering by requirement
                  <button onClick={() => onReqFilterChange?.(null)}>×</button>
                </div>
              )}

              <div className="req-section">
                <div className="req-section-title">Math prep</div>
                <ReqRow ctx={rowCtx} reqKey="calc" label="Pre-calculus / calculus" count="0–3" rowRef={el => { rowRefs.current['calc'] = el; }} />
                <ReqRow ctx={rowCtx} reqKey="linalg" label="Linear Algebra" count="1" rowRef={el => { rowRefs.current['linalg'] = el; }} />
                <ReqRow ctx={rowCtx} reqKey="prob" label="Probability" count="1" rowRef={el => { rowRefs.current['prob'] = el; }} />
              </div>

              {progTags.length > 0 && (
                <div className="req-section">
                  <div className="req-section-title">Core — Programming</div>
                  {progTags.map(([k, r]) => (
                    <ReqRow key={k} reqKey={k} label={r.label} count={String(r.count)} ctx={rowCtx} rowRef={el => { rowRefs.current[k] = el; }} />
                  ))}
                </div>
              )}

              {formalTags.length > 0 && (
                <div className="req-section">
                  <div className="req-section-title">Core — Formal Reasoning</div>
                  {formalTags.map(([k, r]) => (
                    <ReqRow key={k} reqKey={k} label={r.label} count={String(r.count)} ctx={rowCtx} rowRef={el => { rowRefs.current[k] = el; }} />
                  ))}
                </div>
              )}

              {otherTags.length > 0 && (
                <div className="req-section">
                  <div className="req-section-title">Core — Other</div>
                  {otherTags.map(([k, r]) => (
                    <ReqRow key={k} reqKey={k} label={r.label} count={String(r.count)} ctx={rowCtx} rowRef={el => { rowRefs.current[k] = el; }} />
                  ))}
                </div>
              )}

              {advTags.length > 0 && (
                <div className="req-section">
                  <div className="req-section-title">Advanced CS</div>
                  {advTags.map(([k, r]) => (
                    <ReqRow key={k} reqKey={k} label={r.label} count={`${r.count} needed`} ctx={rowCtx} rowRef={el => { rowRefs.current[k] = el; }} />
                  ))}
                </div>
              )}

              <div className="req-section">
                <div className="req-section-title">Core count</div>
                <ReqRow ctx={rowCtx} reqKey="corecount" label="Total CS core" count={`${trackConfig.coreCount} needed`} rowRef={el => { rowRefs.current['corecount'] = el; }} />
                <ReqRow ctx={rowCtx} reqKey="harvardcs" label="Harvard CS-numbered" count={`${trackConfig.harvardCSMin} needed`} rowRef={el => { rowRefs.current['harvardcs'] = el; }} />
              </div>

              {trackConfig.thesis && (
                <div className="req-section">
                  <div className="req-section-title">Senior thesis</div>
                  <ReqRow
                    ctx={rowCtx}
                    reqKey="thesis"
                    label={`Senior thesis${trackConfig.thesis === 'optional' ? ' (optional)' : ''}`}
                    count={trackConfig.thesis === 'required' ? 'required' : 'optional'}
                    rowRef={el => { rowRefs.current['thesis'] = el; }}
                  />
                </div>
              )}

              {trackConfig.mbb && (
                <div className="req-section">
                  <div className="req-section-title">MBB</div>
                  <ReqRow ctx={rowCtx} reqKey="neuro80" label="NEURO 80 or equivalent" count="1" rowRef={el => { rowRefs.current['neuro80'] = el; }} />
                  <ReqRow ctx={rowCtx} reqKey="relatedField" label="Related field course" count="1" rowRef={el => { rowRefs.current['relatedField'] = el; }} />
                  <ReqRow ctx={rowCtx} reqKey="juniorTutorial" label="Junior tutorial" count="1" rowRef={el => { rowRefs.current['juniorTutorial'] = el; }} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default RequirementsPanel;
