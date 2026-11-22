// Economua — trabajador de fondo del cel: funciona sin internet y muestra los avisos de pagos.
const CACHE = 'economua-v1';
const ARCHIVOS = ['./', 'index.html', 'estilos.css', 'config.js', 'manifest.webmanifest', 'js/app.js', 'js/datos.js', 'js/chat.js', 'js/cripto.js', 'js/sync.js', 'js/ui.js', 'js/pantallas.js', 'iconos/icono-192.png', 'iconos/icono-512.png'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });

// Primero internet (para recibir actualizaciones); si no hay, la copia guardada.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
});

// ── Avisos ──
function idb() { return new Promise((ok, mal) => { const r = indexedDB.open('economua', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); }); }
async function leer(k) { const d = await idb(); return new Promise((ok) => { const t = d.transaction('kv').objectStore('kv').get(k); t.onsuccess = () => ok(t.result); t.onerror = () => ok(undefined); }); }
async function escribir(k, v) { const d = await idb(); return new Promise((ok) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => ok(); t.onerror = () => ok(); }); }
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
function hoy() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

async function mostrarAvisos(desdePush) {
  let mostrados = 0;
  try {
    const llave = await leer('llaveAvisos'); const sobre = await leer('avisos');
    if (llave && sobre) {
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(sobre.iv) }, llave, deB64(sobre.ct));
      const lista = JSON.parse(new TextDecoder().decode(pt));
      const ya = new Set((await leer('mostrados')) || []);
      const h = hoy();
      for (const a of lista.filter((x) => x.fecha <= h && x.evento >= h && !ya.has(x.id))) {
        await self.registration.showNotification(a.titulo, { body: a.texto, icon: 'iconos/icono-192.png', badge: 'iconos/icono-192.png', tag: a.id, data: { url: './' } });
        ya.add(a.id); mostrados++;
      }
      await escribir('mostrados', [...ya].slice(-300));
    }
  } catch (e) { /* si algo falla, abajo se muestra el aviso general */ }
  if (desdePush && !mostrados) await self.registration.showNotification('Economua', { body: 'Tienes pagos o renovaciones próximos. Abre la app para verlos.', icon: 'iconos/icono-192.png', badge: 'iconos/icono-192.png', tag: 'economua-general', data: { url: './' } });
}
self.addEventListener('push', (e) => e.waitUntil(mostrarAvisos(true)));
self.addEventListener('periodicsync', (e) => { if (e.tag === 'economua-avisos') e.waitUntil(mostrarAvisos(false)); });
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => { for (const w of ws) if ('focus' in w) return w.focus(); return self.clients.openWindow('./'); }));
});
