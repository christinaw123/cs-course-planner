export default function DeckBar({ schedules, activeSchedId, onSetActive, onStar, onDelete, onAdd }) {
  return (
    <div className="deck-bar">
      {schedules.map(s => (
        <div
          key={s.id}
          className={`deck-card${activeSchedId === s.id ? ' active' : ''}${s.starred ? ' starred' : ''}`}
          onClick={() => onSetActive(s.id)}
        >
          <div className="deck-name-wrap">
            {s.starred && <span className="deck-star-icon">★</span>}
            <div className="deck-name">{s.name}</div>
          </div>
          <div className="deck-btns" onClick={e => e.stopPropagation()}>
            <button
              className="deck-btn star"
              onClick={() => onStar(s.id)}
              title={s.starred ? 'Primary schedule' : 'Set as primary'}
            >
              {s.starred ? '★' : '☆'}
            </button>
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
      <span className="primary-hint"><b>★</b> counts toward requirements</span>
    </div>
  );
}
