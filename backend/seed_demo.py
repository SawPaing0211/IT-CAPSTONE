"""
Forge.Dev ISOLATED DEMO SEED  (synthetic data only)

Builds a throwaway demo database by driving the application's own HTTP endpoints, so
the data obeys the same rules as real use (access control, one graded submission per
student per problem, XP/achievement logic, password policy).

SAFETY
  * Refuses to run unless FORGE_DEMO=1 and DATABASE_URL is a *sqlite file whose name
    contains "demo"* (it deletes and recreates that one file). It never touches MySQL.
  * Everything here is fictional. Subjects are the PROVISIONAL first-year list already
    in the code (the official prospectus is still pending). Sections/class codes are made up.
  * The code runner is replaced by a canned SIMULATION (no Docker needed); results are recorded with
    runner = 'demo-stub' so they can never be mistaken for real grading. Needs FORGE_DEMO_RUNNER=1.
  * Demo passwords are random, written to demo_credentials.local.txt in the working
    directory (gitignored; never put them in screenshots or the ZIP).

Attachments are written to <database folder>/demo_uploads (FORGE_UPLOADS_DIR is set here):
  FORGE_DEMO=1 FORGE_DEMO_RUNNER=1 DATABASE_URL=sqlite:////path/forge_demo.db \
  HEAD_ADMIN_EMAIL=demo.admin@forge-demo.example python /path/to/backend/seed_demo.py
"""
import io, os, sys, base64, csv, json, secrets, string
from datetime import datetime, timedelta

url = os.environ.get('DATABASE_URL', '')
if os.environ.get('FORGE_DEMO', '') != '1' or os.environ.get('FORGE_DEMO_RUNNER', '') != '1' or not url.startswith('sqlite:///') or 'demo' not in os.path.basename(url).lower():
    raise SystemExit("Refusing to run: needs FORGE_DEMO=1, FORGE_DEMO_RUNNER=1 and DATABASE_URL=sqlite:///...demo....db")
path = url[len('sqlite:///'):]
if os.path.exists(path):
    os.remove(path)
# the demo's attachments go to a folder beside the demo database, never into the project's uploads folder
_up = os.path.join(os.path.dirname(os.path.abspath(path)), 'demo_uploads')
import shutil; shutil.rmtree(_up, ignore_errors=True)
os.environ['FORGE_UPLOADS_DIR'] = _up
os.environ['FORGE_AUTO_SCHEMA'] = '1'
os.environ.setdefault('STUDENT_EMAIL_DOMAIN', 'student.com')
os.environ.setdefault('HEAD_ADMIN_EMAIL', 'demo.admin@forge-demo.example')
os.environ.pop('FORGE_ENV', None)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import app as A
A.EXECUTION_MODE = 'demo-stub'
import demo_runner
with A.app.app_context():
    # marks this database as synthetic: demo_runner.install() refuses any database that holds users without it
    A.db.session.add(A.SystemConfig(key=demo_runner.DEMO_MARKER_KEY, value=demo_runner.DEMO_MARKER_VALUE))
    A.db.session.commit()
from werkzeug.security import generate_password_hash

c = A.app.test_client()


def pw():
    a = string.ascii_letters + string.digits
    return 'Dm' + ''.join(secrets.choice(a) for _ in range(9)) + '7'


def call(method, p, token=None, **kw):
    A.rate_limit_store.clear(); A.login_fail_store.clear()
    h = {'Authorization': f'Bearer {token}'} if token else {}
    r = getattr(c, method)(p, headers=h, **kw)
    return r


def ok(r, *codes):
    if r.status_code not in (codes or (200, 201)):
        raise SystemExit(f"seed failed: {r.status_code} {r.get_data(as_text=True)[:300]}")
    return r.get_json()


def login(u, p):
    return ok(call('post', '/api/auth/login', json={'username': u, 'password': p}))['access_token']


creds = []      # (role, login, password, note)

# ---- accounts that need direct creation: the demo head administrator ----
ADMIN_PW = pw()
with A.app.app_context():
    adm = A.User(username='DemoAdmin', email=A.HEAD_ADMIN_EMAIL, role='administrator', full_name='Demo Administrator',
                 password_hash=generate_password_hash(ADMIN_PW), is_active=True, xp=0, level=1)
    A.db.session.add(adm); A.db.session.commit()
creds.append(('administrator', 'DemoAdmin', ADMIN_PW, 'demo head administrator'))
AT = login('DemoAdmin', ADMIN_PW)

