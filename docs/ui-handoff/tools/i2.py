from harness import *
import sys
W, H, tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
d = driver(W, H); ui_login(d,'demo.instructor1')
def cls():
    d.get(BASE+'/instructor/classes'); time.sleep(2.5); click(d,'Fundamentals of Programming Lab'); time.sleep(2.2)
cls(); shot(d, f'I04_class_detail_{tag}')
for lab, nm in [('Students','I09_class_students'),('Quests','I10_class_quests'),('Modules','I11_class_modules'),('Announcements','I12_class_announcements')]:
    cls()
    if clickb(d, lab, wait=2.4): shot(d, f'{nm}_{tag}'); print(nm, d.current_url, btns(d)[5:16])
d.get(BASE+'/instructor/announcements'); time.sleep(2.5); click(d,'Fundamentals of Programming Lab'); time.sleep(2.2); shot(d, f'I14_announcements_manage_{tag}'); print(btns(d)[5:25])
d.quit()
