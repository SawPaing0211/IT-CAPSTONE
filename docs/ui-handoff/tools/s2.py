from harness import *
import sys
W, H, tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
d = driver(W, H); ui_login(d,'DEMO-0004')
shot(d, f'S06_student_my_subjects_{tag}')
if click(d,'Dan Santos'): shot(d, f'S07_student_account_menu_{tag}')
d.get(BASE+'/student'); time.sleep(2.5)
click(d,'Open Course →'); shot(d, f'S08_course_lessons_{tag}')
click(d,'Announcements','button'); shot(d, f'S09_course_announcements_{tag}')
click(d,'Quest Board','button'); shot(d, f'S10_quest_board_{tag}'); print(btns(d)); print(text(d)[200:1500])
click(d,'Quest Log','button'); shot(d, f'S11_quest_log_{tag}'); print(text(d)[200:1000])
click(d,'Sandbox','button'); shot(d, f'S12_course_sandbox_{tag}')
d.quit()
