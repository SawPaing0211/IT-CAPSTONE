"""
DEMO-ONLY simulated code runner. It does NOT execute any code.

It exists so a throwaway demo can show pass/fail screens on a machine without Docker. Its output is
simulated, never evidence that grading works. Guards:
  * nothing in app.py imports this file: the stub exists only when a demo script calls install(), so setting
    an environment variable on a normal deployment cannot turn it on,
  * needs FORGE_DEMO_RUNNER=1 AND FORGE_DEMO=1 (which already requires a database named demo/test on this machine),
  * the database must also carry the synthetic-data marker written by seed_demo.py (system_config
    'demo_database'); a database that already holds users but has no marker is refused whatever its name,
  * the app refuses to start in production (FORGE_ENV=production) if either flag is set,
  * it switches the app to EXECUTION_MODE 'demo-stub', which is stored with every result,
    returned by /api/health and shown as a banner in the interface.
Rule: 'raise' in the code -> runtime error, 'wrong' in the code -> wrong output, otherwise every test passes.
"""
import os

DEMO_MARKER_KEY = 'demo_database'
DEMO_MARKER_VALUE = 'synthetic-demo-data'


def install(app_module):
    if os.environ.get('FORGE_DEMO_RUNNER') != '1' or os.environ.get('FORGE_DEMO') != '1':
        raise SystemExit("demo_runner needs FORGE_DEMO_RUNNER=1 and FORGE_DEMO=1")
    if os.environ.get('FORGE_ENV', '').strip().lower() == 'production':
        raise SystemExit("demo_runner must never be used in production")

    from sqlalchemy import inspect as _inspect
    with app_module.app.app_context():
        insp = _inspect(app_module.db.engine)
        if 'users' in insp.get_table_names() and app_module.User.query.first() is not None:
            marker = app_module.SystemConfig.query.filter_by(key=DEMO_MARKER_KEY).first()
            if not marker or marker.value != DEMO_MARKER_VALUE:
                raise SystemExit("demo_runner refuses: this database holds users but is not marked as synthetic demo data")

    def simulated(code, tests, language, raise_on_infra=False):
        out = []
        for tc in tests:
            hidden = tc.get('visible', True) is False
            if 'raise' in code:
                out.append({'passed': False, 'message': 'Runtime error (simulated)', 'output': 'Simulated error', 'kind': 'runtime_error', 'hidden': hidden})
            elif 'wrong' in code:
                out.append({'passed': False, 'message': 'Wrong output (simulated)', 'output': 'Hidden' if hidden else 'simulated output', 'kind': 'wrong_output', 'hidden': hidden})
            else:
                out.append({'passed': True, 'message': 'Passed (simulated)', 'output': 'Hidden' if hidden else str(tc.get('expected', '')), 'kind': 'passed', 'hidden': hidden})
        return out

    app_module.evaluate_code = simulated
    app_module.EXECUTION_MODE = 'demo-stub'