# ---- subjects (provisional first-year list already seeded by the app) & sections ----
ok(call('post', '/api/admin/seed-subjects', AT))   # provisional first-year list
subs = {x['subject_code']: x['id'] for x in ok(call('get', '/api/admin/subjects', AT))}
SECTIONS = [('29022', 'IT116L', 'MWF 8:00-9:00', 'Lab 1', 1), ('29023', 'IT116L', 'TTh 10:00-11:30', 'Lab 2', 1),
            ('29030', 'IT115L', 'MWF 9:00-10:00', 'Lab 3', 1), ('30011', 'IT125L', 'TTh 1:00-2:30', 'Lab 1', 2)]
sec = {}
for no, code, sched, room, sem in SECTIONS:
    r = ok(call('post', '/api/admin/sections', AT, json={'section_no': no, 'subject_id': subs[code], 'schedule': sched, 'room': room,
                                                          'capacity': 40, 'semester': f'Semester {sem} (provisional)', 'academic_year': 'Demo AY'}), 201)
    sec[no] = r.get('section', {}).get('id') or r.get('id') or r.get('section_id')
if not all(sec.values()):
    with A.app.app_context():
        sec = {s.section_no: s.id for s in A.SubjectSection.query.all()}

# ---- staff (clearly synthetic) ----
staff = {}
for uname, email, full in [('demo.instructor1', 'instructor1@forge-demo.example', 'Demo Instructor One'),
                           ('demo.instructor2', 'instructor2@forge-demo.example', 'Demo Instructor Two')]:
    p_ = pw()
    r = ok(call('post', '/api/admin/users', AT, json={'username': uname, 'email': email, 'password': p_, 'role': 'instructor', 'full_name': full}), 201)
    staff[uname] = r['user']['id']
    # first-login change is demonstrated on the new student; staff get a final password via the real endpoint
    t = login(uname, p_)
    newp = pw()
    ok(call('post', '/api/auth/change-password', t, json={'current_password': p_, 'new_password': newp}))
    creds.append(('instructor', uname, newp, full))
I1, I2 = staff['demo.instructor1'], staff['demo.instructor2']
for ins, secs in [(I1, ['29022', '29030']), (I2, ['29023', '30011'])]:
    for no in secs:
        code = next(s[1] for s in SECTIONS if s[0] == no)
        ok(call('post', '/api/admin/instructor-assignments', AT, json={'instructor_id': ins, 'subject_id': subs[code], 'section_id': sec[no]}), 201)

# ---- students via the real master enrollment CSV ----
rows = [  # id, first, last, type, section
    ('DEMO-0001', 'Ana', 'Reyes', 'regular', '29022'), ('DEMO-0001', 'Ana', 'Reyes', 'regular', '29030'),
    ('DEMO-0002', 'Ben', 'Cruz', 'irregular', '29022'), ('DEMO-0002', 'Ben', 'Cruz', 'irregular', '30011'),
    ('DEMO-0003', 'Cara', 'Lim', 'regular', '29022'),
    ('DEMO-0004', 'Dan', 'Santos', 'regular', '29022'), ('DEMO-0004', 'Dan', 'Santos', 'regular', '29030'),
]
names = ['Eli Ramos', 'Fay Dizon', 'Gio Tan', 'Hana Cruz', 'Ian Lopez', 'Jade Uy', 'Kai Pena', 'Lea Bravo']
for i, n in enumerate(names, start=5):
    f, l = n.split()
    rows.append((f'DEMO-{i:04d}', f, l, 'regular', '29022'))
buf = io.StringIO(); w = csv.writer(buf)
w.writerow(['student_id', 'firstname', 'middlename', 'lastname', 'suffix', 'student_type', 'section_no'])
for sid, f, l, t, s in rows:
    w.writerow([sid, f, '', l, '', t, s])
r = call('post', '/api/admin/enrollment/bulk-upload', AT, data={'file': (io.BytesIO(buf.getvalue().encode()), 'demo_enrollment.csv')}, content_type='multipart/form-data')
body = ok(r, 200, 207)
if body['summary'].get('errors'):
    raise SystemExit(f"enrollment errors: {body.get('errors')}")
temp = {}
for row in csv.DictReader(io.StringIO(base64.b64decode(body['credential_csv']).decode())):
    k = {x.lower(): v for x, v in row.items()}
    sid = k.get('student_id') or k.get('username')
    temp[sid] = k.get('temporary_password') or k.get('password') or k.get('temp_password')
