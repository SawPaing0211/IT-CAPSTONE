from harness import *
import sys, json
W, H, tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
ids = json.load(open('demo_ids.json'))['problems']
d = driver(W, H); ui_login(d,'demo.instructor1')
def go(path, wait=2.8): d.get(BASE+path); time.sleep(wait)
go('/instructor/create-problem?subject_id=4&class_id=1&from=%2Finstructor%2Fclass%2F1')
clickb(d,'Next →',wait=1.2); shot(d, f'I20_wizard_validation_empty_title_{tag}')
for i,(lab,nm) in enumerate([('Problem Type','I21_wizard_type_languages'),('Visibility','I22_wizard_visibility'),('Starter Code','I23_wizard_starter_code'),('Test Cases','I24_wizard_test_cases'),('Hints','I25_wizard_hints'),('Review','I26_wizard_review')]):
    if clickb(d,lab,wait=1.6): shot(d, f'{nm}_{tag}')
go(f"/instructor/problem/{ids['prime_hard']}/submissions"); shot(d, f'I27_problem_submissions_{tag}'); print(btns(d)[5:20])
for b in d.find_elements(By.XPATH,"//button[contains(.,'View') or contains(.,'Code')]"):
    try: b.click(); time.sleep(2); shot(d, f'I28_student_code_modal_{tag}'); break
    except Exception: pass
go('/instructor/problems'); shot(d, f'I05_quest_management_{tag}')
d.quit()
