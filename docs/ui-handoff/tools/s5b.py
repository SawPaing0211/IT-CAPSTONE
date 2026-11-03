from harness import *
import sys
W, H, tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
d = driver(W, H); ui_login(d,'DEMO-0004')
def top(label, name):
    d.get(BASE+'/student'); time.sleep(2.2)
    if click(d,label,'button',wait=2.5): shot(d,name)
d.get(BASE+'/student'); time.sleep(2.2)
if click(d,'Dan Santos'):
    click(d,'My Progress',wait=2.5); shot(d,f'S30_my_progress_{tag}')
d.get(BASE+'/student'); time.sleep(2.2); click(d,'Dan Santos'); click(d,'Change password',wait=1.5); shot(d,f'S31_change_password_dialog_{tag}')
d.get(BASE+'/student'); time.sleep(2.2); 
for b in d.find_elements(By.XPATH,"//button[contains(.,'🔔')]"):
    try: b.click(); time.sleep(1.5); shot(d,f'S32_notifications_{tag}'); break
    except Exception: pass
d.quit()
# new student: complete forced change through the UI, then look at empty states
d = driver(W, H); ui_login(d,'DEMO-0003')
newp = 'FreshStart' + str(int(time.time()) % 100000)
ins=[i for i in d.find_elements(By.TAG_NAME,'input') if i.is_displayed()]
for i,v in zip(ins,[CREDS['DEMO-0003'], newp, newp]): i.send_keys(v)
shot(d, f'S33_forced_change_valid_filled_{tag}')
clickb(d,'Change password',wait=3); shot(d, f'S34_after_forced_change_{tag}')
open(os.path.expanduser('~/demo-run/demo_credentials.local.txt'),'a').write(f'student\tDEMO-0003\t{newp}\t(after forced change)\n')
d.get(BASE+'/student'); time.sleep(2.5); shot(d, f'S35_new_student_dashboard_empty_{tag}')
click(d,'Open Course →'); click(d,'Quest Log','button'); shot(d,f'S36_new_student_quest_log_empty_{tag}')
top('Hero Sheet', f'S37_new_student_hero_sheet_{tag}')
d.quit()
