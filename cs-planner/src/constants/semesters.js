export const SEM_POOL = [
  { id: 'f22', label: 'FAL 2022', long: 'Fall 2022' },
  { id: 's23', label: 'SPR 2023', long: 'Spring 2023' },
  { id: 'f23', label: 'FAL 2023', long: 'Fall 2023' },
  { id: 's24', label: 'SPR 2024', long: 'Spring 2024' },
  { id: 'f24', label: 'FAL 2024', long: 'Fall 2024' },
  { id: 's25', label: 'SPR 2025', long: 'Spring 2025' },
  { id: 'f25', label: 'FAL 2025', long: 'Fall 2025' },
  { id: 's26', label: 'SPR 2026', long: 'Spring 2026' },
  { id: 'f26', label: 'FAL 2026', long: 'Fall 2026' },
  { id: 's27', label: 'SPR 2027', long: 'Spring 2027' },
  { id: 'f27', label: 'FAL 2027', long: 'Fall 2027' },
  { id: 's28', label: 'SPR 2028', long: 'Spring 2028' },
];

export function getSemIdx(semId) {
  return SEM_POOL.findIndex(s => s.id === semId);
}

export function getUpcomingSemId(currentSemId) {
  const idx = getSemIdx(currentSemId);
  return SEM_POOL[idx + 1]?.id ?? null;
}

export function getFutureSemIds(currentSemId) {
  const idx = getSemIdx(currentSemId);
  return SEM_POOL.slice(idx + 2).map(s => s.id);
}

// Returns all past semIds (before current, excluding current)
export function getPastSemIds(currentSemId) {
  const idx = getSemIdx(currentSemId);
  return SEM_POOL.slice(0, idx).map(s => s.id);
}

export function semLabel(semId) {
  return SEM_POOL.find(s => s.id === semId)?.label ?? semId;
}

export function semLong(semId) {
  return SEM_POOL.find(s => s.id === semId)?.long ?? semId;
}

// Build the list of past semesters to show in onboarding.
// Each year starts in Fall (base count) and Spring adds one more.
// e.g. Junior Fall = 4 past, Junior Spring = 5 past, including current = 6 total
export function getPastSemsForYear(year, currentSemId) {
  const yearBase = { Freshman: 0, Sophomore: 2, Junior: 4, Senior: 6 };
  const base = yearBase[year] ?? 0;
  const isSpring = currentSemId?.startsWith('s');
  const count = base + (isSpring ? 1 : 0);
  const curIdx = getSemIdx(currentSemId);
  const pastIds = SEM_POOL.slice(0, curIdx).map(s => s.id);
  return pastIds.slice(-count).reverse(); // most recent first
}
