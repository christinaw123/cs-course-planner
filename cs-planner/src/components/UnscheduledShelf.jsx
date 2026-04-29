import { TAG_SHORT, TAG_CLASS } from '../constants/tags';

export default function UnscheduledShelf({ courses = [], semLong, onRemove }) {
  return (
    <div className="unscheduled-shelf">
      <div className="shelf-header-row">
        <div>
          <div className="shelf-title">Unscheduled — no confirmed time yet</div>
          <div className="shelf-sub">Will move to calendar when {semLong} times are published</div>
        </div>
      </div>
      <div className="shelf-items-row">
        {courses.length === 0 ? (
          <div className="shelf-empty-text">No unscheduled courses yet.</div>
        ) : (
          courses.map(c => (
            <div key={c.code} className="shelf-chip">
              <div>
                <div className="shelf-chip-code">{c.code}</div>
                <div className="shelf-chip-title">{c.title}</div>
              </div>
              <div className="tag-row">
                {(c.tags || []).map(t => (
                  <span key={t} className={`tag ${TAG_CLASS[t] || 'custom'}`}>
                    {TAG_SHORT[t] || t}
                  </span>
                ))}
              </div>
              <button className="shelf-chip-rm" onClick={() => onRemove(c.code)}>×</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
