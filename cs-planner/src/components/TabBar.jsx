import { SEM_POOL, getSemIdx, semLong } from '../constants/semesters';

export default function TabBar({ activeTab, onTabChange, currentSemId, gradYear }) {
  const curIdx = getSemIdx(currentSemId);
  const upcomingSem = SEM_POOL[curIdx + 1];
  const currentSem = SEM_POOL[curIdx];

  // Compute last allowed semester from grad year (assume spring graduation)
  const gradSemId = gradYear ? `s${String(gradYear).slice(-2)}` : null;
  const gradSemIdx = gradSemId ? getSemIdx(gradSemId) : Infinity;

  const showUpcoming = !upcomingSem || getSemIdx(upcomingSem.id) <= gradSemIdx;

  let futureSems = SEM_POOL.slice(curIdx + 2);
  if (gradSemIdx !== Infinity) {
    futureSems = futureSems.filter(s => getSemIdx(s.id) <= gradSemIdx);
  }

  return (
    <div className="tab-bar">
      <button
        className={`sem-tab${activeTab === 'history' ? ' active' : ''}`}
        onClick={() => onTabChange('history')}
      >
        History
      </button>
      <div className="tab-divider" />
      {currentSem && (
        <button
          className={`sem-tab${activeTab === 'current' ? ' active' : ''}`}
          onClick={() => onTabChange('current')}
        >
          {currentSem.label}
          <span className="tab-badge current">current</span>
        </button>
      )}
      {upcomingSem && showUpcoming && (
        <button
          className={`sem-tab${activeTab === 'upcoming' ? ' active' : ''}`}
          onClick={() => onTabChange('upcoming')}
        >
          {upcomingSem.label}
          <span className="tab-badge upcoming">upcoming</span>
        </button>
      )}
      {futureSems.length > 0 && <div className="tab-divider" />}
      {futureSems.map(s => (
        <button
          key={s.id}
          className={`sem-tab${activeTab === s.id ? ' active' : ''}`}
          onClick={() => onTabChange(s.id)}
        >
          {s.long}
          <span className="tab-badge future">future</span>
        </button>
      ))}
    </div>
  );
}
