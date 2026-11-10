from harness import *
import sys
W, H, tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
d = driver(W, H); ui_login(d,'DemoAdmin')
def esc(): 
    from selenium.webdriver.common.keys import Keys
    d.find_element(By.TAG_NAME,'body').send_keys(Keys.ESCAPE); time.sleep(0.6)
def tab(lab): d.get(BASE+'/admin'); time.sleep(2.2); clickb(d, lab, wait=2.4)
tab('User Management'); clickb(d,'Add User',wait=1.5); shot(d, f'A07_create_user_modal_{tag}')
clickb(d,'Create',wait=1.2); shot(d, f'A08_create_user_validation_{tag}')
tab('User Management'); clickb(d,'Upload CSV',wait=1.5); shot(d, f'A09_upload_csv_modal_{tag}')
tab('User Management'); clickb(d,'Recover',wait=1.8); shot(d, f'A10_recover_password_modal_{tag}')
tab('User Management'); clickb(d,'Manage',wait=1.8); shot(d, f'A11_edit_user_modal_{tag}')
tab('User Management'); clickb(d,'Subjects',wait=2.2); shot(d, f'A12_subjects_management_{tag}'); print(btns(d)[8:24])
tab('Class Codes'); clickb(d,'Create Section',wait=1.5); shot(d, f'A13_create_section_modal_{tag}')
tab('Class Codes'); clickb(d,'IT116L',wait=1.8); shot(d, f'A14_class_codes_expanded_{tag}')
tab('Instructor Assignments'); clickb(d,'Assign Instructor',wait=1.8); shot(d, f'A15_assign_instructor_modal_{tag}')
d.get(BASE+'/admin'); time.sleep(2.2); clickb(d,'Settings',wait=1.8); shot(d, f'A16_system_settings_modal_{tag}')
d.get(BASE+'/admin'); time.sleep(2.2); clickb(d,'Backup DB',wait=1.8); shot(d, f'A17_backup_modal_{tag}')
d.quit()
