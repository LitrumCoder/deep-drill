"""Pack deep-drill/ into build/deep-drill.zip (index.html in the archive root)."""
import hashlib
import pathlib
import re
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'deep-drill'
OUT = ROOT / 'build' / 'deep-drill.zip'
OUT.parent.mkdir(exist_ok=True)

files = sorted(p for p in SRC.rglob('*') if p.is_file() and p.name != '.DS_Store')

# stamp a content hash on local css/js links so players never run a cached mix of old and new files
digest = hashlib.sha1()
for p in files:
    if p.suffix in ('.js', '.css'):
        digest.update(p.relative_to(SRC).as_posix().encode())
        digest.update(p.read_bytes())
ver = digest.hexdigest()[:8]
index = SRC / 'index.html'
html = index.read_text(encoding='utf-8')
html = re.sub(r'((?:src|href)="(?:js|css)/[^"?]+\.(?:js|css))(?:\?v=[0-9a-f]+)?"', rf'\1?v={ver}"', html)
index.write_text(html, encoding='utf-8')
print('version', ver)
bad = [p for p in files if not re.fullmatch(r'[A-Za-z0-9_\-./]+', p.relative_to(SRC).as_posix())]
if bad:
    sys.exit('bad file names: ' + ', '.join(map(str, bad)))

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in files:
        z.write(p, p.relative_to(SRC).as_posix())

with zipfile.ZipFile(OUT) as z:
    names = z.namelist()
    total = sum(i.file_size for i in z.infolist())
    print('\n'.join(names))
    assert 'index.html' in names, 'index.html must be in the archive root'
    assert not any(n.startswith(('promo/', 'tools/')) for n in names)
    assert len(names) <= 1500, 'CrazyGames file limit is 1500'
print(f'\n{OUT}: {len(names)} files, unpacked {total / 1024:.1f} KB, zip {OUT.stat().st_size / 1024:.1f} KB')
