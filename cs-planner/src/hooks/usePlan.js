import { useState, useEffect, useCallback } from 'react';
import { BLOCK_COLORS, nextColor } from '../constants/colors';
import { normCode } from '../utils/courseUtils';

const STORAGE_KEY = 'cs_planner_v2_state';

const DEFAULT_STATE = {
  profile: {
    year: null,
    currentSemester: null,
    track: null,
    onboardingDone: false,
    gradYear: null,
    multiScheduleEnabled: true,
  },
  // plan[semId] = array of course objects (past + current semesters)
  plan: {},
  // schedules = array of { id, name, starred, courses[] } for upcoming sem
  schedules: [{ id: 'A', name: 'Schedule A', starred: true, courses: [] }],
  schedCounter: 2,
  // upcomingShelf = timeless courses (no days/start) for upcoming sem
  upcomingShelf: [],
  // unscheduled[semId] = [{code, title, tags}] for far-future sems
  unscheduled: {},
  reqOverrides: {},
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_STATE;
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function usePlan() {
  const [state, setState] = useState(load);

  useEffect(() => {
    save(state);
  }, [state]);

  // ── Profile ──
  const setProfile = useCallback((update) => {
    setState(s => ({ ...s, profile: { ...s.profile, ...update } }));
  }, []);

  // ── Plan (past + current semesters) ──
  const addPlanCourse = useCallback((semId, course) => {
    setState(s => {
      const existing = s.plan[semId] || [];
      const usedColors = existing.map(c => c.colorIdx ?? 0);
      const colorIdx = nextColor(usedColors);
      return {
        ...s,
        plan: {
          ...s.plan,
          [semId]: [...existing, { ...course, colorIdx, color: BLOCK_COLORS[colorIdx] }],
        },
      };
    });
  }, []);

  const removePlanCourse = useCallback((semId, courseCode) => {
    setState(s => ({
      ...s,
      plan: {
        ...s.plan,
        [semId]: (s.plan[semId] || []).filter(c => c.code !== courseCode),
      },
    }));
  }, []);

  const setPlanSemester = useCallback((semId, courses) => {
    setState(s => ({ ...s, plan: { ...s.plan, [semId]: courses } }));
  }, []);

  // ── Schedules (upcoming sem) ──
  const addSchedule = useCallback(() => {
    setState(s => {
      const id = String.fromCharCode(65 + s.schedules.length);
      return {
        ...s,
        schedules: [...s.schedules, { id, name: `Schedule ${id}`, starred: false, courses: [] }],
      };
    });
  }, []);

  const deleteSchedule = useCallback((id) => {
    setState(s => {
      if (s.schedules.length <= 1) return s;
      let schedules = s.schedules.filter(sc => sc.id !== id);
      // if deleting starred, star the first remaining
      if (!schedules.some(sc => sc.starred)) {
        schedules = [{ ...schedules[0], starred: true }, ...schedules.slice(1)];
      }
      return { ...s, schedules };
    });
  }, []);

  const starSchedule = useCallback((id) => {
    setState(s => {
      const mapped = s.schedules.map(sc => ({ ...sc, starred: sc.id === id }));
      const starred = mapped.find(sc => sc.starred);
      const rest = mapped.filter(sc => !sc.starred);
      // Move starred to front, keep names/IDs as-is
      return { ...s, schedules: [starred, ...rest] };
    });
  }, []);

  const addCourseToSchedule = useCallback((schedId, course) => {
    setState(s => {
      const schedules = s.schedules.map(sc => {
        if (sc.id !== schedId) return sc;
        const usedColors = sc.courses.map(c => c.colorIdx ?? 0);
        const colorIdx = nextColor(usedColors);
        return {
          ...sc,
          courses: [...sc.courses, { ...course, colorIdx, color: BLOCK_COLORS[colorIdx] }],
        };
      });
      return { ...s, schedules };
    });
  }, []);

  const removeCourseFromSchedule = useCallback((schedId, courseCode) => {
    setState(s => ({
      ...s,
      schedules: s.schedules.map(sc =>
        sc.id === schedId
          ? { ...sc, courses: sc.courses.filter(c => c.code !== courseCode) }
          : sc
      ),
    }));
  }, []);

  // ── Upcoming shelf ──
  const addToUpcomingShelf = useCallback((course) => {
    setState(s => {
      if (s.upcomingShelf.some(c => c.code === course.code)) return s;
      return { ...s, upcomingShelf: [...s.upcomingShelf, course] };
    });
  }, []);

  const removeFromUpcomingShelf = useCallback((code) => {
    setState(s => ({ ...s, upcomingShelf: s.upcomingShelf.filter(c => c.code !== code) }));
  }, []);

  // ── Unscheduled (far future sems) ──
  const addUnscheduled = useCallback((semId, course) => {
    setState(s => {
      const existing = s.unscheduled[semId] || [];
      if (existing.some(c => c.code === course.code)) return s;
      return { ...s, unscheduled: { ...s.unscheduled, [semId]: [...existing, course] } };
    });
  }, []);

  const removeUnscheduled = useCallback((semId, code) => {
    setState(s => ({
      ...s,
      unscheduled: {
        ...s.unscheduled,
        [semId]: (s.unscheduled[semId] || []).filter(c => c.code !== code),
      },
    }));
  }, []);

  // ── Backup annotations ──
  const setBackupAnnotation = useCallback((schedId, courseCode, backupFor) => {
    setState(s => ({
      ...s,
      schedules: s.schedules.map(sc =>
        sc.id !== schedId ? sc : {
          ...sc,
          courses: sc.courses.map(c =>
            c.code !== courseCode ? c : { ...c, backupFor: backupFor || null }
          ),
        }
      ),
    }));
  }, []);

  // ── Req overrides ──
  const setReqOverride = useCallback((key, override) => {
    setState(s => {
      const overrides = { ...s.reqOverrides };
      if (override === null) delete overrides[key];
      else overrides[key] = override;
      return { ...s, reqOverrides: overrides };
    });
  }, []);

  return {
    profile: state.profile,
    plan: state.plan,
    schedules: state.schedules,
    upcomingShelf: state.upcomingShelf,
    unscheduled: state.unscheduled,
    reqOverrides: state.reqOverrides,
    setProfile,
    addPlanCourse,
    removePlanCourse,
    setPlanSemester,
    addSchedule,
    deleteSchedule,
    starSchedule,
    addCourseToSchedule,
    removeCourseFromSchedule,
    addToUpcomingShelf,
    removeFromUpcomingShelf,
    addUnscheduled,
    removeUnscheduled,
    setBackupAnnotation,
    setReqOverride,
  };
}
