const DAY_ABBREV = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri',
};

export function semLongToTermFilter(semLong) {
  const [season, year] = semLong.split(' ');
  return `${year} ${season}`;
}

function isUndergrad(code) {
  const match = (code || '').match(/\d+/);
  if (!match) return true; // no number (e.g. MATH Ma) → treat as undergrad
  return parseInt(match[0], 10) < 3000;
}

function normDays(days) {
  if (!days) return null;
  const mapped = days.map(d => DAY_ABBREV[d] ?? d);
  return mapped.length ? mapped : null;
}

export function filterCatalogBySem(catalogData, semLong, tagsData = {}) {
  const termFilter = semLongToTermFilter(semLong);
  return (catalogData || [])
    .filter(c => c.term === termFilter && isUndergrad(c.code))
    .map(c => ({ ...c, days: normDays(c.days), tags: c.tags || tagsData[c.code] || [] }));
}
