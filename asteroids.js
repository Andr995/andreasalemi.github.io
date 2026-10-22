/* A temporary, self-contained Asteroids layer. No application nodes are replaced. */
(() => {
    'use strict';
    const secret = /(?:🦄\uFE0F?\s*🚀\uFE0F?|🚀\uFE0F?\s*🦄\uFE0F?)/u;
    const controls = new Map([
        ['ArrowLeft', 'left'], ['KeyA', 'left'], ['ArrowRight', 'right'], ['KeyD', 'right'],
        ['ArrowUp', 'thrust'], ['KeyW', 'thrust'], ['Space', 'fire']
    ]);
    let active = null;
    let typed = '';
    let typedAt = 0;
    let pairPresent = false;
    let scanTimer = 0;
    let pendingStart = 0;
    const wrap = (value, size) => ((value % size) + size) % size;
    const nearest = (value, size) => value - Math.round(value / size) * size;

    function rememberInput(text) {
        if (Date.now() - typedAt > 8000) typed = '';
        typedAt = Date.now();
        typed = (typed + text).slice(-64);
        requestStart(typed);
    }

    function node(tag, className, text = '') {
        const result = document.createElement(tag);
        result.className = className;
        result.textContent = text;
        return result;
    }

    // Event input is observed, never consumed or rewritten, including paste/IME.
    function requestStart(text) {
        // Emoji shortcodes also work on keyboards without an emoji picker.
        const normalized = (text || '').replace(/:unicorn:/gi, '🦄').replace(/:rocket:/gi, '🚀');
        if (!active && !pendingStart && secret.test(normalized)) {
            pendingStart = setTimeout(() => {
                pendingStart = 0;
                start();
            }, 0);
        }
    }

    document.addEventListener('keydown', event => {
        if (active) {
            if (event.code === 'Escape') {
                event.preventDefault();
                event.stopImmediatePropagation();
                active.exit();
            } else if (controls.has(event.code)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                active.keys.add(event.code);
            } else if (event.code !== 'Tab') {
                // Do not let page shortcuts change the underlying application.
                event.preventDefault();
                event.stopImmediatePropagation();
            }
            return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
        if (Date.now() - typedAt > 8000) typed = '';
        typedAt = Date.now();
        // A separator in the secret must not press a focused button or scroll
        // the page. Leave ordinary typing in editable controls untouched.
        if (event.key === ' ' && /(?:🦄|🚀|:unicorn:|:rocket:)\uFE0F?\s*$/iu.test(typed) &&
            !event.target.closest?.('input, textarea, [contenteditable]')) event.preventDefault();
        if (event.key === 'Backspace') typed = Array.from(typed).slice(0, -1).join('');
        else if (Array.from(event.key).length === 1) typed = (typed + event.key).slice(-64);
        else if (!['Shift', 'Unidentified'].includes(event.key)) typed = '';
        requestStart(typed);
    }, true);
    document.addEventListener('keyup', event => {
        if (active && controls.has(event.code)) {
            active.keys.delete(event.code);
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }, true);
    document.addEventListener('paste', event => {
        if (!active) requestStart(event.clipboardData?.getData('text/plain'));
    });
    document.addEventListener('beforeinput', event => {
        if (!active && event.data && !event.isComposing) rememberInput(event.data);
    });
    for (const type of ['input', 'compositionend']) {
        document.addEventListener(type, event => {
            if (active) return;
            requestStart(event.target.value || event.target.textContent);
            // Some emoji pickers commit one character per event without keydown.
            if (event.data && !event.isComposing) rememberInput(event.data);
        });
    }

    function visible(element) {
        if (element.closest('[hidden], [inert], .asteroids-game, #unicorn-bg-element, script, style, noscript')) return false;
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (!(box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight &&
            box.right > 0 && box.left < innerWidth && style.visibility === 'visible')) return false;
        for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
            if (getComputedStyle(ancestor).opacity === '0') return false;
        }
        return true;
    }

    // Read actual visible glyphs, including adjacent inline-block/flex children.
    // Separate blocks elsewhere on the page must not accidentally form a pair.
    function hasVisiblePair() {
        let content = '';
        let previous = null;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const text = walker.currentNode;
            // The permanent footer pair is a click control, not an automatic
            // trigger when the user scrolls down or returns from the game.
            if (text.parentElement.closest('.footer-controls')) {
                previous = null;
                content += '\n';
                continue;
            }
            if (!text.data.trim()) { content += text.data; continue; }
            if (!visible(text.parentElement)) continue;
            let block = text.parentElement;
            while (block.parentElement && ['inline', 'contents'].includes(getComputedStyle(block).display)) block = block.parentElement;
            const offset = content.length;
            content += text.data;
            for (const match of text.data.matchAll(/[🦄🚀]\uFE0F?/gu)) {
                const range = document.createRange();
                range.setStart(text, match.index);
                range.setEnd(text, match.index + match[0].length);
                const rect = range.getBoundingClientRect();
                if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) continue;
                const current = { glyph: match[0][0] + match[0][1], block, rect, start: offset + match.index, end: offset + match.index + match[0].length };
                if (previous && previous.glyph !== current.glyph && /^\s*$/.test(content.slice(previous.end, current.start))) {
                    const a = previous.rect, b = current.rect;
                    const sameLine = Math.abs((a.top + a.bottom - b.top - b.bottom) / 2) < Math.max(a.height, b.height) / 2;
                    const gap = Math.max(0, b.left - a.right, a.left - b.right);
                    if (previous.block === block || (sameLine && gap <= Math.max(a.width, b.width) * 2)) return true;
                }
                previous = current;
            }
        }
        return false;
    }
    function scanPage() {
        scanTimer = 0;
        if (active) return;
        const found = hasVisiblePair();
        if (found && !pairPresent) requestStart('🦄🚀');
        pairPresent = found;
    }
    function scheduleScan() {
        if (!active && !scanTimer) scanTimer = setTimeout(scanPage, 100);
    }
    const observer = new MutationObserver(records => {
        if (records.some(record => !record.target.parentElement?.closest('.asteroids-game'))) scheduleScan();
    });
    observer.observe(document.body, { childList: true, characterData: true, attributes: true,
        attributeFilter: ['class', 'style', 'hidden'], subtree: true });
    window.addEventListener('scroll', scheduleScan, { passive: true });
    scheduleScan();

    document.getElementById('asteroids-launch')?.addEventListener('click', event => {
        event.stopPropagation();
        start();
    });

    // All layout reads happen during this snapshot phase, never in the game loop.
    function capturePage(width, height) {
        const selector = '.project-card, .repo-row, .experience-entry, .skills-panel, .hero-figure, h1, h2, h3, p, .btn-primary, .text-link, .nav-link, .wordmark, .section-index, #theme-toggle, #asteroids-launch';
        const candidates = Array.from(document.querySelectorAll(selector)).filter(visible);
        const selected = candidates.filter(element => !candidates.some(parent => parent !== element && parent.contains(element)));
        const priority = element => element.matches('.project-card, .repo-row, .btn-primary') ? 0
            : element.matches('.hero-figure, .skills-panel, h1, h2') ? 1 : 2;
        selected.sort((a, b) => priority(a) - priority(b));
        const sources = [];
        for (const original of selected) {
            if (sources.length >= 14) break;
            const rect = original.getBoundingClientRect();
            let content = rect;
            if (original.matches('h1, h2, h3, p, .section-index') &&
                getComputedStyle(original).backgroundColor === 'rgba(0, 0, 0, 0)') {
                const range = document.createRange();
                range.selectNodeContents(original);
                content = range.getBoundingClientRect();
            }
            const x0 = Math.max(0, rect.left, content.left), y0 = Math.max(0, rect.top, content.top);
            const x1 = Math.min(width, rect.right, content.right), y1 = Math.min(height, rect.bottom, content.bottom);
            if (x1 - x0 < 12 || y1 - y0 < 12) continue;
            const clone = original.cloneNode(true);
            const originals = [original, ...original.querySelectorAll('*')];
            const copies = [clone, ...clone.querySelectorAll('*')];
            originals.forEach((source, index) => {
                const copy = copies[index];
                const computed = getComputedStyle(source);
                copy.style.cssText = Array.from(computed, property => `${property}:${computed.getPropertyValue(property)};`).join('');
                copy.style.animation = 'none';
                copy.style.transition = 'none';
                copy.removeAttribute('id');
                copy.removeAttribute('autofocus');
                for (const attribute of Array.from(copy.attributes)) {
                    if (attribute.name.startsWith('on')) copy.removeAttribute(attribute.name);
                }
            });
            Object.assign(clone.style, {
                position: 'absolute', inset: 'auto', left: '0', top: '0', margin: '0',
                width: `${rect.width}px`, height: `${rect.height}px`, maxWidth: 'none',
                transform: 'none', pointerEvents: 'none'
            });
            clone.classList.add('asteroid-snapshot');
            clone.inert = true;
            clone.setAttribute('aria-hidden', 'true');
            // Large blocks are tiled, retaining real text and visual details.
            const cols = Math.ceil((x1 - x0) / 320), rows = Math.ceil((y1 - y0) / 190);
            const w = (x1 - x0) / cols, h = (y1 - y0) / rows;
            for (let row = 0; row < rows && sources.length < 14; row++) {
                for (let col = 0; col < cols && sources.length < 14; col++) {
                    sources.push({ template: clone, w, h, ox: x0 - rect.left + col * w, oy: y0 - rect.top + row * h,
                        x: x0 + (col + .5) * w, y: y0 + (row + .5) * h });
                }
            }
        }
        return sources;
    }

    function start() {
        if (active) return;
        let width = document.documentElement.clientWidth, height = innerHeight;
        const sources = capturePage(width, height);
        if (!sources.length) return;
        const previousFocus = document.activeElement;
        const selection = previousFocus && typeof previousFocus.selectionStart === 'number'
            ? [previousFocus.selectionStart, previousFocus.selectionEnd, previousFocus.selectionDirection] : null;
        const scroll = { x: scrollX, y: scrollY };
        const originalInert = Array.from(document.body.children, element => [element, element.inert]);
        const keys = new Set();
        let rocks = [], bullets = [], score = 0, lives = 3, wave = 1;
        let frameId = 0, lastTime = 0, accumulator = 0, cooldown = 0;
        let ended = false, disposed = false, endTimer = 0;
        let invulnerable = 3;
        const ship = { x: width / 2, y: height / 2, vx: 0, vy: 0, angle: 0 };
        const root = node('div', 'asteroids-game');
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-label', 'Asteroids. Frecce per ruotare e spingere, spazio per sparare, Escape per uscire.');
        root.tabIndex = -1;
        const field = node('div', 'asteroids-field');
        field.setAttribute('aria-hidden', 'true');
        const shipNode = node('div', 'asteroids-ship');
        shipNode.append(node('span', '', '🚀'));
        const hud = node('div', 'asteroids-hud');
        const scorePanel = node('div', '', 'ASTEROIDS / PUNTI');
        const scoreNode = node('span', 'asteroids-score', '00000');
        scorePanel.append(scoreNode);
        const livesNode = node('div', 'asteroids-lives');
        livesNode.setAttribute('aria-live', 'polite');
        const exitButton = node('button', 'asteroids-exit', 'Esci / ESC');
        exitButton.type = 'button';
        hud.append(scorePanel, livesNode, exitButton);
        const help = node('p', 'asteroids-help', '← → ruota · ↑ spinta · SPAZIO spara');
        root.append(field, hud, help);
        const touch = node('div', 'asteroids-touch');
        for (const group of [[['ArrowLeft', '↶', 'Ruota a sinistra'], ['ArrowRight', '↷', 'Ruota a destra']], [['ArrowUp', '↑', 'Spinta'], ['Space', '•', 'Spara']]]) {
            const panel = node('div', '');
            for (const [code, label, accessible] of group) {
                const button = node('button', '', label);
                button.type = 'button';
                button.setAttribute('aria-label', accessible);
                button.addEventListener('pointerdown', event => {
                    event.preventDefault();
                    button.setPointerCapture(event.pointerId);
                    keys.add(code);
                });
                for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
                    button.addEventListener(type, () => keys.delete(code));
                }
                panel.append(button);
            }
            touch.append(panel);
        }
        root.append(touch);
        // Block clicks from reaching the original unicorn click handler.
        root.addEventListener('click', event => event.stopPropagation());
        root.addEventListener('keydown', event => {
            if (event.key !== 'Tab') return;
            const buttons = Array.from(root.querySelectorAll('button')).filter(button => button.getClientRects().length);
            const index = buttons.indexOf(document.activeElement);
            event.preventDefault();
            buttons[wrap(index + (event.shiftKey ? -1 : 1), buttons.length)].focus();
        });

        function updateHud() {
            scoreNode.textContent = String(score).padStart(5, '0');
            livesNode.textContent = `VITE ${lives} / ONDATA ${wave}`;
        }
        function addRock(source, level = 2, motion = {}) {
            const piece = node('div', 'asteroid-piece');
            piece.dataset.level = level;
            piece.style.width = `${source.w}px`;
            piece.style.height = `${source.h}px`;
            const image = source.template.cloneNode(true);
            image.style.transform = `translate3d(${-source.ox}px,${-source.oy}px,0)`;
            piece.append(image);
            const direction = Math.random() * Math.PI * 2;
            const speed = 18 + wave * 5 + (2 - level) * 20;
            const rock = { ...source, level, angle: 0, vx: Math.cos(direction) * speed,
                vy: Math.sin(direction) * speed, spin: (Math.random() - .5) * .24, ...motion, element: piece };
            rocks.push(rock);
            field.append(piece);
            return rock;
        }
        function newWave(first = false) {
            for (const source of sources) {
                addRock(first ? source : { ...source, x: Math.random() * width, y: Math.random() < .5 ? 0 : height });
            }
            invulnerable = 3;
            updateHud();
        }
        function splitRock(rock) {
            rocks.splice(rocks.indexOf(rock), 1);
            rock.element.remove();
            score += [100, 50, 20][rock.level];
            if (rock.level > 0) {
                const horizontal = rock.w >= rock.h;
                for (const sign of [-1, 1]) {
                    const w = horizontal ? rock.w / 2 : rock.w;
                    const h = horizontal ? rock.h : rock.h / 2;
                    const dx = horizontal ? sign * rock.w / 4 : 0;
                    const dy = horizontal ? 0 : sign * rock.h / 4;
                    const c = Math.cos(rock.angle), s = Math.sin(rock.angle);
                    const rx = dx * c - dy * s, ry = dx * s + dy * c;
                    const length = Math.hypot(rx, ry) || 1;
                    addRock({ template: rock.template, w, h,
                        ox: rock.ox + (horizontal && sign > 0 ? w : 0),
                        oy: rock.oy + (!horizontal && sign > 0 ? h : 0),
                        x: wrap(rock.x + rx, width), y: wrap(rock.y + ry, height)
                    }, rock.level - 1, { angle: rock.angle,
                        vx: rock.vx + rx / length * 35, vy: rock.vy + ry / length * 35,
                        spin: rock.spin + sign * .35 });
                }
            }
            updateHud();
        }
        // Rotated rectangle collisions on a torus; bullets sweep their whole step.
        function localPoint(x, y, rock) {
            const dx = nearest(x - rock.x, width), dy = nearest(y - rock.y, height);
            const c = Math.cos(rock.angle), s = Math.sin(rock.angle);
            return { x: dx * c + dy * s, y: -dx * s + dy * c };
        }
        function bulletHits(bullet, rock, dt) {
            const p = localPoint(bullet.x, bullet.y, rock);
            const c = Math.cos(rock.angle), s = Math.sin(rock.angle);
            const dx = (bullet.vx * c + bullet.vy * s) * dt;
            const dy = (-bullet.vx * s + bullet.vy * c) * dt;
            let entry = 0, exit = 1;
            for (const [start, delta, half] of [[p.x, dx, rock.w / 2 + 2], [p.y, dy, rock.h / 2 + 2]]) {
                if (Math.abs(delta) < .0001) { if (Math.abs(start) > half) return false; }
                else {
                    const a = (-half - start) / delta, b = (half - start) / delta;
                    entry = Math.max(entry, Math.min(a, b));
                    exit = Math.min(exit, Math.max(a, b));
                    if (entry > exit) return false;
                }
            }
            return true;
        }
        function shipHits(rock) {
            const point = localPoint(ship.x, ship.y, rock);
            return Math.hypot(Math.max(0, Math.abs(point.x) - rock.w / 2), Math.max(0, Math.abs(point.y) - rock.h / 2)) < 12;
        }
        function fire() {
            const bullet = bullets.find(item => item.life <= 0);
            if (!bullet) return;
            const dx = Math.sin(ship.angle), dy = -Math.cos(ship.angle);
            Object.assign(bullet, { x: wrap(ship.x + dx * 23, width), y: wrap(ship.y + dy * 23, height),
                vx: ship.vx + dx * 660, vy: ship.vy + dy * 660, life: 1.25 });
        }
        function gameOver() {
            ended = true;
            keys.clear();
            const message = node('div', 'asteroids-over');
            message.setAttribute('role', 'status');
            message.append(node('h2', '', 'Fine partita.'), node('p', '', `${score} punti. La pagina torna al suo posto.`));
            root.append(message);
            endTimer = setTimeout(exit, 1800);
        }
        function pressed(action) {
            return Array.from(keys).some(key => controls.get(key) === action);
        }
        function step(dt) {
            ship.angle += ((pressed('right') ? 1 : 0) - (pressed('left') ? 1 : 0)) * 3.8 * dt;
            if (pressed('thrust')) {
                ship.vx += Math.sin(ship.angle) * 250 * dt;
                ship.vy -= Math.cos(ship.angle) * 250 * dt;
            }
            const speed = Math.hypot(ship.vx, ship.vy);
            if (speed > 420) { ship.vx *= 420 / speed; ship.vy *= 420 / speed; }
            ship.x = wrap(ship.x + ship.vx * dt, width);
            ship.y = wrap(ship.y + ship.vy * dt, height);
            cooldown -= dt;
            invulnerable = Math.max(0, invulnerable - dt);
            if (pressed('fire') && cooldown <= 0) { fire(); cooldown = .16; }
            for (const rock of rocks) {
                rock.x = wrap(rock.x + rock.vx * dt, width);
                rock.y = wrap(rock.y + rock.vy * dt, height);
                rock.angle += rock.spin * dt;
            }
            for (const bullet of bullets) {
                if (bullet.life <= 0) continue;
                const hit = rocks.find(rock => bulletHits(bullet, rock, dt));
                if (hit) { bullet.life = 0; splitRock(hit); }
                else {
                    bullet.x = wrap(bullet.x + bullet.vx * dt, width);
                    bullet.y = wrap(bullet.y + bullet.vy * dt, height);
                    bullet.life -= dt;
                }
            }
            if (invulnerable <= 0 && rocks.some(shipHits)) {
                lives--;
                updateHud();
                if (!lives) { gameOver(); return; }
                Object.assign(ship, { x: width / 2, y: height / 2, vx: 0, vy: 0, angle: 0 });
                invulnerable = 3;
            }
            if (!rocks.length) { wave++; newWave(); }
        }
        function render() {
            shipNode.style.transform = `translate3d(${ship.x - 18}px,${ship.y - 18}px,0) rotate(${ship.angle}rad)`;
            shipNode.style.opacity = invulnerable > 0 && Math.floor(invulnerable * 8) % 2 ? '.7' : '1';
            shipNode.classList.toggle('is-thrusting', pressed('thrust'));
            for (const rock of rocks) rock.element.style.transform = `translate3d(${rock.x - rock.w / 2}px,${rock.y - rock.h / 2}px,0) rotate(${rock.angle}rad)`;
            for (const bullet of bullets) {
                bullet.element.style.opacity = bullet.life > 0 ? '1' : '0';
                if (bullet.life > 0) bullet.element.style.transform = `translate3d(${bullet.x - 2}px,${bullet.y - 2}px,0)`;
            }
        }
        function frame(time) {
            if (disposed || ended) return;
            if (!document.hidden) {
                // Fixed physics steps, capped catch-up after a suspended tab.
                accumulator += lastTime ? Math.min((time - lastTime) / 1000, .05) : 0;
                while (accumulator >= 1 / 120 && !ended) { step(1 / 120); accumulator -= 1 / 120; }
                render();
            }
            lastTime = time;
            if (!ended) frameId = requestAnimationFrame(frame);
        }
        function clearKeys() { keys.clear(); lastTime = 0; accumulator = 0; }
        function resize() {
            const nextWidth = document.documentElement.clientWidth, nextHeight = innerHeight;
            if (!nextWidth || !nextHeight) return;
            for (const entity of [ship, ...rocks, ...bullets]) {
                entity.x = wrap(entity.x * nextWidth / width, nextWidth);
                entity.y = wrap(entity.y * nextHeight / height, nextHeight);
            }
            width = nextWidth;
            height = nextHeight;
            clearKeys();
            render();
        }
        function exit() {
            if (disposed) return;
            disposed = true;
            cancelAnimationFrame(frameId);
            clearTimeout(endTimer);
            window.removeEventListener('resize', resize);
            window.removeEventListener('blur', clearKeys);
            document.removeEventListener('visibilitychange', clearKeys);
            root.remove();
            document.body.classList.remove('asteroids-playing');
            originalInert.forEach(([element, inert]) => { element.inert = inert; });
            active = null;
            typed = '';
            // Scroll restoration must bypass the page's smooth-scroll setting.
            window.scrollTo({ left: scroll.x, top: scroll.y, behavior: 'instant' });
            if (previousFocus?.isConnected) {
                previousFocus.focus({ preventScroll: true });
                if (selection) previousFocus.setSelectionRange(...selection);
            }
            scheduleScan();
        }
        active = { keys, exit };
        // A pasted/edited pair may remain in the DOM after exit. Consume it
        // until it disappears, instead of immediately reopening the game.
        pairPresent = hasVisiblePair();
        typed = '';
        originalInert.forEach(([element]) => { element.inert = true; });
        document.body.classList.add('asteroids-playing');
        document.body.append(root);
        newWave(true);
        for (let i = 0; i < 24; i++) {
            const element = node('div', 'asteroids-bullet');
            element.style.opacity = '0';
            field.append(element);
            bullets.push({ element, life: 0, x: 0, y: 0, vx: 0, vy: 0 });
        }
        field.append(shipNode);
        exitButton.addEventListener('click', exit);
        window.addEventListener('resize', resize);
        window.addEventListener('blur', clearKeys);
        document.addEventListener('visibilitychange', clearKeys);
        render();
        root.focus({ preventScroll: true });
        frameId = requestAnimationFrame(frame);
    }
})();
