#!/usr/bin/env python3
"""
Scrape the Harvard CS multi-year course plan (instructor assignments by semester).
Uses the backend API powering https://info.seas.harvard.edu/courses/four-year-plan
Outputs: src/data/four_year_plan.json
"""

import requests
import json
import re
import os
import sys

BASE_URL = "https://computingapps-pub.seas.harvard.edu/course-planner"
HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://info.seas.harvard.edu/",
    "Origin": "https://info.seas.harvard.edu",
}
OUTPUT = os.path.join(os.path.dirname(__file__), "../src/data/four_year_plan.json")


def to_sem_id(term, calendar_year):
    """Convert ('FALL', '2026') → 'f26', ('SPRING', '2027') → 's27'."""
    prefix = 'f' if term == 'FALL' else 's'
    return f"{prefix}{str(calendar_year)[-2:]}"


def sem_order_key(term, calendar_year):
    """Comparable sort key for semester ordering."""
    year = int(calendar_year)
    # SPRING comes before FALL in the same calendar year
    return (year, 0 if term == 'SPRING' else 1)


def get_upcoming(current_term, current_year):
    """Return (term, year) of the semester immediately after current."""
    if current_term == 'SPRING':
        return ('FALL', current_year)
    else:
        return ('SPRING', current_year + 1)


def norm_code(code):
    """Normalize catalog number to 'CS XX' format with uppercase suffix."""
    code = code.strip()
    code = re.sub(r'COMPSCI\s*', 'CS ', code, flags=re.IGNORECASE)
    code = re.sub(r'^CS(\d)', r'CS \1', code)
    code = re.sub(r'\s+', ' ', code).strip()
    # Uppercase any trailing letter suffix (e.g. 'CS 91r' → 'CS 91R')
    code = re.sub(r'(\d)([a-z]+)$', lambda m: m.group(1) + m.group(2).upper(), code)
    return code


def main():
    # 1. Get current semester from metadata
    print("Fetching metadata...")
    try:
        meta_resp = requests.get(BASE_URL + "/api/metadata/", headers=HEADERS, timeout=10)
        meta_resp.raise_for_status()
        meta = meta_resp.json()
    except Exception as e:
        print(f"Error fetching metadata: {e}")
        with open(OUTPUT, 'w') as f:
            json.dump({}, f)
        sys.exit(0)

    current_term = meta["currentSemester"]["term"]
    current_year = int(meta["currentSemester"]["calendarYear"])
    upcoming_term, upcoming_year = get_upcoming(current_term, current_year)
    upcoming_key = sem_order_key(upcoming_term, upcoming_year)

    print(f"  Current semester: {current_term} {current_year}")
    print(f"  Upcoming semester (catalog.json): {upcoming_term} {upcoming_year}")
    print(f"  Four-year plan: all semesters after {upcoming_term} {upcoming_year}")

    # 2. Fetch all course instances
    print("Fetching multi-year plan...")
    try:
        resp = requests.get(BASE_URL + "/api/course-instances/multi-year-plan",
                            headers=HEADERS, timeout=30)
        resp.raise_for_status()
        courses = resp.json()
    except Exception as e:
        print(f"Error fetching course instances: {e}")
        with open(OUTPUT, 'w') as f:
            json.dump({}, f)
        sys.exit(0)

    print(f"  Fetched {len(courses)} course entries")

    # 3. Build output grouped by semId, excluding current/past/upcoming semesters
    result = {}
    current_key = sem_order_key(current_term, current_year)

    for course in courses:
        code = norm_code(course.get("catalogNumber", ""))
        title = course.get("title", "")

        for sem in course.get("semesters", []):
            sem_term = sem.get("term", "")
            sem_year = sem.get("calendarYear", "")
            if not sem_term or not sem_year:
                continue

            sem_key = sem_order_key(sem_term, str(sem_year))

            # Only include semesters strictly after the upcoming one
            if sem_key <= upcoming_key:
                continue

            instance = sem.get("instance") or {}
            faculty = instance.get("faculty", [])
            # Skip if no instructor assigned — empty faculty means not offered this semester
            if not faculty:
                continue

            sem_id = to_sem_id(sem_term, str(sem_year))
            instructor_names = [f["displayName"] for f in faculty if f.get("displayName")]
            instructor = ", ".join(instructor_names) if instructor_names else "TBD"

            if sem_id not in result:
                result[sem_id] = []

            # Avoid duplicates
            if not any(c["code"] == code for c in result[sem_id]):
                result[sem_id].append({
                    "code": code,
                    "title": title,
                    "instructor": instructor,
                })

    total = sum(len(v) for v in result.values())
    print(f"  Found {total} course entries across {len(result)} semesters")
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, 'w') as f:
        json.dump(result, f, indent=2)
    print(f"  Written to {OUTPUT}")


if __name__ == '__main__':
    main()
