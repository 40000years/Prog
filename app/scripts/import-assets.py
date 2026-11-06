import concurrent.futures
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'content/wiki.json').read_text())
sources = set()
def walk(item):
    if isinstance(item, dict):
        if isinstance(item.get('src'), str) and item['src'].startswith('assets/'):
            sources.add(item['src'])
        for value in item.values(): walk(value)
    elif isinstance(item, list):
        for value in item: walk(value)
walk(data)
def download(src):
    path = ROOT / 'public' / src
    path.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen('https://evergardenwiki.vercel.app/' + src, timeout=60) as response:
        path.write_bytes(response.read())
    return src
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    print('Imported', len(list(pool.map(download, sorted(sources)))), 'original wiki illustrations')

url = 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=IBM+Plex+Sans+Thai:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap'
request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(request, timeout=60) as response: css = response.read().decode()
urls = list(dict.fromkeys(re.findall(r'url\((https://[^)]+)\)', css)))
for index, font_url in enumerate(urls):
    ext = '.woff2' if '.woff2' in font_url else '.ttf'
    name = f'font-{index}{ext}'
    with urllib.request.urlopen(font_url, timeout=60) as response:
        (ROOT / 'public/fonts' / name).write_bytes(response.read())
    css = css.replace(font_url, '/fonts/' + name)
(ROOT / 'src/app/fonts.css').write_text(css)
print('Self-hosted', len(urls), 'font files')
