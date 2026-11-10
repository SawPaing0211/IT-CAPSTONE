from harness import *
import sys
W, H, tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
d = driver(W, H); ui_login(d,'demo.instructor1')
def go(path, wait=2.8): d.get(BASE+path); time.sleep(wait)
go('/instructor/announcements'); clickb(d,'Fundamentals of Programming Lab',wait=2); clickb(d,'29022',wait=2.5); shot(d, f'I14_announcements_manage_{tag}'); print(btns(d)[5:25])
if clickb(d,'Post',wait=1.5) or clickb(d,'New',wait=1.5) or clickb(d,'Create',wait=1.5): shot(d, f'I15_announcement_form_{tag}'); print(btns(d)[5:25])
go('/instructor/create-problem/pick-class'); clickb(d,'Fundamentals of Programming Lab',wait=2); clickb(d,'29022',wait=2.8); shot(d, f'I17b_create_quest_step1_{tag}'); print(d.current_url, btns(d)[5:25]); print(text(d)[150:900])
d.quit()
