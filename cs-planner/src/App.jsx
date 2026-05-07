import { useState, useRef } from 'react';
import { usePlan } from './hooks/usePlan';
import { useRequirements } from './hooks/useRequirements';
import { getUpcomingSemId, getFutureSemIds, semLong, semLabel } from './constants/semesters';
import { BLOCK_COLORS, nextColor } from './constants/colors';
import { checkConflict, normCode } from './utils/courseUtils';

import Onboarding from './components/Onboarding';
import TopBar from './components/TopBar';
import TabBar from './components/TabBar';
import CalendarGrid from './components/CalendarGrid';
import DeckBar from './components/DeckBar';
import CatalogSidebar from './components/CatalogSidebar';
import RequirementsPanel from './components/RequirementsPanel';
import HistoryView from './components/HistoryView';
import FutureView from './components/FutureView';
import CoursePopup from './components/CoursePopup';
import CatalogPopup from './components/CatalogPopup';
import SettingsModal from './components/SettingsModal';

import catalogData from './data/catalog.json';
import fourYearData from './data/four_year_plan.json';
import rawTagsData from './data/tags.json';

const tagsData = Object.fromEntries(
  Object.entries(rawTagsData).map(([k, v]) => [normCode(k), v])
);

function LegendBar() {
  return (
    <div className="req-legend-bar">
      <div className="req-legend-bar-item">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <polyline points="2,7 5.5,10.5 12,3" stroke="#1D9E75" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Done</span>
      </div>
      <div className="req-legend-bar-item">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="7" fill="#EF9F27" />
          <circle cx="7" cy="7" r="5" stroke="white" strokeWidth="1" />
          <line x1="7" y1="7" x2="4.4" y2="5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="7" y1="7" x2="10.5" y2="5" stroke="white" strokeWidth="1" strokeLinecap="round" />
        </svg>
        <span>Planned (pending enrollment)</span>
      </div>
      <div className="req-legend-bar-item">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="#C8C8C8" strokeWidth="1.5" />
        </svg>
        <span>Not yet fulfilled</span>
      </div>
    </div>
  );
}

export default function App() {
  const {
    profile, plan, schedules, upcomingShelf, unscheduled, reqOverrides,
    setProfile,
    addPlanCourse, removePlanCourse, setPlanSemester,
    addSchedule, deleteSchedule,
    addCourseToSchedule, removeCourseFromSchedule,
    addToUpcomingShelf, removeFromUpcomingShelf,
    addUnscheduled, removeUnscheduled,
    setBackupAnnotation,
    setReqOverride,
  } = usePlan();

  if (!profile.onboardingDone || !profile.currentSemester || !profile.track) {
    return (
      <Onboarding
        onComplete={({ plan: pastPlan, ...profileUpdate }) => {
          setProfile(profileUpdate);
          if (pastPlan) {
            Object.entries(pastPlan).forEach(([semId, courses]) => {
              setPlanSemester(semId, courses);
            });
          }
        }}
      />
    );
  }

  return (
    <AppInner
      profile={profile}
      plan={plan}
      schedules={schedules}
      upcomingShelf={upcomingShelf}
      unscheduled={unscheduled}
      reqOverrides={reqOverrides}
      setProfile={setProfile}
      addPlanCourse={addPlanCourse}
      removePlanCourse={removePlanCourse}
      setPlanSemester={setPlanSemester}
      addSchedule={addSchedule}
      deleteSchedule={deleteSchedule}
      addCourseToSchedule={addCourseToSchedule}
      removeCourseFromSchedule={removeCourseFromSchedule}
      addToUpcomingShelf={addToUpcomingShelf}
      removeFromUpcomingShelf={removeFromUpcomingShelf}
      addUnscheduled={addUnscheduled}
      removeUnscheduled={removeUnscheduled}
      setBackupAnnotation={setBackupAnnotation}
      setReqOverride={setReqOverride}
    />
  );
}

