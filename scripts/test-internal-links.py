from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
import sys

root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
pages = list(root.glob('*.html')) + list((root/'kiosk').glob('*.html'))

class Read(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.refs = []
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if values.get('id'): self.ids.add(values['id'])
        for key in ('href','src'):
            if values.get(key): self.refs.append((tag,key,values[key]))

parsed = {}
for page in pages:
    parser=Read(); parser.feed(page.read_text(encoding='utf-8')); parsed[page]=parser

failures=[]
for page, data in parsed.items():
    for tag,key,raw in data.refs:
        url=urlparse(raw)
        if url.scheme or url.netloc or raw.startswith('//'): continue
        if raw.startswith('#') and raw == '#': continue
        path=unquote(url.path)
        if path.startswith('/'):
            target=(root/path.lstrip('/'))
        elif path:
            target=page.parent/path
        else:
            target=page
        if not path or path.endswith('/'):
            target=target/'index.html' if path else page
        elif not target.suffix:
            target=target.with_suffix('.html')
        target=target.resolve()
        if not target.is_file():
            failures.append(f'{page.relative_to(root)}: missing {tag}.{key} {raw}')
        elif url.fragment and target in parsed and unquote(url.fragment) not in parsed[target].ids:
            failures.append(f'{page.relative_to(root)}: missing #{url.fragment} in {target.relative_to(root)}')
print('\n'.join(failures) if failures else 'No missing internal targets or fragments')
sys.exit(bool(failures))
