/* public/service-worker.js */

// Nomes dos caches para controle de versão
const STATIC_CACHE = "mf-static-v1";
const RUNTIME_CACHE = "mf-runtime-v1";

// Arquivos essenciais do app para cache inicial (modo offline)
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png"
];

// Canal para comunicação entre o Service Worker e as páginas abertas do app
let broadcastChannel;
try {
  broadcastChannel = new BroadcastChannel("pwa-events");
} catch (e) {
  console.error("Broadcast Channel não é suportado.");
}

// Função para focar uma aba existente ou abrir uma nova
async function focusOrOpen(url) {
  const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
  const targetClient = allClients.find(c => c.url.includes(url));
  if (targetClient) {
    return targetClient.focus();
  }
  return clients.openWindow(url);
}

// Evento de instalação do Service Worker
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // Força a ativação do novo SW
  );
});

// Evento de ativação do Service Worker
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    // Limpa caches antigos para evitar conflitos
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => ![STATIC_CACHE, RUNTIME_CACHE].includes(name))
        .map(name => caches.delete(name))
    );
    await self.clients.claim(); // Assume o controle de todas as páginas abertas
  })());
});

// Evento de recebimento de notificações PUSH do servidor
self.addEventListener("push", event => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: "Notificação", body: event.data.text() };
  }

  const title = payload.title || "Whaticket - V15.0.0";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/android-chrome-192x192.png",
    badge: payload.badge || "/android-chrome-192x192.png",
    tag: payload.tag || "default-tag",
    data: {
      url: payload.url || "/",
      ...payload.data
    },
    // ✅ Adiciona som e vibração à notificação
    sound: payload.sound || undefined,
    vibrate: payload.vibrate || [200, 100, 200], // Padrão de vibração
    requireInteraction: true // Mantém a notificação visível até a interação
  };

  // Envia a mensagem para a aplicação (se estiver aberta) para atualização em tempo real
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: "PUSH_EVENT", payload });
  }

  // Exibe a notificação no dispositivo
  event.waitUntil(self.registration.showNotification(title, options));
});

// Evento de clique na notificação
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(focusOrOpen(urlToOpen));
});