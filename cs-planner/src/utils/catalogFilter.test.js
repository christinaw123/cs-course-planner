import { describe, it, expect } from 'vitest';
import { semLongToTermFilter, filterCatalogBySem } from './catalogFilter';

const MOCK_CATALOG = [
  { id: '1', code: 'CS 50', title: 'Intro to CS', term: '2026 Fall', days: ['Monday'], start: '13:30', end: '14:30', prereqs: [] },
  { id: '2', code: 'CS 51', title: 'Abstraction', term: '2026 Fall', days: ['Tuesday', 'Thursday'], start: '11:15', end: '12:30', prereqs: [] },
  { id: '3', code: 'CS 121', title: 'Theory', term: '2026 Spring', days: null, start: null, end: null, prereqs: [] },
  { id: '4', code: 'CS 124', title: 'Algorithms', term: '2025 Fall', days: null, start: null, end: null, prereqs: [] },
  { id: '5', code: 'CS 3210', title: 'Grad Research', term: '2026 Fall', days: null, start: null, end: null, prereqs: [] },
  { id: '6', code: 'CS 3000', title: 'Grad Course', term: '2026 Fall', days: null, start: null, end: null, prereqs: [] },
  { id: '7', code: 'CS 2999', title: 'Just Under', term: '2026 Fall', days: null, start: null, end: null, prereqs: [] },
];

describe('semLongToTermFilter', () => {
  it('converts "Fall 2026" → "2026 Fall"', () => {
    expect(semLongToTermFilter('Fall 2026')).toBe('2026 Fall');
  });
  it('converts "Spring 2026" → "2026 Spring"', () => {
    expect(semLongToTermFilter('Spring 2026')).toBe('2026 Spring');
  });
  it('converts "Spring 2025" → "2025 Spring"', () => {
    expect(semLongToTermFilter('Spring 2025')).toBe('2025 Spring');
  });
});

describe('filterCatalogBySem', () => {
  it('returns only courses matching the given semester', () => {
    const result = filterCatalogBySem(MOCK_CATALOG, 'Fall 2026');
    expect(result.map(c => c.code)).toEqual(['CS 50', 'CS 51', 'CS 2999']);
  });

  it('does NOT return courses from other semesters', () => {
    const result = filterCatalogBySem(MOCK_CATALOG, 'Fall 2026');
    const codes = result.map(c => c.code);
    expect(codes).not.toContain('CS 121'); // Spring 2026 course
    expect(codes).not.toContain('CS 124'); // Fall 2025 course
  });

  it('returns empty array when no courses match the semester', () => {
    const result = filterCatalogBySem(MOCK_CATALOG, 'Fall 2027');
    expect(result).toHaveLength(0);
  });

  it('returns empty array for null/undefined catalog', () => {
    expect(filterCatalogBySem(null, 'Fall 2026')).toHaveLength(0);
    expect(filterCatalogBySem(undefined, 'Fall 2026')).toHaveLength(0);
  });

  it('attaches tags from tagsData by course code', () => {
    const tags = { 'CS 50': ['ai', 'systems'] };
    const result = filterCatalogBySem(MOCK_CATALOG, 'Fall 2026', tags);
    expect(result.find(c => c.code === 'CS 50').tags).toEqual(['ai', 'systems']);
  });

  it('uses existing course tags if present, ignoring tagsData', () => {
    const catalog = [{ ...MOCK_CATALOG[0], tags: ['formal'] }];
    const tags = { 'CS 50': ['ai'] };
    const result = filterCatalogBySem(catalog, 'Fall 2026', tags);
    expect(result[0].tags).toEqual(['formal']);
  });

  it('assigns empty tags array when no tags available', () => {
    const result = filterCatalogBySem(MOCK_CATALOG, 'Fall 2026', {});
    result.forEach(c => expect(c.tags).toEqual([]));
  });

  it('filters correctly for Spring semester', () => {
    const result = filterCatalogBySem(MOCK_CATALOG, 'Spring 2026');
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('CS 121');
  });

  it('does NOT show a Fall 2026 course when viewing Spring 2026', () => {
    const result = filterCatalogBySem(MOCK_CATALOG, 'Spring 2026');
    expect(result.map(c => c.code)).not.toContain('CS 50');
  });
});

describe('day name normalization', () => {
  it('converts full day names to abbreviations', () => {
    const result = filterCatalogBySem(MOCK_CATALOG, 'Fall 2026');
    const cs50 = result.find(c => c.code === 'CS 50');
    expect(cs50.days).toEqual(['Mon']);
  });

  it('converts multiple full day names', () => {
    const result = filterCatalogBySem(MOCK_CATALOG, 'Fall 2026');
    const cs51 = result.find(c => c.code === 'CS 51');
    expect(cs51.days).toEqual(['Tue', 'Thu']);
  });

  it('passes through already-abbreviated days unchanged', () => {
    const catalog = [{ id: '8', code: 'CS 91', title: 'Test', term: '2026 Fall', days: ['Mon', 'Wed'], prereqs: [] }];
    const result = filterCatalogBySem(catalog, 'Fall 2026');
    expect(result[0].days).toEqual(['Mon', 'Wed']);
  });

  it('preserves null days', () => {
    const result = filterCatalogBySem(MOCK_CATALOG, 'Fall 2026');
    const cs2999 = result.find(c => c.code === 'CS 2999');
    expect(cs2999.days).toBeNull();
  });
});

describe('graduate course filtering (3000+)', () => {
  it('excludes courses numbered 3000+', () => {
    const result = filterCatalogBySem(MOCK_CATALOG, 'Fall 2026');
    const codes = result.map(c => c.code);
    expect(codes).not.toContain('CS 3210');
    expect(codes).not.toContain('CS 3000');
  });

  it('includes courses numbered exactly 2999', () => {
    const result = filterCatalogBySem(MOCK_CATALOG, 'Fall 2026');
    expect(result.map(c => c.code)).toContain('CS 2999');
  });

  it('only returns undergrad courses for Fall 2026', () => {
    const result = filterCatalogBySem(MOCK_CATALOG, 'Fall 2026');
    expect(result.map(c => c.code)).toEqual(['CS 50', 'CS 51', 'CS 2999']);
  });
});
