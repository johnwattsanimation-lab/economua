// Economua — arranque, candado, guardado, sincronización y navegación (botón atrás).
import * as D from './datos.js';
import * as C from './cripto.js';
import * as S from './sync.js';
import { crearChat } from './chat.js';
import { esc, aviso, md } from './ui.js';
import { crearPantallas, NAV, TITULOS } from './pantallas.js';

const raiz = document.getElementById('app');
const estado = {
  db: null, llave: null, pantalla: 'chat', abierto: null, filtros: { tipo: 'todos', mes: D.mesDe(D.hoyISO()), busca: '' },
  mensajes: [], chat: null, oculto: localStorage.getItem('economua-ocultar') === '1', sync: { texto: '', alerta: false },
  ocultoDesde: 0, salirPendiente: 0,
};
const SAL_PRF = new TextEncoder().encode('economua-prf-v1-sal-fija-32bytes!');

// ───────────────────────── Arranque ─────────────────────────
async function iniciar() {
  document.body.classList.toggle('oculto', estado.oculto);
  if (!S.ES_PC && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  try {
    if (S.ES_PC) await iniciarPC(); else await iniciarCel();
  } catch (e) {
    console.error(e);
    pantallaError(e.message);
  }
}

function pantallaError(msg) {
  raiz.innerHTML = `<div class="bloqueo"><div class="caja"><img src="iconos/icono-192.png" alt=""><h1>Algo salió mal</h1>
    <p class="error">${esc(msg)}</p><p class="nota">${S.ES_PC ? 'Revisa que el programa de fondo esté abierto (icono junto al reloj) y vuelve a abrir Economua. El detalle queda en datos\\registro.txt.' : 'Revisa tu internet y vuelve a abrir la app.'}</p>
    <button class="btn prim" onclick="location.reload()">Intentar de nuevo</button></div></div>`;
}

// ── PC ──
async function iniciarPC() {
  let mk = null;
  try { const r = await S.pc.llaveDispositivo(); if (r?.mk) mk = C.deB64(r.mk); }
  catch (e) { throw new Error('No encuentro el programa de fondo de Economua.'); }
  if (mk) { await abrirConLlave(mk); return; }
  const sobre = await S.pc.leerLlave();
  if (!sobre) pantallaPrimerUsoPC(); else pantallaContrasenaPC(sobre);
}
function pantallaPrimerUsoPC() {
  raiz.innerHTML = `<div class="bloqueo"><div class="caja"><img src="iconos/icono-192.png" alt=""><h1>Bienvenido a Economua</h1>
    <p>Crea tu contraseña. Con ella se cifra todo. Esta PC quedará reconocida y no te la pedirá cada vez.</p>
    <div class="campo"><label for="p-nombre">¿Cómo te llamo? (opcional)</label><input id="p-nombre" maxlength="40" autocomplete="off"></div>
    <div class="campo"><label for="p-1">Contraseña (mínimo 8 caracteres)</label><input id="p-1" type="password" autocomplete="new-password"></div>
    <div class="campo"><label for="p-2">Repite la contraseña</label><input id="p-2" type="password" autocomplete="new-password"></div>
    <p class="error" id="p-err"></p>
    <button class="btn prim" id="p-ok">Crear contraseña y empezar</button>
    <p class="nota">⚠️ Si la olvidas, nadie la puede recuperar. Mientras esta PC esté reconocida podrás cambiarla desde Conexión y seguridad.</p></div></div>`;
  const ok = raiz.querySelector('#p-ok');
  ok.onclick = async () => {
    const a = raiz.querySelector('#p-1').value, b = raiz.querySelector('#p-2').value, err = raiz.querySelector('#p-err');
    if (a.length < 8) { err.textContent = 'La contraseña debe tener al menos 8 caracteres.'; return; }
    if (a !== b) { err.textContent = 'Las contraseñas no son iguales.'; return; }
    ok.disabled = true; ok.textContent = 'Cifrando…';
    try {
      const mk = C.nuevaLlaveMaestra();
      await S.pc.guardarLlave(await C.envolverConContrasena(mk, a));
      await S.pc.guardarLlaveDispositivo(C.aB64(mk));
      const nombre = raiz.querySelector('#p-nombre').value.trim();
      await abrirConLlave(mk, nombre);
    } catch (e) { err.textContent = e.message; ok.disabled = false; ok.textContent = 'Crear contraseña y empezar'; }
  };
}
function pantallaContrasenaPC(sobre) {
  raiz.innerHTML = `<div class="bloqueo"><div class="caja"><img src="iconos/icono-192.png" alt=""><h1>Economua</h1>
    <p>No reconozco esta PC. Escribe tu contraseña.</p>
    <div class="campo"><label for="p-1">Contraseña</label><input id="p-1" type="password" autocomplete="current-password"></div>
    <label class="interruptor" style="justify-content:center"><input type="checkbox" id="p-rec" checked> <span>Recordar esta PC</span></label>
    <p class="error" id="p-err"></p><button class="btn prim" id="p-ok">Entrar</button></div></div>`;
  const entrar = async () => {
    const err = raiz.querySelector('#p-err'); const ok = raiz.querySelector('#p-ok');
    ok.disabled = true; ok.textContent = 'Revisando…';
    try {
      const mk = await C.abrirConContrasena(sobre, raiz.querySelector('#p-1').value);
      if (raiz.querySelector('#p-rec').checked) await S.pc.guardarLlaveDispositivo(C.aB64(mk));
      await abrirConLlave(mk);
    } catch (e) { err.textContent = e.message; ok.disabled = false; ok.textContent = 'Entrar'; }
  };
  raiz.querySelector('#p-ok').onclick = entrar;
  raiz.querySelector('#p-1').onkeydown = (e) => { if (e.key === 'Enter') entrar(); };
  raiz.querySelector('#p-1').focus();
}

// ── Cel ──
async function iniciarCel() {
  const disp = await S.kvLeer('dispositivo');
  if (!disp) { pantallaConfigCel(); return; }
  pantallaHuella(disp);
}
function pantallaConfigCel(paso = 1, datos = {}) {
  const conf = S.driveConfigurado();
  if (!conf) {
    raiz.innerHTML = `<div class="bloqueo"><div class="caja"><img src="iconos/icono-192.png" alt=""><h1>Falta un paso en la PC</h1>
      <p>Esta página todavía no tiene el ID de Google. En tu PC abre Economua → Conexión y seguridad, guarda los datos de Google y vuelve a subir el archivo <b>config.js</b> a GitHub.</p></div></div>`;
    return;
  }
  if (paso === 1) {
    raiz.innerHTML = `<div class="bloqueo"><div class="caja"><img src="iconos/icono-192.png" alt=""><h1>Economua en tu cel</h1>
      <p>Paso 1 de 3: conecta tu Google. Economua solo usa una carpeta privada que nadie más ve (ni tú en tu Drive), y todo va cifrado.</p>
      <p class="error" id="c-err"></p><button class="btn prim" id="c-ok">Conectar con Google</button></div></div>`;
    raiz.querySelector('#c-ok').onclick = async () => {
      const err = raiz.querySelector('#c-err');
      try {
        await S.prepararGoogle(); await S.pedirToken(true);
        const archivos = await S.drive.listar();
        const f = archivos.find((x) => x.name === 'llave.json');
        if (!f) { err.textContent = 'Todavía no encuentro tus datos. Primero abre Economua en tu PC, conéctalo a Google y espera a que diga "Sincronizado".'; return; }
        const sobre = JSON.parse(await S.drive.leer(f.id));
        pantallaConfigCel(2, { sobre });
      } catch (e) { err.textContent = e.message; }
    };
  } else if (paso === 2) {
    raiz.innerHTML = `<div class="bloqueo"><div class="caja"><img src="iconos/icono-192.png" alt=""><h1>Tu contraseña</h1>
      <p>Paso 2 de 3: escribe la misma contraseña que creaste en tu PC.</p>
      <div class="campo"><label for="c-p">Contraseña</label><input id="c-p" type="password" autocomplete="current-password"></div>
      <p class="error" id="c-err"></p><button class="btn prim" id="c-ok">Continuar</button></div></div>`;
    const seguir = async () => {
      const err = raiz.querySelector('#c-err'); const b = raiz.querySelector('#c-ok'); b.disabled = true; b.textContent = 'Revisando…';
      try { const mk = await C.abrirConContrasena(datos.sobre, raiz.querySelector('#c-p').value); pantallaConfigCel(3, { ...datos, mk }); }
      catch (e) { err.textContent = e.message; b.disabled = false; b.textContent = 'Continuar'; }
    };
    raiz.querySelector('#c-ok').onclick = seguir;
    raiz.querySelector('#c-p').onkeydown = (e) => { if (e.key === 'Enter') seguir(); };
  } else {
    raiz.innerHTML = `<div class="bloqueo"><div class="caja"><img src="iconos/icono-192.png" alt=""><h1>Tu huella</h1>
      <p>Paso 3 de 3: activa tu huella para entrar sin escribir la contraseña. Este cel quedará reconocido.</p>
      <div class="huella">🫆</div><p class="error" id="c-err"></p>
      <button class="btn prim" id="c-ok">Activar huella</button><button class="btn" id="c-no">Prefiero escribir la contraseña cada vez</button></div></div>`;
    const terminar = async (conHuella) => {
      const err = raiz.querySelector('#c-err');
      try {
        await S.kvGuardar('llaveSobre', datos.sobre);
        const llaveAvisos = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        await S.kvGuardar('llaveAvisos', llaveAvisos);
        if (conHuella) await registrarHuella(datos.mk); else await S.kvGuardar('dispositivo', { tipo: 'contrasena' });
        await abrirConLlave(datos.mk);
      } catch (e) { err.textContent = `No se pudo activar la huella: ${e.message}`; }
    };
    raiz.querySelector('#c-ok').onclick = () => terminar(true);
    raiz.querySelector('#c-no').onclick = () => terminar(false);
  }
}
async function registrarHuella(mk) {
  if (!window.PublicKeyCredential) throw new Error('Este navegador no permite huella');
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: C.aleatorio(32), rp: { name: 'Economua', id: location.hostname },
    user: { id: C.aleatorio(16), name: 'economua', displayName: 'Economua' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
    timeout: 60000, extensions: { prf: {} },
  } });
  const credId = C.aB64(cred.rawId);
  let guardado = null;
  if (cred.getClientExtensionResults?.()?.prf?.enabled) {
    try {
      const secreto = await secretoPRF(credId);
      if (secreto) guardado = { tipo: 'prf', credId, sobre: await C.envolverConLlave(await C.llaveDeSecreto(secreto), mk) };
    } catch (e) { /* si falla, usamos la otra forma */ }
  }
  if (!guardado) guardado = { tipo: 'puerta', credId, llave: await C.importarLlave(mk, false) };
  await S.kvGuardar('dispositivo', guardado);
}
async function secretoPRF(credId) {
  const r = await navigator.credentials.get({ publicKey: { challenge: C.aleatorio(32), allowCredentials: [{ type: 'public-key', id: C.deB64(credId) }], userVerification: 'required', timeout: 60000, extensions: { prf: { eval: { first: SAL_PRF } } } } });
  const res = r.getClientExtensionResults?.()?.prf?.results?.first;
  return res ? new Uint8Array(res) : null;
}
function pantallaHuella(disp, mensaje = '') {
  const conHuella = disp.tipo !== 'contrasena';
  raiz.innerHTML = `<div class="bloqueo"><div class="caja"><img src="iconos/icono-192.png" alt=""><h1>Economua</h1>
    ${conHuella ? '<p>Pon tu huella para entrar.</p><button class="huella" id="h-ok" aria-label="Entrar con huella">🫆</button>' : '<p>Escribe tu contraseña.</p>'}
    <div id="h-pass" ${conHuella ? 'hidden' : ''}><div class="campo"><label for="h-p">Contraseña</label><input id="h-p" type="password" autocomplete="current-password"></div><button class="btn prim" id="h-entrar">Entrar</button></div>
    <p class="error" id="h-err">${esc(mensaje)}</p>
    ${conHuella ? '<button class="btn" id="h-usar">Usar contraseña</button>' : ''}</div></div>`;
  const err = raiz.querySelector('#h-err');
  const conHuellaEntrar = async () => {
    try {
      if (disp.tipo === 'prf') { const sec = await secretoPRF(disp.credId); if (!sec) throw new Error('No se pudo leer la huella'); await abrirConLlave(await C.abrirConLlave(await C.llaveDeSecreto(sec), disp.sobre)); }
      else {
        await navigator.credentials.get({ publicKey: { challenge: C.aleatorio(32), allowCredentials: [{ type: 'public-key', id: C.deB64(disp.credId) }], userVerification: 'required', timeout: 60000 } });
        await abrirConLlave(null, '', disp.llave);
      }
    } catch (e) { err.textContent = e.name === 'NotAllowedError' ? 'Se canceló. Toca la huella para intentar de nuevo.' : e.message; }
  };
  const conPass = async () => {
    try {
      const sobre = await S.kvLeer('llaveSobre');
      const mk = await C.abrirConContrasena(sobre, raiz.querySelector('#h-p').value);
      await abrirConLlave(mk);
    } catch (e) { err.textContent = e.message; }
  };
  if (conHuella) {
    raiz.querySelector('#h-ok').onclick = conHuellaEntrar;
    raiz.querySelector('#h-usar').onclick = () => { raiz.querySelector('#h-pass').hidden = false; raiz.querySelector('#h-usar').hidden = true; raiz.querySelector('#h-p').focus(); };
    conHuellaEntrar();
  }
  raiz.querySelector('#h-entrar').onclick = conPass;
  raiz.querySelector('#h-p').onkeydown = (e) => { if (e.key === 'Enter') conPass(); };
}

