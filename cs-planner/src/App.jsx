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
import UnscheduledShelf from './components/UnscheduledShelf';
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

export default function App() {
  const {
    profile, plan, schedules, upcomingShelf, unscheduled, reqOverrides,
    setProfile,
    addPlanCourse, removePlanCourse, setPlanSemester,
    addSchedule, deleteSchedule, starSchedule,
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
      starSchedule={starSchedule}
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
  addSchedule, deleteSchedule, starSchedule,
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
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState('');
  const [activeReqFilter, setActiveReqFilter] = useState(null);
  const toastTimer = useRef(null);

  const activeSched = schedules.find(s => s.id === activeSchedId) || schedules[0];
  const starredSched = schedules.find(s => s.starred) || schedules[0];

  const reqStatus = useRequirements(
    plan, profile.track, reqOverrides, currentSemId, tagsData, starredSched
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

  function handleStarSchedule(id) {
    starSchedule(id);
    setActiveSchedId(id);
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
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div className="sidebar sidebar-left">
              <div className="sidebar-body-wrap">
                <CatalogSidebar
                  termLabel="Current semester"
                  semLong={currentLong}
                  isUpcoming={false}
                  catalogData={catalogData}
                  tagsData={tagsData}
                  addedCodes={addedCodesCurrent}
                  shelvedCodes={new Set()}
                  takenCodes={takenCodes}
                  reqStatus={reqStatus}
                  activeReqFilter={activeReqFilter}
                  onReqFilterChange={setActiveReqFilter}
                  onOpenPopup={c => handleOpenCatalogPopup(c, 'current')}
                />
              </div>
            </div>
            <CalendarGrid
              courses={currentCourses}
              isCurrent={true}
              onCourseClick={handleCurrentCourseClick}
            />
            <div className="sidebar">
              <div className="sidebar-body-wrap">
                <RequirementsPanel
                  track={profile.track}
                  reqStatus={reqStatus}
                  reqOverrides={reqOverrides}
                  onOverride={handleOverride}
                  onTrackChange={t => setProfile({ track: t })}
                  activeReqFilter={activeReqFilter}
                  onReqFilterChange={setActiveReqFilter}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'upcoming' && (
          <div className="cal-view">
            {multiScheduleEnabled && (
              <DeckBar
                schedules={schedules}
                activeSchedId={activeSchedId || schedules[0]?.id}
                onSetActive={setActiveSchedId}
                onStar={handleStarSchedule}
                onDelete={deleteSchedule}
                onAdd={addSchedule}
              />
            )}
            <div className="cal-view-inner">
              <div className="sidebar sidebar-left">
                <div className="sidebar-body-wrap">
                  <CatalogSidebar
                    termLabel="Upcoming semester"
                    semLong={upcomingLong}
                    isUpcoming={true}
                    catalogData={catalogData}
                    tagsData={tagsData}
                    activeScheduleName={activeSched?.name}
                    addedCodes={addedCodesUpcoming}
                    shelvedCodes={shelvedCodes}
                    takenCodes={takenCodes}
                    reqStatus={reqStatus}
                    activeReqFilter={activeReqFilter}
                    onReqFilterChange={setActiveReqFilter}
                    onOpenPopup={c => handleOpenCatalogPopup(c, 'upcoming')}
                  />
                </div>
              </div>
              <CalendarGrid
                courses={activeSched?.courses || []}
                isCurrent={false}
                onCourseClick={handleUpcomingCourseClick}
                onSetBackup={(courseCode, backupFor) =>
                  setBackupAnnotation(activeSched.id, courseCode, backupFor)
                }
              />
              <div className="sidebar">
                <div className="sidebar-body-wrap">
                  <RequirementsPanel
                    track={profile.track}
                    reqStatus={reqStatus}
                    reqOverrides={reqOverrides}
                    onOverride={handleOverride}
                    onTrackChange={t => setProfile({ track: t })}
                    isUpcoming={true}
                    schedName={activeSched?.name}
                    schedStarred={activeSched?.starred}
                    activeReqFilter={activeReqFilter}
                    onReqFilterChange={setActiveReqFilter}
                  />
                </div>
              </div>
            </div>
            <UnscheduledShelf
              courses={upcomingShelf}
              semLong={upcomingLong}
              onRemove={removeFromUpcomingShelf}
            />
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
            onAdd={course => addUnscheduled(activeTab, { code: normCode(course.code), title: course.title, tags: course.tags || [] })}
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
          schedName={activeSched?.name}
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

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
}