assert temp and all(temp.values()), f"could not read temp passwords from credential csv: {list(row.keys())}"

# students (except DEMO-0003) set a final password; DEMO-0003 keeps its temporary password to show the forced-change screen
ST = {}
for sid in sorted(temp):
    if sid == 'DEMO-0003':
        creds.append(('student', sid, temp[sid], 'NEW student: still on temporary password (forced change screen)'))
        continue
    t = login(sid, temp[sid]); newp = pw()
    ok(call('post', '/api/auth/change-password', t, json={'current_password': temp[sid], 'new_password': newp}))
    ST[sid] = login(sid, newp)
    note = {'DEMO-0001': 'REGULAR student, 2 subjects', 'DEMO-0002': 'IRREGULAR student, 2 subjects (different sections)',
            'DEMO-0004': 'ACTIVE student with progress'}.get(sid, 'classmate (leaderboard)')
    creds.append(('student', sid, newp, note))

# ---- instructor content ----
T1 = login(*[(u, p) for r_, u, p, n in creds if u == 'demo.instructor1'][0])
T2 = login(*[(u, p) for r_, u, p, n in creds if u == 'demo.instructor2'][0])
now = datetime.utcnow()


def ann(tok, sno, title, content, prio, pinned=False):
    ok(call('post', '/api/announcements', tok, json={'title': title, 'content': content, 'class_id': sec[sno], 'priority': prio, 'is_pinned': pinned}), 201)


ann(T1, '29022', 'Welcome to Fundamentals of Programming Lab', 'Please read the lab guidelines before our first session.', 'low')
ann(T1, '29022', 'Quest deadline reminder', 'The Event Quest closes at the end of this week. Submit early: you only get one graded submission per quest.', 'high', True)
ann(T1, '29022', 'Room change',
    'Starting next meeting we move to Lab 2. ' + 'Please bring your ID and check the posted schedule. ' * 6, 'medium')
ann(T1, '29030', 'Intro to Computing: orientation', 'First module is posted. Review it before class.', 'medium')
ann(T2, '30011', 'Midterm quest window', 'Details to follow. Watch this space.', 'high')

LES = [  # section, week, title, desc, published, attach
    ('29022', 1, 'Week 1: Variables and Output', 'Printing, variables and basic types.', True, True),
    ('29022', 2, 'Week 2: Conditionals', 'if / elif / else with worked examples.', True, True),
    ('29022', 3, 'Week 3: Loops', 'for and while loops.', True, False),
    ('29022', 4, 'Week 4: Functions (draft, not published)', 'Unpublished: students must not see this.', False, False),
    ('29030', 1, 'Week 1: What is a computer?', 'Hardware, software and data.', True, True),
    ('30011', 1, 'Week 1: Programming 1 overview', 'Course outline.', True, False),
]
for sno, wk, title, desc, pub, att in LES:
    tok = T2 if sno == '30011' else T1
    sid_ = subs[next(s[1] for s in SECTIONS if s[0] == sno)]
    r = ok(call('post', '/api/lessons', tok, json={'title': title, 'description': desc, 'week_number': wk, 'subject_id': sid_, 'section_id': sec[sno], 'is_published': pub}), 201)
    if att:
        # a tiny valid PDF made on the fly: harmless sample attachment
        pdf = b"%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
        ok(call('post', f"/api/lessons/{r['lesson_id']}/files", tok, data={'file': (io.BytesIO(pdf), 'sample-handout.pdf')}, content_type='multipart/form-data'), 201, 200)

def _tc(*pairs, hidden=()):
    return [{'input': i, 'expected': e, 'visible': True} for i, e in pairs] + [{'input': i, 'expected': e, 'visible': False} for i, e in hidden]


