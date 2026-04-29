#!/usr/bin/env python3
"""
Scrape CS requirement tags from the Harvard CS advising page.
Outputs: src/data/tags.json
"""

import requests
import json
import re
import os
import sys

try:
    from bs4 import BeautifulSoup, Tag
except ImportError:
    print("Missing dependency: pip install beautifulsoup4 requests")
    sys.exit(1)

URL = "https://csadvising.seas.harvard.edu/concentration/courses/tags/"
OUTPUT = os.path.join(os.path.dirname(__file__), "../src/data/tags.json")

# Maps table tag values (comma-separated in Tags column) to app tag keys.
# Tags not in this map (corecs, linearalgebra, probability, secondary) are ignored.
TABLE_TAG_MAP = {
    "programming1": "prog1",
    "programming2": "prog2",
    "formalreasoning": "formal",
    "discretemath": "discmath",
    "complimitations": "complim",
    "algorithms": "alg",
    "intermediatealgorithms": "intalg",
    "systems": "systems",
    "computationandtheworld": "world",
    "ai": "ai",
    "advancedcs": "adv",
}


def norm_code(code):
    """Extract and normalize primary course code.

    'CS 1050 (formerly CS105)' → 'CS 1050'
    'CS 2232 / MIT 6.5430'     → 'CS 2232'
    'COMPSCI 50'               → 'CS 50'
    'CS50'                     → 'CS 50'
    'AC215'                    → 'AC 215'
    """
    code = code.strip()
    code = re.sub(r'COMPSCI\s*', 'CS ', code, flags=re.IGNORECASE)
    # Take only up to the first '(' or '/'
    code = re.split(r'[(/]', code)[0].strip()
    # Add space between prefix letters and digits if missing (e.g. CS50 → CS 50)
    code = re.sub(r'^([A-Za-z]+)(\d)', r'\1 \2', code)
    return re.sub(r'\s+', ' ', code).strip()


def main():
    print(f"Fetching {URL}...")
    try:
        resp = requests.get(URL, timeout=20)
        resp.raise_for_status()
    except Exception as e:
        print(f"Error: {e}")
        with open(OUTPUT, 'w') as f:
            json.dump({}, f)
        sys.exit(0)

    soup = BeautifulSoup(resp.text, 'html.parser')
    tags_map = {}

    # The page has a single table with id="tag-table"
    table = soup.find('table', id='tag-table')
    if not isinstance(table, Tag):
        # Fallback: find any table
        table = soup.find('table')

    if isinstance(table, Tag):
        rows = table.find_all('tr')[1:]  # skip header row
        for row in rows:
            if not isinstance(row, Tag):
                continue
            cells = row.find_all(['td', 'th'])
            if len(cells) < 3:
                continue

            code_text = cells[0].get_text(strip=True)
            if not code_text:
                continue

            code = norm_code(code_text)
            tag_text = cells[2].get_text(strip=True)
            if not tag_text:
                continue

            found_tags = [
                TABLE_TAG_MAP[t.strip()]
                for t in tag_text.split(',')
                if t.strip() in TABLE_TAG_MAP
            ]

            if found_tags:
                # Merge if code already seen (some courses appear in multiple rows)
                if code in tags_map:
                    for t in found_tags:
                        if t not in tags_map[code]:
                            tags_map[code].append(t)
                else:
                    tags_map[code] = found_tags

    print(f"  Found tags for {len(tags_map)} courses")
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, 'w') as f:
        json.dump(tags_map, f, indent=2, sort_keys=True)
    print(f"  Written to {OUTPUT}")


if __name__ == '__main__':
    main()