// ── Ya con la llave ──
async function abrirConLlave(mk, nombre = '', llaveYa = null) {
  estado.llave = llaveYa || await C.importarLlave(mk, false);
  let db = null;
  if (S.ES_PC) {
    const sobre = await S.pc.leerBase();
    db = sobre ? await C.descifrar(estado.llave, sobre) : D.nuevaBase();
  } else {
    const sobre = await S.kvLeer('base');
    db = sobre ? await C.descifrar(estado.llave, sobre) : null;
  }
  if (!db && !S.ES_PC) {
    // Cel nuevo: base vacía "vieja" (marca 1) para que todo lo que venga de la PC gane al unir.
    db = D.envejecer(D.nuevaBase());
    await S.kvGuardar('enviadoHasta', 1);
  }
  estado.db = D.normalizarBase(db);
  if (nombre) D.guardarAjustes(estado.db, { nombre });
  if (S.ES_PC) await importarBuzonPC(false);
  const hechos = D.procesarAutomaticos(estado.db, D.hoyISO());
  await guardarYa();
  estado.pantalla = 'chat'; estado.abierto = null; // al abrir siempre sale primero el chat
  estado.chat = crearChat({ db: () => estado.db, cambio: () => guardar() });
  estado.mensajes = [];
  agregarMensajes(estado.chat.avisoAutomaticos(hechos));
  agregarMensajes(estado.chat.saludo());
  prepararNavegacion();
  render();
  arrancarSincronizacion();
}

