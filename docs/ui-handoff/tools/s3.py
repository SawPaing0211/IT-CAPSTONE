from harness import *
import sys
W, H, tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
GOOD = "a, b = map(int, input().split())\nprint(max(a, b))\n"
def open_quest(d, title):
    d.get(BASE+'/student'); time.sleep(2.5)
    click(d,'Open Course →'); click(d,'Quest Board','button'); click(d,title,'h3')
def setcode(d, code):
    ok_ = d.execute_script("var m=window.monaco; if(!m){return false}; m.editor.getModels()[0].setValue(arguments[0]); return true", code)
    if not ok_:
        ta = d.find_element(By.CSS_SELECTOR, 'textarea.inputarea'); ta.send_keys(code)
    return ok_
d = driver(W, H); ui_login(d,'DEMO-0004')
open_quest(d,'Find the Larger'); time.sleep(3); shot(d,f'S13_quest_workspace_{tag}')
click(d,'Test Cases','button'); shot(d,f'S14_quest_test_cases_{tag}')
click(d,'Hints','button'); shot(d,f'S15_quest_hints_{tag}')
click(d,'Problem','button')
print('monaco global:', setcode(d, GOOD)); time.sleep(1)
clickb(d,'Run',wait=4); shot(d,f'S16_run_feedback_passed_{tag}')
setcode(d, "print('wrong')\n"); clickb(d,'Run',wait=4); shot(d,f'S17_run_feedback_failed_{tag}')
setcode(d, GOOD); time.sleep(4)   # autosave draft
d.get(BASE+'/student'); time.sleep(2.5)
open_quest(d,'Find the Larger'); time.sleep(3); shot(d,f'S18_draft_restored_after_reload_{tag}')
print(d.execute_script("return window.monaco?window.monaco.editor.getModels()[0].getValue():''")[:80])
clickb(d,'Submit',wait=2); shot(d,f'S19_submit_confirmation_{tag}'); print(text(d)[-500:])
d.quit()