function AppInner({
  profile, plan, schedules, upcomingShelf, unscheduled, reqOverrides,
  setProfile, addPlanCourse, removePlanCourse, setPlanSemester,
  addSchedule, deleteSchedule,
  addCourseToSchedule, removeCourseFromSchedule,
  addToUpcomingShelf, removeFromUpcomingShelf,
  addUnscheduled, removeUnscheduled,
  setBackupAnnotation,
  setReqOverride,
}) {
  const currentSemId = profile.currentSemester;
  const upcomingSemId = getUpcomingSemId(currentSemId);
  const futureSemIds = getFutureSemIds(currentSemId);

  const [activeTab, setActiveTab] = useState('upcoming');
  const [activeSchedId, setActiveSchedId] = useState(() => schedules[0]?.id);
  const [calPopup, setCalPopup] = useState(null);
  const [catPopup, setCatPopup] = useState(null);
  const [conflictCourse, setConflictCourse] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState('');
  const [activeReqFilter, setActiveReqFilter] = useState(null);
  const toastTimer = useRef(null);
  const reqPanelCurrentRef = useRef(null);
  const reqPanelUpcomingRef = useRef(null);

  const activeSched = schedules.find(s => s.id === activeSchedId) || schedules[0];
  const starredSched = schedules.find(s => s.starred) || schedules[0];

  const reqStatus = useRequirements(
    plan, profile.track, reqOverrides, currentSemId, tagsData, starredSched
  );
  const upcomingReqStatus = useRequirements(
    plan, profile.track, reqOverrides, currentSemId, tagsData, activeSched
  );

  // All codes from completed past semesters (for catalog "hide taken" filter)
  const takenCodes = new Set(
    Object.values(plan).flatMap(arr => arr.map(c => c.code))
  );

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2000);
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    setCatPopup(null);
    setCalPopup(null);
  }

  function handleCurrentCourseClick(course) {
    setCalPopup({
      course,
      fromLabel: `${semLabel(currentSemId)} · Current semester`,
      onRemove: () => {
        removePlanCourse(currentSemId, course.code);
        setCalPopup(null);
        showToast(`${course.code} removed`);
      },
    });
  }

  function handleUpcomingCourseClick(course) {
    setCalPopup({
      course,
      fromLabel: `${semLabel(upcomingSemId)} · ${activeSched?.name}`,
      onRemove: () => {
        removeCourseFromSchedule(activeSched.id, course.code);
        setCalPopup(null);
        showToast(`${course.code} removed`);
      },
    });
  }

  function handleOpenCatalogPopup(course, context) {
    setCatPopup({ course, context, backupFor: null });
  }

  function handleAddFromCatalog(backupFor = null) {
    if (!catPopup) return;
    const { course, context } = catPopup;
    const code = normCode(course.code || '');
    const tags = course.tags || tagsData[code] || [];

    if (context === 'upcoming') {
      const existing = activeSched?.courses || [];
      const usedColors = existing.map(c => c.colorIdx ?? 0);
      const colorIdx = nextColor(usedColors);
      const conflict = checkConflict(course, existing);
      addCourseToSchedule(activeSched.id, {
        code,
        title: course.title,
        days: course.days ? (Array.isArray(course.days) ? course.days : [course.days]) : null,
        start: course.start || null,
        end: course.end || null,
        tags,
        prereqs: course.prereqs,
        pf: course.pf,
        hasConflict: conflict,
        colorIdx,
        color: BLOCK_COLORS[colorIdx],
        isCustom: false,
        isTransfer: false,
        backupFor: backupFor || null,
      });
      showToast(`${code} added to ${activeSched.name}`);
    } else if (context === 'current') {
      addPlanCourse(currentSemId, {
        code,
        title: course.title,
        days: course.days ? (Array.isArray(course.days) ? course.days : [course.days]) : null,
        start: course.start || null,
        end: course.end || null,
        tags,
        isCustom: false,
        isTransfer: false,
      });
      showToast(`${code} added`);
    }
    setCatPopup(null);
  }

  function handleAddToShelf() {
    if (!catPopup) return;
    const { course } = catPopup;
    const code = normCode(course.code || '');
    addToUpcomingShelf({ code, title: course.title, tags: course.tags || tagsData[code] || [] });
    setCatPopup(null);
    showToast(`${code} added to shelf`);
  }

  function handleOverride(reqKey, type) {
    if (type === null) { setReqOverride(reqKey, null); return; }
    const note = window.prompt(`Note for this override (${type}):`, '') ?? '';
    if (note === null) return;
    setReqOverride(reqKey, { type, note });
  }

  function doAddToUpcomingSchedule(course, hasConflict) {
    const code = normCode(course.code || '');
    const tags = course.tags || tagsData[code] || [];
    const existing = activeSched?.courses || [];
    const usedColors = existing.map(c => c.colorIdx ?? 0);
    const colorIdx = nextColor(usedColors);
    addCourseToSchedule(activeSched.id, {
      code,
      title: course.title,
      days: course.days ? (Array.isArray(course.days) ? course.days : [course.days]) : null,
      start: course.start || null,
      end: course.end || null,
      tags,
      prereqs: course.prereqs,
      pf: course.pf,
      hasConflict,
      colorIdx,
      color: BLOCK_COLORS[colorIdx],
      isCustom: false,
      isTransfer: false,
      backupFor: null,
    });
    showToast(`${code} added to ${activeSched.name}`);
    reqPanelUpcomingRef.current?.flashExpand();
  }

  function handleAddDirectFromCatalog(course) {
    const code = normCode(course.code || '');
    const tags = course.tags || tagsData[code] || [];
    if (activeTab === 'upcoming') {
      const existing = activeSched?.courses || [];
      if (checkConflict(course, existing)) {
        setConflictCourse(course);
        return;
      }
      doAddToUpcomingSchedule(course, false);
    } else if (activeTab === 'current') {
      addPlanCourse(currentSemId, {
        code,
        title: course.title,
        days: course.days ? (Array.isArray(course.days) ? course.days : [course.days]) : null,
        start: course.start || null,
        end: course.end || null,
        tags,
        isCustom: false,
        isTransfer: false,
      });
      showToast(`${code} added`);
      reqPanelCurrentRef.current?.flashExpand();
    }
  }

  function handleRemoveDirectFromCatalog(course) {
    const code = normCode(course.code || '');
    if (activeTab === 'upcoming') {
      removeCourseFromSchedule(activeSched.id, code);
      showToast(`${code} removed`);
    } else if (activeTab === 'current') {
      removePlanCourse(currentSemId, code);
      showToast(`${code} removed`);
    }
  }


  const currentCourses = plan[currentSemId] || [];
  const addedCodesUpcoming = new Set(activeSched?.courses.map(c => c.code) || []);
  const shelvedCodes = new Set(upcomingShelf.map(c => c.code));
  const addedCodesCurrent = new Set(currentCourses.map(c => c.code));
  const upcomingLong = upcomingSemId ? semLong(upcomingSemId) : '';
  const currentLong = semLong(currentSemId);

  const catHasTime = catPopup ? !!(catPopup.course.days && catPopup.course.start) : false;
  const catAlreadyAdded = catPopup
    ? (catPopup.context === 'upcoming'
        ? addedCodesUpcoming.has(normCode(catPopup.course.code || ''))
        : addedCodesCurrent.has(normCode(catPopup.course.code || '')))
    : false;
  const catOnShelf = catPopup ? shelvedCodes.has(normCode(catPopup.course.code || '')) : false;
  const catConflict = catPopup && catHasTime && !catAlreadyAdded && catPopup.context === 'upcoming'
    ? checkConflict(catPopup.course, activeSched?.courses || [])
    : false;

  const multiScheduleEnabled = profile.multiScheduleEnabled !== false;

  // Catalog props vary only by which semester tab is active
  const catalogProps = {
    catalogData,
    tagsData,
    takenCodes,
    activeReqFilter,
    onReqFilterChange: setActiveReqFilter,
    onAddDirect: handleAddDirectFromCatalog,
    onRemoveDirect: handleRemoveDirectFromCatalog,
    ...(activeTab === 'current' ? {
      termLabel: 'Current semester',
      semLong: currentLong,
      isUpcoming: false,
      addedCodes: addedCodesCurrent,
      shelvedCodes: new Set(),
      reqStatus,
      onOpenPopup: c => handleOpenCatalogPopup(c, 'current'),
    } : {
      termLabel: 'Upcoming semester',
      semLong: upcomingLong,
      isUpcoming: true,
      activeScheduleName: activeSched?.name,
      addedCodes: addedCodesUpcoming,
      shelvedCodes,
      reqStatus: upcomingReqStatus,
      onOpenPopup: c => handleOpenCatalogPopup(c, 'upcoming'),
    }),
  };

  return (
    <div className="app">
      <TopBar
        track={profile.track}
        onSettings={() => setShowSettings(true)}
      />
      <TabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        currentSemId={currentSemId}
        gradYear={profile.gradYear}
      />

      <div className="content">
        {activeTab === 'history' && (
          <HistoryView
            plan={plan}
            currentSemId={currentSemId}
            userYear={profile.year}
            onUpdateSem={setPlanSemester}
          />
        )}

        {activeTab === 'current' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              <RequirementsPanel
                ref={reqPanelCurrentRef}
                track={profile.track}
                reqStatus={reqStatus}
                reqOverrides={reqOverrides}
                onOverride={handleOverride}
                onTrackChange={t => setProfile({ track: t })}
                activeReqFilter={activeReqFilter}
                onReqFilterChange={setActiveReqFilter}
              />
              <div className="sidebar sidebar-left">
                <div className="sidebar-body-wrap">
                  <CatalogSidebar {...catalogProps} />
                </div>
              </div>
              <CalendarGrid
                courses={currentCourses}
                isCurrent={true}
                onCourseClick={handleCurrentCourseClick}
              />
            </div>
            <LegendBar />
          </div>
        )}

        {activeTab === 'upcoming' && (
          <div className="cal-view">
            <div className="cal-view-inner">
              <RequirementsPanel
                ref={reqPanelUpcomingRef}
                track={profile.track}
                reqStatus={upcomingReqStatus}
                reqOverrides={reqOverrides}
                onOverride={handleOverride}
                onTrackChange={t => setProfile({ track: t })}
                isUpcoming={true}
                schedName={activeSched?.name}
                activeReqFilter={activeReqFilter}
                onReqFilterChange={setActiveReqFilter}
              />
              <div className="sidebar sidebar-left">
                <div className="sidebar-body-wrap">
                  <CatalogSidebar {...catalogProps} />
                </div>
              </div>
              <div className="cal-right">
                {multiScheduleEnabled && (
                  <DeckBar
                    schedules={schedules}
                    activeSchedId={activeSchedId || schedules[0]?.id}
                    onSetActive={setActiveSchedId}
                    onDelete={deleteSchedule}
                    onAdd={addSchedule}
                  />
                )}
                <CalendarGrid
                  courses={activeSched?.courses || []}
                  isCurrent={false}
                  onCourseClick={handleUpcomingCourseClick}
                  onSetBackup={(courseCode, backupFor) =>
                    setBackupAnnotation(activeSched.id, courseCode, backupFor)
                  }
                />
              </div>
            </div>
            <LegendBar />
          </div>
        )}

        {futureSemIds.includes(activeTab) && (
          <FutureView
            semId={activeTab}
            fourYearData={fourYearData}
            tagsData={tagsData}
            unscheduled={unscheduled[activeTab] || []}
            reqStatus={reqStatus}
            reqOverrides={reqOverrides}
            track={profile.track}
            activeReqFilter={activeReqFilter}
            onReqFilterChange={setActiveReqFilter}
            onAdd={course => addUnscheduled(activeTab, { code: course.code, title: course.title, tags: course.tags || [] })}
            onRemove={code => removeUnscheduled(activeTab, code)}
            onOverride={handleOverride}
          />
        )}
      </div>

      {calPopup && (
        <CoursePopup
          course={calPopup.course}
          fromLabel={calPopup.fromLabel}
          onClose={() => setCalPopup(null)}
          onRemove={calPopup.onRemove}
        />
      )}

      {catPopup && (
        <CatalogPopup
          course={catPopup.course}
          fromLabel={`${catPopup.context === 'upcoming' ? upcomingLong : currentLong} · Catalog`}
          schedName={catPopup.context === 'upcoming' ? activeSched?.name : 'current semester'}
          alreadyAdded={catAlreadyAdded}
          onShelf={catOnShelf}
          hasConflict={catConflict}
          existingCourses={catPopup.context === 'upcoming' ? (activeSched?.courses || []) : []}
          onClose={() => setCatPopup(null)}
          onAdd={handleAddFromCatalog}
          onAddToShelf={handleAddToShelf}
        />
      )}

      {showSettings && (
        <SettingsModal
          profile={profile}
          onSave={setProfile}
          onClose={() => setShowSettings(false)}
        />
      )}

      {conflictCourse && (
        <div className="overlay open" onClick={() => setConflictCourse(null)}>
          <div className="popup" onClick={e => e.stopPropagation()}>
            <div className="popup-stripe" style={{ background: 'var(--amber)' }} />
            <div className="popup-top">
              <div className="popup-from">Time conflict</div>
              <div className="popup-code">{conflictCourse.code}</div>
              <div className="popup-title-el">{conflictCourse.title}</div>
            </div>
            <div className="popup-divider" />
            <div className="popup-body">
              <div className="conflict-warn">
                <div className="conflict-warn-title">Scheduling conflict detected</div>
                {conflictCourse.code} overlaps with a course already in your schedule. You can still add it if simultaneous enrollment is allowed.
              </div>
            </div>
            <div className="popup-footer">
              <button className="btn-ghost" onClick={() => setConflictCourse(null)}>Cancel</button>
              <button
                className="btn-primary warn-btn"
                onClick={() => {
                  doAddToUpcomingSchedule(conflictCourse, true);
                  setConflictCourse(null);
                }}
              >
                Add anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
}
