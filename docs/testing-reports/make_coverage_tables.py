"""Prints the Markdown coverage tables used in CODE_COVERAGE_REPORT.md and BRANCH_COVERAGE_REPORT.md.

Input: a Jest `coverage-summary.json` (json-summary reporter). Usage:
    python docs/testing-reports/make_coverage_tables.py docs/testing-reports/evidence/2026-11-05/coverage-summary-unit-and-integration.json

Files that no Jest test loads have 0 statements covered and **0 branches in total**: the V8 provider
cannot see the branches of code that never ran, so Jest prints "100 %" branch coverage for them. This
script marks such files "not loaded" and reports branch totals over loaded files only, so the figure is
never inflated by unexecuted code.
"""
import json
import sys

METRICS = ('statements', 'branches', 'functions', 'lines')
BS = chr(92)


def rel(path):
    path = path.replace(BS, '/')
    for top in ('/client/', '/server/', '/shared/'):
        i = path.find(top)
        if i >= 0:
            return path[i + 1:]
    return path


def pct(c, t):
    return f'{100 * c / t:.2f} %' if t else 'n/a'


def main(summary_file):
    data = json.load(open(summary_file, encoding='utf-8'))
    files = {rel(k): v for k, v in data.items() if k != 'total'}
    layers = {}
    print('### Per file\n')
    print('| File | Statements | Branches | Functions | Lines | Loaded by Jest |')
    print('|---|---|---|---|---|---|')
    for name in sorted(files):
        v = files[name]
        loaded = v['statements']['covered'] > 0 or v['functions']['covered'] > 0
        layer = name.split('/')[0]
        for key in (layer, 'ALL'):
            agg = layers.setdefault(key, {m: [0, 0] for m in METRICS} | {'files': 0, 'unloaded': 0, 'b_loaded': [0, 0]})
            agg['files'] += 1
            agg['unloaded'] += 0 if loaded else 1
            for m in METRICS:
                agg[m][0] += v[m]['covered']
                agg[m][1] += v[m]['total']
            if loaded:
                agg['b_loaded'][0] += v['branches']['covered']
                agg['b_loaded'][1] += v['branches']['total']
        cells = []
        for m in METRICS:
            c, t = v[m]['covered'], v[m]['total']
            cells.append('not measurable (never ran)' if (m == 'branches' and not loaded) else f'{c}/{t} ({pct(c, t)})')
        print(f"| `{name}` | {' | '.join(cells)} | {'yes' if loaded else '**no**'} |")
    print('\n### Per layer\n')
    print('| Layer | Files (not loaded) | Statements | Branches (loaded files) | Functions | Lines |')
    print('|---|---|---|---|---|---|')
    for key in ('shared', 'server', 'client', 'ALL'):
        a = layers.get(key)
        if not a:
            continue
        b = a['b_loaded']
        print(f"| {key} | {a['files']} ({a['unloaded']}) | {a['statements'][0]}/{a['statements'][1]} ({pct(*a['statements'])}) | "
              f"{b[0]}/{b[1]} ({pct(*b)}) | {a['functions'][0]}/{a['functions'][1]} ({pct(*a['functions'])}) | "
              f"{a['lines'][0]}/{a['lines'][1]} ({pct(*a['lines'])}) |")


if __name__ == '__main__':
    main(sys.argv[1])
