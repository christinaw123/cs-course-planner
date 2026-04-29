import { useState } from 'react';
import { SEM_POOL } from '../constants/semesters';
import TrackSwitchPreview from './TrackSwitchPreview';

const TRACK_OPTS = [
  { id: 'Basic', desc: '9 CS core, 2–5 math' },
  { id: 'Honors', desc: '11 CS core, AI tag required' },
  { id: 'Joint', desc: '8 CS core + thesis' },
  { id: 'MBB', desc: '8 CS core + 3 MBB courses' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTS = Array.from({ length: 9 }, (_, i) => CURRENT_YEAR - 4 + i);

export default function SettingsModal({ profile, onSave, onClose }) {
  const [year, setYear] = useState(profile.year || '');
  const [season, setSeason] = useState(
    profile.currentSemester?.startsWith('s') ? 'Spring' : 'Fall'
  );
  const [semYear, setSemYear] = useState(
    profile.currentSemester
      ? `20${profile.currentSemester.slice(-2)}`
      : String(CURRENT_YEAR)
  );
  const [gradYear, setGradYear] = useState(profile.gradYear ? String(profile.gradYear) : '');
  const [pendingTrack, setPendingTrack] = useState(profile.track || 'Honors');
  const [multiSchedule, setMultiSchedule] = useState(profile.multiScheduleEnabled !== false);
  const [showPreview, setShowPreview] = useState(false);

  function handleSave() {
    const semId = season && semYear
      ? (season === 'Fall' ? 'f' : 's') + String(semYear).slice(-2)
      : profile.currentSemester;

    if (pendingTrack !== profile.track) {
      setShowPreview(true);
      return;
    }

    onSave({
      year,
      currentSemester: semId,
      gradYear: gradYear ? parseInt(gradYear) : null,
      multiScheduleEnabled: multiSchedule,
    });
    onClose();
  }

  function handleConfirmSwitch() {
    const semId = (season === 'Fall' ? 'f' : 's') + String(semYear).slice(-2);
    onSave({
      year,
      currentSemester: semId,
      track: pendingTrack,
      gradYear: gradYear ? parseInt(gradYear) : null,
      multiScheduleEnabled: multiSchedule,
    });
    setShowPreview(false);
    onClose();
  }

  if (showPreview) {
    return (
      <TrackSwitchPreview
        fromTrack={profile.track}
        toTrack={pendingTrack}
        onConfirm={handleConfirmSwitch}
        onClose={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="popup settings-modal" onClick={e => e.stopPropagation()}>
        <div className="popup-stripe" style={{ background: 'var(--crimson)' }} />
        <div className="settings-section">
          <div className="settings-section-title">Your details</div>
          <div className="settings-field">
            <label>Year</label>
            <select value={year} onChange={e => setYear(e.target.value)}>
              <option value="">Select...</option>
              <option>Freshman</option>
              <option>Sophomore</option>
              <option>Junior</option>
              <option>Senior</option>
            </select>
          </div>
          <div className="settings-field">
            <label>Graduation year</label>
            <select value={gradYear} onChange={e => setGradYear(e.target.value)}>
              <option value="">Not set</option>
              {Array.from({ length: 7 }, (_, i) => CURRENT_YEAR + i).map(y => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="settings-field-row">
            <div className="settings-field">
              <label>Semester</label>
              <select value={season} onChange={e => setSeason(e.target.value)}>
                <option>Fall</option>
                <option>Spring</option>
              </select>
            </div>
            <div className="settings-field">
              <label>&nbsp;</label>
              <select value={semYear} onChange={e => setSemYear(e.target.value)}>
                {YEAR_OPTS.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="settings-section">
          <div className="settings-section-title">Concentration track</div>
          <div className="track-grid">
            {TRACK_OPTS.map(t => (
              <div
                key={t.id}
                className={`track-opt${pendingTrack === t.id ? ' selected' : ''}`}
                onClick={() => setPendingTrack(t.id)}
              >
                <div className="track-opt-name">{t.id}</div>
                <div className="track-opt-desc">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="settings-section">
          <div className="settings-section-title">Preferences</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text1)' }}>Multiple schedules</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Compare alternate schedule options (A/B/C)</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={multiSchedule}
                onChange={e => setMultiSchedule(e.target.checked)}
              />
              <span className="toggle-track" />
            </label>
          </div>
        </div>
        <div className="settings-footer">
          <button
            className="btn-ghost"
            style={{ color: 'var(--crimson)', marginRight: 'auto' }}
            onClick={() => {
              if (window.confirm('Reset everything and start over? This cannot be undone.')) {
                localStorage.removeItem('cs_planner_v2_state');
                window.location.reload();
              }
            }}
          >
            Reset app
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save changes</button>
        </div>
      </div>
    </div>
  );
}