// ───────────────────────── Guardado ─────────────────────────
let tGuardar = null; let guardando = Promise.resolve();
export function guardar() { clearTimeout(tGuardar); tGuardar = setTimeout(() => { guardarYa(); }, 400); actualizarResumenChat(); }
async function guardarYa() {
  if (!estado.db || !estado.llave) return;
  const db = estado.db;
  guardando = guardando.then(async () => {
    try {
      const sobre = await C.cifrar(estado.llave, db);
      if (S.ES_PC) {
        await S.pc.guardarBase(sobre);
        await S.pc.avisos(D.avisos(db, D.hoyISO()));
      } else {
        await S.kvGuardar('base', sobre);
        await guardarAvisosCel(db);
        programarSyncCel();
      }
    } catch (e) { console.error(e); ponerSync(`No se pudo guardar: ${e.message}`, true); }
  });
  return guardando;
}
async function guardarAvisosCel(db) {
  const k = await S.kvLeer('llaveAvisos'); if (!k) return;
  await S.kvGuardar('avisos', await C.cifrar(k, D.avisos(db, D.hoyISO())));
}

// ───────────────────────── Sincronización ─────────────────────────
function ponerSync(texto, alerta = false) {
  estado.sync = { texto, alerta };
  const el = raiz.querySelector('#estado-sync');
  if (el) { el.textContent = texto; el.classList.toggle('alerta', alerta); }
}
let relojSync = null;
function arrancarSincronizacion() {
  clearInterval(relojSync);
  if (S.ES_PC) {
    revisarEstadoPC();
    relojSync = setInterval(async () => { await importarBuzonPC(true); revisarEstadoPC(); }, 30000);
  } else {
    S.prepararGoogle().then(() => sincronizarCel(false)).catch((e) => ponerSync('☁ Sin conexión', true));
    relojSync = setInterval(() => sincronizarCel(false), 5 * 60000);
  }
}
async function revisarEstadoPC() {
  try {
    const e = await S.pc.estado();
    estado.estadoPC = e;
    if (!e.driveConectado) ponerSync('☁ Drive sin conectar', true);
    else if (e.error) ponerSync('☁ Error de sincronización', true);
    else ponerSync(e.ultimaSync ? `☁ ${e.ultimaSync}` : '☁ Conectado');
  } catch (e) { ponerSync('⚠ Programa de fondo cerrado', true); }
}
async function importarBuzonPC(refrescar) {
  let lista;
  try { lista = await S.pc.leerBuzon(); } catch (e) { return; }
  if (!lista || !lista.length) return;
  const listos = []; let cambios = 0;
  for (const p of lista) {
    try {
      const paquete = await C.descifrar(estado.llave, JSON.parse(p.contenido));
      estado.db = D.unir(estado.db, paquete); listos.push(p.nombre); cambios++;
    } catch (e) { console.error('Paquete no válido', p.nombre, e); }
  }
  if (!listos.length) return;
  D.procesarAutomaticos(estado.db, D.hoyISO());
  await guardarYa();
  await S.pc.confirmarBuzon(listos);
  if (refrescar && cambios) { refrescarSiSePuede(); aviso(`Llegaron ${cambios === 1 ? 'datos' : cambios + ' paquetes'} de tu cel`); }
}
let tSyncCel = null;
function programarSyncCel() { clearTimeout(tSyncCel); tSyncCel = setTimeout(() => sincronizarCel(false), 2500); }
let sincronizando = false;
export async function sincronizarCel(interactivo) {
  if (S.ES_PC || !estado.db || sincronizando) return;
  if (!navigator.onLine) { ponerSync('☁ Sin internet (se guarda en el cel)', true); return; }
  try {
    await S.prepararGoogle();
    if (!S.tokenValido()) {
      if (!interactivo) { ponerSync('☁ Toca para sincronizar', true); return; }
      await S.pedirToken(false);
    }
    sincronizando = true; ponerSync('☁ Sincronizando…');
    const archivos = await S.drive.listar();
    // 1) Mandar lo nuevo de este cel como paquete
    const marca = (await S.kvLeer('enviadoHasta')) || 0;
    const ultima = D.ultimaMarcaDe(estado.db);
    if (ultima > marca) {
      const cambios = D.cambiosDesde(estado.db, marca);
      const sobre = await C.cifrar(estado.llave, cambios);
      await S.drive.crear(`paquete-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`, JSON.stringify(sobre));
      await S.kvGuardar('enviadoHasta', ultima);
    }
    // 2) Traer la base que dejó la PC
    const base = archivos.find((f) => f.name === 'base.json');
    if (base && base.modifiedTime !== (await S.kvLeer('baseMod'))) {
      const remoto = await C.descifrar(estado.llave, JSON.parse(await S.drive.leer(base.id)));
      estado.db = D.unir(estado.db, remoto);
      D.procesarAutomaticos(estado.db, D.hoyISO());
      await S.kvGuardar('baseMod', base.modifiedTime);
      await S.kvGuardar('enviadoHasta', Math.max((await S.kvLeer('enviadoHasta')) || 0, D.ultimaMarcaDe(remoto)));
      const sobre = await C.cifrar(estado.llave, estado.db);
      await S.kvGuardar('base', sobre); await guardarAvisosCel(estado.db);
      refrescarSiSePuede();
    }
    // 3) Llave (por si cambiaste la contraseña en la PC)
    const llave = archivos.find((f) => f.name === 'llave.json');
    if (llave && llave.modifiedTime !== (await S.kvLeer('llaveMod'))) { await S.kvGuardar('llaveSobre', JSON.parse(await S.drive.leer(llave.id))); await S.kvGuardar('llaveMod', llave.modifiedTime); }
    // 4) Avisos con la app cerrada (la PC manda un toque al cel)
    await suscribirPush(archivos);
    const h = new Date(); ponerSync(`☁ ✓ ${String(h.getHours()).padStart(2, '0')}:${String(h.getMinutes()).padStart(2, '0')}`);
  } catch (e) {
    if (e.message === 'SIN_TOKEN') ponerSync('☁ Toca para sincronizar', true);
    else { console.error(e); ponerSync(`☁ ${e.message}`, true); }
  } finally { sincronizando = false; }
}
async function suscribirPush(archivos) {
  if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return;
  const pub = archivos.find((f) => f.name === 'push-publica.txt'); if (!pub) return;
  const reg = await navigator.serviceWorker.ready;
  try { if (reg.periodicSync) await reg.periodicSync.register('economua-avisos', { minInterval: 6 * 3600 * 1000 }); } catch (e) { /* no siempre se permite */ }
  if (!reg.pushManager) return;
  const clave = (await S.drive.leer(pub.id)).trim();
  let sub = await reg.pushManager.getSubscription();
  if (sub && (await S.kvLeer('pushClave')) === clave && archivos.some((f) => f.name === 'push-suscripcion.json')) return;
  if (sub) await sub.unsubscribe();
  const bytes = C.deB64(clave.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((clave.length + 3) % 4));
  sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
  await S.drive.guardarPorNombre('push-suscripcion.json', JSON.stringify(sub.toJSON()), archivos);
  await S.kvGuardar('pushClave', clave);
}
export async function activarNotificacionesCel() {
  const p = await Notification.requestPermission();
  if (p !== 'granted') throw new Error('No diste permiso de notificaciones. Actívalo en los ajustes de Chrome para esta app.');
  await sincronizarCel(true);
}

