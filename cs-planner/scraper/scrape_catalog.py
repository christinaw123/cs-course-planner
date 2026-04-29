#!/usr/bin/env python3
"""
Scrape Harvard course catalog for CS + math prep courses.
Fetches COMPSCI, MATH, STAT, and APMTH courses for Spring 2026 and Fall 2026.
Outputs: src/data/catalog.json
"""

import requests
import json
import re
import os
import sys

URL = "https://courses.my.harvard.edu/psc/courses/EMPLOYEE/EMPL/s/WEBLIB_IS_SCL.ISCRIPT1.FieldFormula.IScript_Search"

HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Origin": "https://courses.my.harvard.edu",
    "Referer": "https://courses.my.harvard.edu/psp/courses/EMPLOYEE/EMPL/h/?tab=HU_CLASS_SEARCH",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
}

OUTPUT = os.path.join(os.path.dirname(__file__), "../src/data/catalog.json")

TERMS = ["2026 Spring", "2026 Fall"]

SUBJECTS = [
    "COMPSCI",  # CS courses
    "MATH",     # Math preparation (linalg, calc)
    "STAT",     # Probability
    "APMTH",    # Applied Math (linalg)
]

# Math prep courses we specifically want (by code fragment)
MATH_ALLOWLIST = {
    # Calculus
    'MATH Ma', 'MATH Mb', 'MATH 1a', 'MATH 1b',
    # Linear algebra
    'MATH 21a', 'MATH 21b', 'MATH 22a', 'MATH 22b',
    'MATH 23a', 'MATH 25a', 'MATH 55a',
    'APMTH 22a',
    # Probability
    'STAT 110', 'STAT 111',
    'MATH 154',
}

# For CS, include all undergrad (< 3000)
def is_wanted(code, subject):
    if subject == 'COMPSCI':
        num = re.search(r'\d+', code)
        return num and int(num.group()) < 3000
    # For math/stat/apmth, only include the allowlisted courses
    return code in MATH_ALLOWLIST


def parse_time(t):
    if not t:
        return None
    if isinstance(t, list):
        t = t[0] if t else None
    if not t:
        return None
    t = str(t).strip()
    m = re.match(r'(\d+):?(\d{0,2})(am|pm)', t, re.IGNORECASE)
    if not m:
        return t
    h, mins, ap = int(m.group(1)), m.group(2) or '00', m.group(3).lower()
    if ap == 'pm' and h != 12:
        h += 12
    if ap == 'am' and h == 12:
        h = 0
    return f"{h:02d}:{mins.zfill(2)}"


def norm_nbr(nbr):
    """Harvard convention: digit+letter → lowercase letter (21B→21b); all-alpha → capitalize (MA→Ma)."""
    m = re.match(r'^(\d+)([A-Za-z]+)$', nbr)
    if m:
        return m.group(1) + m.group(2).lower()
    m = re.match(r'^([A-Za-z]+)$', nbr)
    if m:
        return nbr.capitalize()
    return nbr

def norm_code(subject, catalog_nbr):
    subj = 'CS' if subject.strip() == 'COMPSCI' else subject.strip()
    nbr = norm_nbr(catalog_nbr.strip())
    return f"{subj} {nbr}"


def fetch_page(search_text, page):
    payload = {
        "SearchReqJSON": json.dumps({
            "ExcludeBracketed": True,
            "Exclude300": False,
            "PageSize": 25,
            "PageNumber": page,
            "SortOrder": ["SCORE"],
            "Facets": [],
            "SaveRecent": False,
            "CombineClassSections": True,
            "SearchText": search_text,
        })
    }
    resp = requests.post(URL, headers=HEADERS, data=payload, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, list):
        return data[0] if data else {}
    return data


DAY_ABBREV = {
    'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed',
    'Thursday': 'Thu', 'Friday': 'Fri',
}


def build_course(c, subject):
    days = c.get("DAY_OF_WEEK", [])
    if isinstance(days, str):
        days = [days] if days.strip() else []
    days = [DAY_ABBREV.get(d, d) for d in days]

    raw_instructors = c.get("IS_SCL_DESCR_IS_SCL_DESCRL", "")
    instructors = [raw_instructors] if isinstance(raw_instructors, str) and raw_instructors else (raw_instructors if isinstance(raw_instructors, list) else [])

    code = norm_code(subject, c.get('CATALOG_NBR', ''))

    return {
        "id": c.get("HU_STRM_CLASSNBR"),
        "code": code,
        "title": c.get("IS_SCL_DESCR100"),
        "days": days if days else None,
        "start": parse_time(c.get("IS_SCL_TIME_START")),
        "end": parse_time(c.get("IS_SCL_TIME_END")),
        "term": c.get("IS_SCL_DESCR_IS_SCL_DESCRH"),
        "instructors": instructors,
        "prereqs": [],
    }


def fetch_subject(search_text, terms_set):
    """Fetch all pages for a search text, return matching courses."""
    all_raw = []
    page = 1
    while True:
        try:
            data = fetch_page(search_text, page)
            results = data.get("ResultsCollection") or data.get("resultsCollection", [])
            if not results:
                break
            # Only keep courses from our target terms
            filtered = [r for r in results if r.get("IS_SCL_DESCR_IS_SCL_DESCRH") in terms_set]
            all_raw.extend(filtered)
            print(f"    Page {page}: {len(results)} results ({len(filtered)} in target terms)")
            page += 1
        except Exception as e:
            print(f"    Error on page {page}: {e}")
            break
    return all_raw


def main():
    terms_set = set(TERMS)
    print(f"Fetching courses for terms: {', '.join(TERMS)}")

    all_courses = []
    seen = set()

    for subject in SUBJECTS:
        print(f"\nFetching {subject}...")
        raw = fetch_subject(subject, terms_set)

        for c in raw:
            code = norm_code(subject, c.get('CATALOG_NBR', ''))
            term = c.get("IS_SCL_DESCR_IS_SCL_DESCRH")
            key = (code, term)
            if key in seen:
                continue
            if not is_wanted(code, subject):
                continue
            seen.add(key)
            all_courses.append(build_course(c, subject))

        print(f"  → {sum(1 for c in all_courses if c['code'].startswith('CS' if subject == 'COMPSCI' else subject.replace('APMTH','APMTH')))} unique {subject} courses so far")

    # Sort by term, then code
    all_courses.sort(key=lambda c: (c.get('term', ''), c.get('code', '')))

    by_term = {}
    for c in all_courses:
        t = c.get('term', 'unknown')
        by_term[t] = by_term.get(t, 0) + 1

    print(f"\nTotal: {len(all_courses)} courses")
    for term, count in sorted(by_term.items()):
        print(f"  {term}: {count}")

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, 'w') as f:
        json.dump(all_courses, f, indent=2)
    print(f"\nWritten to {OUTPUT}")


if __name__ == '__main__':
    main()
