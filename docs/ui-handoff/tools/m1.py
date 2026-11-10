from harness import *
import sys
W, H, tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
d = driver(W, H); ui_login(d,'DemoAdmin')
for lab, nm in [('Classes','A03_class_codes_sections'),('Users','A04_user_management'),('Assign','A05_instructor_assignments'),('Logs','A06_activity_logs')]:
    if clickb(d, lab, wait=2.6): shot(d, f'{nm}_{tag}')
clickb(d,'Users',wait=2); clickb(d,'Add User',wait=1.5); shot(d,f'A07_create_user_modal_{tag}')
d.get(BASE+'/admin'); time.sleep(2.5); clickb(d,'Users',wait=2); clickb(d,'Recover',wait=1.8); shot(d,f'A10_recover_password_modal_{tag}')
d.quit()
d = driver(W, H); ui_login(d,'demo.instructor1')
d.get(BASE+'/instructor/classes'); time.sleep(2.5); clickb(d,'Fundamentals of Programming Lab',wait=2.2); shot(d, f'I04_class_detail_{tag}')
d.get(BASE+'/instructor'); time.sleep(2.5)
for b in d.find_elements(By.XPATH,"//button[contains(.,'▼')]"):
    try: b.click(); time.sleep(1); shot(d, f'I02_instructor_account_menu_{tag}'); break
    except Exception: pass
d.get(BASE+'/instructor/create-problem?subject_id=4&class_id=1&from=%2Finstructor%2Fclass%2F1'); time.sleep(2.8); shot(d, f'I17b_create_quest_step1_{tag}')
d.get(BASE+'/instructor/problems'); time.sleep(2.5)
d.get(BASE+'/instructor/announcements'); time.sleep(2.2); clickb(d,'Fundamentals of Programming Lab',wait=2); clickb(d,'29022',wait=2.5); shot(d, f'I14_announcements_manage_{tag}')
d.quit()