// ───────────────────────── Candado del cel ─────────────────────────
document.addEventListener('visibilitychange', () => {
  if (S.ES_PC || !estado.llave) return;
  if (document.hidden) { estado.ocultoDesde = Date.now(); guardarYa(); return; }
  const min = Number(estado.db?.ajustes.bloqueoMinutos ?? 5);
  if (estado.ocultoDesde && Date.now() - estado.ocultoDesde > min * 60000) bloquear();
  else sincronizarCel(false);
});
export async function bloquear() {
  await guardarYa();
  estado.llave = null; estado.db = null; estado.mensajes = []; clearInterval(relojSync);
  const disp = await S.kvLeer('dispositivo');
  if (disp) pantallaHuella(disp, 'Se bloqueó por seguridad. Pon tu huella para entrar.'); else location.reload();
}

// ───────────────────────── Navegación y botón atrás ─────────────────────────
function prepararNavegacion() {
  history.replaceState({ p: 'chat', raiz: true }, '');
  history.pushState({ p: 'chat' }, '');
}
window.addEventListener('popstate', (e) => {
  if (!estado.db) return;
  const st = e.state || { raiz: true };
  if (st.raiz) {
    // Atrás en el inicio: pide un segundo toque para salir, nunca se cierra de golpe.
    if (Date.now() - estado.salirPendiente < 2500) { history.back(); return; }
    estado.salirPendiente = Date.now();
    history.pushState({ p: 'chat' }, '');
    estado.pantalla = 'chat'; estado.abierto = null; render();
    aviso('Presiona atrás otra vez para salir');
    return;
  }
  estado.pantalla = st.p || 'chat'; estado.abierto = st.abierto || null;
  render();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && estado.abierto) history.back(); });
