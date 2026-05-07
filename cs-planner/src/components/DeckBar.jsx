export default function DeckBar({ schedules, activeSchedId, onSetActive, onDelete, onAdd }) {
  return (
    <div className="deck-bar">
      {schedules.map(s => (
        <div
          key={s.id}
          className={`deck-card${activeSchedId === s.id ? ' active' : ''}`}
          onClick={() => onSetActive(s.id)}
        >
          <div className="deck-name-wrap">
            <div className="deck-name">{s.name}</div>
          </div>
          <div className="deck-btns" onClick={e => e.stopPropagation()}>
            <button
              className="deck-btn del"
              onClick={() => onDelete(s.id)}
              disabled={schedules.length <= 1}
              title="Delete schedule"
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <button className="add-deck-btn" onClick={onAdd}>+ New</button>
    </div>
  );
}
