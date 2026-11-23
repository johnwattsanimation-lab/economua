// Economua — chat sin IA.
// Regla de oro: NADA se guarda sin que lo confirmes. Cada cosa sale en una tarjeta con todos sus datos;
// cada dato se puede cambiar tocándolo o escribiéndolo ("no, eran 120"), y después se puede cambiar o deshacer.
import * as D from './datos.js';
import * as L from './lexico.js';

// ───────── Texto ─────────
export function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!"“”'`´;:()\[\]{}]/g, ' ').replace(/(\d),(\d{3})/g, '$1$2').replace(/,/g, ' , ').replace(/\s+/g, ' ').trim();
}
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const titulo = (s) => String(s || '').split(' ').filter(Boolean).map((w) => cap(w)).join(' ');
const singular = (w) => (w.length > 4 && w.endsWith('es') ? [w, w.slice(0, -2), w.slice(0, -1)] : w.length > 3 && w.endsWith('s') ? [w, w.slice(0, -1)] : [w]);
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ───────── Números con palabras ─────────
const UNI = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400, quinientos: 500, quinientas: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900 };
function numeroPalabras(tokens) {
  let mejor = null;
  for (let i = 0; i < tokens.length; i++) {
    if (!(tokens[i] in UNI) && tokens[i] !== 'mil') continue;
    let total = 0, actual = 0, j = i, usado = false, fuerte = false;
    while (j < tokens.length) {
      const w = tokens[j];
      if (w in UNI) { actual += UNI[w]; usado = true; if (UNI[w] >= 10) fuerte = true; }
      else if (w === 'mil') { total += (actual || 1) * 1000; actual = 0; usado = true; fuerte = true; }
      else if (w === 'y' && usado && tokens[j + 1] in UNI) { /* treinta y cinco */ }
      else break;
      j++;
    }
    if (['pesos', 'varos', 'baros', 'morlacos', 'pesitos'].includes(tokens[j])) fuerte = true;
    const valor = total + actual;
    if (usado && fuerte && (!mejor || valor > mejor.valor)) mejor = { valor, ini: i, fin: j };
  }
  return mejor;
}
export function extraerMonto(texto) {
  const t = ` ${texto} `; const cand = []; let m;
  const re = /(\$\s*)?(\d+)(?:\.(\d{1,2}))?\s*(k\b|mil\b|pesos\b|peso\b|varos\b|baros\b|mxn\b|lucas\b|luca\b|pesitos\b|morlacos\b)?/g;
  while ((m = re.exec(t))) {
    let v = Number(m[2]) + (m[3] ? Number('0.' + m[3]) : 0);
    const suf = m[4] || '';
    if (/^(k|mil|lucas|luca)$/.test(suf)) v *= 1000;
    const antes = t.slice(Math.max(0, m.index - 6), m.index);
    cand.push({ v, ini: m.index, fin: m.index + m[0].length, marca: !!m[1] || !!suf, trasPor: /\b(por|de|en)\s*$/.test(antes) });
  }
  if (cand.length) {
    const c = cand.find((x) => x.marca) || cand[0];
    return { monto: c.v, resto: (t.slice(0, c.ini) + ' ' + t.slice(c.fin)).replace(/\s+/g, ' ').trim() };
  }
  const tokens = texto.split(' '); const np = numeroPalabras(tokens);
  if (np) return { monto: np.valor, resto: [...tokens.slice(0, np.ini), ...tokens.slice(np.fin)].join(' ') };
  if (/\bmil\b/.test(texto)) return { monto: 1000, resto: texto.replace(/\bmil\b/, ' ').trim() };
  return { monto: null, resto: texto };
}

// ───────── Fechas ─────────
const MESES_N = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const DIAS_N = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
export function extraerFecha(texto, hoy, futuro = false) {
  let t = ` ${texto} `; let fecha = null; let m;
  const quitar = (x) => { t = t.replace(x, ' '); };
  const anio = Number(hoy.slice(0, 4));
  if ((m = t.match(/\b(antier|anteayer|antes de ayer)\b/))) { fecha = D.sumarDias(hoy, -2); quitar(m[0]); }
  else if ((m = t.match(/\bpasado manana\b/))) { fecha = D.sumarDias(hoy, 2); quitar(m[0]); }
  else if ((m = t.match(/\bayer\b/))) { fecha = D.sumarDias(hoy, -1); quitar(m[0]); }
  else if ((m = t.match(/\bmanana\b/)) && !/\b(en|por|de|esta) la manana\b/.test(t)) { fecha = D.sumarDias(hoy, 1); quitar(m[0]); }
  else if ((m = t.match(/\b(hoy|ahorita|ahora|hace rato|en la manana|esta manana|en la tarde|esta tarde|en la noche|esta noche|hoy en la \w+)\b/))) { fecha = hoy; quitar(m[0]); }
  else if ((m = t.match(/\bhace (\d{1,2}|un|una|dos|tres|cuatro|cinco|seis) (dia|dias|semana|semanas)\b/))) {
    const n = isNaN(Number(m[1])) ? UNI[m[1]] : Number(m[1]); fecha = D.sumarDias(hoy, -(m[2].startsWith('semana') ? 7 * n : n)); quitar(m[0]);
  } else if ((m = t.match(/\b(?:el\s+)?(?:dia\s+)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de|del)\s+(\d{4}))?\b/))) {
    const mes = MESES_N[m[2]]; const a = m[3] ? Number(m[3]) : anio;
    fecha = D.fechaConDia(a, mes, Number(m[1]));
    if (!m[3] && !futuro && fecha > hoy) fecha = D.fechaConDia(a - 1, mes, Number(m[1]));
    if (!m[3] && futuro && fecha < D.sumarDias(hoy, -200)) fecha = D.fechaConDia(a + 1, mes, Number(m[1]));
    quitar(m[0]);
  } else if ((m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    const a = m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : anio;
    fecha = D.fechaConDia(a, Number(m[2]), Number(m[1]));
    if (!m[3] && !futuro && fecha > hoy) fecha = D.fechaConDia(a - 1, Number(m[2]), Number(m[1]));
    quitar(m[0]);
  } else if ((m = t.match(/\b(?:el|este)\s+(?:dia\s+)?(\d{1,2})\b(?!\s*(?:pesos|varos|mil|k\b|de cada|del mes))/)) && Number(m[1]) >= 1 && Number(m[1]) <= 31) {
    fecha = futuro ? D.proximoDia(Number(m[1]), hoy) : D.anteriorDia(Number(m[1]), hoy);
    quitar(m[0]);
  } else if ((m = t.match(/\b(?:el\s+|este\s+)?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)(\s+pasado)?\b/))) {
    const obj = DIAS_N[m[1]]; const act = D.aFecha(hoy).getDay();
    let dif = (act - obj + 7) % 7; if (m[2] && dif === 0) dif = 7;
    fecha = futuro && !m[2] ? D.sumarDias(hoy, (obj - act + 7) % 7) : D.sumarDias(hoy, -dif);
    quitar(m[0]);
  }
  return { fecha, resto: t.replace(/\s+/g, ' ').trim() };
}
// "cada 20 del mes", "el 20 de cada mes", "los días 20", "se cobra el 20", "se renueva el 20"
function extraerDiaCobro(texto) {
  const res = [/\bcada\s+(?:dia\s+)?(\d{1,2})\s+(?:de\s+cada\s+mes|del\s+mes|de\s+mes)\b/, /\b(?:el|los)\s+(?:dia\s+|dias\s+)?(\d{1,2})\s+de\s+cada\s+mes\b/, /\bcada\s+dia\s+(\d{1,2})\b/,
    /\blos\s+dias?\s+(\d{1,2})\b/, /\b(?:se\s+(?:cobra|renueva|paga|carga)|me\s+(?:cobran|cargan)|cobran|se\s+vence|vence|corta)\s+(?:cada\s+|el\s+|los\s+)?(?:dia\s+)?(\d{1,2})\b/,
    /\bcada\s+(\d{1,2})\b(?!\s*(?:dias|meses|semanas|anos))/, /\b(\d{1,2})\s+de\s+cada\s+mes\b/];
  for (const re of res) { const m = texto.match(re); if (m && Number(m[1]) >= 1 && Number(m[1]) <= 31) return { dia: Number(m[1]), resto: texto.replace(m[0], ' ').replace(/\s+/g, ' ').trim() }; }
  return { dia: null, resto: texto };
}
function extraerFrecuencia(t) {
  if (/\b(cada (3|tres) meses|trimestral|trimestre)\b/.test(t)) return 'trimestral';
  if (/\b(al ano|anual|anualidad|cada ano|por ano|anuales|al anio|cada anio|anualmente)\b/.test(t)) return 'anual';
  if (/\b(semanal|cada semana|a la semana|por semana|semanalmente)\b/.test(t)) return 'semanal';
  if (/\b(quincenal|cada (15|quince) dias|a la quincena|cada quincena)\b/.test(t)) return 'quincenal';
  if (/\b(al mes|mensual|mensuales|cada mes|por mes|mensualidad|mensualmente|de cada mes|del mes)\b/.test(t)) return 'mensual';
  return null;
}
const RE_FRECUENCIA = /\b(cada (3|tres) meses|trimestral|trimestre|al ano|anual|anualidad|cada ano|por ano|anuales|anualmente|semanal|cada semana|a la semana|por semana|semanalmente|quincenal|cada (15|quince) dias|a la quincena|cada quincena|al mes|mensual|mensuales|cada mes|por mes|mensualidad|mensualmente)\b/g;
function extraerMSI(t) {
  const m = t.match(/\b(?:a\s+)?(\d{1,2}|tres|seis|nueve|doce|dieciocho|veinticuatro)\s*(?:meses\s+sin\s+intereses|msi|meses)\b/);
  if (!m) return null;
  return { meses: isNaN(Number(m[1])) ? UNI[m[1]] : Number(m[1]), resto: t.replace(m[0], ' ') };
}

