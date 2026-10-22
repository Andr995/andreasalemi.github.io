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
    async function fetchProjects() {
        try {
            const response = await fetch('https://api.github.com/users/Andr995/repos');
            if (!response.ok) throw new Error('GitHub response: ' + response.status);
            const repos = await response.json();
            const originalRepos = repos.filter(repo => !repo.fork);
            originalRepos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            renderProjects(originalRepos.slice(0, 6));
            loading.classList.add('hidden');
            container.classList.remove('hidden');
        } catch (error) {
            console.error('Errore nel recupero dei progetti GitHub:', error);
            loading.textContent = 'GitHub non risponde in questo momento. Puoi aprire i repository dal link qui sotto.';
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
                element('p', 'repo-description', repo.description || 'Il progetto è raccontato nel codice.'),
                meta, arrow
            );
            fragment.append(link);
        });
        container.append(fragment);
    }
    fetchProjects();

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