export function ir(p) {
  if (p === estado.pantalla && !estado.abierto) { const main = raiz.querySelector('main'); if (main) main.scrollTop = 0; return; }
  estado.pantalla = p; estado.abierto = null;
  history.pushState({ p }, '');
  render();
}
export function abrir(id) { estado.abierto = id; history.pushState({ p: estado.pantalla, abierto: id }, ''); renderContenido(); }
export function cerrar() { if (estado.abierto) history.back(); }

// ───────────────────────── Dibujar ─────────────────────────
const pantallas = crearPantallas({ estado, guardar, ir, abrir, cerrar, render: () => renderContenido(), sincronizarCel, activarNotificacionesCel, bloquear, guardarYa, registrarHuella, enviarChat: (t) => enviarChat(t) });

function render() {
  if (!estado.db) return;
  const titulo = TITULOS[estado.pantalla] || 'Economua';
  raiz.innerHTML = `
    <header class="barra">
      <h1>${estado.pantalla === 'chat' ? '<img src="iconos/icono-192.png" alt="">Economua' : `<button class="icono-btn" data-acc="atras" aria-label="Regresar">←</button> ${esc(titulo)}`}</h1>
      <button class="icono-btn estado-sync ${estado.sync.alerta ? 'alerta' : ''}" id="estado-sync" data-acc="sync" title="Estado de sincronización">${esc(estado.sync.texto || '☁')}</button>
      <button class="icono-btn" data-acc="ojito" aria-label="${estado.oculto ? 'Mostrar cantidades' : 'Ocultar cantidades'}" title="${estado.oculto ? 'Mostrar cantidades' : 'Ocultar cantidades'}">${estado.oculto ? '🙈' : '👁️'}</button>
    </header>
    <nav class="lado">${NAV.lado.map((n) => n === '-' ? '<div class="sep"></div>' : `<button data-ir="${n[0]}" class="${estado.pantalla === n[0] ? 'activo' : ''}"><span class="ic">${n[1]}</span>${esc(n[2])}</button>`).join('')}</nav>
    <main id="principal"></main>
    <nav class="abajo">${NAV.abajo.map(([p, ic, txt]) => `<button data-ir="${p}" class="${navActivo(p) ? 'activo' : ''}"><span class="ic">${ic}</span>${esc(txt)}</button>`).join('')}</nav>`;
  renderContenido();
}
function navActivo(p) {
  if (p === 'mas') return !['chat', 'bancos', 'resumen', 'movimientos', 'pagos'].includes(estado.pantalla);
  return estado.pantalla === p;
}
function renderContenido() {
  const main = raiz.querySelector('#principal'); if (!main || !estado.db) return;
  if (estado.pantalla === 'chat') { renderChat(main); return; }
  const scroll = main.scrollTop;
  main.innerHTML = `<div class="contenido">${pantallas.html(estado.pantalla)}</div>`;
  pantallas.montar?.(estado.pantalla, main);
  main.scrollTop = scroll;
  const ed = main.querySelector('.editor'); if (ed && estado.abierto) ed.scrollIntoView({ block: 'nearest' });
}
function refrescarSiSePuede() {
  if (!estado.db) return;
  if (estado.pantalla === 'chat') actualizarResumenChat();
  else if (!estado.abierto) renderContenido();
}

