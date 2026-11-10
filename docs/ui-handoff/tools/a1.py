from harness import *
import sys
W, H, tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
d = driver(W, H); ui_login(d,'DemoAdmin')
shot(d, f'A01_admin_dashboard_{tag}')
if click(d,'DemoAdmin'): shot(d, f'A02_admin_account_menu_{tag}'); print(btns(d)[-6:])
d.get(BASE+'/admin'); time.sleep(2.5)
for lab, nm in [('Class Codes','A03_class_codes_sections'),('User Management','A04_user_management'),('Instructor Assignments','A05_instructor_assignments'),('Activity Logs','A06_activity_logs')]:
    if clickb(d, lab, wait=2.6): shot(d, f'{nm}_{tag}'); print(nm, btns(d)[8:24])
d.quit()
