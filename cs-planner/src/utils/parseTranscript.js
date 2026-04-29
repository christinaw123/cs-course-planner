import * as pdfjsLib from 'pdfjs-dist';
import { normCode } from './courseUtils';
import { SEM_POOL } from '../constants/semesters';
import { TAG_AUTO, COURSE_TITLE } from '../constants/tags';
import { BLOCK_COLORS, nextColor } from '../constants/colors';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;

const VALID_SEM_IDS = new Set(SEM_POOL.map(s => s.id));

// Maps canonical course prefix → possible department names on a Harvard transcript
const DEPT_ALIAS = {
  MATH: ['MATHEMATICS', 'MATH'],
  STAT: ['STATISTICS', 'STAT'],
};

// Precompile one regex per non-CS entry in TAG_AUTO so any requirement-satisfying
// course is recognised automatically — adding a new entry to TAG_AUTO is enough.
const NON_CS_PATTERNS = Object.keys(TAG_AUTO)
  .filter(code => !code.startsWith('CS '))
  .map(code => {
    const spaceIdx = code.indexOf(' ');
    const prefix = code.slice(0, spaceIdx);
    const num = code.slice(spaceIdx + 1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const aliases = (DEPT_ALIAS[prefix] || [prefix]).join('|');
    return { code, re: new RegExp(`\\b(?:${aliases})\\s+0*${num}\\b(.*)`, 'i') };
  });

// Extract text from PDF, reconstructing lines from y-positions
export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allLines = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Group text items by rounded y-coordinate to reconstruct visual lines
    const lineMap = new Map();
    for (const item of content.items) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({ x: item.transform[4], str: item.str });
    }

    // Sort lines top-to-bottom (higher y = higher on page in PDF coords)
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const lineText = lineMap.get(y)
        .sort((a, b) => a.x - b.x)
        .map(i => i.str)
        .join(' ');
      allLines.push(lineText.trim());
    }
  }

  return allLines.join('\n');
}

// Parse extracted transcript text into { semId: [{code, title}] }
export function parseTranscriptText(text) {
  const lines = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);

  const result = {};
  let acadYearStart = null; // e.g. 2022 for "2022-2023"
  let currentSemId = null;

  for (const line of lines) {
    // Harvard format: "2023 Fall" or "2024 Spring" (year then season)
    const harvardSem = line.match(/\b(20\d{2})\s+(Fall|Spring)\b/i);
    if (harvardSem) {
      const year = harvardSem[1];
      const season = harvardSem[2].toLowerCase();
      const id = (season === 'fall' ? 'f' : 's') + year.slice(-2);
      if (VALID_SEM_IDS.has(id)) currentSemId = id;
      continue;
    }

    // Alternate format: "Fall 2022" / "Spring 2023" (season then year)
    const altSem = line.match(/\b(Fall|Spring)\s+(20\d{2})\b/i);
    if (altSem) {
      const id = (altSem[1].toLowerCase() === 'fall' ? 'f' : 's') + altSem[2].slice(-2);
      if (VALID_SEM_IDS.has(id)) currentSemId = id;
      continue;
    }

    // Academic year header: "2022-2023" or "2022-23" — sets context for FALL/SPRING TERM below
    const yearMatch = line.match(/\b(20\d{2})[\s\-–]+(\d{2,4})\b/);
    if (yearMatch) {
      const start = parseInt(yearMatch[1]);
      const endRaw = yearMatch[2];
      const end = endRaw.length === 2
        ? Math.floor(start / 100) * 100 + parseInt(endRaw)
        : parseInt(endRaw);
      if (end === start + 1) acadYearStart = start;
    }

    // "FALL TERM" / "SPRING TERM" relative to academic year context
    if (/\bFALL\s+(TERM|SEMESTER)\b/i.test(line) && acadYearStart !== null) {
      const id = `f${String(acadYearStart).slice(-2)}`;
      if (VALID_SEM_IDS.has(id)) currentSemId = id;
      continue;
    }
    if (/\bSPRING\s+(TERM|SEMESTER)\b/i.test(line) && acadYearStart !== null) {
      const id = `s${String(acadYearStart + 1).slice(-2)}`;
      if (VALID_SEM_IDS.has(id)) currentSemId = id;
      continue;
    }

    // COMPSCI course line, e.g.: "COMPSCI 50 Introduction to Computer Science 4.000 B+"
    // Columns left-to-right: code, description, earned credits, grade
    const courseMatch = line.match(/\bCOMPSCI\s+0*(\d+[A-Z]?)\b(.*)/i);
    if (courseMatch && currentSemId) {
      const num = parseInt(courseMatch[1]);
      if (num >= 3000) continue; // skip grad courses

      const code = normCode(`COMPSCI ${courseMatch[1]}`);

      // Strip trailing "4.000 B+" or "4.000 A-" (credits then grade at end)
      let rest = courseMatch[2].trim();
      rest = rest.replace(/\s+\d+\.\d+\s+[A-F][+-]?\s*$/, '').trim();
      // Also strip lone trailing grade letter in case credits are missing
      rest = rest.replace(/\s+[A-F][+-]?\s*$/, '').trim();
      const title = rest || COURSE_TITLE[code] || '';

      if (!result[currentSemId]) result[currentSemId] = [];
      if (!result[currentSemId].some(c => c.code === code)) {
        result[currentSemId].push({ code, title });
      }
      continue;
    }

    // Non-CS courses that satisfy CS concentration requirements (driven by TAG_AUTO)
    for (const { code, re } of NON_CS_PATTERNS) {
      const m = line.match(re);
      if (m && currentSemId) {
        let rest = m[1].trim();
        rest = rest.replace(/\s+\d+\.\d+\s+[A-F][+-]?\s*$/, '').trim();
        rest = rest.replace(/\s+[A-F][+-]?\s*$/, '').trim();
        const title = rest || COURSE_TITLE[code] || '';
        if (!result[currentSemId]) result[currentSemId] = [];
        if (!result[currentSemId].some(c => c.code === code)) {
          result[currentSemId].push({ code, title });
        }
        break;
      }
    }
  }

  return result;
}

// Attach colors/tags to match the onboarding pastCourses shape
export function enrichParsedCourses(parsed) {
  const enriched = {};
  for (const [semId, courses] of Object.entries(parsed)) {
    const usedColors = [];
    enriched[semId] = courses.map(({ code, title }) => {
      const tags = TAG_AUTO[code] || [];
      const colorIdx = nextColor(usedColors);
      usedColors.push(colorIdx);
      return {
        code,
        title: COURSE_TITLE[code] || title || code,
        tags,
        colorIdx,
        color: BLOCK_COLORS[colorIdx],
        isCustom: false,
        isTransfer: false,
      };
    });
  }
  return enriched;
}
