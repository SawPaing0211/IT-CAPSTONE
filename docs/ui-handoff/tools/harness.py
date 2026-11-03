import os, sys, threading, http.server, socketserver, functools, time
os.environ.update(FORGE_DEMO='1', FORGE_DEMO_RUNNER='1', FORGE_AUTO_SCHEMA='0', STUDENT_EMAIL_DOMAIN='student.com',
                  HEAD_ADMIN_EMAIL='demo.admin@forge-demo.example', CORS_ORIGINS='http://127.0.0.1:5056')
os.environ['DATABASE_URL'] = 'sqlite:///' + os.path.expanduser('~/demo-run/forge_demo.db')
os.environ.pop('FORGE_ENV', None)
os.environ['FORGE_UPLOADS_DIR'] = os.path.expanduser('~/demo-run/demo_uploads')   # same folder the seed wrote to
sys.path.insert(0, os.path.expanduser('~/mnt/forge-dev/backend'))
import logging; logging.getLogger('werkzeug').setLevel(logging.ERROR)
import app as A
import demo_runner; demo_runner.install(A)   # simulated results, labelled 'demo-stub'
if not os.environ.get('NO_API'): threading.Thread(target=lambda: A.app.run('127.0.0.1', 5055, threaded=True, use_reloader=False), daemon=True).start()
DIST = os.path.expanduser('~/fe-build/dist')
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=DIST, **k)
    def do_GET(s):
        p = s.translate_path(s.path)
        if not os.path.exists(p) or os.path.isdir(p) and not os.path.exists(os.path.join(p, 'index.html')): s.path = '/index.html'
        if s.path == '/index.html':
            b = open(os.path.join(DIST,'index.html'),'rb').read().replace(b'<head>', b'<head><script>window.__errs=[];(function(){var o=console.error;console.error=function(){try{sessionStorage.setItem("errs",(sessionStorage.getItem("errs")||"")+Array.prototype.map.call(arguments,function(a){return a&&a.stack?a.stack:String(a)}).join(" ")+"\\n")}catch(e){};o.apply(console,arguments)};window.addEventListener("error",function(e){try{sessionStorage.setItem("errs",(sessionStorage.getItem("errs")||"")+"ERR "+e.message+"\\n")}catch(x){}})})()</script>',1)
            s.send_response(200); s.send_header('Content-Type','text/html'); s.send_header('Content-Length',str(len(b))); s.end_headers(); s.wfile.write(b); return
        super().do_GET()
    def log_message(s, *a): pass
socketserver.TCPServer.allow_reuse_address = True
threading.Thread(target=lambda: socketserver.ThreadingTCPServer(('127.0.0.1', 5056), H).serve_forever(), daemon=True).start()
time.sleep(1.5)

os.environ.update(LD_LIBRARY_PATH=os.path.expanduser('~/ffenv/lib'), MOZ_HEADLESS='1', FONTCONFIG_PATH=os.path.expanduser('~/ffenv/etc/fonts'))
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.by import By
BASE = 'http://127.0.0.1:5056'
CREDS = {}
for line in open(os.path.expanduser('~/demo-run/demo_credentials.local.txt')):
    if line.startswith('#'): continue
    r, u, p, n = line.rstrip('\n').split('\t'); CREDS[u] = p
def driver(w=1280, h=800):
    o = Options(); o.binary_location = os.path.expanduser('~/ffenv/lib/firefox/FirefoxApp/firefox') if os.path.exists(os.path.expanduser('~/ffenv/lib/firefox/FirefoxApp/firefox')) else os.path.expanduser('~/ffenv/bin/firefox')
    o.add_argument('-headless')
    o.set_preference('network.proxy.type', 0)
    o.set_preference('network.proxy.no_proxies_on', '127.0.0.1,localhost')
    d = webdriver.Firefox(options=o, service=Service(os.path.expanduser('~/ffenv/bin/geckodriver'), log_output=os.devnull))
    d.set_window_size(w, h); return d
SHOTS = os.environ.get('SHOTS_DIR') or os.path.expanduser('~/mnt/forge-dev/docs/ui-handoff/screens')
def shot(d, name): time.sleep(1.2); d.save_screenshot(f'{SHOTS}/{name}.png'); print('shot', name)
def ui_login(d, user, pw=None, submit=True):
    d.get(BASE + '/auth'); time.sleep(2.5)
    ins = [i for i in d.find_elements(By.TAG_NAME, 'input') if i.is_displayed()]
    ins[0].send_keys(user); ins[1].send_keys(pw or CREDS[user])
    if submit:
        d.find_element(By.XPATH, "//button[@type='submit']").click(); time.sleep(3.5)
def text(d): return d.find_element(By.TAG_NAME, 'body').text
def click(d, label, tag='*', wait=1.8):
    xp = f"//{tag}[normalize-space(.)='{label}' or contains(normalize-space(text()),'{label}')]"
    for e in d.find_elements(By.XPATH, xp):
        try:
            if e.is_displayed():
                d.execute_script('arguments[0].scrollIntoView({block:"center"})', e); e.click(); time.sleep(wait); return True
        except Exception: continue
    print('!! no click target:', label); return False
def btns(d): return [b.text.replace('\n', ' | ') for b in d.find_elements(By.TAG_NAME, 'button') if b.text and b.is_displayed()]
def clickb(d, sub, wait=1.8):
    for e in d.find_elements(By.XPATH, f"//button[contains(., '{sub}')]"):
        try:
            if e.is_displayed() and e.is_enabled():
                d.execute_script('arguments[0].scrollIntoView({block:"center"})', e); e.click(); time.sleep(wait); return True
        except Exception: continue
    print('!! no button:', sub); return False
