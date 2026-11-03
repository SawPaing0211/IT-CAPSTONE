from harness import *
import sys
W, H, tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
CSV = os.path.expanduser('~/mnt/forge-dev/backend/tests/sample_csv/3_bad_row_missing_section.csv')
# access denied: a student opening the admin and instructor areas
d = driver(W, H); ui_login(d,'DEMO-0004')
d.get(BASE+'/admin'); time.sleep(2.5); shot(d, f'X01_student_opens_admin_url_redirected_{tag}')
d.get(BASE+'/instructor'); time.sleep(2.5); print('student->instructor:', d.current_url)
# session expired: invalid token
d.execute_script("localStorage.setItem('token','not-a-valid-token')"); d.get(BASE+'/student'); time.sleep(3); shot(d, f'X02_invalid_session_token_{tag}'); print(d.current_url)
d.quit()
