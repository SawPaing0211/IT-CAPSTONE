from harness import *
import sys
W, H, tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
GOOD = "a, b = map(int, input().split())\nprint(max(a, b))\n"
def open_quest(d, title):
    d.get(BASE+'/student'); time.sleep(2.5)
    click(d,'Open Course →'); click(d,'Quest Board','button'); click(d,title,'h3'); time.sleep(3)
d = driver(W, H); ui_login(d,'DEMO-0008')
open_quest(d,'Find the Larger')
d.execute_script("window.monaco.editor.getModels()[0].setValue(arguments[0])", GOOD); time.sleep(1)
clickb(d,'Submit',wait=1.5); clickb(d,'Submit final answer',wait=4); shot(d,f'S20_submitted_result_accepted_{tag}')
d.execute_script("window.scrollTo(0, document.body.scrollHeight)"); 
shot(d,f'S21_submitted_readonly_editor_{tag}'); print(btns(d))
open_quest(d,'Warm-up (closed)'); shot(d,f'S22_overdue_quest_{tag}')
clickb(d,'Submit',wait=1.5); clickb(d,'Submit final answer',wait=3); shot(d,f'S23_overdue_submit_refused_{tag}')
open_quest(d,'EVENT: Weekly Challenge'); shot(d,f'S24_event_quest_{tag}')
d.get(BASE+'/student'); time.sleep(2); click(d,'Open Course →'); click(d,'Quest Log','button'); shot(d,f'S25_quest_log_after_submit_{tag}')
d.quit()