TWO = "a, b = map(int, input().split())\n# your code here\n"
ONE = "n = int(input())\n# your code here\n"
# every synthetic quest has a description, examples and starter code that agree with each other
SPECS = {
    'Add Two Numbers': ("Read two integers on one line and print their sum.", _tc(('2 3', '5'), ('10 -4', '6'), hidden=[('1000 2000', '3000'), ('0 0', '0')]), TWO),
    'Find the Larger': ("Read two integers on one line and print the larger one.", _tc(('2 3', '3'), ('10 -4', '10'), hidden=[('1000 2000', '2000'), ('7 7', '7')]), TWO),
    'FizzBuzz Variant': ("Read n. Print 1 to n, one number per line, but print Fizz for multiples of 3, Buzz for multiples of 5 and FizzBuzz for multiples of both.", _tc(('5', '1\n2\nFizz\n4\nBuzz'), ('3', '1\n2\nFizz'), hidden=[('15', '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz')]), ONE),
    'Reverse a String': ("Read one line of text and print it reversed.", _tc(('forge', 'egrof'), ('abc', 'cba'), hidden=[('a', 'a'), ('level up', 'pu level')]), "text = input()\n# your code here\n"),
    'Prime Counter': ("Read n and print how many prime numbers are less than or equal to n.", _tc(('10', '4'), ('30', '10'), hidden=[('2', '1'), ('1', '0')]), ONE),
    'Debug: Off-by-one Sum': ("The starter code should print the sum of 1 to n, but it stops one short. Fix it.", _tc(('4', '10'), ('1', '1'), hidden=[('100', '5050')]), "n = int(input())\ntotal = 0\nfor i in range(1, n):\n    total += i\nprint(total)\n"),
    'Debug: Broken Average': ("The starter code should print the average of three integers, rounded down, but it divides by the wrong number. Fix it.", _tc(('3 4 5', '4'), ('1 1 1', '1'), hidden=[('10 20 30', '20'), ('0 0 1', '0')]), "a, b, c = map(int, input().split())\nprint((a + b + c) // 2)\n"),
    'EVENT: Weekly Challenge': ("Read n and print the n-th Fibonacci number, where the 1st and 2nd are both 1.", _tc(('6', '8'), ('10', '55'), hidden=[('1', '1'), ('20', '6765')]), ONE),
    'Warm-up (closed)': ("Read a name and print Hello, followed by the name and an exclamation mark.", _tc(('Alice', 'Hello, Alice!'), ('Ben', 'Hello, Ben!'), hidden=[('Cy', 'Hello, Cy!')]), "name = input()\n# your code here\n"),
    'Quiz Drill (due soon)': ("Read an integer and print even or odd.", _tc(('4', 'even'), ('7', 'odd'), hidden=[('0', 'even'), ('-3', 'odd')]), ONE),
    'Unpublished idea (instructor only)': ("Read an integer and print its square.", _tc(('3', '9'), ('-2', '4'), hidden=[('0', '0')]), ONE),
    'Number Basics': ("Read an integer and print its absolute value.", _tc(('-5', '5'), ('8', '8'), hidden=[('0', '0')]), ONE),
    'Binary Sum': ("Read two binary numbers on one line and print their sum in binary.", _tc(('101 11', '1000'), ('1 1', '10'), hidden=[('0 0', '0')]), "a, b = input().split()\n# your code here\n"),
    'Programming 1: Hello Input': ("Read a name and print Hello, followed by the name and an exclamation mark.", _tc(('Dana', 'Hello, Dana!'), ('Eli', 'Hello, Eli!'), hidden=[('Fay', 'Hello, Fay!')]), "name = input()\n# your code here\n"),
}
P = {}


def prob(key, tok, sno, title, diff, xp, ptype='coding', due=None, event=False, pub=True, desc=None, cat='Basics'):
    code = next(s[1] for s in SECTIONS if s[0] == sno)
    spec_desc, spec_cases, spec_starter = SPECS[title]
    body = {'title': title, 'description': desc or spec_desc, 'difficulty': diff, 'xp_reward': xp,
            'test_cases': spec_cases, 'subject_id': subs[code], 'visible_to_sections': [sec[sno]], 'problem_type': ptype,
            'languages': ['python'], 'starter_code': {'python': spec_starter}, 'is_published': pub, 'is_event_quest': event, 'category': cat,
            'hints': ['Read the input with input().', 'Print only the answer, with no extra text.'], 'tags': ['demo'], 'estimated_time': 15}
    if due:
        body['due_date'] = due.isoformat()
    P[key] = ok(call('post', '/api/problems', tok, json=body), 201)['problem_id']


