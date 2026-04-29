export default function TopBar({ track, onSettings }) {
  return (
    <div className="topbar">
      <span className="logo">CS Planner</span>
      <span className="track-pill" onClick={onSettings}>
        {track?.toLowerCase()}
      </span>
      <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={onSettings} title="Settings">⚙</button>
    </div>
  );
}
