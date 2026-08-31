// Service Worker do Guia Fitness — permite abrir o app mesmo sem internet.
// Estratégia: "cache primeiro" pros arquivos do próprio app (HTML/CSS/JS/fontes/imagens
// locais); tudo que é de fora (Firebase, Gemini, YouTube, imagens da biblioteca de
// exercícios no GitHub) vai direto pra rede, sem passar pelo cache — não faz sentido
// (nem seria viável) guardar isso tudo offline.

const CACHE_VERSION = 'guia-fitness-v1';

const APP_SHELL = [
  './',
  './index.html',
  './privacidade.html',
  './css/bootstrap.min.css',
  './css/bootstrap-icons.min.css',
  './css/fonts.css',
  './css/fonts/bootstrap-icons.woff',
  './css/fonts/bootstrap-icons.woff2',
  './css/webfonts/inter-latin-400-normal.woff2',
  './css/webfonts/inter-latin-500-normal.woff2',
  './css/webfonts/inter-latin-600-normal.woff2',
  './css/webfonts/poppins-latin-600-normal.woff2',
  './css/webfonts/poppins-latin-700-normal.woff2',
  './css/webfonts/poppins-latin-800-normal.woff2',
  './js/bootstrap.bundle.min.js',
  './js/Sortable.min.js',
  './js/firebase-compat.min.js',
  './js/exercises-library.json',
  './img/exercicios-gif/agachamento-sumo-halteres.gif',
  './img/musculos/agachamento-sumo-halteres.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes
          .filter((nome) => nome !== CACHE_VERSION)
          .map((nome) => caches.delete(nome))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Só intercepta requisições do próprio site (mesma origem). Tudo externo
  // (Firebase, Gemini, YouTube, imagens de exercícios no GitHub) vai direto pra rede.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((resposta) => {
          // Guarda uma cópia no cache pra próxima vez, se a resposta for válida
          if (resposta && resposta.status === 200) {
            const copia = resposta.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copia));
          }
          return resposta;
        })
        .catch(() => {
          // Sem rede e sem cache — se for navegação de página, cai no index.html salvo
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