prob('sum_easy', T1, '29022', 'Add Two Numbers', 'Easy', 50)
prob('max_easy', T1, '29022', 'Find the Larger', 'Easy', 60)
prob('fizz_med', T1, '29022', 'FizzBuzz Variant', 'Medium', 150, cat='Loops')
prob('rev_med', T1, '29022', 'Reverse a String', 'Medium', 180, cat='Strings')
prob('prime_hard', T1, '29022', 'Prime Counter', 'Hard', 400, cat='Algorithms')
prob('dbg_easy', T1, '29022', 'Debug: Off-by-one Sum', 'Easy', 70, ptype='debugging', cat='Debugging')
prob('dbg_med', T1, '29022', 'Debug: Broken Average', 'Medium', 160, ptype='debugging', cat='Debugging')
prob('event', T1, '29022', 'EVENT: Weekly Challenge', 'Hard', 500, event=True, due=now + timedelta(days=5), cat='Event')
prob('overdue', T1, '29022', 'Warm-up (closed)', 'Easy', 40, due=now - timedelta(days=3))
prob('upcoming', T1, '29022', 'Quiz Drill (due soon)', 'Easy', 45, due=now + timedelta(hours=20))
prob('draft', T1, '29022', 'Unpublished idea (instructor only)', 'Medium', 120, pub=False)
prob('intro1', T1, '29030', 'Number Basics', 'Easy', 50)
prob('intro2', T1, '29030', 'Binary Sum', 'Medium', 150)
prob('p1', T2, '30011', 'Programming 1: Hello Input', 'Easy', 50)

# ---- submissions through the real endpoint, with a canned runner (one per student per problem) ----
KIND = {'passed': {'passed': True, 'message': 'Passed', 'output': 'ok', 'kind': 'passed'},
        'wrong': {'passed': False, 'message': 'Wrong output', 'output': 'x', 'kind': 'wrong_output'},
        'error': {'passed': False, 'message': 'NameError', 'output': 'NameError', 'kind': 'runtime_error'},
        'timeout': {'passed': False, 'message': 'Timeout', 'output': 'Timeout', 'kind': 'timeout'}}


def submit(sid, key, pattern):
    tests = A.Problem  # noqa
    def fake(code, tcs, lang, raise_on_infra=False):
        return [dict(KIND[pattern[i % len(pattern)]]) for i, _ in enumerate(tcs)]
    A.evaluate_code = fake
    r = call('post', '/api/submissions', ST[sid], json={'problem_id': P[key], 'code': 'a, b = map(int, input().split())\nprint(a + b)\n', 'language': 'python'})
    ok(r, 201)


ALL = ['passed'] * 4
HALF = ['passed', 'wrong']
# active student DEMO-0004: five different problems, five different outcomes
submit('DEMO-0004', 'sum_easy', ALL); submit('DEMO-0004', 'fizz_med', HALF)
submit('DEMO-0004', 'rev_med', ['wrong']); submit('DEMO-0004', 'dbg_easy', ['error']); submit('DEMO-0004', 'prime_hard', ['timeout'])
# regular DEMO-0001: a couple of accepted, one in the other subject
submit('DEMO-0001', 'sum_easy', ALL); submit('DEMO-0001', 'max_easy', ALL); submit('DEMO-0001', 'intro1', ALL)
# irregular DEMO-0002: one in each of its two subjects
submit('DEMO-0002', 'sum_easy', HALF); submit('DEMO-0002', 'p1', ALL)
# classmates for the leaderboard
for i, (sid, keys) in enumerate([('DEMO-0005', ['sum_easy', 'max_easy', 'fizz_med', 'event']), ('DEMO-0006', ['sum_easy', 'max_easy', 'fizz_med']),
                                 ('DEMO-0007', ['sum_easy', 'rev_med']), ('DEMO-0008', ['sum_easy']), ('DEMO-0009', ['max_easy', 'dbg_med']),
                                 ('DEMO-0010', ['sum_easy', 'max_easy']), ('DEMO-0011', ['fizz_med']), ('DEMO-0012', ['sum_easy'])]):
    for k in keys:
        submit(sid, k, ALL if (i + hash(k)) % 3 else HALF)

# touch achievement-bearing endpoints so achievements are awarded the normal (lazy) way
for sid in ST:
    call('get', '/api/student/achievements', ST[sid])
    call('get', '/api/student/stats', ST[sid])

with open('demo_credentials.local.txt', 'w') as f:
    f.write('# SYNTHETIC DEMO ACCOUNTS. Local only. Never include in screenshots, ZIP, or git.\n')
    for role, u, p_, note in creds:
        f.write(f'{role}\t{u}\t{p_}\t{note}\n')
with open('demo_ids.json', 'w') as f:
    json.dump({'problems': P, 'sections': sec, 'subjects': subs}, f)
print('DEMO SEED OK:', len(creds), 'accounts;', len(P), 'problems; db =', path)
