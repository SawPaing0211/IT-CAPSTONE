from harness import *
import sys
W, H, tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
CSV = os.path.expanduser('~/mnt/forge-dev/backend/tests/sample_csv/3_bad_row_missing_section.csv')
d = driver(W, H); ui_login(d,'DemoAdmin'); clickb(d,'User Management',wait=2.4); clickb(d,'Upload CSV',wait=1.5)
d.find_element(By.CSS_SELECTOR, "input[type=file]").send_keys(CSV); time.sleep(1.5); shot(d, f'A18_csv_selected_preview_{tag}'); print(text(d)[-700:])
clickb(d,'Enroll 1 Student',wait=3.5); shot(d, f'A19_csv_result_with_error_{tag}'); print(text(d)[-600:])
d.quit()