// ───────── Motor ─────────
export function crearChat(ctx) {
  const db = () => ctx.db();
  const hoy = () => (ctx.hoy ? ctx.hoy() : D.hoyISO());
  const cambio = () => ctx.cambio && ctx.cambio();
  let manejadores = {}; let contador = 0; let espera = null;
  const tarjetas = new Map(); // id → borrador
  let activa = null;          // id de la última tarjeta sin confirmar (para correcciones escritas)
  let mapaOriginal = {};
  const pila = [];            // para "deshacer" escrito

  const chip = (label, fn, estilo) => { const id = `c${++contador}`; manejadores[id] = fn; return { id, label, estilo }; };
  const bot = (lineas, extra = {}) => ({ de: 'bot', lineas: Array.isArray(lineas) ? lineas : [lineas], ...extra });
  const fechaCorta = (iso) => { if (!iso) return ''; const f = D.aFecha(iso); return `${f.getDate()} de ${D.MESES[f.getMonth()]}`; };
  const textoOriginal = (palabras) => palabras.map((w) => mapaOriginal[w] || w).join(' ');

  // ── Cuentas y tarjetas ──
  function pagosPosibles() {
    const out = D.lista(db(), 'cuentas').map((c) => ({ tipo: 'cuenta', id: c.id, nombre: c.nombre, clave: norm(c.nombre), efectivo: c.tipo === 'efectivo' }));
    for (const t of D.lista(db(), 'tarjetas')) out.push({ tipo: 'tarjeta', id: t.id, nombre: t.nombre, clave: norm(t.nombre) });
    return out.sort((a, b) => b.clave.length - a.clave.length);
  }
  function buscarExistente(t, soloTipo) {
    for (const p of pagosPosibles()) if ((!soloTipo || p.tipo === soloTipo) && p.clave && new RegExp(`\\b${escRe(p.clave)}\\b`).test(t)) return p;
    if ((!soloTipo || soloTipo === 'cuenta') && L.PALABRAS_EFECTIVO.test(t)) { const e = pagosPosibles().find((p) => p.efectivo); if (e) return e; }
    return null;
  }
  // Busca una cuenta mencionada, aunque todavía no exista ("tengo 1500 en mercado pago").
  function cuentaMencionada(t, soloTipo = 'cuenta') {
    const ya = buscarExistente(t, soloTipo); if (ya) return ya;
    const bancos = Object.keys(L.BANCOS).sort((a, b) => b.length - a.length);
    for (const b of bancos) if (new RegExp(`\\b${escRe(b)}\\b`).test(t) && !['twitch', 'kick', 'tiktok', 'patreon', 'tdc'].includes(b)) return { tipo: soloTipo, nuevo: true, nombre: L.BANCOS[b] };
    const m = t.match(/\b(?:en|de|desde|a|con)\s+(?:la\s+|el\s+|mi\s+)?(?:cuenta|tarjeta|banco|cartera)\s+(?:de\s+)?([a-z0-9ñ]+(?:\s+[a-z0-9ñ]+)?)/);
    if (m) { const w = m[1].split(' ').filter((x) => !L.STOP.has(x) && !/^\d+$/.test(x)); if (w.length) return { tipo: soloTipo, nuevo: true, nombre: titulo(textoOriginal(w)) }; }
    return null;
  }
  const valorPago = (p) => (!p ? '' : p.nuevo ? `nueva-${p.tipo}:${p.nombre}` : `${p.tipo}:${p.id}`);
  function leerPago(v) { const [tipo, ...r] = String(v || '').split(':'); return { tipo, id: r.join(':') }; }
  function nombrePagoValor(v) {
    if (!v) return '—';
    const p = leerPago(v);
    if (p.tipo === 'nueva-cuenta') return `🏦 ${p.id} (cuenta nueva)`;
    if (p.tipo === 'nueva-tarjeta') return `💳 ${p.id} (tarjeta nueva)`;
    if (p.tipo === 'tarjeta') return `💳 ${D.obtener(db(), 'tarjetas', p.id)?.nombre || '¿?'}`;
    if (p.tipo === 'nada') return 'Solo anotar (no movió mis cuentas)';
    return `🏦 ${D.obtener(db(), 'cuentas', p.id)?.nombre || '¿?'}`;
  }
  // Crea la cuenta o tarjeta nueva si hace falta y devuelve {tipo, id}
  function asegurarPago(v, extra = {}) {
    const p = leerPago(v);
    if (p.tipo === 'nueva-cuenta') { const c = D.guardar(db(), 'cuentas', { nombre: p.id, tipo: /mercado pago|paypal|spin|didi|uala|rappi/i.test(p.id) ? 'digital' : 'banco', saldoInicial: 0 }); return { tipo: 'cuenta', id: c.id, creado: ['cuentas', c.id] }; }
    if (p.tipo === 'nueva-tarjeta') { const t = D.guardar(db(), 'tarjetas', { nombre: p.id, diaCorte: extra.diaCorte || 1, diaPago: extra.diaPago || 20, deudaInicial: 0 }); return { tipo: 'tarjeta', id: t.id, creado: ['tarjetas', t.id] }; }
    return p;
  }
  function pagoPredeterminado() {
    const c = D.obtener(db(), 'cuentas', db().ajustes.cuentaPredeterminada) || D.lista(db(), 'cuentas')[0];
    return c ? `cuenta:${c.id}` : '';
  }

  // ── Descripción, categoría, fuente ──
  function palabrasDe(resto) {
    for (const p of pagosPosibles()) if (p.clave) resto = resto.replace(new RegExp(`\\b(?:con|en|de|desde|a|por)?\\s*(?:la|mi|el)?\\s*(?:tarjeta|cuenta)?\\s*${escRe(p.clave)}\\b`, 'g'), ' ');
    resto = resto.replace(RE_FRECUENCIA, ' ');
    return resto.split(' ').map((w) => w.replace(/[^a-z0-9ñ+-]/g, '')).filter((w) => w && !L.STOP.has(w) && !L.FORMAS.has(w) && !/^\d+([.]\d+)?$/.test(w) && w.length > 1 && !L.PALABRAS_DINERO.has(w));
  }
  function categoriaDe(palabras) {
    const d = db();
    for (const w of palabras) for (const f of singular(w)) if (d.aprendido[f] && D.obtener(d, 'categorias', d.aprendido[f].cat)) return d.aprendido[f].cat;
    const cats = D.lista(d, 'categorias');
    for (const w of palabras) for (const f of singular(w)) for (const c of cats) if ((c.palabras || []).includes(f) || norm(c.nombre) === f) return c.id;
    for (const w of palabras) if (L.SERVICIOS[w]) return 'suscripciones';
    return null;
  }
  function fuenteDe(t) {
    for (const f of D.lista(db(), 'fuentes')) {
      if (new RegExp(`\\b${escRe(norm(f.nombre).split(' ')[0])}\\b`).test(t)) return f.id;
      for (const w of f.palabras || []) if (new RegExp(`\\b${escRe(w)}\\b`).test(t)) return f.id;
    }
    return null;
  }
  function servicioEn(t) {
    const orden = Object.keys(L.SERVICIOS).sort((a, b) => b.length - a.length);
    const s = orden.find((x) => new RegExp(`\\b${escRe(x)}\\b`).test(t));
    return s ? L.SERVICIOS[s] : null;
  }
  function buscarSuscripcion(t) {
    return D.lista(db(), 'suscripciones').sort((a, b) => b.nombre.length - a.nombre.length).find((s) => new RegExp(`\\b${escRe(norm(s.nombre))}\\b`).test(t)) || null;
  }

  // ───────── Tipos de tarjeta y sus datos ─────────
  const TIPOS = {
    gasto: { nombre: 'Gasto', emoji: '💸', campos: ['monto', 'descripcion', 'categoria', 'pago', 'fecha', 'micro'] },
    ingreso: { nombre: 'Ingreso', emoji: '💰', campos: ['monto', 'descripcion', 'fuente', 'cuenta', 'fecha'] },
    saldo: { nombre: 'Saldo de una cuenta', emoji: '🏦', campos: ['cuenta', 'monto'] },
    deuda: { nombre: 'Deuda de una tarjeta', emoji: '💳', campos: ['tarjeta', 'monto'] },
    suscripcion: { nombre: 'Suscripción', emoji: '🔁', campos: ['nombre', 'monto', 'frecuencia', 'inicio', 'proxima', 'renueva', 'pago', 'registrarPago'] },
    transferencia: { nombre: 'Pasar dinero entre mis cuentas', emoji: '🔄', campos: ['monto', 'origen', 'destino', 'fecha'] },
    pagoTarjeta: { nombre: 'Pago de tarjeta', emoji: '💳', campos: ['monto', 'tarjeta', 'origen', 'fecha'] },
    prestamo: { nombre: 'Préstamo', emoji: '🤝', campos: ['persona', 'direccion', 'monto', 'cuentaPrestamo', 'fecha'] },
    abono: { nombre: 'Abono de un préstamo', emoji: '🤝', campos: ['prestamo', 'monto', 'fecha'] },
    meta: { nombre: 'Apartar para una meta', emoji: '🎯', campos: ['meta', 'monto'] },
    msi: { nombre: 'Compra a meses sin intereses', emoji: '🗓️', campos: ['descripcion', 'monto', 'meses', 'tarjeta', 'fecha', 'categoria'] },
    cancelarSus: { nombre: 'Cancelar suscripción', emoji: '❌', campos: ['suscripcion', 'modo'], sinTipo: true },
    reactivarSus: { nombre: 'Reactivar suscripción', emoji: '🔁', campos: ['suscripcion', 'inicio', 'monto', 'registrarPago'], sinTipo: true },
    borrar: { nombre: 'Borrar', emoji: '🗑️', campos: ['movimiento'], sinTipo: true },
  };
  const TIPOS_CAMBIABLES = ['gasto', 'ingreso', 'saldo', 'suscripcion', 'transferencia', 'pagoTarjeta', 'deuda', 'prestamo', 'meta', 'msi'];
  const etiquetaMonto = (b) => ({ saldo: 'Tengo ahora', deuda: 'Debo ahora', suscripcion: 'Precio', meta: 'Apartar', msi: 'Precio total', reactivarSus: 'Precio' }[b.tipo] || 'Monto');
  const opcPago = (incluirTarjetas = true, b) => {
    const op = pagosPosibles().filter((p) => incluirTarjetas || p.tipo === 'cuenta').map((p) => ({ v: `${p.tipo}:${p.id}`, label: `${p.tipo === 'tarjeta' ? '💳' : '🏦'} ${p.nombre}` }));
    for (const k of ['pago', 'cuenta', 'origen', 'destino']) if (b?.[k] && leerPago(b[k]).tipo.startsWith('nueva') && !op.some((o) => o.v === b[k])) op.unshift({ v: b[k], label: nombrePagoValor(b[k]) });
    return op;
  };
  const CAMPOS = {
    monto: { label: etiquetaMonto, tipo: 'dinero', ver: (b) => (b.monto != null ? D.dinero(b.monto) : null) },
    descripcion: { label: () => 'Descripción', tipo: 'texto', ver: (b) => b.descripcion || null },
    nombre: { label: () => 'Nombre', tipo: 'texto', ver: (b) => b.nombre || null },
    categoria: { label: () => 'Categoría', tipo: 'opciones', ver: (b) => { const c = D.categoria(db(), b.categoria); return `${c.emoji || ''} ${c.nombre}`; },
      opciones: () => D.lista(db(), 'categorias').sort((a, b) => a.nombre.localeCompare(b.nombre)).map((c) => ({ v: c.id, label: `${c.emoji || ''} ${c.nombre}` })) },
    pago: { label: (b) => (b.tipo === 'suscripcion' ? 'Se paga con' : 'Pagado con'), tipo: 'opciones', ver: (b) => nombrePagoValor(b.pago), opciones: (b) => opcPago(true, b) },
    cuenta: { label: (b) => (b.tipo === 'saldo' ? 'Cuenta' : 'Entró a'), tipo: 'opciones', ver: (b) => nombrePagoValor(b.cuenta), opciones: (b) => opcPago(false, b), extraTexto: 'Escribe el nombre de una cuenta nueva' },
    origen: { label: () => 'Sale de', tipo: 'opciones', ver: (b) => nombrePagoValor(b.origen), opciones: (b) => opcPago(false, b) },
    destino: { label: () => 'Llega a', tipo: 'opciones', ver: (b) => nombrePagoValor(b.destino), opciones: (b) => opcPago(false, b) },
    tarjeta: { label: () => 'Tarjeta', tipo: 'opciones', ver: (b) => nombrePagoValor(b.tarjeta), extraTexto: 'Escribe el nombre de una tarjeta nueva',
      opciones: (b) => { const op = D.lista(db(), 'tarjetas').map((t) => ({ v: `tarjeta:${t.id}`, label: `💳 ${t.nombre}` })); if (b.tarjeta && leerPago(b.tarjeta).tipo === 'nueva-tarjeta' && !op.some((o) => o.v === b.tarjeta)) op.unshift({ v: b.tarjeta, label: nombrePagoValor(b.tarjeta) }); return op; } },
    fecha: { label: () => 'Fecha', tipo: 'fecha', ver: (b) => cap(D.fechaBonita(b.fecha, hoy())) },
    micro: { label: () => '¿Microgasto?', tipo: 'opciones', ver: (b) => (b.micro === 'si' ? 'Sí, contarlo' : b.micro === 'no' ? 'No contarlo' : `Automático (${D.esMicro(db(), { tipo: 'gasto', monto: b.monto || 0, categoria: b.categoria }, hoy()) ? 'sí es' : 'no es'})`),
      opciones: () => [{ v: 'auto', label: 'Automático (según el monto)' }, { v: 'si', label: 'Sí, contarlo' }, { v: 'no', label: 'No contarlo' }] },
    fuente: { label: () => '¿De dónde vino?', tipo: 'opciones', ver: (b) => D.fuente(db(), b.fuente).nombre, opciones: () => D.lista(db(), 'fuentes').map((f) => ({ v: f.id, label: f.nombre })) },
    frecuencia: { label: () => '¿Cada cuándo?', tipo: 'opciones', ver: (b) => D.FRECUENCIAS[b.frecuencia] || '—', opciones: () => Object.entries(D.FRECUENCIAS).map(([v, label]) => ({ v, label })) },
    inicio: { label: (b) => (b.tipo === 'reactivarSus' ? 'Desde qué día' : 'Empezó / último cobro'), tipo: 'fecha', ver: (b) => cap(D.fechaBonita(b.inicio, hoy())) },
    proxima: { label: (b) => (b.renueva === false ? 'Termina el' : 'Se renueva el'), tipo: 'fecha', ver: (b) => cap(D.fechaBonita(b.proxima, hoy())) },
    renueva: { label: () => '¿Se renueva sola?', tipo: 'opciones', ver: (b) => (b.renueva === false ? 'No, se cancela al terminar' : 'Sí, se renueva sola'), opciones: () => [{ v: true, label: 'Sí, se renueva sola' }, { v: false, label: 'No, se cancela al terminar' }] },
    registrarPago: { label: () => '¿Anotar el pago?', tipo: 'opciones', ver: (b) => (b.registrarPago ? `Sí (${fechaCorta(b.inicio)})` : 'No (ya lo anoté o es prueba gratis)'), opciones: () => [{ v: true, label: 'Sí, registrarlo' }, { v: false, label: 'No' }] },
    persona: { label: () => 'Persona', tipo: 'texto', ver: (b) => b.persona || null },
    direccion: { label: () => '¿Quién debe?', tipo: 'opciones', ver: (b) => (b.direccion === 'debo' ? 'Yo le debo' : 'Me debe a mí'), opciones: () => [{ v: 'meDeben', label: 'Me debe a mí' }, { v: 'debo', label: 'Yo le debo' }] },
    cuentaPrestamo: { label: () => 'Dinero salió/entró de', tipo: 'opciones', ver: (b) => nombrePagoValor(b.cuentaPrestamo), opciones: (b) => [...opcPago(false, b), { v: 'nada:', label: 'Solo anotar (no movió mis cuentas)' }] },
    prestamo: { label: () => 'Préstamo', tipo: 'opciones', ver: (b) => { const p = D.obtener(db(), 'prestamos', b.prestamo); return p ? `${p.persona} (${p.direccion === 'meDeben' ? 'te debe' : 'le debes'} ${D.dinero(D.prestamoSaldo(p))})` : null; },
      opciones: () => D.lista(db(), 'prestamos').filter((p) => D.prestamoSaldo(p) > 0).map((p) => ({ v: p.id, label: `${p.persona}: ${D.dinero(D.prestamoSaldo(p))}` })) },
    meta: { label: () => 'Meta', tipo: 'opciones', extraTexto: 'Escribe el nombre de una meta nueva', ver: (b) => (b.meta ? (b.meta.startsWith('nueva:') ? `${b.meta.slice(6)} (meta nueva)` : D.obtener(db(), 'metas', b.meta)?.nombre) : null),
      opciones: (b) => { const op = D.lista(db(), 'metas').map((x) => ({ v: x.id, label: `🎯 ${x.nombre}` })); if (b.meta?.startsWith('nueva:')) op.unshift({ v: b.meta, label: `${b.meta.slice(6)} (meta nueva)` }); return op; } },
    meses: { label: () => 'Meses', tipo: 'opciones', ver: (b) => (b.meses ? `${b.meses} meses (${D.dinero((b.monto || 0) / b.meses)} al mes)` : null), opciones: () => [3, 6, 9, 12, 18, 24].map((n) => ({ v: n, label: `${n} meses` })) },
    suscripcion: { label: () => 'Suscripción', tipo: 'opciones', ver: (b) => D.obtener(db(), 'suscripciones', b.suscripcion)?.nombre || null, opciones: () => D.lista(db(), 'suscripciones').map((s) => ({ v: s.id, label: s.nombre })) },
    modo: { label: () => '¿Cómo?', tipo: 'opciones', ver: (b) => (b.modo === 'hoy' ? 'Ya terminó hoy' : b.suscripcion ? `Ya no se renueva (la usas hasta el ${fechaCorta(D.obtener(db(), 'suscripciones', b.suscripcion)?.proxima)})` : 'Ya no se renueva'),
      opciones: () => [{ v: 'noRenovar', label: 'Ya no se renueva (la uso hasta que termine)' }, { v: 'hoy', label: 'Ya terminó hoy' }] },
    movimiento: { label: () => 'Movimiento', tipo: 'fijo', ver: (b) => { const m = D.obtener(db(), 'movimientos', b.movimiento); return m ? `${m.descripcion || m.tipo} · ${D.dinero(m.monto)} · ${fechaCorta(m.fecha)}` : '(ya no existe)'; } },
  };

  // Completa lo que falte con lo más lógico
  function completar(b) {
    const h = hoy();
    if (['gasto', 'ingreso', 'transferencia', 'pagoTarjeta', 'prestamo', 'abono', 'msi'].includes(b.tipo) && !b.fecha) b.fecha = h;
    if (b.tipo === 'gasto') { b.pago = b.pago || pagoPredeterminado(); b.categoria = b.categoria || categoriaDe(b.palabras || []) || 'otros'; b.micro = b.micro || 'auto'; b.descripcion = b.descripcion || (b.palabras?.length ? cap(textoOriginal(b.palabras)) : D.categoria(db(), b.categoria).nombre); }
    if (b.tipo === 'ingreso') { b.cuenta = b.cuenta && !leerPago(b.cuenta).tipo.includes('tarjeta') ? b.cuenta : pagoPredeterminado(); b.fuente = b.fuente || 'otros-ing'; b.descripcion = b.descripcion || (b.palabras?.length ? cap(textoOriginal(b.palabras)) : D.fuente(db(), b.fuente).nombre); }
    if (b.tipo === 'saldo') { if (!b.cuenta || leerPago(b.cuenta).tipo.includes('tarjeta')) b.cuenta = pagoPredeterminado(); }
    if (b.tipo === 'deuda' || b.tipo === 'pagoTarjeta' || b.tipo === 'msi') { if (!b.tarjeta || !leerPago(b.tarjeta).tipo.includes('tarjeta')) { const ts = D.lista(db(), 'tarjetas'); b.tarjeta = ts.length ? `tarjeta:${ts[0].id}` : ''; } }
    if (b.tipo === 'pagoTarjeta' || b.tipo === 'transferencia') b.origen = b.origen || pagoPredeterminado();
    if (b.tipo === 'transferencia' && !b.destino) { const otra = pagosPosibles().find((p) => p.tipo === 'cuenta' && `cuenta:${p.id}` !== b.origen); b.destino = otra ? `cuenta:${otra.id}` : ''; }
    if (b.tipo === 'msi') { b.meses = b.meses || 3; b.categoria = b.categoria || categoriaDe(b.palabras || []) || 'otros'; b.descripcion = b.descripcion || (b.palabras?.length ? cap(textoOriginal(b.palabras)) : 'Compra a meses'); }
    if (b.tipo === 'prestamo') { b.direccion = b.direccion || 'meDeben'; b.cuentaPrestamo = b.cuentaPrestamo || pagoPredeterminado(); }
    if (b.tipo === 'suscripcion') {
      b.frecuencia = b.frecuencia || 'mensual';
      if (b.diaCobro && !b.inicio) b.inicio = D.anteriorDia(b.diaCobro, h);
      b.inicio = b.inicio || h;
      if (!b.proximaManual) b.proxima = D.siguientePeriodo(b.inicio, b.frecuencia, b.diaCobro || Number(b.inicio.slice(8, 10)));
      if (b.renueva === undefined) b.renueva = true;
      b.pago = b.pago || pagoPredeterminado();
      if (b.registrarPago === undefined) b.registrarPago = !b.editando && b.inicio <= h;
      b.nombre = b.nombre || (b.palabras?.length ? titulo(textoOriginal(b.palabras.slice(0, 3))) : '');
    }
    if (b.tipo === 'reactivarSus') { b.inicio = b.inicio || h; if (b.registrarPago === undefined) b.registrarPago = b.inicio <= h; }
    if (b.tipo === 'cancelarSus') b.modo = b.modo || 'noRenovar';
    return b;
  }
  function faltantes(b) {
    const f = [];
    const req = { gasto: ['monto'], ingreso: ['monto'], saldo: ['cuenta', 'monto'], deuda: ['tarjeta', 'monto'], suscripcion: ['nombre', 'monto'], transferencia: ['monto', 'origen', 'destino'],
      pagoTarjeta: ['monto', 'tarjeta'], prestamo: ['persona', 'monto'], abono: ['prestamo', 'monto'], meta: ['meta', 'monto'], msi: ['monto', 'tarjeta'], cancelarSus: ['suscripcion'], reactivarSus: ['suscripcion'], borrar: ['movimiento'] }[b.tipo] || [];
    for (const k of req) if (b[k] == null || b[k] === '' || (k === 'monto' && !(b.monto > 0) && b.tipo !== 'saldo' && b.tipo !== 'deuda')) f.push(k);
    if (b.tipo === 'transferencia' && b.origen && b.origen === b.destino) f.push('destino');
    return f;
  }

  // ── Dibujar tarjeta ──
  function vistaTarjeta(b) {
    const t = TIPOS[b.tipo];
    const filas = [];
    if (!t.sinTipo && b.estado === 'pendiente') filas.push({ k: 'tipo', label: 'Tipo', valor: `${t.emoji} ${t.nombre}` });
    for (const k of t.campos) {
      const c = CAMPOS[k];
      const v = c.ver(b);
      filas.push({ k, label: c.label(b), valor: v == null || v === '' ? '— toca para ponerlo' : v, falta: v == null || v === '', fijo: c.tipo === 'fijo' });
    }
    const falt = faltantes(b);
    const notas = [];
    if (b.tipo === 'saldo' && b.cuenta && !leerPago(b.cuenta).tipo.startsWith('nueva')) notas.push(`Antes decía ${D.dinero(D.saldoCuenta(db(), leerPago(b.cuenta).id))}.`);
    if (b.tipo === 'saldo' && b.cuenta && leerPago(b.cuenta).tipo.startsWith('nueva')) notas.push('Se va a crear esa cuenta con ese saldo.');
    if (b.tipo === 'deuda' && b.tarjeta && !leerPago(b.tarjeta).tipo.startsWith('nueva')) notas.push(`Antes decía ${D.dinero(D.deudaTarjeta(db(), leerPago(b.tarjeta).id))}. Pon los días de corte y pago en Más → Tarjetas.`);
    if (b.tipo === 'deuda' && b.tarjeta && leerPago(b.tarjeta).tipo.startsWith('nueva')) notas.push('Se va a crear esa tarjeta. Después pon su día de corte y de pago en Más → Tarjetas.');
    if (b.tipo === 'gasto' && b.monto > 0) { const micro = b.micro === 'si' || (b.micro !== 'no' && D.esMicro(db(), { tipo: 'gasto', monto: b.monto, categoria: b.categoria }, hoy())); if (micro) notas.push(`Es microgasto. Llevas ${D.dinero(D.sumar(D.microDelMes(db(), D.mesDe(hoy()), hoy())))} de ${D.dinero(D.topeMicro(db(), hoy()))} este mes.`); }
    if (b.estado === 'pendiente' && falt.length) notas.push(`Falta: ${falt.map((k) => CAMPOS[k]?.label(b).toLowerCase() || k).join(', ')}.`);
    if (b.estado === 'pendiente') notas.push('Toca un dato para cambiarlo, o escríbelo (ej. "no, eran 120").');
    const titulos = { pendiente: `${t.emoji} ¿Lo guardo así?`, guardado: `✅ Guardado: ${t.nombre}`, cancelado: '✖️ Cancelado: no guardé nada', deshecho: '↩️ Deshecho: lo quité' };
    return { de: 'bot', id: b.id, lineas: [], tarjeta: { id: b.id, estado: b.estado, titulo: titulos[b.estado], filas: b.estado === 'cancelado' || b.estado === 'deshecho' ? [] : filas, notas: b.estado === 'pendiente' || b.estado === 'guardado' ? notas.filter((n) => b.estado === 'pendiente' || !n.startsWith('Toca')) : [], puedeConfirmar: !falt.length } };
  }
  function nuevaTarjeta(datos) {
    const b = completar({ ...datos, id: `t${++contador}`, estado: 'pendiente' });
    tarjetas.set(b.id, b); activa = b.id; espera = null;
    return vistaTarjeta(b);
  }

  // ── Cambiar un dato ──
  function campo(id, k) {
    const b = tarjetas.get(id); if (!b || b.estado !== 'pendiente') return null;
    if (k === 'tipo') return { tipo: 'opciones', opciones: TIPOS_CAMBIABLES.map((x) => ({ v: x, label: `${TIPOS[x].emoji} ${TIPOS[x].nombre}` })) };
    const c = CAMPOS[k]; if (!c || c.tipo === 'fijo') return null;
    if (c.tipo === 'opciones') return { tipo: 'opciones', opciones: c.opciones(b), extraTexto: c.extraTexto || null };
    return { tipo: c.tipo, valor: c.tipo === 'fecha' ? b[k] : b[k] ?? '' };
  }
  function poner(id, k, v) {
    const b = tarjetas.get(id); if (!b || b.estado !== 'pendiente') return null;
    if (k === 'tipo') cambiarTipo(b, v);
    else if (k === '_texto') return null;
    else {
      if (CAMPOS[k]?.tipo === 'dinero') { const r = extraerMonto(norm(String(v))); v = r.monto ?? (Number(String(v).replace(/[^\d.]/g, '')) || null); }
      if (k === 'renueva' || k === 'registrarPago') v = v === true || v === 'true';
      if (k === 'meses') v = Number(v);
      if (k === 'categoria' && b.tipo === 'gasto' && b.palabras?.length && !categoriaDe(b.palabras)) D.aprender(db(), b.palabras[0], v);
      b[k] = v;
      if (k === 'proxima') b.proximaManual = true;
      if (k === 'inicio' || k === 'frecuencia') { b.proximaManual = false; b.diaCobro = k === 'inicio' ? Number(String(v).slice(8, 10)) : b.diaCobro; if (b.tipo === 'suscripcion' && !b.editando) b.registrarPago = b.inicio <= hoy(); }
    }
    completar(b);
    return vistaTarjeta(b);
  }
  // Texto escrito para un dato de opciones (ej. nombre de cuenta nueva)
  function ponerTexto(id, k, texto) {
    const b = tarjetas.get(id); if (!b) return null;
    const n = norm(texto); if (!n) return vistaTarjeta(b);
    if (k === 'cuenta' || k === 'origen' || k === 'destino' || k === 'pago') { const p = cuentaMencionada(` en ${n}`, 'cuenta') || { tipo: 'cuenta', nuevo: true, nombre: titulo(texto.trim()) }; b[k] = valorPago(p); }
    else if (k === 'tarjeta') { const p = buscarExistente(n, 'tarjeta') || { tipo: 'tarjeta', nuevo: true, nombre: titulo(texto.trim()) }; b[k] = valorPago(p); }
    else if (k === 'meta') { const mt = D.lista(db(), 'metas').find((x) => norm(x.nombre) === n); b.meta = mt ? mt.id : `nueva:${cap(texto.trim())}`; }
    completar(b);
    return vistaTarjeta(b);
  }
  function cambiarTipo(b, nuevo) {
    const viejo = b.tipo; b.tipo = nuevo;
    if (nuevo === 'suscripcion' && !b.nombre) b.nombre = b.descripcion || '';
    if (viejo === 'suscripcion' && !b.descripcion) b.descripcion = b.nombre;
    if (nuevo === 'saldo' || nuevo === 'ingreso') { b.cuenta = b.cuenta || (b.pago && !b.pago.includes('tarjeta') ? b.pago : null); }
    if (nuevo === 'gasto' || nuevo === 'suscripcion') b.pago = b.pago || b.cuenta || null;
    if (nuevo === 'deuda' || nuevo === 'pagoTarjeta' || nuevo === 'msi') { if (b.pago?.includes('tarjeta')) b.tarjeta = b.pago; }
    if (nuevo === 'meta' && !b.meta && b.descripcion) { const mt = D.lista(db(), 'metas').find((x) => norm(x.nombre) === norm(b.descripcion)); b.meta = mt ? mt.id : `nueva:${b.descripcion}`; }
    if (nuevo === 'prestamo' && !b.persona && b.descripcion) b.persona = b.descripcion;
  }

  // ── Confirmar / cancelar / cambiar / deshacer ──
  function confirmar(id) {
    const b = tarjetas.get(id); if (!b || b.estado !== 'pendiente') return [];
    if (faltantes(b).length) return [vistaTarjeta(b)];
    if (b.previo) { try { b.previo(); } catch (e) { /* ya no existía */ } b.previo = null; }
    const r = aplicar(b);
    b.estado = 'guardado'; b.deshacer = r.deshacer; if (activa === id) activa = null;
    pila.push(id); if (pila.length > 40) pila.shift();
    cambio();
    const extra = r.lineas?.length ? [bot(r.lineas)] : [];
    return [vistaTarjeta(b), ...extra];
  }
  function cancelar(id) {
    const b = tarjetas.get(id); if (!b) return [];
    if (b.previo) { b.estado = 'guardado'; b.deshacer = b.previo; b.previo = null; } // se canceló un cambio: lo guardado se queda
    else b.estado = 'cancelado';
    if (activa === id) activa = null;
    return [vistaTarjeta(b)];
  }
  function reabrir(id) {
    const b = tarjetas.get(id); if (!b || b.estado !== 'guardado') return [];
    b.previo = b.deshacer; b.deshacer = null; b.estado = 'pendiente'; activa = id;
    if (b.tipo === 'suscripcion') b.registrarPago = b.registrarPago && !b.editando;
    return [vistaTarjeta(b)];
  }
  function deshacer(id) {
    const b = tarjetas.get(id); if (!b || b.estado !== 'guardado' || !b.deshacer) return [];
    b.deshacer(); b.deshacer = null; b.estado = 'deshecho'; cambio();
    return [vistaTarjeta(b)];
  }

  // Guarda de verdad según el tipo. Devuelve cómo deshacerlo.
  function aplicar(b) {
    const d = db(); const creados = []; const lineas = [];
    const pagoDe = (v, extra) => { const p = asegurarPago(v, extra); if (p.creado) creados.push(p.creado); return p; };
    const quitarCreados = () => { for (const [col, cid] of creados) D.borrar(db(), col, cid); };
    const copia = (col, rid) => { const x = D.obtener(db(), col, rid); return x ? JSON.parse(JSON.stringify(x)) : null; };
    switch (b.tipo) {
      case 'gasto': {
        const p = pagoDe(b.pago);
        const rec = { tipo: 'gasto', monto: b.monto, fecha: b.fecha, categoria: b.categoria, descripcion: b.descripcion, cuenta: p.id, pagoTipo: p.tipo === 'tarjeta' ? 'tarjeta' : 'cuenta' };
        if (b.micro === 'si') rec.micro = true; if (b.micro === 'no') rec.micro = false;
        const m = D.guardar(d, 'movimientos', rec);
        return { deshacer: () => { D.borrar(db(), 'movimientos', m.id); quitarCreados(); } };
      }
      case 'ingreso': {
        const p = pagoDe(b.cuenta);
        const m = D.guardar(d, 'movimientos', { tipo: 'ingreso', monto: b.monto, fecha: b.fecha, fuente: b.fuente, descripcion: b.descripcion, cuenta: p.id, pagoTipo: 'cuenta' });
        lineas.push(`Este mes llevas ${D.dinero(D.sumar(D.delMes(db(), D.mesDe(hoy()), 'ingreso')))} de ingresos.`);
        return { deshacer: () => { D.borrar(db(), 'movimientos', m.id); quitarCreados(); }, lineas };
      }
      case 'saldo': {
        const p = pagoDe(b.cuenta); const antes = copia('cuentas', p.id);
        const c = D.obtener(d, 'cuentas', p.id); const actual = D.saldoCuenta(d, p.id);
        c.saldoInicial = (Number(c.saldoInicial) || 0) + (b.monto - actual); D.guardar(d, 'cuentas', c);
        lineas.push(`Ahora tienes en total ${D.dinero(D.saldoTotal(db()))} en tus cuentas.`);
        return { deshacer: () => { if (antes && !creados.length) D.guardar(db(), 'cuentas', antes); quitarCreados(); }, lineas };
      }
      case 'deuda': {
        const p = pagoDe(b.tarjeta); const antes = copia('tarjetas', p.id);
        const t = D.obtener(d, 'tarjetas', p.id); const actual = D.deudaTarjeta(d, p.id);
        t.deudaInicial = (Number(t.deudaInicial) || 0) + (b.monto - actual); D.guardar(d, 'tarjetas', t);
        return { deshacer: () => { if (antes && !creados.length) D.guardar(db(), 'tarjetas', antes); quitarCreados(); } };
      }
      case 'suscripcion': {
        const p = pagoDe(b.pago);
        const antes = b.editando ? copia('suscripciones', b.editando) : null;
        const s = D.guardar(d, 'suscripciones', { ...(antes || {}), id: b.editando || undefined, nombre: b.nombre, monto: b.monto, frecuencia: b.frecuencia, inicio: b.inicio, proxima: b.proxima,
          renueva: b.renueva !== false, estado: b.renueva === false ? 'cancelada' : 'activa', pagaCon: p.id, pagaTipo: p.tipo === 'tarjeta' ? 'tarjeta' : 'cuenta' });
        let mov = null;
        if (b.registrarPago && b.inicio <= hoy()) mov = D.pagoDeSuscripcion(d, s, b.inicio, false);
        D.procesarAutomaticos(d, hoy());
        lineas.push(`${s.nombre}: ${D.estadoSuscripcion(D.obtener(db(), 'suscripciones', s.id), hoy()).texto}. En suscripciones pagas ${D.dinero(D.costoMensualSuscripciones(db()))} al mes.`);
        return { deshacer: () => { if (antes) D.guardar(db(), 'suscripciones', antes); else D.borrar(db(), 'suscripciones', s.id); if (mov) D.borrar(db(), 'movimientos', mov.id); quitarCreados(); }, lineas };
      }
      case 'transferencia': {
        const o = pagoDe(b.origen), de = pagoDe(b.destino);
        const m = D.guardar(d, 'movimientos', { tipo: 'transferencia', monto: b.monto, fecha: b.fecha, cuenta: o.id, destino: de.id, descripcion: `De ${D.obtener(d, 'cuentas', o.id)?.nombre} a ${D.obtener(d, 'cuentas', de.id)?.nombre}` });
        return { deshacer: () => { D.borrar(db(), 'movimientos', m.id); quitarCreados(); } };
      }
      case 'pagoTarjeta': {
        const t = pagoDe(b.tarjeta), o = pagoDe(b.origen);
        const m = D.guardar(d, 'movimientos', { tipo: 'pagoTarjeta', monto: b.monto, fecha: b.fecha, cuenta: o.id, destino: t.id, descripcion: 'Pago de tarjeta' });
        lineas.push(`Ahora debes ${D.dinero(D.deudaTarjeta(db(), t.id))} en ${D.obtener(db(), 'tarjetas', t.id)?.nombre}.`);
        return { deshacer: () => { D.borrar(db(), 'movimientos', m.id); quitarCreados(); }, lineas };
      }
      case 'prestamo': {
        const pv = leerPago(b.cuentaPrestamo); const p = pv.tipo === 'nada' ? { id: null } : pagoDe(b.cuentaPrestamo);
        const r = D.guardar(d, 'prestamos', { persona: b.persona, direccion: b.direccion, monto: b.monto, fecha: b.fecha, cuenta: p.id, abonos: [] });
        return { deshacer: () => { D.borrar(db(), 'prestamos', r.id); quitarCreados(); } };
      }
      case 'abono': {
        const antes = copia('prestamos', b.prestamo); const pr = D.obtener(d, 'prestamos', b.prestamo);
        pr.abonos = [...(pr.abonos || []), { monto: b.monto, fecha: b.fecha, cuenta: pr.cuenta || null }]; D.guardar(d, 'prestamos', pr);
        const queda = D.prestamoSaldo(pr); lineas.push(queda > 0 ? `Queda pendiente: ${D.dinero(queda)}.` : '¡Quedó saldado!');
        return { deshacer: () => D.guardar(db(), 'prestamos', antes), lineas };
      }
      case 'meta': {
        let mt; let creada = false;
        if (b.meta.startsWith('nueva:')) { mt = D.guardar(d, 'metas', { nombre: b.meta.slice(6), objetivo: 0, ahorrado: 0 }); creada = true; } else mt = D.obtener(d, 'metas', b.meta);
        const antes = JSON.parse(JSON.stringify(mt));
        mt.ahorrado = (Number(mt.ahorrado) || 0) + b.monto; D.guardar(d, 'metas', mt);
        lineas.push(mt.objetivo ? `Llevas ${D.dinero(mt.ahorrado)} de ${D.dinero(mt.objetivo)} para ${mt.nombre}.` : `Llevas ${D.dinero(mt.ahorrado)} para ${mt.nombre}. Ponle cuánto quieres juntar en Más → Metas.`);
        return { deshacer: () => { if (creada) D.borrar(db(), 'metas', mt.id); else D.guardar(db(), 'metas', antes); }, lineas };
      }
      case 'msi': {
        const t = pagoDe(b.tarjeta);
        const x = D.guardar(d, 'msi', { tarjeta: t.id, descripcion: b.descripcion, total: b.monto, meses: b.meses, fecha: b.fecha, categoria: b.categoria });
        return { deshacer: () => { D.borrar(db(), 'msi', x.id); quitarCreados(); } };
      }
      case 'cancelarSus': {
        const antes = copia('suscripciones', b.suscripcion); const s = D.obtener(d, 'suscripciones', b.suscripcion);
        if (b.modo === 'hoy') { s.estado = 'terminada'; s.proxima = hoy(); s.renueva = false; } else { s.estado = 'cancelada'; s.renueva = false; }
        D.guardar(d, 'suscripciones', s);
        lineas.push(b.modo === 'hoy' ? `${s.nombre} quedó terminada y guardada por si la reactivas.` : `${s.nombre} ya no se renovará. La usas hasta el ${fechaCorta(s.proxima)}; después queda guardada para reactivarla.`);
        return { deshacer: () => D.guardar(db(), 'suscripciones', antes), lineas };
      }
      case 'reactivarSus': {
        const antes = copia('suscripciones', b.suscripcion); const s = D.obtener(d, 'suscripciones', b.suscripcion);
        if (b.monto > 0) s.monto = b.monto;
        s.inicio = b.inicio; s.proxima = D.siguientePeriodo(b.inicio, s.frecuencia, Number(b.inicio.slice(8, 10))); s.estado = 'activa'; s.renueva = true;
        D.guardar(d, 'suscripciones', s);
        const mov = b.registrarPago && b.inicio <= hoy() ? D.pagoDeSuscripcion(d, s, b.inicio, false) : null;
        D.procesarAutomaticos(d, hoy());
        lineas.push(`${s.nombre} está activa otra vez. Se renueva el ${fechaCorta(D.obtener(db(), 'suscripciones', s.id).proxima)}.`);
        return { deshacer: () => { D.guardar(db(), 'suscripciones', antes); if (mov) D.borrar(db(), 'movimientos', mov.id); }, lineas };
      }
      case 'borrar': {
        const c = D.borrar(d, 'movimientos', b.movimiento);
        return { deshacer: () => c && D.restaurar(db(), 'movimientos', c) };
      }
      default: return { deshacer: () => {} };
    }
  }

  // ───────── Entender una frase nueva ─────────
  function analizar(t0, original) {
    const h = hoy();
    // Fechas, día de cobro, frecuencia, MSI y monto (en ese orden para no confundir números)
    const esSus = L.RE_SUSCRIPCION.test(t0) || !!servicioEn(t0);
    let t = t0;
    const dc = esSus ? extraerDiaCobro(t) : { dia: null, resto: t }; t = dc.resto;
    const futuro = L.RE_CONSULTA.test(t0);
    const f = extraerFecha(t, h, futuro); t = f.resto;
    const msi = /\b(msi|meses sin intereses|a \d{1,2} meses)\b/.test(t) ? extraerMSI(t) : null; if (msi) t = msi.resto;
    const frecuencia = extraerFrecuencia(t0);
    const { monto, resto } = extraerMonto(t.replace(RE_FRECUENCIA, ' '));
    const palabras = palabrasDe(resto);
    const tokens = t0.split(' ');
    // Verbos encontrados (con persona y si va con "me")
    const hits = [];
    tokens.forEach((w, i) => {
      for (const x of L.FORMAS.get(w) || []) {
        const conMe = ['me', 'nos'].includes(tokens[i - 1]) || (['me', 'nos'].includes(tokens[i - 2]) && ['lo', 'la', 'los', 'las', 'le'].includes(tokens[i - 1]));
        const conSe = tokens[i - 1] === 'se' || (tokens[i - 2] === 'se' && tokens[i - 1] === 'me');
        hits.push({ ...x, i, conMe, conSe });
      }
    });
    const tiene = (re) => re.test(t0);
    const frase = (lista) => lista.some((p) => new RegExp(`\\b${escRe(p)}\\b`).test(t0));
    return { t0, original, h, esSus, diaCobro: dc.dia, fecha: f.fecha, msi, frecuencia, monto, palabras, hits, tiene, frase, resto };
  }

  function decidir(a) {
    const { t0, hits, tiene, frase } = a;
    // 1) Préstamos y deudas con personas
    if (tiene(/\b(le|les)\s+(preste|prestamos|fie)\b|\bpreste\b/)) return 'prestamo-meDeben';
    if (tiene(/\b(me|nos)\s+(presto|prestaron|fio|fiaron)\b|\bpedi prestado\b|\bme endeude\b/)) return 'prestamo-debo';
    if (tiene(/\b(me|nos)\s+(deben|debe)\b/)) return 'prestamo-meDeben';
    // 2) Deuda de tarjeta / deuda con alguien
    if (tiene(/\b(debo|debemos|adeudo|tengo una deuda|tengo de deuda|mi deuda|la deuda|deuda de|deuda en|le debo)\b/)) {
      if (tiene(/\b(tarjeta|credito|tdc)\b/) || buscarExistente(t0, 'tarjeta')) return 'deuda';
      if (tiene(/\ble debo\b|\bdebo\b.*\ba\s+[a-z]/)) return 'prestamo-debo';
      return 'deuda';
    }
    // 3) Abono a préstamo existente
    const prs = D.lista(db(), 'prestamos').filter((p) => D.prestamoSaldo(p) > 0);
    if (prs.some((p) => new RegExp(`\\b${escRe(norm(p.persona))}\\b`).test(t0)) && tiene(/\b(pago|pagaron|devolvio|regreso|abono|dio|deposito|transfirio|pague|devolvi|regrese|abone|di|deposite|transferi|mande)\b/)) return 'abono';
    // 4) Cancelar / reactivar suscripción
    if (tiene(/\b(cancele|cancelar|cancela|cancelo|cancelamos|di de baja|dar de baja|me di de baja|ya no (voy a )?(pagar|pago|renovar|uso)|desactive|quite la suscripcion|deje de pagar)\b/) && (buscarSuscripcion(t0) || a.esSus)) return 'cancelarSus';
    if (tiene(/\b(reactiv\w*|volvi a|me volvi a|de nuevo|otra vez|reanude|regrese a|renove)\b/) && buscarSuscripcion(t0)) return 'reactivarSus';
    // 5) Pago de tarjeta
    if (tiene(/\b(pague|abone|liquide|salde|pagamos|cubri|deposite|pago|abono)\b/) && (tiene(/\btarjeta\b/) || (buscarExistente(t0, 'tarjeta') && !a.palabras.filter((w) => !buscarExistente(w, 'tarjeta') && w !== 'tarjeta').length)) && !a.msi) return 'pagoTarjeta';
    // 6) Transferencias entre mis cuentas, cajero
    if (tiene(/\b(saque|retire|sacamos)\b/) && tiene(/\b(cajero|banco|cuenta|retiro)\b/)) return 'retiro';
    if (tiene(/\b(retiro|retire)\b.*\b(efectivo|cajero)\b/)) return 'retiro';
    const mDeA = t0.match(/\b(?:de|del|desde)\s+(.+?)\s+(?:a|al|hacia|para)\s+(.+)$/);
    const esCuentaTexto = (x) => !!(buscarExistente(x, 'cuenta') || Object.keys(L.BANCOS).some((b) => new RegExp(`\\b${escRe(b)}\\b`).test(x)) || /\b(cuenta|banco|ahorro|ahorros)\b/.test(x));
    if (tiene(/\b(pase|pasamos|transferi|transfiero|movi|traspase|mande|envie|meti|deposite|mandamos)\b/) && mDeA && esCuentaTexto(mDeA[1]) && esCuentaTexto(mDeA[2])) return 'transferencia';
    const cuentasMencionadas = pagosPosibles().filter((p) => p.tipo === 'cuenta' && new RegExp(`\\b${escRe(p.clave)}\\b`).test(t0)).length + (L.PALABRAS_EFECTIVO.test(t0) ? 1 : 0);
    if (tiene(/\b(deposite|meti|ingrese)\b/) && (cuentasMencionadas >= 1 || esCuentaTexto(t0)) && !tiene(/\ba\s+(mi|su|la|el)\s+[a-z]+/) && !tiene(/\b(a|para)\s+(mama|papa|hermano|hermana|abuela|abuelo|tio|tia|amigo|amiga|novia|novio|esposa|esposo)\b/)) return 'deposito';
    // 7) Apartar para metas
    if (hits.some((x) => x.tipo === 'apartar' || x.lema === 'juntar') && tiene(/\bpara\b/) && !tiene(/\b(tengo|llevo)\s+(ahorrado|guardado|juntado)\b/)) return 'meta';
    // 8) Meses sin intereses
    if (a.msi && (hits.some((x) => x.tipo === 'gasto' || x.tipo === 'doble') || tiene(/\bcompra\b/))) return 'msi';
    // 9) Suscripción nueva
    if (a.esSus && (hits.some((x) => x.tipo === 'gasto' || (x.tipo === 'doble' && !x.conMe) || (x.tipo === 'cobrar' && x.conMe)) || tiene(/\b(suscribi|subscribi|inscribi|contrate|me uni)\w*\b/) || !hits.length) && !hits.some((x) => x.tipo === 'saldo' || x.tipo === 'ingreso' || x.tipo === 'llegar')) return 'suscripcion';
    // 10) Frases hechas de gasto o ingreso
    if (frase(L.FRASES_INGRESO) && !tiene(/\bme cobr\w*/)) return 'ingreso';
    if (frase(L.FRASES_GASTO)) return 'gasto';
    // 11) Saldo: tengo / traigo / me quedan / hay / mi saldo…
    if (!tiene(/\btengo que\b|\btenemos que\b/) && (frase(L.FRASES_SALDO) || hits.some((x) => x.tipo === 'saldo')) && !hits.some((x) => x.tipo === 'gasto' && x.i < (hits.find((y) => y.tipo === 'saldo')?.i ?? 99))) return 'saldo';
    if (tiene(/\b(tengo|tenemos) que\b/)) return 'consulta';
    // 12) Verbos sueltos: el primero que decida
    for (const x of hits) {
      if (x.tipo === 'gasto') { if (x.conSe && x.lema !== 'ir') return 'gasto'; return x.lema === 'hacer' ? (x.conMe ? 'gasto' : 'ingreso') : 'gasto'; }
      if (x.tipo === 'ingreso') { if (x.lema === 'hacer' && x.conMe) return 'gasto'; return 'ingreso'; }
      if (x.tipo === 'llegar') return 'ingreso';
      if (x.tipo === 'doble') { if (x.conMe) return 'ingreso'; if (x.persona === '3' && !tiene(/\b(le|les|a mi|a la|al)\b/)) return 'ingreso'; return 'gasto'; }
      if (x.tipo === 'cobrar') return x.conMe ? 'gasto' : 'ingreso';
      if (x.tipo === 'saldo') return 'saldo';
      if (x.tipo === 'apartar') return tiene(/\b(ahorrado|guardado)\b/) ? 'saldo' : 'meta';
    }
    // 13) Sin verbo: sustantivos que dicen qué es
    const ws = t0.split(' ');
    if (ws.some((w) => L.PALABRAS_INGRESO.has(w)) && !ws.some((w) => ['gasto', 'compra', 'pague'].includes(w))) return 'ingreso';
    if (ws.some((w) => L.PALABRAS_GASTO.has(w))) return 'gasto';
    if (a.monto && categoriaDe(a.palabras)) return 'gasto';
    if (a.monto && a.palabras.length) return 'preguntar';
    return null;
  }

  function construir(intencion, a) {
    const { t0, monto, palabras, fecha } = a;
    const base = { monto, fecha: fecha || undefined, palabras };
    switch (intencion) {
      case 'gasto': {
        const p = cuentaMencionada(t0, buscarExistente(t0, 'tarjeta') ? 'tarjeta' : 'cuenta') || (/\b(tarjeta|credito|tdc)\b/.test(t0) ? (D.lista(db(), 'tarjetas')[0] ? { tipo: 'tarjeta', id: D.lista(db(), 'tarjetas')[0].id } : null) : null);
        return { ...base, tipo: 'gasto', pago: p ? valorPago(p) : undefined };
      }
      case 'ingreso': {
        const p = cuentaMencionada(t0.replace(/\b(twitch|kick|tiktok|patreon)\b/g, ' '), 'cuenta');
        const fuente = fuenteDe(t0);
        const pal = palabras.filter((w) => !D.lista(db(), 'fuentes').some((x) => (x.palabras || []).includes(w)));
        return { ...base, tipo: 'ingreso', palabras: pal, fuente: fuente || undefined, cuenta: p ? valorPago(p) : undefined, descripcion: pal.length ? cap(textoOriginal(pal)) : undefined };
      }
      case 'saldo': {
        const p = cuentaMencionada(t0, 'cuenta');
        return { tipo: 'saldo', monto, cuenta: p ? valorPago(p) : undefined };
      }
      case 'deuda': {
        const p = buscarExistente(t0, 'tarjeta') || (() => { const c = cuentaMencionada(t0, 'tarjeta'); return c ? { ...c, tipo: 'tarjeta' } : null; })();
        return { tipo: 'deuda', monto, tarjeta: p ? valorPago(p) : undefined };
      }
      case 'suscripcion': {
        const s = buscarSuscripcion(t0);
        if (s && s.estado !== 'activa') return { tipo: 'reactivarSus', suscripcion: s.id, inicio: fecha || (a.diaCobro ? D.anteriorDia(a.diaCobro, hoy()) : undefined), monto: monto || s.monto };
        const servicio = servicioEn(t0);
        let nombre = servicio;
        if (servicio && /^ChatGPT$/.test(servicio)) { const m = t0.match(/\bchat ?gpt\s+(go|plus|pro|team)\b/); if (m) nombre = `ChatGPT ${cap(m[1])}`; }
        if (!nombre) { const ws = palabras.filter((w) => !/^(suscribi\w*|subscri\w*|inscribi\w*|contrate|membresia|premium|plan|servicio)$/.test(w)); nombre = ws.length ? titulo(textoOriginal(ws.slice(0, 3))) : ''; }
        const p = cuentaMencionada(t0, buscarExistente(t0, 'tarjeta') ? 'tarjeta' : 'cuenta');
        return { tipo: 'suscripcion', nombre: s ? s.nombre : nombre, monto: monto || s?.monto, frecuencia: a.frecuencia || s?.frecuencia, diaCobro: a.diaCobro || undefined, inicio: fecha || undefined,
          renueva: /\b(no se renueva|se cancela|sin renovacion|una sola vez|solo este mes)\b/.test(t0) ? false : undefined, pago: p ? valorPago(p) : undefined, editando: s?.id };
      }
      case 'transferencia': case 'retiro': case 'deposito': {
        const cuentas = pagosPosibles().filter((p) => p.tipo === 'cuenta');
        const efectivo = cuentas.find((c) => c.efectivo);
        const mOri = t0.match(/\b(?:de|del|desde)\s+(?:la\s+|mi\s+|el\s+)?(?:cuenta\s+)?([a-z0-9ñ ]+?)(?=\s+(?:a|al|para|hacia)\b|$)/);
        const mDes = t0.match(/\b(?:a|al|para|hacia)\s+(?:la\s+|mi\s+|el\s+)?(?:cuenta\s+)?([a-z0-9ñ ]+)$/);
        let o = mOri ? (buscarExistente(mOri[1], 'cuenta') || cuentaMencionada(` en ${mOri[1]}`, 'cuenta')) : null; let de = mDes ? (buscarExistente(mDes[1], 'cuenta') || cuentaMencionada(` en ${mDes[1]}`, 'cuenta')) : null;
        if (intencion === 'retiro') { de = de || efectivo; o = o || buscarExistente(t0.replace(L.PALABRAS_EFECTIVO, ' '), 'cuenta'); }
        if (intencion === 'deposito') { o = o || efectivo; de = de || buscarExistente(t0.replace(L.PALABRAS_EFECTIVO, ' '), 'cuenta'); }
        return { tipo: 'transferencia', monto, fecha, origen: o ? valorPago(o) : undefined, destino: de ? valorPago(de) : undefined };
      }
      case 'pagoTarjeta': {
        const tj = buscarExistente(t0, 'tarjeta');
        const o = buscarExistente(tj ? t0.replace(new RegExp(`\\b${escRe(tj.clave)}\\b`), ' ') : t0, 'cuenta');
        return { tipo: 'pagoTarjeta', monto, fecha, tarjeta: tj ? valorPago(tj) : undefined, origen: o ? valorPago(o) : undefined };
      }
      case 'prestamo-meDeben': case 'prestamo-debo': {
        const m = t0.match(/\b(?:a|de|con)\s+(?:mi\s+)?([a-zñ]{3,})\b/) || t0.match(/^(?:mi\s+)?([a-zñ]{3,})\s+me\s+/) || t0.match(/\bmi\s+([a-zñ]{3,})\b/);
        const malas = new Set(['tarjeta', 'cuenta', 'efectivo', 'pesos', 'que', 'hoy', 'ayer', 'deber', 'debo', 'prestado', 'presto', 'prestaron', 'preste', 'deben', 'debe']);
        const persona = m && !malas.has(m[1]) ? cap(mapaOriginal[m[1]] || m[1]) : undefined;
        return { tipo: 'prestamo', direccion: intencion === 'prestamo-debo' ? 'debo' : 'meDeben', persona, monto, fecha };
      }
      case 'abono': {
        const prs = D.lista(db(), 'prestamos').filter((p) => D.prestamoSaldo(p) > 0);
        const p = prs.find((x) => new RegExp(`\\b${escRe(norm(x.persona))}\\b`).test(t0));
        return { tipo: 'abono', prestamo: p?.id, monto: monto || (p ? D.prestamoSaldo(p) : null), fecha };
      }
      case 'meta': {
        const mt = D.lista(db(), 'metas').find((x) => new RegExp(`\\b${escRe(norm(x.nombre))}\\b`).test(t0));
        const m = t0.match(/\bpara\s+(?:la\s+|el\s+|mi\s+|una\s+|un\s+|los\s+|las\s+)?([a-z0-9ñ ]{2,30})/);
        const nombre = m ? titulo(textoOriginal(m[1].trim().split(' ').filter((w) => w && !/^\d+$/.test(w) && !['la', 'el', 'los', 'las', 'mi', 'mis', 'un', 'una', 'unos', 'unas', 'hoy', 'ayer'].includes(w)))) : '';
        return { tipo: 'meta', monto, meta: mt ? mt.id : nombre ? `nueva:${nombre}` : undefined };
      }
      case 'msi': {
        const tj = buscarExistente(t0, 'tarjeta');
        return { ...base, tipo: 'msi', meses: a.msi.meses, tarjeta: tj ? valorPago(tj) : undefined, palabras: palabras.filter((w) => !/^(meses|msi|intereses|sin)$/.test(w)) };
      }
      case 'cancelarSus': {
        const s = buscarSuscripcion(t0);
        if (!s && servicioEn(t0)) return { noExiste: servicioEn(t0) };
        if (!s && !D.lista(db(), 'suscripciones').some((x) => x.estado === 'activa')) return { noExiste: 'esa suscripción' };
        return { tipo: 'cancelarSus', suscripcion: s?.id, modo: /\b(hoy|ya termino|ya no la puedo usar|ya se acabo)\b/.test(t0) ? 'hoy' : undefined };
      }
      case 'reactivarSus': {
        const s = buscarSuscripcion(t0);
        return { tipo: 'reactivarSus', suscripcion: s?.id, inicio: fecha || undefined, monto: monto || s?.monto };
      }
      default: return null;
    }
  }

  // ── Correcciones escritas sobre la tarjeta pendiente ──
  function corregir(b, original) {
    const t = norm(original);
    if (L.RE_SI.test(t) && t.split(' ').length <= 4) return { accion: 'confirmar' };
    if (L.RE_NO.test(t)) return { accion: 'cancelar' };
    let cambio = false;
    const mTipo = t.match(/\b(?:es|era|fue|son|eran|ponlo como|cambialo a|como)\s+(?:un|una)?\s*(gasto|ingreso|saldo|suscripcion|prestamo|transferencia|pago de tarjeta|meta|deuda|compra a meses)\b/);
    if (mTipo) { const mapa = { gasto: 'gasto', ingreso: 'ingreso', saldo: 'saldo', suscripcion: 'suscripcion', prestamo: 'prestamo', transferencia: 'transferencia', 'pago de tarjeta': 'pagoTarjeta', meta: 'meta', deuda: 'deuda', 'compra a meses': 'msi' }; cambiarTipo(b, mapa[mTipo[1]]); cambio = true; }
    const mNom = t.match(/\b(?:nombre|descripcion|concepto|se llama|ponle|llamalo|ponle de nombre)\s+(.+)$/);
    let resto = t;
    const dc = b.tipo === 'suscripcion' ? extraerDiaCobro(resto) : { dia: null, resto };
    if (dc.dia) { b.diaCobro = dc.dia; b.inicio = D.anteriorDia(dc.dia, hoy()); b.proximaManual = false; b.registrarPago = !b.editando && b.inicio <= hoy(); resto = dc.resto; cambio = true; }
    const f = extraerFecha(resto, hoy(), b.tipo === 'suscripcion' && /\b(renueva|termina|vence|proxim)\w*/.test(t));
    if (f.fecha) {
      if (b.tipo === 'suscripcion' && /\b(renueva|termina|vence|proxim)\w*/.test(t)) { b.proxima = f.fecha; b.proximaManual = true; }
      else if (b.tipo === 'suscripcion' || b.tipo === 'reactivarSus') { b.inicio = f.fecha; b.proximaManual = false; }
      else b.fecha = f.fecha;
      resto = f.resto; cambio = true;
    }
    const fr = extraerFrecuencia(t); if (fr && b.tipo === 'suscripcion') { b.frecuencia = fr; b.proximaManual = false; cambio = true; }
    if (/\b(no se renueva|se cancela|sin renovacion)\b/.test(t)) { b.renueva = false; cambio = true; } else if (/\bse renueva\b/.test(t)) { b.renueva = true; cambio = true; }
    if (/\bno (lo )?registres el pago|no me cobraron|prueba gratis|era gratis\b/.test(t)) { b.registrarPago = false; cambio = true; }
    if (/\bno (es|era|cuenta como) micro\w*/.test(t)) { b.micro = 'no'; cambio = true; } else if (/\b(si )?(es|cuenta como) micro\w*/.test(t)) { b.micro = 'si'; cambio = true; }
    const mm = extraerMonto(resto.replace(RE_FRECUENCIA, ' '));
    if (mm.monto != null && !(b.tipo === 'msi' && /\bmeses\b/.test(t))) { b.monto = mm.monto; cambio = true; }
    if (b.tipo === 'msi') { const ms = extraerMSI(t); if (ms) { b.meses = ms.meses; cambio = true; } }
    // Cuenta / tarjeta
    const kPago = { gasto: 'pago', suscripcion: 'pago', ingreso: 'cuenta', saldo: 'cuenta', transferencia: /\b(a|al|llega|hacia)\b/.test(t) && !/\b(de|desde|sale)\b/.test(t) ? 'destino' : 'origen', pagoTarjeta: 'origen', prestamo: 'cuentaPrestamo' }[b.tipo];
    if (kPago) {
      const tipoBusca = (kPago === 'pago' && /\b(tarjeta|credito)\b/.test(t)) || (kPago === 'pago' && buscarExistente(t, 'tarjeta')) ? 'tarjeta' : 'cuenta';
      const p = (kPago === 'pago' ? buscarExistente(t, tipoBusca) : buscarExistente(t, 'cuenta')) || (/\b(cuenta|banco|en|con)\b/.test(t) ? cuentaMencionada(t, tipoBusca) : null);
      if (p) { b[kPago] = valorPago(p); cambio = true; }
    }
    if (['deuda', 'pagoTarjeta', 'msi'].includes(b.tipo)) { const tj = buscarExistente(t, 'tarjeta'); if (tj) { b.tarjeta = valorPago(tj); cambio = true; } }
    if (b.tipo === 'gasto' || b.tipo === 'msi') { const cat = categoriaDe(palabrasDe(t)); if (cat) { b.categoria = cat; cambio = true; } const mc = t.match(/\bcategoria\s+(.+)$/); if (mc) { const c2 = D.lista(db(), 'categorias').find((c) => norm(c.nombre).startsWith(mc[1].trim())); if (c2) { b.categoria = c2.id; cambio = true; } } }
    if (b.tipo === 'ingreso') { const fu = fuenteDe(t); if (fu) { b.fuente = fu; cambio = true; } }
    if (mNom) {
      const texto = mNom[1].trim();
      if (b.tipo === 'suscripcion') b.nombre = titulo(textoOriginal(texto.split(' ')));
      else if (b.tipo === 'prestamo') b.persona = cap(textoOriginal(texto.split(' ')));
      else if (b.tipo === 'gasto' || b.tipo === 'ingreso' || b.tipo === 'msi') { const ws = palabrasDe(texto); if (ws.length) { b.descripcion = cap(textoOriginal(ws)); b.palabras = ws; if (b.tipo === 'gasto') { const c = categoriaDe(ws); if (c) b.categoria = c; } } }
      cambio = true;
    }
    return cambio ? { accion: 'cambio' } : null;
  }

  // ───────── Preguntas (no guardan nada) ─────────
  function periodoDe(t) {
    const h = hoy();
    if (/\bhoy\b/.test(t)) return { desde: h, hasta: h, nombre: 'hoy' };
    if (/\bayer\b/.test(t)) return { desde: D.sumarDias(h, -1), hasta: D.sumarDias(h, -1), nombre: 'ayer' };
    if (/\bsemana\b/.test(t)) { const dia = (D.aFecha(h).getDay() + 6) % 7; return { desde: D.sumarDias(h, -dia), hasta: h, nombre: 'esta semana' }; }
    if (/\bmes pasado\b/.test(t)) { const m = D.mesDe(D.sumarMeses(D.mesDe(h) + '-01', -1)); return { desde: m + '-01', hasta: D.finDeMes(m + '-01'), nombre: `en ${D.nombreMes(m)}` }; }
    if (/\bano\b/.test(t)) return { desde: h.slice(0, 4) + '-01-01', hasta: h, nombre: 'este año' };
    return { desde: D.mesDe(h) + '-01', hasta: h, nombre: 'este mes' };
  }
  function infoSuscripcion(s) {
    const est = D.estadoSuscripcion(s, hoy());
    return bot([`🔁 **${s.nombre}** · ${D.dinero(s.monto)} ${(D.FRECUENCIAS[s.frecuencia] || '').toLowerCase()}`, `Empezó: ${D.fechaBonita(s.inicio, hoy())} · ${est.texto}`, `Se paga con ${D.nombrePago(db(), { pagoTipo: s.pagaTipo, cuenta: s.pagaCon })}.`],
      { chips: [
        chip('Cambiar datos', () => [nuevaTarjeta({ tipo: 'suscripcion', editando: s.id, nombre: s.nombre, monto: s.monto, frecuencia: s.frecuencia, inicio: s.inicio, proxima: s.proxima, proximaManual: true, renueva: s.renueva !== false && s.estado === 'activa', pago: s.pagaCon ? `${s.pagaTipo || 'cuenta'}:${s.pagaCon}` : undefined, registrarPago: false })]),
        ...(s.estado === 'activa' ? [chip('Cancelarla', () => [nuevaTarjeta({ tipo: 'cancelarSus', suscripcion: s.id })])] : [chip('Reactivarla', () => [nuevaTarjeta({ tipo: 'reactivarSus', suscripcion: s.id, monto: s.monto })])]),
      ] });
  }
  function preguntas(t) {
    const d = db(); const h = hoy(); const mes = D.mesDe(h);
    if (/\b(micro|microgasto|microgastos|hormiga|hormigas|gastitos)\b/.test(t)) {
      const lista = D.microDelMes(d, mes, h); const total = D.sumar(lista); const tope = D.topeMicro(d, h); const semana = D.sumar(D.microDeSemana(d, h));
      const porCat = {}; for (const m of lista) porCat[m.categoria] = (porCat[m.categoria] || 0) + Number(m.monto);
      const top = Object.entries(porCat).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, v]) => `${D.categoria(d, c).emoji} ${D.categoria(d, c).nombre}: ${D.dinero(v)}`);
      return [bot([`🐜 Microgastos de este mes: **${D.dinero(total)}** de ${D.dinero(tope)} (${lista.length} compras).`, `Esta semana: ${D.dinero(semana)}.`,
        total > tope ? `Te pasaste del tope por ${D.dinero(total - tope)}.` : `Te quedan ${D.dinero(tope - total)} para microgastos.`, ...(top.length ? ['En lo que más se te va:', ...top] : []),
        `Cuenta como microgasto lo que sea de hasta ${D.dinero(D.umbralMicro(d, h))}.`], { semaforo: total > tope ? 'rojo' : total > tope * 0.8 ? 'amarillo' : 'verde' })];
    }
    const sub = buscarSuscripcion(t);
    if (sub) return [infoSuscripcion(sub)];
    const serv = servicioEn(t);
    if (serv && /\b(cuando|vence|termina|renueva|acaba|cancela|cuanto)\b/.test(t)) return [bot(`No tienes ${serv} guardada. Escribe por ejemplo: "me suscribí a ${serv} por 99 cada 20 del mes".`)];
    if (/\bsuscripcion|suscripciones\b/.test(t)) {
      const subs = D.lista(d, 'suscripciones').filter((s) => s.estado !== 'terminada');
      if (!subs.length) return [bot('No tienes suscripciones guardadas. Escribe por ejemplo: "pago Netflix 219 cada 15 del mes".')];
      return [bot([`🔁 Tus suscripciones (${D.dinero(D.costoMensualSuscripciones(d))} al mes):`, ...subs.sort((a, b) => (a.proxima || '').localeCompare(b.proxima || '')).map((s) => `• ${s.nombre}: ${D.dinero(s.monto)} ${(D.FRECUENCIAS[s.frecuencia] || '').toLowerCase()} — ${D.estadoSuscripcion(s, h).texto}`)])];
    }
    const tarjeta = buscarExistente(t, 'tarjeta');
    if (/\b(corte|corta|tarjeta|tarjetas|limite|credito)\b/.test(t) || tarjeta) {
      const ts = tarjeta ? [D.obtener(d, 'tarjetas', tarjeta.id)] : D.lista(d, 'tarjetas');
      if (!ts.length) return [bot('No tienes tarjetas guardadas. Escribe "debo 3,000 en mi tarjeta Nu" o agrégala en Más → Tarjetas de crédito.')];
      const l = [];
      for (const x of ts) {
        l.push(`💳 **${x.nombre}** — debes ${D.dinero(D.deudaTarjeta(d, x.id))}`, `Corte: ${D.fechaBonita(D.proximoDia(Number(x.diaCorte) || 1, h), h)} · Pago: ${D.fechaBonita(D.proximoDia(Number(x.diaPago) || 1, h), h)}`, `Para no generar intereses paga: ${D.dinero(D.pagoSinIntereses(d, x.id, h))}`);
        if (x.limite) l.push(`Disponible: ${D.dinero(Number(x.limite) - D.deudaTarjeta(d, x.id))} de ${D.dinero(x.limite)}`);
      }
      return [bot(l)];
    }
    if (/\b(me deben|me debe)\b/.test(t)) { const ps = D.lista(d, 'prestamos').filter((p) => p.direccion === 'meDeben' && D.prestamoSaldo(p) > 0); return [bot(ps.length ? ['🤝 Te deben:', ...ps.map((p) => `• ${p.persona}: ${D.dinero(D.prestamoSaldo(p))}`)] : 'Nadie te debe nada ahora.')]; }
    if (/\b(debo|deuda|deudas|adeudo)\b/.test(t)) {
      const l = [`📉 Debes en total: **${D.dinero(D.deudaTotalTarjetas(d) + D.totalesPrestamos(d).debo)}**`];
      for (const x of D.lista(d, 'tarjetas')) l.push(`• ${x.nombre}: ${D.dinero(D.deudaTarjeta(d, x.id))}`);
      for (const p of D.lista(d, 'prestamos').filter((p) => p.direccion === 'debo' && D.prestamoSaldo(p) > 0)) l.push(`• A ${p.persona}: ${D.dinero(D.prestamoSaldo(p))}`);
      return [bot(l)];
    }
    if (/\b(pagos|pagar|vence|vencen|proximos|proximo|toca pagar|tengo que pagar|fechas)\b/.test(t)) {
      const ev = D.proximosEventos(d, h, 31);
      if (!ev.length) return [bot('No tienes pagos en los próximos 30 días.')];
      return [bot(['📅 Lo que viene (30 días):', ...ev.slice(0, 12).map((e) => `• ${D.fechaBonita(e.fecha, h)}: ${e.texto}${e.monto ? ` — ${D.dinero(e.monto)}` : ''}`), `Por pagar este mes: ${D.dinero(D.porPagar(d, h).total)}.`])];
    }
    if (/\b(gane|ganado|ganancia|ganancias|ingresos|ingreso|ingrese|entro|entrado|recibi|recibido|cobre|cobrado)\b/.test(t)) {
      const p = periodoDe(t); const movs = D.movimientos(d).filter((m) => m.tipo === 'ingreso' && m.fecha >= p.desde && m.fecha <= p.hasta);
      const porF = {}; for (const m of movs) porF[m.fuente] = (porF[m.fuente] || 0) + Number(m.monto);
      return [bot([`💰 Ingresos ${p.nombre}: **${D.dinero(D.sumar(movs))}**`, ...Object.entries(porF).sort((a, b) => b[1] - a[1]).map(([f, v]) => `• ${D.fuente(d, f).nombre}: ${D.dinero(v)}`)])];
    }
    if (/\b(gaste|gastado|gasto|gastos|gastamos|se me fue|se fue|compre|comprado)\b/.test(t)) {
      const p = periodoDe(t);
      const cat = categoriaDe(palabrasDe(t.replace(/\b(cuanto|cuantos|he|llevo|esta|este|semana|mes|ano|pasado|hoy|ayer|gastado|gastos)\b/g, ' ')));
      let movs = D.movimientos(d).filter((m) => m.tipo === 'gasto' && m.fecha >= p.desde && m.fecha <= p.hasta); if (cat) movs = movs.filter((m) => m.categoria === cat);
      const porC = {}; for (const m of movs) porC[m.categoria] = (porC[m.categoria] || 0) + Number(m.monto);
      return [bot([`💸 Gastaste ${cat ? `en ${D.categoria(d, cat).nombre} ` : ''}${p.nombre}: **${D.dinero(D.sumar(movs))}** (${movs.length} gastos)`, ...(!cat ? Object.entries(porC).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, v]) => `• ${D.categoria(d, c).emoji} ${D.categoria(d, c).nombre}: ${D.dinero(v)}`) : [])])];
    }
    if (/\b(libre|disponible|alcanza|sobra|queda|quedan)\b/.test(t)) { const pp = D.porPagar(d, h); return [bot([`🟢 Dinero libre: **${D.dinero(D.dineroLibre(d, h))}**`, `Tienes ${D.dinero(D.saldoTotal(d))} en cuentas, menos ${D.dinero(pp.total)} por pagar y ${D.dinero(D.totalApartado(d))} apartados.`])]; }
    if (/\b(negocio|negocios|proyeccion|podria ganar)\b/.test(t)) {
      const ns = D.lista(d, 'negocios').filter((n) => n.estado !== 'cobrado' && n.estado !== 'descartado');
      if (!ns.length) return [bot('No tienes negocios en proceso. Agrégalos en Más → Negocios.')];
      return [bot([`📈 Podrías ganar: **${D.dinero(ns.reduce((s, n) => s + (Number(n.ganancia) || 0) - (Number(n.costo) || 0), 0))}**`, ...ns.map((n) => `• ${n.nombre}: ${D.dinero((Number(n.ganancia) || 0) - (Number(n.costo) || 0))}`)])];
    }
    if (/\b(meta|metas|ahorro|ahorrado|apartado|apartados)\b/.test(t)) {
      const ms = D.lista(d, 'metas'); if (!ms.length) return [bot('No tienes metas. Escribe por ejemplo: "aparté 500 para la PC".')];
      return [bot(['🎯 Tus metas:', ...ms.map((m) => `• ${m.nombre}: ${D.dinero(m.ahorrado)}${m.objetivo ? ` de ${D.dinero(m.objetivo)}` : ''}`)])];
    }
    const cuenta = buscarExistente(t, 'cuenta');
    if (cuenta) return [bot(`🏦 En ${cuenta.nombre} tienes **${D.dinero(D.saldoCuenta(d, cuenta.id))}**.`)];
    if (/\b(tengo|saldo|saldos|dinero|cuentas|cuenta|banco|bancos|efectivo|lana|feria)\b/.test(t)) {
      const l = [`🏦 Tienes en total: **${D.dinero(D.saldoTotal(d))}**`];
      for (const c of D.lista(d, 'cuentas')) l.push(`• ${c.nombre}: ${D.dinero(D.saldoCuenta(d, c.id))}`);
      l.push(`Libre después de tus pagos: ${D.dinero(D.dineroLibre(d, h))}`);
      return [bot(l)];
    }
    return resumen();
  }
  function resumen() {
    const d = db(); const h = hoy(); const mes = D.mesDe(h);
    const ev = D.proximosEventos(d, h, 7);
    return [bot([`📊 **Resumen de ${D.nombreMes(mes)}**`, `Tienes: ${D.dinero(D.saldoTotal(d))} · Debes: ${D.dinero(D.deudaTotalTarjetas(d) + D.totalesPrestamos(d).debo)}`,
      `Ganaste: ${D.dinero(D.sumar(D.delMes(d, mes, 'ingreso')))} · Gastaste: ${D.dinero(D.sumar(D.delMes(d, mes, 'gasto')))}`,
      `Microgastos: ${D.dinero(D.sumar(D.microDelMes(d, mes, h)))} de ${D.dinero(D.topeMicro(d, h))}`, `Libre: ${D.dinero(D.dineroLibre(d, h))}`,
      ...(ev.length ? ['Esta semana:', ...ev.slice(0, 4).map((e) => `• ${D.fechaBonita(e.fecha, h)}: ${e.texto}${e.monto ? ` — ${D.dinero(e.monto)}` : ''}`)] : [])])];
  }
  function consulta(a) {
    const { monto, palabras } = a;
    if (!monto) {
      espera = { manejar: (txt) => { const r = extraerMonto(norm(txt)); if (!r.monto) return null; espera = null; return consulta({ ...a, monto: r.monto }); } };
      return [bot(`¿Cuánto cuesta${palabras.length ? ` ${textoOriginal(palabras)}` : ''}?`)];
    }
    const cat = categoriaDe(palabras) || 'otros';
    const r = D.consultarGasto(db(), monto, cat, hoy());
    return [bot([`**${r.titulo}** — ${D.dinero(monto)} en ${palabras.length ? textoOriginal(palabras) : 'eso'}`, ...r.lineas], { semaforo: r.nivel, chips: [
      chip('Lo compré: anotarlo', () => [nuevaTarjeta({ tipo: 'gasto', monto, palabras })]),
      chip('Mejor no', () => [bot('👍 Buena decisión. Ese dinero sigue contigo.')]),
    ] })];
  }
  function ayuda() {
    return [bot(['Escríbeme normal. Antes de guardar te muestro todo para que lo confirmes o lo cambies. Por ejemplo:',
      '• "gasté 120 en un juego" · "me compré unos chetos de 25" · "le di 50 a la tienda" · "se me fueron 200 en uber"',
      '• "hoy gané 3,000 de Twitch" · "me depositaron 500" · "me cayeron 300 de TikTok" · "vendí una llave por 399"',
      '• "tengo 1,500 en Mercado Pago" · "en efectivo traigo 200" · "mi saldo en BBVA es 8,000"',
      '• "debo 3,000 en mi tarjeta Nu" · "pagué 2,000 de la tarjeta" · "le presté 200 a Juan" · "Juan me pagó 100"',
      '• "pago ChatGPT Go 110 cada 20 del mes" · "cancelé Spotify" · "reactiva Netflix"',
      '• "saqué 500 del cajero" · "pasé 300 de BBVA a Mercado Pago" · "aparté 500 para la PC"',
      '• "¿puedo gastar 150 en una nieve?" · "¿cuánto llevo en microgastos?" · "¿qué pagos tengo?"',
      '• Para corregir mientras confirmas: "no, eran 120", "fue en efectivo", "es ingreso", "el día 15". Para borrar algo: "borra el último".'])];
  }

  // ───────── Entrada principal ─────────
  function procesar(original) {
    const t0 = norm(original);
    if (!t0) return [];
    mapaOriginal = {};
    for (const w of String(original).split(/\s+/)) { const limpio = w.replace(/[¿?¡!"“”'`´,;:()\[\]{}.]/g, ''); const n = norm(limpio).replace(/[^a-z0-9ñ+-]/g, ''); if (n && limpio) mapaOriginal[n] = limpio; }
    const a = analizar(t0, original);
    const esCorreccion = /^(no|nop|nel|era|eran|fue|fueron|es|son|cambia|cambialo|cambiale|pon|ponle|ponlo|mejor|perdon|corrijo|correccion|en realidad|mas bien|el dia|la fecha|categoria|nombre|descripcion|con|en|desde|de)\b/.test(t0);
    const intencionPrevia = decidir(a);
    const pareceNuevo = !esCorreccion && ((intencionPrevia && intencionPrevia !== 'preguntar' && a.monto != null) || L.RE_CONSULTA.test(t0) || /^(cuanto|cuantos|cuanta|cuando|que|cual|cuales|como|dime|muestrame|resumen|ayuda|borra|deshaz|deshacer|hola|buenas)\b/.test(t0));

    // 1) ¿Es una corrección de la tarjeta que está esperando confirmación?
    if (activa && tarjetas.get(activa)?.estado === 'pendiente' && !pareceNuevo) {
      const b = tarjetas.get(activa);
      const r = corregir(b, original);
      if (r?.accion === 'confirmar') return confirmar(b.id);
      if (r?.accion === 'cancelar') return cancelar(b.id);
      if (r?.accion === 'cambio') { completar(b); return [{ ...vistaTarjeta(b), mover: true }]; }
    }
    // 2) ¿Respuesta a una pregunta mía?
    if (espera && !pareceNuevo) { const r = espera.manejar(original); if (r) return r; }
    espera = null;

    if (/^(ayuda|que puedo (decir|hacer|escribir)|comandos|como funciona|ejemplos)\b/.test(t0)) return ayuda();
    if (/\b(deshace|deshacer|deshaz)\b|\b(borra|borrar|elimina|eliminar|quita|quitar)\s+(el\s+|lo\s+|la\s+)?(ultimo|ultima)\b|\bme equivoque\b/.test(t0)) {
      const ult = D.movimientos(db()).filter((m) => !m.auto).sort((x, y) => (y.u || 0) - (x.u || 0))[0];
      if (!ult) return [bot('No hay movimientos para borrar.')];
      return [nuevaTarjeta({ tipo: 'borrar', movimiento: ult.id })];
    }
    if (/^(hola|buenas|buenos dias|buen dia|buenas tardes|buenas noches|que onda|hey|que tal|que hay)\b/.test(t0) && a.monto == null) return [bot(`¡Hola${db().ajustes.nombre ? ' ' + db().ajustes.nombre : ''}! 👋`), ...resumen()];
    if (/^(resumen|como voy|como vamos|estado|como estoy)\b/.test(t0)) return resumen();

    // 3) ¿Puedo gastar…?
    if (L.RE_CONSULTA.test(t0) && !/^(cuanto|cuando)\b/.test(t0)) return consulta(a);
    // 4) Preguntas
    const esPregunta = /^(cuanto|cuantos|cuanta|cuando|que|cual|cuales|como|dime|muestrame|ensename|saldo de|en que|donde)\b/.test(t0) || (/\?\s*$/.test(String(original).trim()) && a.monto == null);
    if (esPregunta) return preguntas(t0);

    // 5) Entender y armar la tarjeta para confirmar
    const intencion = intencionPrevia;
    if (intencion === 'consulta') return consulta(a);
    if (intencion === 'preguntar' || (!intencion && a.monto != null)) {
      return [bot(`¿Qué es "${original}"?`, { chips: [
        chip('Un gasto', () => [nuevaTarjeta({ tipo: 'gasto', monto: a.monto, palabras: a.palabras, fecha: a.fecha })]),
        chip('Un ingreso', () => [nuevaTarjeta({ tipo: 'ingreso', monto: a.monto, palabras: a.palabras, fecha: a.fecha })]),
        chip('Lo que tengo en una cuenta', () => [nuevaTarjeta({ tipo: 'saldo', monto: a.monto, cuenta: (() => { const p = cuentaMencionada(t0); return p ? valorPago(p) : undefined; })() })]),
        chip('Una suscripción', () => [nuevaTarjeta({ tipo: 'suscripcion', monto: a.monto, palabras: a.palabras })]),
      ] })];
    }
    if (!intencion) {
      if (buscarSuscripcion(t0)) return [infoSuscripcion(buscarSuscripcion(t0))];
      return [bot([`No entendí "${original}".`, 'Prueba con algo como "gasté 120 en tacos", "gané 500" o "tengo 1,500 en BBVA".'], { chips: [chip('Ver ejemplos', () => ayuda())] })];
    }
    const datos = construir(intencion, a);
    if (datos?.noExiste) return [bot(`No tienes ${datos.noExiste} guardada en tus suscripciones, así que no hay nada que cancelar.`)];
    if (!datos) return [bot(`No entendí "${original}".`, { chips: [chip('Ver ejemplos', () => ayuda())] })];
    return [nuevaTarjeta(datos)];
  }

  function tocar(id, valor) {
    const fn = manejadores[id];
    if (!fn) return [bot('Ese botón ya no está disponible. Escríbelo de nuevo, por favor.')];
    return (valor !== undefined ? fn(valor) : fn()) || [];
  }
  function saludo() {
    const d = db(); const h = hoy(); const hora = new Date().getHours();
    const lineas = [`${hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'}${d.ajustes.nombre ? ', ' + d.ajustes.nombre : ''} 👋 ¿Qué gastaste o ganaste hoy?`];
    for (const e of D.proximosEventos(d, h, Number(d.ajustes.avisosDiasAntes) || 3).slice(0, 4)) lineas.push(`📅 ${cap(D.fechaBonita(e.fecha, h))}: ${e.texto}${e.monto ? ` — ten listos ${D.dinero(e.monto)}` : ''}`);
    return [bot(lineas, { chips: [chip('¿Cuánto llevo en microgastos?', () => procesar('cuanto llevo en microgastos')), chip('Resumen del mes', () => resumen()), chip('Próximos pagos', () => procesar('que pagos tengo')), chip('Ejemplos de lo que entiendo', () => ayuda())] })];
  }
  function avisoAutomaticos(hechos) { return hechos.length ? [bot(hechos.map((x) => `🔔 ${x}`))] : []; }

  return { procesar, tocar, saludo, avisoAutomaticos, campo, poner, ponerTexto, confirmar, cancelar, reabrir, deshacer,
    get esperando() { return !!espera; }, get activa() { return activa; } };
}
