from harness import *
import sys
W, H, tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
GOOD = "a, b = map(int, input().split())\nprint(max(a, b))\n"
def open_quest(d, title):
    d.get(BASE+'/student'); time.sleep(2.5)
    click(d,'Open Course →'); clickb(d,'Quests'); click(d,title,'h3'); time.sleep(3)
d = driver(W, H); ui_login(d,'DEMO-0004')
open_quest(d,'Find the Larger'); shot(d,f'S13_quest_workspace_{tag}')
clickb(d,'Code',wait=2.5); shot(d,f'S13b_quest_code_tab_{tag}')
d.execute_script("window.monaco.editor.getModels()[0].setValue(arguments[0])", GOOD); time.sleep(1)
clickb(d,'Run',wait=4); shot(d,f'S16_run_feedback_passed_{tag}')
d.execute_script("window.monaco.editor.getModels()[0].setValue(arguments[0])", "print('wrong')\n"); clickb(d,'Run',wait=4); shot(d,f'S17_run_feedback_failed_{tag}')
time.sleep(4)
open_quest(d,'Find the Larger'); clickb(d,'Code',wait=2.5); time.sleep(2); shot(d,f'S18_draft_restored_after_reload_{tag}')
clickb(d,'Submit',wait=2); shot(d,f'S19_submit_confirmation_{tag}')
d.quit()
d = driver(W, H); ui_login(d,'DEMO-0008'); open_quest(d,'Find the Larger'); clickb(d,'Code',wait=2.5)
d.execute_script("window.monaco.editor.getModels()[0].setValue(arguments[0])", GOOD); time.sleep(1)
clickb(d,'Submit',wait=1.5); clickb(d,'Submit final answer',wait=4); shot(d,f'S20_submitted_result_accepted_{tag}')
open_quest(d,'Warm-up (closed)'); clickb(d,'Code',wait=2.0); shot(d,f'S22_overdue_quest_{tag}')
clickb(d,'Submit',wait=1.5); clickb(d,'Submit final answer',wait=3); shot(d,f'S23_overdue_submit_refused_{tag}')
d.quit()
