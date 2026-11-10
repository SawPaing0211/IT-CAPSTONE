from harness import *
import sys
W, H, tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
d = driver(W, H); ui_login(d,'demo.instructor1')
def go(path, name, wait=2.8):
    d.get(BASE+path); time.sleep(wait); shot(d, name); return d.current_url
go('/instructor', f'I01_instructor_dashboard_{tag}')
if click(d,'demo.instructor1'): shot(d, f'I02_instructor_account_menu_{tag}')
go('/instructor/classes', f'I03_my_classes_{tag}'); print(btns(d)[:12])
if click(d,'29022'): time.sleep(2); shot(d, f'I04_class_detail_{tag}'); print(d.current_url, btns(d)[:20])
go('/instructor/problems', f'I05_quest_management_{tag}'); print(btns(d)[:20])
go('/instructor/announcements', f'I06_announcements_{tag}'); print(btns(d)[:20])
go('/instructor/materials', f'I07_course_materials_{tag}'); print(btns(d)[:20])
go('/instructor/achievements', f'I08_instructor_achievements_{tag}')
d.quit()
