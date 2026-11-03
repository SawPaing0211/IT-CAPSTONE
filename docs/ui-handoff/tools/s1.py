from harness import *
import sys
W, H, tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
d = driver(W, H)
d.get(BASE+'/auth'); time.sleep(2.5); shot(d, f'S01_login_{tag}')
ui_login(d,'DEMO-0004','WrongPass123'); shot(d, f'S02_login_wrong_password_{tag}')
d.execute_script('localStorage.clear()')
ui_login(d,'DEMO-0003'); shot(d, f'S03_forced_password_change_{tag}'); print(btns(d))
ins=[i for i in d.find_elements(By.TAG_NAME,'input') if i.is_displayed()]; print('inputs',len(ins))
for i,v in zip(ins,['not-the-temp','short','different']): i.send_keys(v)
shot(d, f'S04_forced_password_change_filled_invalid_{tag}')
for b in d.find_elements(By.TAG_NAME,'button'):
    if b.is_displayed() and ('save' in b.text.lower() or 'change' in b.text.lower() or 'set' in b.text.lower()): b.click(); break
time.sleep(1.5); shot(d, f'S05_forced_password_change_error_{tag}'); print(text(d)[:400])
d.quit()
