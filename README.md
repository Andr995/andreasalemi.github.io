# Andrea Filippo Salemi — Portfolio

Portfolio statico in HTML, CSS e JavaScript. Non richiede installazione, bundler o compilazione.

Avvio locale dalla cartella del progetto:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Apri http://127.0.0.1:4173. Il sito funziona anche su GitHub Pages. I font vengono serviti da Google Fonts, con fallback sans e monospace; i sei repository originali più recenti vengono letti dall'API pubblica di GitHub. Il link diretto al profilo resta disponibile se l'API non risponde.

## Tema

Tema workstation: fondo carbone, testo chiaro e accenti verde fosforo; Space Grotesk, IBM Plex Sans e IBM Plex Mono. La variante unicorno resta scura, con accenti rosa e sfondo animato: il pulsante nel footer e l'animazione al clic mantengono il comportamento originale. Nessuna preferenza viene aggiunta al localStorage.

## Asteroids

Il pulsante 🚀 nel footer, accanto al pulsante del tema 🦄, avvia Asteroids con un clic. I due pulsanti restano indipendenti: scorrere fino al footer o cambiare tema non avvia il gioco.

Resta disponibile anche la coppia `🦄🚀` oppure `🚀🦄`, anche separata da spazi: viene riconosciuta tramite digitazione, incolla, input/IME o altro testo visibile nella pagina, inclusi span e pulsanti affiancati. Senza selettore emoji, si può digitare `:unicorn::rocket:` oppure `:rocket::unicorn:` direttamente nella pagina (anche con uno spazio tra i codici). La coppia permanente del footer è esclusa dal riconoscimento automatico.

- Frecce sinistra/destra o A/D: rotazione. Freccia su o W: spinta. Spazio: sparo.
- ESC: uscita immediata. Su schermi touch sono disponibili comandi durante il gioco.
- Tre vite, punteggio e ondate successive. Il game over ripristina automaticamente la pagina dopo 1,8 secondi. Un ridimensionamento o il cambio di altezza della tastiera mobile adatta il campo senza chiudere il gioco.
- Le copie degli elementi visibili sono ritagliate e si dividono in tre dimensioni. I nodi originali rimangono nel DOM, temporaneamente nascosti e inerti: valori, listener, tema e menu sono conservati; focus, selezione e scroll vengono ripristinati.
- La geometria e gli stili vengono letti solo all'ingresso. Fisica a passi fissi, rendering con requestAnimationFrame e transform/opacity, massimo 14 frammenti iniziali (56 dopo le divisioni) e 24 proiettili riutilizzati. Nessuna lettura del layout nel loop.

## Verifica

```sh
node --check script.js
node --check asteroids.js
python tests/browser_checks.py
```

Il test browser usa Python Playwright e Chromium già installati nell'ambiente di sviluppo; non sono dipendenze del sito. Avvia e chiude un server locale autonomamente. Copre layout responsive, GitHub (successo/vuoto/errore), menu, unicorno, attivazione segreta da tastiera e input emoji nativo, font emoji effettivamente usato, adattamento al viewport, frammentazione, inerzia, wrap-around, vite, game over e ripristino dello stato. Screenshot e misure dei frame sono salvati in `artifacts/` (ignorata da Git).
