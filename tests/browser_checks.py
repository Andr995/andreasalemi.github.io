"""Browser regression checks. Uses an already installed Python Playwright runtime.
Run from the repository root: python tests/browser_checks.py
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
import json
import threading
import sys

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'artifacts'
ARTIFACTS.mkdir(exist_ok=True)

class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}'
checks = []

def passed(name):
    checks.append(name)
    print('PASS:', name, flush=True)

def secret(page, value='🦄🚀'):
    page.evaluate('''value => {
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', value);
        document.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true }));
    }''', value)
    page.wait_for_selector('.asteroids-game')

def exit_game(page):
    page.keyboard.press('Escape')
    page.wait_for_selector('.asteroids-game', state='detached')

REPOS = [dict(name=f'Repository-{i}', description='<b>Plain text</b>' if i == 7 else 'Descrizione di prova',
              html_url=f'https://github.com/Andr995/repo-{i}', language='Python', fork=i == 8,
              archived=i == 9,
              updated_at=(f'2022-10-{i+1:02d}T12:00:00Z' if i == 10 else f'2026-10-{i+1:02d}T12:00:00Z'),
              pushed_at=(f'2022-10-{i+1:02d}T12:00:00Z' if i == 10 else f'2026-10-{i+1:02d}T12:00:00Z'),
              stargazers_count=i) for i in range(11)]

try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width':1440,'height':1000})
        repo_requests = []
        def mock_repos(route):
            repo_requests.append(route.request.url)
            route.fulfill(json=REPOS)
        context.route('https://api.github.com/**', mock_repos)
        context.route('https://img.youtube.com/**', lambda route: route.fulfill(status=404))
        context.route('https://raw.githubusercontent.com/**', lambda route: route.fulfill(status=404))
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: (errors.append(str(error)), print('BROWSER ERROR:',str(error),flush=True)))
        page.goto(URL, wait_until='networkidle')
        page.wait_for_function("document.querySelector('#typewriter-text').textContent === 'ANDREASALEMI'")
        assert page.locator('.repo-row').count() == 6
        assert page.locator('.repo-row h4').all_text_contents() == [f'Repository-{i}' for i in [7,6,5,4,3,2]]
        assert page.locator('.repo-description b').count() == 0
        assert page.locator('#projects-loading').is_hidden()
        assert 'sort=updated' in repo_requests[0] and 'per_page=100' in repo_requests[0]
        page.reload(wait_until='networkidle')
        assert len(repo_requests) == 1, 'Fresh session cache should avoid another GitHub request'
        assert page.locator('.repo-row').count() == 6
        passed('GitHub: active non-forks, archive/stale filtering, date order, safe rendering and cache')
        assert page.locator('.experience-duration').all_text_contents() == ['· 5 mesi', '· 3 anni e 2 mesi']
        assert page.locator('.experience-duration').nth(1).get_attribute('aria-label') == 'Durata: 3 anni e 2 mesi'
        passed('Experience lengths are calculated and announced accessibly')
        assert page.locator('link[rel="icon"][type="image/svg+xml"]').get_attribute('href') == 'favicon.svg'
        for filename, signature in [('favicon.svg', b'<svg'), ('favicon-32.png', b'\x89PNG'), ('favicon.ico', b'\x00\x00\x01\x00')]:
            response = page.request.get(URL + '/' + filename)
            assert response.ok and response.body().startswith(signature), filename
        passed('SVG favicon and PNG/ICO fallbacks are served with valid signatures')
        assert page.locator('.project-preview').count() == 3
        preview = page.locator('.project-lidar .project-preview')
        page.locator('.project-lidar').hover()
        page.wait_for_function("parseFloat(getComputedStyle(document.querySelector('.lidar-preview')).opacity) >= 0.99")
        assert preview.evaluate("el=>getComputedStyle(el).opacity") == '1'
        assert page.locator('.project-limbo .project-preview img').get_attribute('src').endswith('mVXbDGCF2_Y/hqdefault.jpg')
        page.locator('.project-limbo').scroll_into_view_if_needed()
        page.wait_for_selector('.limbo-preview.is-fallback')
        split = page.locator('.steg-comparison')
        split.scroll_into_view_if_needed()
        page.wait_for_selector('.steg-comparison.is-fallback')
        split_box = split.bounding_box()
        page.mouse.move(split_box['x'] + split_box['width'] * .8, split_box['y'] + split_box['height'] / 2)
        assert split.evaluate("el=>parseFloat(getComputedStyle(el).getPropertyValue('--split'))") > 75
        page.locator('body').hover(position={'x':5,'y':5})
        assert split.evaluate("el=>el.style.getPropertyValue('--split')") == '50%'
        passed('Project previews reveal on hover and steganography comparison follows the pointer')
        assert page.locator('.asteroids-game').count() == 0
        assert 'Asteroids' not in page.locator('body').inner_text()
        assert page.locator('body').evaluate("el=>getComputedStyle(el).backgroundColor") == 'rgb(16, 21, 18)'
        assert 'Space Grotesk' in page.locator('h1').evaluate("el=>getComputedStyle(el).fontFamily")
        passed('Dark theme and no unsolicited activation')
        page.screenshot(path=str(ARTIFACTS/'desktop.png'), full_page=True)
        page.screenshot(path=str(ARTIFACTS/'desktop-hero.png'))
        for width in [1440,1024,800,768,580,390,320]:
            page.set_viewport_size({'width':width,'height':900})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Overflow at {width}'
        passed('No horizontal overflow at seven desktop/tablet/mobile widths')
        for width in [320,1440]:
            page.set_viewport_size({'width':width,'height':900})
            page.locator('#asteroids-launch').scroll_into_view_if_needed()
            page.wait_for_timeout(250)
            assert page.locator('.asteroids-game').count() == 0
            unicorn = page.locator('#theme-toggle').bounding_box()
            rocket = page.locator('#asteroids-launch').bounding_box()
            assert abs(unicorn['y']-rocket['y']) < 1
            assert 0 < rocket['x']-unicorn['x']-unicorn['width'] <= 10
            page.locator('footer').screenshot(path=str(ARTIFACTS/f'footer-{width}.png'))
            previous_theme=page.locator('body').get_attribute('class') or ''
            page.locator('#asteroids-launch').click()
            page.wait_for_selector('.asteroids-game')
            assert page.locator('.asteroids-ship').inner_text() == '🚀'
            exit_game(page)
            page.wait_for_timeout(250)
            assert page.locator('.asteroids-game').count() == 0
            assert (page.locator('body').get_attribute('class') or '') == previous_theme
            assert page.evaluate("document.activeElement.id === 'asteroids-launch'")
        page.locator('#asteroids-launch').focus()
        page.keyboard.press('Enter')
        page.wait_for_selector('.asteroids-game')
        exit_game(page)
        passed('Adjacent footer controls: desktop/mobile click, keyboard activation and no automatic restart')
        page.set_viewport_size({'width':390,'height':844})
        page.locator('#mobile-menu-btn').click()
        assert page.locator('#mobile-menu-btn').get_attribute('aria-expanded') == 'true'
        page.locator('#mobile-menu a[href="#about"]').click()
        assert page.locator('#mobile-menu').is_hidden()
        assert page.locator('#mobile-menu-btn').get_attribute('aria-expanded') == 'false'
        page.evaluate("scrollTo({top:0,behavior:'instant'})")
        page.screenshot(path=str(ARTIFACTS/'mobile.png'), full_page=True)
        passed('Mobile menu and section navigation')
        page.locator('#theme-toggle').click()
        assert page.locator('body').evaluate("el=>el.classList.contains('theme-unicorn')")
        assert page.locator('#theme-toggle').inner_text() == '💻'
        assert page.locator('.hero-description').evaluate("el=>getComputedStyle(el,'::selection').backgroundColor") == 'rgb(237, 165, 208)'
        page.locator('footer p').click()
        assert page.locator('#unicorn-bg-element').evaluate("el=>el.classList.contains('unicorn-animate')")
        page.evaluate("scrollTo({top:0,behavior:'instant'})")
        page.wait_for_timeout(900)
        assert page.locator('#unicorn-bg-element').evaluate("el=>getComputedStyle(el).opacity") == '0.18'
        page.screenshot(path=str(ARTIFACTS/'unicorn-mobile.png'))
        page.locator('#theme-toggle').click()
        assert not page.locator('body').evaluate("el=>el.classList.contains('theme-unicorn')")
        assert page.locator('#theme-toggle').inner_text() == '🦄'
        passed('Unicorn toggle, icon swap, background and click animation')
        page.set_viewport_size({'width':1440,'height':1000})
        page.evaluate("scrollTo({top:0,behavior:'instant'})")
        for value in ['🦄🚀','🚀🦄','🦄 🚀','🚀 🦄','🦄️ 🚀️']:
            page.wait_for_timeout(150)
            secret(page,value)
            assert page.locator('.asteroid-piece').count() > 0
            assert page.locator('.asteroids-ship').inner_text() == '🚀'
            exit_game(page)
        passed('Both orders, with/without space and variation selectors')
        for code in [':unicorn: :rocket:', ':rocket::unicorn:']:
            page.keyboard.type(code)
            page.wait_for_selector('.asteroids-game')
            exit_game(page)
        passed('Real keyboard activation without an emoji picker or input field')
        page.evaluate("""() => {
            const input=document.createElement('div');input.id='emoji-input';input.contentEditable='true';
            input.style='position:fixed;left:20px;top:150px;z-index:80;width:120px;height:50px';
            document.body.append(input);input.focus();
        }""")
        page.keyboard.insert_text('🦄')
        page.keyboard.insert_text('🚀')
        page.wait_for_selector('.asteroids-game')
        emoji_cdp = context.new_cdp_session(page)
        emoji_cdp.send('DOM.enable')
        emoji_cdp.send('CSS.enable')
        document_node = emoji_cdp.send('DOM.getDocument')['root']['nodeId']
        ship_node = emoji_cdp.send('DOM.querySelector',{'nodeId':document_node,'selector':'.asteroids-ship span'})['nodeId']
        fonts = emoji_cdp.send('CSS.getPlatformFontsForNode', {'nodeId':ship_node})['fonts']
        assert any('Emoji' in font['familyName'] and font['glyphCount'] > 0 for font in fonts), fonts
        emoji_cdp.detach()
        exit_game(page)
        assert page.locator('#emoji-input').inner_text() == '🦄🚀'
        page.locator('#emoji-input').evaluate('el=>el.remove()')
        page.wait_for_timeout(150)
        passed('Native emoji text insertion, visible rocket glyph and preserved editable text')
        page.evaluate("""() => {
            const row=document.createElement('div');row.id='flex-pair';
            row.style='display:flex;gap:4px;position:fixed;left:30px;top:200px;opacity:0';
            row.innerHTML='<button>🚀</button><button>🦄</button>';document.body.append(row);
        }""")
        page.wait_for_timeout(200)
        assert page.locator('.asteroids-game').count() == 0
        page.locator('#flex-pair').evaluate("el=>el.style.opacity='1'")
        page.wait_for_selector('.asteroids-game')
        exit_game(page)
        page.locator('#flex-pair').evaluate('el=>el.remove()')
        page.wait_for_timeout(150)
        passed('Adjacent emoji buttons in flex layout, including hidden-to-visible transitions')
        # A pair split over inline elements is still adjacent visible text.
        page.evaluate("""() => { const p=document.createElement('p'); p.id='pair-test'; p.style='position:fixed;top:300px;left:20px'; p.innerHTML='<span>🚀</span> <span>🦄</span>'; document.body.append(p); }""")
        page.wait_for_selector('.asteroids-game')
        exit_game(page)
        page.wait_for_timeout(300)
        assert page.locator('.asteroids-game').count() == 0
        page.locator('#pair-test').evaluate('el=>el.remove()')
        page.wait_for_timeout(150)
        passed('DOM detection across inline spans; no reactivation from a persistent pair')
        # Preserve real DOM identities, a form value/selection/focus, theme, menu and scroll.
        page.set_viewport_size({'width':390,'height':844})
        page.locator('#theme-toggle').click()
        page.evaluate("scrollTo({top:350,behavior:'instant'})")
        page.locator('#mobile-menu-btn').click()
        page.evaluate("""() => {
            window.originalMain=document.querySelector('main');
            window.originalScroll=scrollY;
            const input=document.createElement('input'); input.id='state-test';
            input.style='position:fixed;top:130px;left:10px;z-index:60';
            document.body.append(input); input.focus();
            input.value='dati da conservare 🦄🚀'; input.setSelectionRange(2,5);
            input.dispatchEvent(new InputEvent('input',{bubbles:true,data:'🦄🚀'}));
        }""")
        page.wait_for_selector('.asteroids-game')
        exit_game(page)
        page.wait_for_timeout(200)
        assert page.evaluate("document.querySelector('main') === window.originalMain")
        assert page.locator('#state-test').input_value() == 'dati da conservare 🦄🚀'
        assert page.evaluate("document.activeElement.id === 'state-test' && document.activeElement.selectionStart === 2 && document.activeElement.selectionEnd === 5")
        assert page.evaluate('Math.abs(scrollY-window.originalScroll)<1')
        assert page.locator('#mobile-menu').is_visible()
        assert page.locator('body').evaluate("el=>el.classList.contains('theme-unicorn')")
        assert page.locator('main').get_attribute('inert') is None
        assert page.locator('.asteroids-game').count() == 0
        page.locator('#state-test').evaluate('el=>el.remove()')
        passed('ESC restores DOM identity, input data, selection, focus, scroll, menu and theme')
        secret(page)
        page.set_viewport_size({'width':400,'height':844})
        page.wait_for_timeout(200)
        assert page.locator('.asteroids-game').is_visible()
        page.set_viewport_size({'width':400,'height':600})
        page.wait_for_timeout(200)
        assert page.locator('.asteroids-game').is_visible()
        exit_game(page)
        passed('Viewport and keyboard height changes no longer close the game')
        assert not errors, errors
        # Deterministic physics with actual keyboard events and browser virtual time.
        physics = context.new_page()
        physics.set_viewport_size({'width':800,'height':600})
        physics.goto(URL,wait_until='networkidle')
        physics.clock.install()
        physics.evaluate("""() => {
            Math.random=()=>0.5;
            document.querySelectorAll('header, main, footer').forEach(el=>el.style.display='none');
            const target=document.createElement('p'); target.id='target'; target.textContent='Un elemento reale della pagina';
            target.style='position:fixed;left:320px;top:100px;width:160px;height:100px;background:var(--surface)';
            document.body.append(target);
        }""")
        secret(physics)
        physics.keyboard.down('Space')
        physics.clock.run_for(450)
        physics.keyboard.up('Space')
        assert int(physics.locator('.asteroids-score').inner_text()) > 0
        assert physics.locator('.asteroid-piece[data-level="1"]').count() + physics.locator('.asteroid-piece[data-level="0"]').count() > 0
        physics.keyboard.down('Space')
        physics.clock.run_for(1000)
        physics.keyboard.up('Space')
        assert int(physics.locator('.asteroids-score').inner_text()) >= 70
        passed('Shooting actual page fragments: large → medium → small, score increments')
        exit_game(physics)
        physics.locator('#target').evaluate("el=>el.style='position:fixed;left:10px;top:10px;width:30px;height:20px'")
        secret(physics)
        def ship_state():
            return physics.locator('.asteroids-ship').evaluate("el=>{const m=new DOMMatrix(getComputedStyle(el).transform);return {x:m.e+18,y:m.f+18,a:m.a,b:m.b}}")
        physics.keyboard.down('ArrowUp')
        physics.clock.run_for(500)
        physics.keyboard.up('ArrowUp')
        before=ship_state()
        physics.clock.run_for(500)
        after=ship_state()
        assert after['y'] < before['y']-30, (before,after)
        physics.keyboard.down('ArrowRight')
        physics.clock.run_for(350)
        physics.keyboard.up('ArrowRight')
        rotated=ship_state()
        assert abs(rotated['b']) > .5
        physics.clock.run_for(2300)
        wrapped=ship_state()
        assert 0 <= wrapped['x'] < 800 and 0 <= wrapped['y'] < 600
        assert wrapped['y'] > after['y'], (after,wrapped)
        passed('Rotation, inertia after releasing thrust and edge wrap-around')
        exit_game(physics)
        physics.locator('#target').evaluate("el=>el.style='position:fixed;inset:0;width:800px;height:600px;background:var(--surface)'")
        secret(physics)
        physics.clock.run_for(9400)
        assert physics.locator('.asteroids-over').is_visible()
        assert 'VITE 0' in physics.locator('.asteroids-lives').inner_text()
        physics.clock.run_for(1900)
        assert physics.locator('.asteroids-game').count() == 0
        assert physics.locator('#target').is_visible()
        passed('Three collisions consume lives; game over automatically restores originals')
        physics.close()
        # Runtime frame metrics, without firing (no intentional fragment creation).
        page.set_viewport_size({'width':1440,'height':1000})
        page.locator('#mobile-menu-btn').evaluate("el=>{document.getElementById('mobile-menu').classList.add('hidden')}")
        page.evaluate("scrollTo({top:0,behavior:'instant'})")
        secret(page)
        page.screenshot(path=str(ARTIFACTS/'asteroids.png'))
        cdp = context.new_cdp_session(page)
        cdp.send('Performance.enable')
        def metrics(): return {m['name']:m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}
        page.wait_for_timeout(300)
        start=metrics()
        intervals=page.evaluate('''() => new Promise(resolve=>{
            const times=[]; let last=0;
            function sample(t){ if(last)times.push(t-last);last=t;if(times.length<100)requestAnimationFrame(sample);else resolve(times); }
            requestAnimationFrame(sample);
        })''')
        end=metrics()
        intervals.sort()
        performance={'median_frame_ms':round(intervals[50],2),'p95_frame_ms':round(intervals[95],2),'layouts_during_animation':end['LayoutCount']-start['LayoutCount']}
        assert performance['layouts_during_animation'] == 0, performance
        (ARTIFACTS/'performance.json').write_text(json.dumps(performance,indent=2))
        print('PERFORMANCE:',json.dumps(performance),flush=True)
        passed('requestAnimationFrame loop causes no repeated layout')
        exit_game(page)
        # Empty and failed GitHub requests stay useful without breaking the page.
        for response in ['empty','failure']:
            fallback=browser.new_context()
            fallback.route('https://api.github.com/**',lambda route: route.fulfill(status=503,json={}) if response=='failure' else route.fulfill(json=[]))
            tab=fallback.new_page()
            tab.goto(URL,wait_until='networkidle')
            if response=='empty': assert 'Non ci sono repository' in tab.locator('#projects-container').inner_text()
            else: assert 'GitHub non risponde' in tab.locator('#projects-loading').inner_text()
            assert tab.locator('.all-repos').is_visible()
            fallback.close()
        passed('Empty/error GitHub responses and direct profile fallback')
        browser.close()
finally:
    server.shutdown()
(ARTIFACTS/'checks.json').write_text(json.dumps(checks,indent=2,ensure_ascii=False),encoding='utf-8')
print(f'{len(checks)} checks passed.',flush=True)
