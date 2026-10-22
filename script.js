// Portfolio interactions. Project filtering, order and count are unchanged.
document.addEventListener('DOMContentLoaded', () => {
    const yearSpan = document.getElementById('year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            const closed = mobileMenu.classList.toggle('hidden');
            mobileMenuBtn.setAttribute('aria-expanded', String(!closed));
            mobileMenuBtn.setAttribute('aria-label', closed ? 'Apri menu di navigazione' : 'Chiudi menu di navigazione');
        });
        document.querySelectorAll('.mobile-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                mobileMenuBtn.setAttribute('aria-label', 'Apri menu di navigazione');
            });
        });
    }

    const navbar = document.getElementById('navbar');
    const updateNavbar = () => navbar.classList.toggle('is-scrolled', window.scrollY > 50);
    window.addEventListener('scroll', updateNavbar, { passive: true });
    updateNavbar();

    const container = document.getElementById('projects-container');
    const loading = document.getElementById('projects-loading');
    const repoCacheKey = 'portfolio:repos:Andr995';
    const repoCacheTtl = 15 * 60 * 1000;

    function readRepoCache() {
        try {
            const cached = JSON.parse(sessionStorage.getItem(repoCacheKey) || 'null');
            return cached && Array.isArray(cached.repos) ? cached : null;
        } catch (_) {
            return null;
        }
    }

    function getActiveRepos(repos) {
        const activeSince = new Date();
        activeSince.setFullYear(activeSince.getFullYear() - 3);
        return repos
            .filter(repo => !repo.fork && !repo.archived && new Date(repo.pushed_at || repo.updated_at) >= activeSince)
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, 6);
    }

    async function fetchProjects() {
        if (!container || !loading) return;
        const cached = readRepoCache();
        if (cached) {
            renderProjects(getActiveRepos(cached.repos));
            loading.classList.add('hidden');
            container.classList.remove('hidden');
            if (Date.now() - cached.savedAt < repoCacheTtl) return;
        }

        try {
            const response = await fetch('https://api.github.com/users/Andr995/repos?sort=updated&per_page=100&type=owner', {
                cache: 'no-cache',
                headers: { Accept: 'application/vnd.github+json' }
            });
            if (!response.ok) throw new Error('GitHub response: ' + response.status);
            const repos = await response.json();
            try {
                sessionStorage.setItem(repoCacheKey, JSON.stringify({ savedAt: Date.now(), repos }));
            } catch (_) { /* Storage can be disabled; the list still works for this visit. */ }
            renderProjects(getActiveRepos(repos));
            loading.classList.add('hidden');
            container.classList.remove('hidden');
        } catch (error) {
            console.error('Errore nel recupero dei progetti GitHub:', error);
            if (cached) {
                loading.textContent = 'Mostro l’ultimo elenco salvato: GitHub non risponde adesso.';
                loading.classList.remove('hidden');
            } else {
                loading.textContent = 'GitHub non risponde adesso. Il profilo resta qui sotto.';
            }
        }
    }

    function element(tag, className, text) {
        const node = document.createElement(tag);
        node.className = className;
        node.textContent = text;
        return node;
    }

    function renderProjects(repos) {
        container.replaceChildren();
        if (repos.length === 0) {
            container.textContent = 'Non ci sono repository pubblici da mostrare, per ora.';
            return;
        }
        const fragment = document.createDocumentFragment();
        repos.forEach((repo, index) => {
            const date = new Date(repo.updated_at).toLocaleDateString('it-IT', { year: 'numeric', month: 'short' });
            const link = element('a', 'repo-row', '');
            link.href = repo.html_url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            const meta = element('span', 'repo-meta', '');
            meta.append(element('span', 'repo-language', repo.language || 'Codice'));
            meta.append(element('span', '', `${date}${repo.stargazers_count > 0 ? ` / ${repo.stargazers_count} stelle` : ''}`));
            const arrow = element('span', 'repo-arrow', '↗');
            arrow.setAttribute('aria-hidden', 'true');
            link.append(
                element('span', 'repo-number', String(index + 1).padStart(2, '0')),
                element('h4', '', repo.name),
                element('p', 'repo-description', repo.description || 'Repository senza descrizione: apri i sorgenti e le istruzioni.'),
                meta, arrow
            );
            fragment.append(link);
        });
        container.append(fragment);
    }
    fetchProjects();

    const limboImage = document.querySelector('.limbo-preview img');
    if (limboImage) {
        const showLimboFallback = () => {
            limboImage.closest('.limbo-preview')?.classList.add('is-fallback');
        };
        limboImage.addEventListener('error', showLimboFallback, { once: true });
        if (limboImage.complete && !limboImage.naturalWidth) showLimboFallback();
    }

    const steganographyImages = document.querySelectorAll('.steg-comparison img');
    steganographyImages.forEach(image => {
        const showSteganographyFallback = () => {
            image.closest('.steg-comparison')?.classList.add('is-fallback');
        };
        image.addEventListener('error', showSteganographyFallback, { once: true });
        if (image.complete && !image.naturalWidth) showSteganographyFallback();
    });

    document.querySelectorAll('.experience-duration[data-start][data-end]').forEach(duration => {
        const [startYear, startMonth] = duration.dataset.start.split('-').map(Number);
        const [endYear, endMonth] = duration.dataset.end.split('-').map(Number);
        if (![startYear, startMonth, endYear, endMonth].every(Number.isFinite)) return;
        let months = (endYear - startYear) * 12 + endMonth - startMonth + 1;
        if (months < 1) return;
        const years = Math.floor(months / 12);
        months %= 12;
        const parts = [];
        if (years) parts.push(`${years} ${years === 1 ? 'anno' : 'anni'}`);
        if (months) parts.push(`${months} ${months === 1 ? 'mese' : 'mesi'}`);
        const readable = parts.join(' e ');
        duration.textContent = `· ${readable}`;
        duration.setAttribute('aria-label', `Durata: ${readable}`);
    });

    const steganographyPreview = document.querySelector('.steg-comparison');
    if (steganographyPreview) {
        let frame = 0;
        let pendingSplit = 50;
        let previewBounds = null;
        steganographyPreview.addEventListener('pointerenter', event => {
            if (event.pointerType === 'touch') return;
            previewBounds = steganographyPreview.getBoundingClientRect();
            pendingSplit = Math.max(0, Math.min(100, ((event.clientX - previewBounds.left) / previewBounds.width) * 100));
            steganographyPreview.style.setProperty('--split', `${pendingSplit}%`);
        });
        steganographyPreview.addEventListener('pointermove', event => {
            if (event.pointerType === 'touch' || frame || !previewBounds) return;
            pendingSplit = Math.max(0, Math.min(100, ((event.clientX - previewBounds.left) / previewBounds.width) * 100));
            frame = requestAnimationFrame(() => {
                steganographyPreview.style.setProperty('--split', `${pendingSplit}%`);
                frame = 0;
            });
        });
        steganographyPreview.addEventListener('pointerleave', () => {
            if (frame) cancelAnimationFrame(frame);
            frame = 0;
            previewBounds = null;
            steganographyPreview.style.setProperty('--split', '50%');
        });
    }

    const textElement = document.getElementById('typewriter-text');
    const dotElement = document.getElementById('typewriter-dot');
    const textToType = 'ANDREASALEMI';
    let typeIndex = 0;
    if (textElement) {
        function typeWriter() {
            if (typeIndex < textToType.length) {
                textElement.textContent += textToType.charAt(typeIndex++);
                setTimeout(typeWriter, 120);
            } else if (dotElement) dotElement.classList.remove('opacity-0');
        }
        setTimeout(typeWriter, 300);
    }

    // Same footer activation, icon swap and click animation as the original.
    const themeToggleBtn = document.getElementById('theme-toggle');
    const unicornBgElement = document.getElementById('unicorn-bg-element');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isUnicorn = document.body.classList.toggle('theme-unicorn');
            themeToggleBtn.textContent = isUnicorn ? '💻' : '🦄';
            themeToggleBtn.setAttribute('aria-label', isUnicorn ? 'Torna al tema principale' : 'Attiva tema unicorno');
        });
    }
    if (unicornBgElement) {
        document.addEventListener('click', event => {
            if (document.body.classList.contains('theme-unicorn') && !event.target.closest('#theme-toggle')) {
                unicornBgElement.classList.remove('unicorn-animate');
                void unicornBgElement.offsetWidth;
                unicornBgElement.classList.add('unicorn-animate');
            }
        });
    }
});