// ── Chat ──
function renderChat(main) {
  main.innerHTML = `<div class="chat">
    <div class="chat-resumen" id="chat-resumen"></div>
    <div class="mensajes" id="mensajes" aria-live="polite"></div>
    <form class="entrada" id="entrada"><textarea id="texto" rows="1" placeholder="Ej: gasté 120 en un juego" autocomplete="off" aria-label="Escribe aquí"></textarea><button type="submit" aria-label="Enviar">➤</button></form></div>`;
  actualizarResumenChat();
  const cont = main.querySelector('#mensajes');
  cont.innerHTML = estado.mensajes.map(htmlMensaje).join('');
  cont.scrollTop = cont.scrollHeight;
  const ta = main.querySelector('#texto');
  main.querySelector('#entrada').onsubmit = (e) => { e.preventDefault(); const t = ta.value.trim(); if (!t) return; ta.value = ''; ta.style.height = ''; enviarChat(t); };
  ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); main.querySelector('#entrada').requestSubmit(); } };
  ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; };
  if (matchMedia('(min-width: 900px)').matches) ta.focus();
}
function actualizarResumenChat() {
  const el = raiz.querySelector('#chat-resumen'); if (!el || !estado.db) return;
  const db = estado.db; const h = D.hoyISO();
  const micro = D.sumar(D.microDelMes(db, D.mesDe(h), h)); const tope = D.topeMicro(db, h);
  el.innerHTML = `<button data-ir="bancos"><span class="et">Tengo</span><span class="val m-dinero">${esc(D.dinero(D.saldoTotal(db)))}</span></button>
    <button data-ir="bancos"><span class="et">Debo</span><span class="val m-dinero">${esc(D.dinero(D.deudaTotalTarjetas(db) + D.totalesPrestamos(db).debo))}</span></button>
    <button data-ir="resumen"><span class="et">Microgastos del mes</span><span class="val" style="color:${micro > tope ? 'var(--rojo)' : micro > tope * 0.8 ? 'var(--amarillo)' : 'inherit'}"><span class="m-dinero">${esc(D.dinero(micro))}</span> / <span class="m-dinero">${esc(D.dinero(tope))}</span></span></button>`;
}
let idMsg = 0;
function agregarMensajes(lista) {
  const cont = raiz.querySelector('#mensajes');
  let bajar = false;
  for (const msg of lista) {
    // Una tarjeta que ya está en el chat se actualiza (en su lugar, o se baja al final si la corregiste escribiendo)
    if (msg.id) {
      const i = estado.mensajes.findIndex((x) => x.id === msg.id);
      if (i >= 0) {
        msg.n = estado.mensajes[i].n;
        const el = cont?.querySelector(`[data-tid="${msg.id}"]`);
        if (msg.mover) { bajar = true; estado.mensajes.splice(i, 1); estado.mensajes.push(msg); el?.remove(); cont?.insertAdjacentHTML('beforeend', htmlMensaje(msg)); }
        else { estado.mensajes[i] = msg; if (el) el.outerHTML = htmlMensaje(msg); }
        continue;
      }
    }
    msg.n = ++idMsg; estado.mensajes.push(msg); bajar = true;
    if (cont) cont.insertAdjacentHTML('beforeend', htmlMensaje(msg));
  }
  if (estado.mensajes.length > 120) estado.mensajes.splice(0, estado.mensajes.length - 120);
  if (cont && bajar) cont.scrollTop = cont.scrollHeight;
}
function htmlTarjeta(msg) {
  const t = msg.tarjeta; const pend = t.estado === 'pendiente';
  const filas = t.filas.map((f) => `<button type="button" class="t-fila ${f.falta ? 'falta' : ''}" ${pend && !f.fijo ? `data-tc="${t.id}" data-campo="${f.k}"` : 'disabled'}>
      <span class="t-et">${esc(f.label)}</span><span class="t-val">${md(f.valor)}</span>${pend && !f.fijo ? '<span class="t-lapiz" aria-hidden="true">✏️</span>' : ''}</button>`).join('');
  const notas = (t.notas || []).map((n) => `<p class="t-nota">${md(n)}</p>`).join('');
  let botones = '';
  if (pend) botones = `<div class="t-botones"><button type="button" class="btn prim" data-tacc="confirmar" data-tc="${t.id}" ${t.puedeConfirmar ? '' : 'disabled'}>✅ Confirmar</button><button type="button" class="btn" data-tacc="cancelar" data-tc="${t.id}">✖️ Cancelar</button></div>`;
  if (t.estado === 'guardado') botones = `<div class="t-botones"><button type="button" class="btn chico" data-tacc="reabrir" data-tc="${t.id}">✏️ Cambiar algo</button><button type="button" class="btn chico" data-tacc="deshacer" data-tc="${t.id}">↩️ Deshacer</button></div>`;
  return `<div class="msg bot tarjeta-chat ${t.estado}" data-tid="${t.id}" data-n="${msg.n}"><p class="t-titulo">${esc(t.titulo)}</p>${filas ? `<div class="t-filas">${filas}</div>` : ''}${notas}${botones}</div>`;
}
function htmlMensaje(msg) {
  if (msg.de === 'yo') return `<div class="msg yo">${esc(msg.texto)}</div>`;
  if (msg.tarjeta) return htmlTarjeta(msg);
  const sem = msg.semaforo ? `<div class="semaforo ${msg.semaforo}">${msg.semaforo === 'verde' ? '🟢 Bien' : msg.semaforo === 'amarillo' ? '🟡 Cuidado' : '🔴 No conviene'}</div>` : '';
  const chips = msg.chips?.length ? `<div class="chips">${msg.chips.map((c) => `<button type="button" class="chip ${c.estilo === 'peligro' ? 'peligro' : ''}" data-chip="${c.id}" data-msg="${msg.n}" ${c.fecha ? 'data-fecha="1"' : ''} ${msg.usado ? 'disabled' : ''}>${esc(c.label)}</button>`).join('')}</div>` : '';
  return `<div class="msg bot ${msg.semaforo || ''}" data-n="${msg.n}">${sem}${msg.lineas.map((l) => `<p>${md(l)}</p>`).join('')}${chips}</div>`;
}
// Editor pequeño debajo del dato que tocaste (sin tapar la pantalla)
function abrirEditorTarjeta(boton) {
  const id = boton.dataset.tc, k = boton.dataset.campo;
  const caja = boton.closest('.tarjeta-chat');
  const yaAbierto = caja.querySelector(`.t-editor[data-k="${k}"]`);
  caja.querySelectorAll('.t-editor').forEach((x) => x.remove());
  if (yaAbierto) return;
  const info = estado.chat.campo(id, k); if (!info) return;
  let html = '';
  if (info.tipo === 'opciones') {
    html = `<div class="chips">${info.opciones.map((o, i) => `<button type="button" class="chip" data-tv="${i}">${esc(o.label)}</button>`).join('')}</div>`;
    if (info.extraTexto) html += `<div class="t-entrada"><input type="text" placeholder="${esc(info.extraTexto)}" aria-label="${esc(info.extraTexto)}"><button type="button" class="chip" data-tok="1">Usar</button></div>`;
  } else if (info.tipo === 'fecha') html = `<div class="t-entrada"><input type="date" value="${esc(info.valor || D.hoyISO())}" aria-label="Fecha"><button type="button" class="chip" data-tok="1">Listo</button></div>`;
  else html = `<div class="t-entrada"><input type="text" ${info.tipo === 'dinero' ? 'inputmode="decimal" placeholder="$0"' : ''} value="${esc(info.valor ?? '')}" aria-label="Nuevo valor"><button type="button" class="chip" data-tok="1">Listo</button></div>`;
  boton.insertAdjacentHTML('afterend', `<div class="t-editor" data-k="${k}">${html}</div>`);
  const ed = caja.querySelector('.t-editor');
  const aplicar = (msg) => { if (msg) { agregarMensajes([msg]); actualizarResumenChat(); } };
  ed.querySelectorAll('[data-tv]').forEach((b) => { b.onclick = () => aplicar(estado.chat.poner(id, k, info.opciones[Number(b.dataset.tv)].v)); });
  const input = ed.querySelector('input'); const ok = ed.querySelector('[data-tok]');
  if (input && ok) {
    const enviar = () => { const v = input.value.trim(); if (!v) return; aplicar(info.tipo === 'opciones' ? estado.chat.ponerTexto(id, k, v) : estado.chat.poner(id, k, v)); };
    ok.onclick = enviar; input.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); enviar(); } };
    if (info.tipo !== 'opciones') { input.focus(); if (input.select) input.select(); }
  }
}
function accionTarjeta(boton) {
  const id = boton.dataset.tc, a = boton.dataset.tacc;
  let r = [];
  try { r = estado.chat[a](id) || []; } catch (e) { console.error(e); r = [{ de: 'bot', lineas: [`Tuve un problema con eso: ${e.message}`] }]; }
  agregarMensajes(r); actualizarResumenChat();
  if (a === 'confirmar' || a === 'deshacer') { const cont = raiz.querySelector('#mensajes'); if (cont && r.length > 1) cont.scrollTop = cont.scrollHeight; }
}
function enviarChat(texto) {
  if (estado.pantalla !== 'chat') ir('chat');
  agregarMensajes([{ de: 'yo', texto }]);
  let r;
  try { r = estado.chat.procesar(texto); } catch (e) { console.error(e); r = [{ de: 'bot', lineas: [`Tuve un problema con eso: ${e.message}`] }]; }
  agregarMensajes(r);
  actualizarResumenChat();
  if (!S.ES_PC && !S.tokenValido()) sincronizarCel(true).catch(() => {}); // aprovecha el toque para conectar con Google
}
function tocarChip(boton, valor) {
  const msg = estado.mensajes.find((x) => x.n === Number(boton.dataset.msg));
  if (msg) msg.usado = true;
  boton.closest('.chips')?.querySelectorAll('button').forEach((b) => { b.disabled = true; });
  boton.closest('.msg')?.querySelector('.chip-fecha')?.remove();
  agregarMensajes([{ de: 'yo', texto: valor ? `${boton.textContent}: ${D.fechaBonita(valor)}` : boton.textContent }]);
  let r;
  try { r = estado.chat.tocar(boton.dataset.chip, valor); } catch (e) { console.error(e); r = [{ de: 'bot', lineas: [`Tuve un problema con eso: ${e.message}`] }]; }
  agregarMensajes(r);
  actualizarResumenChat();
}

