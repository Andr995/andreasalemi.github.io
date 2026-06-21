// script.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Imposta l'anno corrente nel footer ---
    const yearSpan = document.getElementById('year');
    if(yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // --- Gestione Mobile Menu ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');

    if(mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });

        // Chiudi il menu quando si clicca un link
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // --- Effetto Navbar su Scroll ---
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('shadow-lg');
            navbar.style.background = 'rgba(11, 13, 23, 0.85)';
        } else {
            navbar.classList.remove('shadow-lg');
            navbar.style.background = 'rgba(11, 13, 23, 0.7)';
        }
    });

    // --- Fetch GitHub Projects ---
    const username = 'Andr995';
    const apiUrl = `https://api.github.com/users/${username}/repos`;
    
    const container = document.getElementById('projects-container');
    const loading = document.getElementById('projects-loading');

    async function fetchProjects() {
        try {
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const repos = await response.json();
            
            // Filtra solo i repo originali (no fork) e con una descrizione o qualche stella per evitare repo vuoti
            const originalRepos = repos.filter(repo => !repo.fork);
            
            // Ordina per data di aggiornamento (più recenti prima)
            // Potresti anche ordinare per stelle: (a, b) => b.stargazers_count - a.stargazers_count
            originalRepos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

            // Prendi i primi 6 per il portfolio (opzionale, o mostrali tutti)
            const topRepos = originalRepos.slice(0, 6);
            
            renderProjects(topRepos);
            
            // Nascondi il loading e mostra il container
            loading.classList.add('hidden');
            container.classList.remove('hidden');
            
        } catch (error) {
            console.error('Errore nel recupero dei progetti GitHub:', error);
            loading.innerHTML = `<p class="text-red-400 col-span-full">Ops! Non sono riuscito a caricare i progetti. Riprova più tardi.</p>`;
        }
    }

    function renderProjects(repos) {
        if (repos.length === 0) {
            container.innerHTML = `<p class="text-textMuted col-span-full">Nessun progetto pubblico trovato al momento.</p>`;
            return;
        }

        const html = repos.map(repo => {
            // Formatta la data
            const date = new Date(repo.updated_at).toLocaleDateString('it-IT', {
                year: 'numeric',
                month: 'short'
            });

            // Gestisci la descrizione vuota
            const description = repo.description 
                ? repo.description 
                : 'Nessuna descrizione fornita. Guarda il codice per saperne di più!';

            // Gestisci il linguaggio
            const language = repo.language ? repo.language : 'Codice';
            
            // Colori badge in base al linguaggio (esempi basilari)
            let langColor = 'bg-gray-800 text-gray-300';
            if (language === 'Python') langColor = 'bg-blue-900/50 text-blue-300 border border-blue-700/50';
            if (language === 'C#') langColor = 'bg-purple-900/50 text-purple-300 border border-purple-700/50';
            if (language === 'JavaScript' || language === 'HTML') langColor = 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50';
            if (language === 'Jupyter Notebook') langColor = 'bg-orange-900/50 text-orange-300 border border-orange-700/50';

            return `
                <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="project-card group flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-start mb-4">
                            <!-- Icona Folder -->
                            <svg class="w-10 h-10 text-cyan mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                            </svg>
                            <!-- Icona Link esterna -->
                            <svg class="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                            </svg>
                        </div>
                        <h3 class="project-card-title">${repo.name}</h3>
                        <p class="text-gray-400 text-sm mb-6 line-clamp-3 leading-relaxed">
                            ${description}
                        </p>
                    </div>
                    <div class="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                        <span class="text-xs px-2.5 py-1 rounded-full font-mono ${langColor}">
                            ${language}
                        </span>
                        <div class="flex items-center gap-3 text-xs font-mono text-gray-500">
                            ${repo.stargazers_count > 0 ? `
                                <span class="flex items-center gap-1">
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                    ${repo.stargazers_count}
                                </span>
                            ` : ''}
                            <span class="flex items-center gap-1">
                                Aggiornato: ${date}
                            </span>
                        </div>
                    </div>
                </a>
            `;
        }).join('');

        container.innerHTML = html;
    }

    // Inizializza la chiamata fetch
    fetchProjects();

    // --- Typewriter Effect per Navbar ---
    const textElement = document.getElementById('typewriter-text');
    const dotElement = document.getElementById('typewriter-dot');
    const textToType = "ANDREASALEMI";
    let typeIndex = 0;

    if (textElement) {
        function typeWriter() {
            if (typeIndex < textToType.length) {
                textElement.textContent += textToType.charAt(typeIndex);
                typeIndex++;
                setTimeout(typeWriter, 120); // Velocità di digitazione
            } else {
                // Mostra il punto finale
                if (dotElement) {
                    dotElement.classList.remove('opacity-0');
                }
            }
        }
        // Avvia dopo un piccolo delay iniziale
        setTimeout(typeWriter, 300);
    }
});
