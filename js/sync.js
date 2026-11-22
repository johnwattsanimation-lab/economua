// Economua — guardar y sincronizar.
//  · En la PC: habla con el programa de fondo (localhost), que guarda el archivo cifrado en tu disco
//    y hace de cartero con Google Drive.
//  · En el cel: guarda una copia cifrada en el teléfono y usa una carpeta privada de Google Drive
//    (appDataFolder: solo esta app la puede ver) como buzón.

export const ES_PC = ['localhost', '127.0.0.1'].includes(location.hostname);

// ───────── Almacén local del navegador (IndexedDB) ─────────
let idbPromesa = null;
function idb() {
  if (!idbPromesa) idbPromesa = new Promise((ok, mal) => {
    const r = indexedDB.open('economua', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error);
  });
  return idbPromesa;
}
export async function kvLeer(k) { const d = await idb(); return new Promise((ok, mal) => { const t = d.transaction('kv').objectStore('kv').get(k); t.onsuccess = () => ok(t.result); t.onerror = () => mal(t.error); }); }
export async function kvGuardar(k, v) { const d = await idb(); return new Promise((ok, mal) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => ok(); t.onerror = () => mal(t.error); }); }
export async function kvBorrar(k) { const d = await idb(); return new Promise((ok, mal) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = () => ok(); t.onerror = () => mal(t.error); }); }

// ───────── PC: programa de fondo ─────────
const TOKEN = document.querySelector('meta[name="economua-token"]')?.content || '';
async function api(ruta, { metodo = 'GET', cuerpo } = {}) {
  const r = await fetch(ruta, { method: metodo, headers: { 'X-Economua': TOKEN, ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined, cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) { let msg = `Error ${r.status}`; try { msg = (await r.json()).error || msg; } catch (e) { /* nada */ } throw new Error(msg); }
  const tx = await r.text();
  return tx ? JSON.parse(tx) : {};
}
export const pc = {
  llaveDispositivo: () => api('/api/dispositivo'),
  guardarLlaveDispositivo: (mk) => api('/api/dispositivo', { metodo: 'POST', cuerpo: { mk } }),
  olvidarDispositivo: () => api('/api/dispositivo', { metodo: 'DELETE' }),
  leerLlave: () => api('/api/llave'),
  guardarLlave: (sobre) => api('/api/llave', { metodo: 'PUT', cuerpo: sobre }),
  leerBase: () => api('/api/base'),
  guardarBase: (sobre) => api('/api/base', { metodo: 'PUT', cuerpo: sobre }),
  leerBuzon: () => api('/api/buzon'),
  confirmarBuzon: (nombres) => api('/api/buzon/listo', { metodo: 'POST', cuerpo: { nombres } }),
  avisos: (lista) => api('/api/avisos', { metodo: 'POST', cuerpo: { lista } }),
  estado: () => api('/api/estado'),
  configGoogle: (datos) => api('/api/google/config', { metodo: 'POST', cuerpo: datos }),
  conectarGoogle: () => api('/api/google/conectar', { metodo: 'POST', cuerpo: {} }),
  desconectarGoogle: () => api('/api/google/desconectar', { metodo: 'POST', cuerpo: {} }),
  sincronizar: () => api('/api/sync', { metodo: 'POST', cuerpo: {} }),
  inicioWindows: (activar) => api('/api/inicio-windows', { metodo: 'POST', cuerpo: { activar } }),
  probarAviso: () => api('/api/probar-aviso', { metodo: 'POST', cuerpo: {} }),
  respaldo: () => api('/api/respaldo', { metodo: 'POST', cuerpo: {} }),
};

// ───────── Cel: Google Drive (carpeta privada de la app) ─────────
const CFG = window.ECONOMUA_CONFIG || {};
const ALCANCE = 'https://www.googleapis.com/auth/drive.appdata';
let token = null; let tokenVence = 0; let clienteToken = null;

export function driveConfigurado() { return !!(CFG.clientIdWeb && !CFG.clientIdWeb.startsWith('PEGA')); }
export function tokenValido() { return token && Date.now() < tokenVence - 60000; }

function cargarGoogle() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => ok(); s.onerror = () => mal(new Error('No se pudo cargar Google (¿sin internet?)'));
    document.head.appendChild(s);
  });
}
export async function prepararGoogle() {
  if (!driveConfigurado()) throw new Error('Falta el ID de Google en config.js');
  await cargarGoogle();
  const guardado = await kvLeer('tokenDrive');
  if (guardado && Date.now() < guardado.vence - 60000) { token = guardado.token; tokenVence = guardado.vence; }
}
// Debe llamarse desde un toque del usuario (Google abre una ventanita).
export function pedirToken(primeraVez = false) {
  return new Promise((ok, mal) => {
    if (!window.google?.accounts?.oauth2) { mal(new Error('Google no está listo')); return; }
    clienteToken = google.accounts.oauth2.initTokenClient({
      client_id: CFG.clientIdWeb, scope: ALCANCE,
      callback: async (r) => {
        if (r.error) { mal(new Error(r.error_description || r.error)); return; }
        token = r.access_token; tokenVence = Date.now() + (Number(r.expires_in) || 3600) * 1000;
        await kvGuardar('tokenDrive', { token, vence: tokenVence });
        ok();
      },
      error_callback: (e) => mal(new Error(e?.message || 'Se cerró la ventana de Google')),
    });
    clienteToken.requestAccessToken({ prompt: primeraVez ? 'consent' : '' });
  });
}
async function g(url, opciones = {}) {
  if (!tokenValido()) throw new Error('SIN_TOKEN');
  const r = await fetch(url, { ...opciones, headers: { Authorization: `Bearer ${token}`, ...(opciones.headers || {}) } });
  if (r.status === 401) { token = null; await kvBorrar('tokenDrive'); throw new Error('SIN_TOKEN'); }
  if (!r.ok && r.status !== 204) throw new Error(`Drive respondió ${r.status}`);
  return r;
}
export const drive = {
  async listar() {
    const r = await g('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&pageSize=1000&fields=files(id,name,modifiedTime)');
    return (await r.json()).files || [];
  },
  async leer(id) { const r = await g(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`); return r.text(); },
  async crear(nombre, texto) {
    const limite = 'economua' + Math.random().toString(36).slice(2);
    const cuerpo = `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: nombre, parents: ['appDataFolder'] })}\r\n--${limite}\r\nContent-Type: application/json\r\n\r\n${texto}\r\n--${limite}--`;
    const r = await g('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${limite}` }, body: cuerpo });
    return (await r.json()).id;
  },
  async actualizar(id, texto) { await g(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: texto }); },
  async borrar(id) { await g(`https://www.googleapis.com/drive/v3/files/${id}`, { method: 'DELETE' }); },
  async guardarPorNombre(nombre, texto, archivos) {
    const ya = (archivos || await this.listar()).find((f) => f.name === nombre);
    if (ya) await this.actualizar(ya.id, texto); else await this.crear(nombre, texto);
  },
};
