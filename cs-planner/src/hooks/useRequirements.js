import { useMemo } from 'react';
import { TRACKS } from '../data/requirements';
import { SEM_POOL, getSemIdx } from '../constants/semesters';

function effectiveTags(c) {
  return c.userTags ?? c.tags ?? c.sysTags ?? [];
}

function computeForCourseList(courses, trackConfig) {
  function coursesWithTag(tag) {
    return courses.filter(c => effectiveTags(c).includes(tag)).map(c => c.code);
  }

  const results = {};

  results.calc = { satisfied: true, by: ['Placed out / exempt'], remaining: 0 };

  results.linalg = (() => {
    const cs = courses.filter(c => ['MATH 21b','MATH 22a','MATH 22b','MATH 25a'].includes(c.code));
    const satisfied = cs.length > 0;
    return { satisfied, by: cs.map(c => c.code), remaining: satisfied ? 0 : 1 };
  })();

  results.prob = (() => {
    const cs = courses.filter(c => ['STAT 110','STAT 111'].includes(c.code));
    const satisfied = cs.length > 0;
    return { satisfied, by: cs.map(c => c.code), remaining: satisfied ? 0 : 1 };
  })();

  const tags = trackConfig.tags;
  Object.entries(tags).forEach(([key, req]) => {
    if (key === 'adv') {
      const adv = coursesWithTag('adv');
      results[key] = {
        satisfied: adv.length >= req.count,
        by: adv,
        remaining: Math.max(0, req.count - adv.length),
      };
    } else if (key === 'formal3') {
      const formal = coursesWithTag('formal');
      const hasThird = formal.length >= 3;
      results[key] = { satisfied: hasThird, by: formal.slice(2), remaining: hasThird ? 0 : 1 };
    } else {
      const cs = coursesWithTag(key);
      results[key] = {
        satisfied: cs.length >= req.count,
        by: cs,
        remaining: Math.max(0, req.count - cs.length),
      };
    }
  });

  const csCourses = courses.filter(c => {
    const t = effectiveTags(c);
    return ['prog1','prog2','formal','discmath','complim','alg','intalg','systems','world','ai','adv']
      .some(tag => t.includes(tag)) && !c.isCustom;
  });
  const uniqueCS = [...new Set(csCourses.map(c => c.code))];
  results.corecount = {
    satisfied: uniqueCS.length >= trackConfig.coreCount,
    by: uniqueCS,
    remaining: Math.max(0, trackConfig.coreCount - uniqueCS.length),
  };

  const harvardCS = courses.filter(c => c.code.startsWith('CS ') && !c.isCustom && !c.isTransfer);
  const uniqueHCS = [...new Set(harvardCS.map(c => c.code))];
  results.harvardcs = {
    satisfied: uniqueHCS.length >= trackConfig.harvardCSMin,
    by: uniqueHCS,
    remaining: Math.max(0, trackConfig.harvardCSMin - uniqueHCS.length),
  };

  if (trackConfig.thesis) results.thesis = { satisfied: false, by: [], remaining: 1 };
  if (trackConfig.mbb) {
    results.neuro80 = { satisfied: false, by: [], remaining: 1 };
    results.relatedField = { satisfied: false, by: [], remaining: 1 };
    results.juniorTutorial = { satisfied: false, by: [], remaining: 1 };
  }

  return results;
}

function computeRequirements(plan, track, reqOverrides, currentSemId, tagsData, starredSchedule) {
  const trackConfig = TRACKS[track];
  if (!trackConfig) return null;

  const curIdx = getSemIdx(currentSemId);

  const pastCurrentCourses = [];
  SEM_POOL.forEach((sem, idx) => {
    if (idx <= curIdx) {
      (plan[sem.id] || []).forEach(c => pastCurrentCourses.push(c));
    }
  });

  const upcomingCourses = starredSchedule ? starredSchedule.courses : [];
  const allCourses = [...pastCurrentCourses, ...upcomingCourses];

  const pastResults = computeForCourseList(pastCurrentCourses, trackConfig);
  const allResults = computeForCourseList(allCourses, trackConfig);

  // Mark pending: satisfied only when upcoming courses are included
  Object.keys(allResults).forEach(key => {
    if (!pastResults[key]?.satisfied && allResults[key]?.satisfied) {
      allResults[key].pending = true;
      allResults[key].satisfied = false; // keep isDone false so pending state renders
    }
  });

  // Apply overrides
  Object.entries(reqOverrides).forEach(([key, override]) => {
    if (allResults[key]) allResults[key] = { ...allResults[key], override };
  });

  // Summary
  let satisfied = 0, total = 0, remaining = 0, pending = 0;
  Object.keys(allResults).forEach(key => {
    const r = allResults[key];
    total++;
    const isSat = r.override
      ? (r.override.type === 'satisfied' || r.override.type === 'waived')
      : r.satisfied;
    if (isSat) satisfied++;
    else if (r.pending) pending++;
    else remaining++;
  });

  allResults._summary = { satisfied, total, remaining, pending };
  return allResults;
}

export function useRequirements(plan, track, reqOverrides, currentSemId, tagsData, starredSchedule) {
  return useMemo(
    () => computeRequirements(plan, track, reqOverrides, currentSemId, tagsData, starredSchedule),
    [plan, track, reqOverrides, currentSemId, tagsData, starredSchedule]
  );
}
