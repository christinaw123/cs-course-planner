import { useMemo } from 'react';
import { TRACKS } from '../data/requirements';
import { SEM_POOL, getSemIdx } from '../constants/semesters';

function computeRequirements(plan, track, reqOverrides, currentSemId, tagsData, starredSchedule) {
  const trackConfig = TRACKS[track];
  if (!trackConfig) return null;

  const curIdx = getSemIdx(currentSemId);

  // Gather all relevant courses: past + current semesters + starred upcoming schedule
  const allCourses = [];
  SEM_POOL.forEach((sem, idx) => {
    if (idx <= curIdx) {
      (plan[sem.id] || []).forEach(c => allCourses.push(c));
    }
  });
  // Add starred schedule courses (upcoming) — as preview/counted
  if (starredSchedule) {
    starredSchedule.courses.forEach(c => allCourses.push(c));
  }

  function effectiveTags(c) {
    return c.userTags ?? c.tags ?? c.sysTags ?? [];
  }

  function hasCourseWithTag(tag) {
    return allCourses.some(c => effectiveTags(c).includes(tag));
  }

  function coursesWithTag(tag) {
    return allCourses.filter(c => effectiveTags(c).includes(tag)).map(c => c.code);
  }

  function countCoursesWithTag(tag) {
    return coursesWithTag(tag).length;
  }

  const results = {};

  // ── Math requirements ──
  results.calc = (() => {
    const satisfied = true; // placed out or handled manually; always show satisfied by default
    return { satisfied: true, by: ['Placed out / exempt'], remaining: 0 };
  })();

  results.linalg = (() => {
    const mathCourses = allCourses.filter(c => effectiveTags(c).includes('math') && (
      c.code.includes('MATH 21') || c.code.includes('MATH 22') || c.code.includes('MATH 25')
    ));
    const linearAlg = allCourses.filter(c =>
      ['MATH 21b', 'MATH 22a', 'MATH 22b', 'MATH 25a'].includes(c.code)
    );
    const satisfied = linearAlg.length > 0;
    return { satisfied, by: linearAlg.map(c => c.code), remaining: satisfied ? 0 : 1 };
  })();

  results.prob = (() => {
    const probCourses = allCourses.filter(c =>
      ['STAT 110', 'STAT 111'].includes(c.code) || effectiveTags(c).includes('math')
    );
    const stat = allCourses.filter(c => ['STAT 110', 'STAT 111'].includes(c.code));
    const satisfied = stat.length > 0;
    return { satisfied, by: stat.map(c => c.code), remaining: satisfied ? 0 : 1 };
  })();

  // ── Tag requirements ──
  const tags = trackConfig.tags;
  Object.entries(tags).forEach(([key, req]) => {
    if (key === 'adv') {
      const advCourses = coursesWithTag('adv');
      const satisfied = advCourses.length >= req.count;
      results[key] = {
        satisfied,
        by: advCourses,
        remaining: Math.max(0, req.count - advCourses.length),
      };
    } else if (key === 'formal3') {
      // Honors only: 3rd formal reasoning course (any formal-tagged course beyond discmath + complim)
      const formalCourses = coursesWithTag('formal');
      const hasThird = formalCourses.length >= 3;
      results[key] = {
        satisfied: hasThird,
        by: formalCourses.slice(2),
        remaining: hasThird ? 0 : 1,
      };
    } else {
      const courses = coursesWithTag(key);
      const count = courses.length;
      const satisfied = count >= req.count;
      results[key] = {
        satisfied,
        by: courses,
        remaining: Math.max(0, req.count - count),
      };
    }
  });

  // ── Core count ──
  const csCourses = allCourses.filter(c => {
    const tags = effectiveTags(c);
    const isCoreTag = ['prog1','prog2','formal','discmath','complim','alg','intalg','systems','world','ai','adv'].some(t => tags.includes(t));
    return isCoreTag && !c.isCustom;
  });
  const uniqueCSCodes = [...new Set(csCourses.map(c => c.code))];
  const coreCount = uniqueCSCodes.length;
  results.corecount = {
    satisfied: coreCount >= trackConfig.coreCount,
    by: uniqueCSCodes,
    remaining: Math.max(0, trackConfig.coreCount - coreCount),
  };

  const harvardCSCourses = allCourses.filter(c => c.code.startsWith('CS ') && !c.isCustom && !c.isTransfer);
  const uniqueHarvardCS = [...new Set(harvardCSCourses.map(c => c.code))];
  results.harvardcs = {
    satisfied: uniqueHarvardCS.length >= trackConfig.harvardCSMin,
    by: uniqueHarvardCS,
    remaining: Math.max(0, trackConfig.harvardCSMin - uniqueHarvardCS.length),
  };

  // ── Thesis ──
  if (trackConfig.thesis) {
    results.thesis = { satisfied: false, by: [], remaining: 1 };
  }

  // ── MBB requirements ──
  if (trackConfig.mbb) {
    results.neuro80 = { satisfied: false, by: [], remaining: 1 };
    results.relatedField = { satisfied: false, by: [], remaining: 1 };
    results.juniorTutorial = { satisfied: false, by: [], remaining: 1 };
  }

  // ── Apply overrides ──
  Object.entries(reqOverrides).forEach(([key, override]) => {
    if (results[key]) {
      results[key] = { ...results[key], override };
    }
  });

  // ── Summary ──
  const reqKeys = Object.keys(results);
  let satisfied = 0;
  let total = 0;
  let remaining = 0;
  reqKeys.forEach(key => {
    const r = results[key];
    total++;
    const isSat = r.override ? (r.override.type === 'satisfied' || r.override.type === 'waived') : r.satisfied;
    if (isSat) satisfied++;
    else remaining++;
  });

  results._summary = { satisfied, total, remaining };
  return results;
}

export function useRequirements(plan, track, reqOverrides, currentSemId, tagsData, starredSchedule) {
  return useMemo(
    () => computeRequirements(plan, track, reqOverrides, currentSemId, tagsData, starredSchedule),
    [plan, track, reqOverrides, currentSemId, tagsData, starredSchedule]
  );
}
