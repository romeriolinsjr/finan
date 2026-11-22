// sw.js — "Porteiro" de atualizações do Finan (service worker)
//
// Objetivo: fazer o app sempre abrir na versão mais recente publicada,
// sem depender da cópia antiga guardada pelo navegador (problema comum
// no atalho do iPhone).
//
// Regra (rede primeiro):
// 1. Para cada arquivo do próprio Finan (HTML, CSS, JS, imagens), pergunta
//    ao servidor se há versão nova (cache: "no-cache"). Se não mudou, o
//    servidor responde apenas "continua igual", sem baixar tudo de novo.
// 2. Guarda uma cópia do que recebeu, usada SOMENTE se estiver sem internet.
//
// Não interfere em nada de fora do Finan (Firebase, login, Google Fonts,
// jsPDF): essas requisições seguem direto para a internet, como antes.

const CACHE_FINAN = "finan-arquivos";

self.addEventListener("install", () => {
  // Assume o controle imediatamente, sem esperar fechar todas as abas.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const requisicao = event.request;

  // Só cuida de leituras (GET) de arquivos do próprio Finan.
  if (requisicao.method !== "GET") return;
  if (new URL(requisicao.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(requisicao, { cache: "no-cache" })
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches
            .open(CACHE_FINAN)
            .then((cache) => cache.put(requisicao, copia));
        }
        return resposta;
      })
      .catch(() =>
        // Sem internet: usa a última cópia guardada, se existir.
        caches
          .match(requisicao)
          .then((guardada) => guardada || Response.error()),
      ),
  );
});