// ── Clics (un solo escuchador para toda la app) ──
raiz.addEventListener('click', async (e) => {
  const tacc = e.target.closest('[data-tacc]');
  if (tacc && !tacc.disabled) { accionTarjeta(tacc); return; }
  const tfila = e.target.closest('.t-fila[data-campo]');
  if (tfila) { abrirEditorTarjeta(tfila); return; }
  const chip = e.target.closest('[data-chip]');
  if (chip && !chip.disabled) {
    if (chip.dataset.fecha) {
      const caja = chip.closest('.msg');
      if (!caja.querySelector('.chip-fecha')) {
        caja.insertAdjacentHTML('beforeend', `<div class="chip-fecha"><input type="date" value="${D.hoyISO()}" aria-label="Elige la fecha"><button type="button" class="chip">Usar esta fecha</button></div>`);
        caja.querySelector('.chip-fecha button').onclick = () => { const v = caja.querySelector('.chip-fecha input').value; if (v) tocarChip(chip, v); };
      }
      return;
    }
    tocarChip(chip); return;
  }
  const nav = e.target.closest('[data-ir]');
  if (nav) { ir(nav.dataset.ir); return; }
  const acc = e.target.closest('[data-acc]');
  if (!acc) return;
  const a = acc.dataset.acc;
  if (a === 'atras') { history.back(); return; }
  if (a === 'ojito') { estado.oculto = !estado.oculto; localStorage.setItem('economua-ocultar', estado.oculto ? '1' : '0'); document.body.classList.toggle('oculto', estado.oculto); acc.textContent = estado.oculto ? '🙈' : '👁️'; acc.title = acc.ariaLabel = estado.oculto ? 'Mostrar cantidades' : 'Ocultar cantidades'; return; }
  if (a === 'sync') { if (S.ES_PC) { try { await S.pc.sincronizar(); ponerSync('☁ Sincronizando…'); setTimeout(revisarEstadoPC, 4000); } catch (er) { ponerSync('⚠ ' + er.message, true); } } else sincronizarCel(true); return; }
  pantallas.accion(a, acc, e);
});
raiz.addEventListener('change', (e) => pantallas.cambio?.(e));

iniciar();
