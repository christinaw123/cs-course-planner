import { TRACKS } from '../data/requirements';
import { useRequirements } from '../hooks/useRequirements';

function computeDiff(fromTrack, toTrack, plan, currentSemId, tagsData, starredSchedule) {
  const fromReqs = useRequirements(plan, fromTrack, {}, currentSemId, tagsData, starredSchedule);
  const toReqs = useRequirements(plan, toTrack, {}, currentSemId, tagsData, starredSchedule);

  if (!fromReqs || !toReqs) return null;

  const fromConfig = TRACKS[fromTrack];
  const toConfig = TRACKS[toTrack];

  const keeps = [];
  const loses = [];
  const gains = [];

  // Requirements that exist in both tracks
  const fromKeys = new Set(Object.keys(fromReqs).filter(k => k !== '_summary'));
  const toKeys = new Set(Object.keys(toReqs).filter(k => k !== '_summary'));

  fromKeys.forEach(key => {
    if (toKeys.has(key)) {
      if (fromReqs[key]?.satisfied) {
        keeps.push({ l: fromConfig.tags[key]?.label || key, note: `${fromTrack}: satisfied ✓` });
      }
    } else {
      loses.push({ l: fromConfig.tags[key]?.label || key, note: `Not required in ${toTrack}` });
    }
  });

  toKeys.forEach(key => {
    if (!fromKeys.has(key)) {
      gains.push({ l: toConfig.tags[key]?.label || key, note: `New in ${toTrack}` });
    }
  });

  const gaps = gains.filter(g => {
    const reqKey = Object.keys(toConfig.tags || {}).find(k => toConfig.tags[k].label === g.l);
    return reqKey && toReqs[reqKey] && !toReqs[reqKey].satisfied;
  }).length;

  return { keeps, loses, gains, gaps, summary: `Switching from ${fromTrack} to ${toTrack}.` };
}

export default function TrackSwitchPreview({ fromTrack, toTrack, onConfirm, onClose }) {
  const fromConfig = TRACKS[fromTrack];
  const toConfig = TRACKS[toTrack];

  // Static diff based on track definitions (no live requirements computation here)
  const keeps = [];
  const loses = [];
  const gains = [];

  // Compare tag sets
  const fromTags = new Set(Object.keys(fromConfig?.tags || {}));
  const toTags = new Set(Object.keys(toConfig?.tags || {}));

  fromTags.forEach(k => {
    const label = fromConfig.tags[k].label;
    if (toTags.has(k)) keeps.push({ l: label, note: 'Both tracks' });
    else loses.push({ l: label, note: `${fromTrack}-only` });
  });
  toTags.forEach(k => {
    if (!fromTags.has(k)) gains.push({ l: toConfig.tags[k].label, note: `New in ${toTrack}` });
  });

  // Core count difference
  if (fromConfig?.coreCount !== toConfig?.coreCount) {
    if (toConfig.coreCount > fromConfig.coreCount) {
      gains.push({ l: `${toConfig.coreCount - fromConfig.coreCount} more CS core courses`, note: `${toConfig.coreCount} needed instead of ${fromConfig.coreCount}` });
    } else {
      loses.push({ l: `${fromConfig.coreCount - toConfig.coreCount} fewer CS core courses`, note: `${toConfig.coreCount} needed instead of ${fromConfig.coreCount}` });
    }
  }

  // Thesis
  if (!fromConfig?.thesis && toConfig?.thesis) {
    gains.push({ l: 'Senior thesis', note: toConfig.thesis === 'required' ? 'Required' : 'Optional' });
  } else if (fromConfig?.thesis && !toConfig?.thesis) {
    loses.push({ l: 'Senior thesis', note: 'Not required in ' + toTrack });
  }

  const gaps = gains.length;

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="popup wide" onClick={e => e.stopPropagation()}>
        <div className="popup-stripe" style={{ background: 'var(--amber)' }} />
        <div className="preview-header">
          <div className="preview-title">Switch concentration track?</div>
          <div className="preview-sub">
            Here's how your current plan maps to {toTrack} requirements before you commit.
          </div>
          <div className="preview-from-to">
            <span className={`track-badge ${fromTrack.toLowerCase()}`}>{fromTrack}</span>
            <span className="arrow">→</span>
            <span className={`track-badge ${toTrack.toLowerCase()}`}>{toTrack}</span>
          </div>
        </div>
        <div className="preview-body">
          {keeps.length > 0 && (
            <>
              <div className="preview-section-label">Still satisfied ✓</div>
              {keeps.map((r, i) => (
                <div key={i} className="preview-row">
                  <div className="preview-check ok">✓</div>
                  <div className="preview-name">{r.l}</div>
                  <div className="preview-note">{r.note}</div>
                </div>
              ))}
            </>
          )}
          {loses.length > 0 && (
            <>
              <div className="preview-section-label">No longer required</div>
              {loses.map((r, i) => (
                <div key={i} className="preview-row">
                  <div className="preview-check gap">–</div>
                  <div className="preview-name">{r.l}</div>
                  <div className="preview-note">{r.note}</div>
                </div>
              ))}
            </>
          )}
          {gains.length > 0 && (
            <>
              <div className="preview-section-label">New requirements</div>
              {gains.map((r, i) => (
                <div key={i} className="preview-row">
                  <div className="preview-check new">+</div>
                  <div className="preview-name">{r.l}</div>
                  <div className="preview-note">{r.note}</div>
                </div>
              ))}
            </>
          )}
          <div className="preview-summary">
            {gaps > 0
              ? <><b>{gaps} new gap{gaps !== 1 ? 's' : ''}</b> in your plan after switching. </>
              : <span style={{ color: 'var(--green)' }}>No new gaps</span>}
            {' '}Switching from {fromTrack} to {toTrack}.
          </div>
        </div>
        <div className="preview-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className={`btn-primary${gaps > 0 ? ' warn-btn' : ''}`}
            onClick={onConfirm}
          >
            {gaps > 0 ? 'Switch anyway' : `Switch to ${toTrack}`}
          </button>
        </div>
      </div>
    </div>
  );
}
