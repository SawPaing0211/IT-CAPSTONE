from harness import *
import sys
W, H, tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
d = driver(W, H); ui_login(d,'DEMO-0004')
def top(label, name):
    d.get(BASE+'/student'); time.sleep(2.2)
    if click(d,label,'button',wait=2.5): shot(d,name)
top('Bounty Board', f'S26_bounty_board_{tag}')
top('Hall of Champions', f'S27_leaderboard_{tag}')
top('Hero Sheet', f'S28_hero_sheet_achievements_{tag}'); print(text(d)[200:900])
top('Sandbox', f'S29_sandbox_{tag}')
d.quit()
