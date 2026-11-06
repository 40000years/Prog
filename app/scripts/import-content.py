"""Import the user's existing public wiki without inventing gameplay information."""
import concurrent.futures
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://evergardenwiki.vercel.app/"

def fetch(path):
    with urllib.request.urlopen(BASE + path, timeout=45) as response:
        return json.load(response)

site = fetch("data/site.json")
paths = [f"{group['id']}/{page['id']}" for group in site['groups'] for page in group['pages']]

def page(path):
    return path, fetch(f"data/pages/{path}.json")

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    pages = dict(pool.map(page, paths))

result = {"source": BASE, "site": site, "pages": pages}
(ROOT / "content/wiki.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
print(f"Imported {len(pages)} original articles across {len(site['groups'])} categories")
