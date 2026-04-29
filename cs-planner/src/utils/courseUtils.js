export const PX = 48;
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export function frac(t) {
  const [h, m] = t.split(':').map(Number);
  return h + m / 60 - 8;
}

export function fmt(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ap = h < 12 ? 'am' : 'pm';
  const hh = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, '0')}${ap}`;
}

export function parseTime(t) {
  const match = t.match(/(\d+):?(\d*)(am|pm)/i);
  if (!match) return t;
  let h = parseInt(match[1]);
  const min = match[2] || '00';
  const ap = match[3].toLowerCase();
  if (ap === 'pm' && h !== 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${min.padStart(2, '0')}`;
}

export function normCode(code) {
  return code.replace('COMPSCI', 'CS').replace(/\s+/g, ' ').trim();
}

export function checkConflict(course, existingCourses) {
  if (!course.days || !course.start) return false;
  const sf = frac(course.start);
  const ef = frac(course.end);
  return existingCourses.some(c => {
    if (!c.days || !c.start) return false;
    return course.days.some(d => c.days.includes(d)) && sf < frac(c.end) && ef > frac(c.start);
  });
}

// Computes side-by-side column layout for a set of courses on a single day.
// Returns Map<courseCode, {colIdx, colCount}>.
export function layoutDay(courses) {
  const result = new Map();
  if (!courses.length) return result;

  const adj = new Map();
  courses.forEach(c => adj.set(c.code, new Set()));

  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const a = courses[i], b = courses[j];
      if (frac(a.start) < frac(b.end) && frac(a.end) > frac(b.start)) {
        adj.get(a.code).add(b.code);
        adj.get(b.code).add(a.code);
      }
    }
  }

  const visited = new Set();
  const components = [];
  courses.forEach(c => {
    if (visited.has(c.code)) return;
    const comp = [];
    const queue = [c.code];
    visited.add(c.code);
    while (queue.length) {
      const code = queue.shift();
      comp.push(code);
      adj.get(code).forEach(nb => {
        if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
      });
    }
    components.push(comp);
  });

  components.forEach(comp => {
    if (comp.length === 1) {
      result.set(comp[0], { colIdx: 0, colCount: 1 });
      return;
    }
    const compCourses = comp.map(code => courses.find(c => c.code === code)).filter(Boolean);
    compCourses.sort((a, b) => frac(a.start) - frac(b.start));
    const cols = [];
    compCourses.forEach(c => {
      const sf = frac(c.start);
      const ef = frac(c.end);
      let assigned = -1;
      for (let i = 0; i < cols.length; i++) {
        if (cols[i] <= sf) { assigned = i; cols[i] = ef; break; }
      }
      if (assigned === -1) { assigned = cols.length; cols.push(ef); }
      result.set(c.code, { colIdx: assigned, colCount: comp.length });
    });
  });

  return result;
}
