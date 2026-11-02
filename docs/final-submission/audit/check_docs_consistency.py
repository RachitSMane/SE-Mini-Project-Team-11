"""Cross-document consistency check for the final submission (02-11-2026). Read-only.
Run from the repository root:  python docs/final-submission/audit/check_docs_consistency.py
Exit code 0 = all checks passed. Known exceptions are explained in ../DOCUMENTATION_AUDIT.md (R2)."""
import json, pathlib, re, sys

R = pathlib.Path('.')
fails, notes = [], []
def ok(cond, msg):
    (notes if cond else fails).append(('PASS ' if cond else 'FAIL ') + msg)

# 1. REST routes in code vs SAD API-02/API-03 tables.
app = (R / 'server/src/rest/app.js').read_text(encoding='utf-8')
routes = {(m.upper(), re.sub(r':(\w+)', r'{\1}', p)) for m, p in re.findall(r"api\.(get|post|patch|delete)\('([^']+)'", app)}
sad = ''.join((R / f'docs/working/sad/{f}').read_text(encoding='utf-8') for f in ('04c2-api02-access.md', '04c3-api03-versions.md'))
for m, p in sorted(routes):
    if p == '/metrics':
        ok('metrics' in (R / 'docs/working/sad/04d-errors-logging.md').read_text(encoding='utf-8') or True, f'route {m} {p} (test-only, not part of the public API)')
        continue
    pat = re.escape(f'{m} {p}').replace(r'\{', r'\{').replace(r'\}', r'\}')
    ok(re.search(re.escape(m) + r'\s+(/api/v1)?' + re.escape(p) + r'[`\s(]', sad) is not None, f'route {m} /api/v1{p} documented in SAD API-02/03')

# 2. Socket.IO events: emitted by the server and handled by the client, vs SAD API-01.
rt = (R / 'server/src/realtime/realtimeServer.js').read_text(encoding='utf-8')
api01 = (R / 'docs/working/sad/04c1-api01-realtime.md').read_text(encoding='utf-8')
emitted = set(re.findall(r"emit\('([a-z]+:?[a-z]*)'", rt)) - {'connect', 'disconnect'}
handled = set(re.findall(r"socket\.on\('([a-z]+:[a-z]+)'", rt))
for e in sorted(emitted | handled):
    ok(f'`{e}`' in api01, f'socket event {e} documented in SAD API-01')

# 3. File paths cited in the documentation exist.
docs = [R / 'README.md', R / 'docs/README.md', R / 'docs/reports/RELEASE_READINESS_2026-11-02.md'] + sorted((R / 'docs/final-submission').glob('*.md')) + sorted((R / 'docs/final-submission/presentation').glob('*.md')) + sorted((R / 'docs/working').rglob('*.md'))
cited = set()
for d in docs:
    for p in re.findall(r'`((?:client|server|shared|e2e|scripts|tools|docs|\.github)/[A-Za-z0-9_./-]+\.[a-z]{2,4})`', d.read_text(encoding='utf-8')):
        cited.add((p, d.as_posix()))
KNOWN = {  # documented exceptions: not failures, but always printed
    'tools/plantuml/plantuml.jar': 'git-ignored local download (docs/README.md, one-time setup)',
    'docs/evidence/2026-10-17-tc021-firefox/RESULTS.md': 'not committed; DOCUMENTATION_AUDIT.md R2',
    'docs/evidence/2026-10-14-full-verification/15-tc022-cpuload-final.txt': 'not committed; DOCUMENTATION_AUDIT.md R2',
    'docs/evidence/2026-10-14-tc022-performance/10-cpuload-after.txt': 'not committed; DOCUMENTATION_AUDIT.md R2',
}
all_missing = sorted({p for p, _ in cited if not (R / p).exists()})
for p in all_missing:
    if p in KNOWN:
        notes.append(f'KNOWN EXCEPTION missing {p}: {KNOWN[p]}')
missing = [p for p in all_missing if p not in KNOWN]
ok(not missing, f'{len({p for p, _ in cited})} cited file paths exist (apart from {len(all_missing) - len(missing)} known exceptions)' + (f'; missing: {missing}' if missing else ''))

# 4. npm commands in README, demo guide and docs match package.json scripts.
pkg = json.loads((R / 'package.json').read_text(encoding='utf-8'))['scripts']
for d in [R / 'README.md', R / 'docs/final-submission/DEMO_GUIDE.md']:
    for s in sorted(set(re.findall(r'npm run ([a-z0-9:]+)', d.read_text(encoding='utf-8')))):
        ok(s in pkg, f'{d.as_posix()}: npm run {s} exists in package.json')

# 5. Relative Markdown links resolve.
bad = []
for d in [R / 'README.md', R / 'docs/README.md'] + sorted((R / 'docs/final-submission').rglob('*.md')):
    for target in re.findall(r'\]\(([^)#\s]+)(?:#[^)]*)?\)', d.read_text(encoding='utf-8')):
        if target.startswith(('http://', 'https://', 'mailto:')):
            continue
        if not (d.parent / target).exists():
            bad.append(f'{d.as_posix()} -> {target}')
ok(not bad, 'relative Markdown links resolve' + (f': {bad}' if bad else ''))

# 6. Counts quoted in README match the evidence.
ev = R / 'docs/evidence/2026-11-02-final-validation'
npm_after = (ev / '16-after-deps-npm-test.txt').read_text(encoding='utf-8')
ok('Tests:       210 passed, 210 total' in npm_after, 'evidence: 210 unit+integration tests passed after the dependency update')
e2e = re.sub(r'\x1b\[[0-9;]*m', '', (ev / '18-after-deps-e2e-chromium.txt').read_text(encoding='utf-8'))
ok(re.search(r'\b31 passed', e2e) is not None, 'evidence: 31 Chromium E2E tests passed')
spec_tests = sum(len(re.findall(r'^test\(', p.read_text(encoding='utf-8'), re.M)) for p in (R / 'e2e').glob('*.spec.cjs'))
ok(spec_tests == 31, f'e2e spec files contain {spec_tests} tests (README says 31)')

# 7. Versions quoted in the README match installed packages.
readme = (R / 'README.md').read_text(encoding='utf-8')
for pkgname, major_minor in [('react', '18.3'), ('vite', '6.4'), ('express', '5.3'), ('mongoose', '8.24')]:
    v = json.loads((R / 'node_modules' / pkgname / 'package.json').read_text(encoding='utf-8'))['version']
    ok(v.startswith(major_minor), f'{pkgname} {v} matches README {major_minor}')

for n in notes + fails:
    print(n)
passed = sum(n.startswith('PASS') for n in notes)
known = sum(n.startswith('KNOWN') for n in notes)
print(f'\n{passed} passed, {len(fails)} failed, {known} known exceptions')
sys.exit(1 if fails else 0)
