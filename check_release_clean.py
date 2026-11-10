"""Fail if a build output, release folder or ZIP contains design-preview or demo-only material.

Usage:
    python check_release_clean.py frontend/dist
    python check_release_clean.py path/to/release_folder_or_package.zip [more paths...]

Exit code 0 = clean, 1 = something forbidden was found, 2 = bad usage.
It only reads; it never changes or deletes anything.
"""
import os
import re
import sys
import zipfile

FORBIDDEN_PATHS = [
    r'(^|/)design-preview(-v\d+)?(/|$)',
    r'(^|/)simple-adventure-preview(/|$)',
    r'(^|/)docs/ui-handoff(/|$)',
    r'(^|/)seed_demo\.py$',
    r'(^|/)demo_runner\.py$',
    r'(^|/)forge_demo\.db$',
    r'(^|/)demo_credentials[^/]*$',
    r'(^|/)_testing(/|$)',
    r'(^|/)node_modules(/|$)',
    r'(^|/)\.env$',
]
# Text markers that only the previews / demo tooling contain.
FORBIDDEN_TEXT = [b'DESIGN PREVIEW', b'Synthetic data \xc2\xb7 No server calls', b'forge-design-preview', b'forge-simple-adventure-preview', b'Review only. Not part of the product', b'Design preview \xc2\xb7 Synthetic data', b'seed_demo', b'demo_credentials']
TEXT_EXT = ('.js', '.css', '.html', '.json', '.map', '.txt', '.md', '.py', '.yml', '.yaml', '.conf')


def entries(target):
    if zipfile.is_zipfile(target):
        with zipfile.ZipFile(target) as z:
            for n in z.namelist():
                yield n, (lambda n=n, z=z: z.read(n))
    elif os.path.isdir(target):
        for d, _, files in os.walk(target):
            for f in files:
                p = os.path.join(d, f)
                yield os.path.relpath(p, target).replace(os.sep, '/'), (lambda p=p: open(p, 'rb').read())
    else:
        raise SystemExit(f'not a folder or zip: {target}')


def main(argv):
    if not argv:
        print(__doc__); return 2
    bad = []
    for t in argv:
        count = 0
        for name, read in entries(t):
            count += 1
            for pat in FORBIDDEN_PATHS:
                if re.search(pat, name):
                    bad.append(f'{t}: forbidden path: {name}'); break
            else:
                if name.endswith(TEXT_EXT):
                    data = read()
                    for m in FORBIDDEN_TEXT:
                        if m in data:
                            bad.append(f'{t}: {name}: contains {m.decode("utf8", "replace")!r}'); break
        print(f'checked {count} files in {t}')
    for b in bad:
        print('FOUND', b)
    print('CLEAN' if not bad else f'{len(bad)} problem(s)')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
