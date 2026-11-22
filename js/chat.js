// Economua — chat sin IA. Entiende frases de dinero escritas normal, con muchos sinónimos.
import * as D from './datos.js';

// ───────── Utilidades de texto ─────────
export function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!"“”'`´,;:()\[\]{}]/g, (c) => (c === ',' ? ',' : ' ')).replace(/\s+/g, ' ').trim();
}
const tiene = (t, re) => re.test(t);
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const singular = (w) => (w.length > 4 && w.endsWith('es') ? [w, w.slice(0, -2), w.slice(0, -1)] : w.length > 3 && w.endsWith('s') ? [w, w.slice(0, -1)] : [w]);

// ───────── Números escritos con palabras ─────────
const UNI = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900 };
function numeroPalabras(tokens) {
  // Busca la secuencia de números en palabras más larga. Devuelve {valor, ini, fin} o null.
  let mejor = null;
  for (let i = 0; i < tokens.length; i++) {
    if (!(tokens[i] in UNI) && tokens[i] !== 'mil') continue;
    let total = 0, actual = 0, j = i, usado = false, fuerte = false;
    while (j < tokens.length) {
      const w = tokens[j];
      if (w in UNI) { actual += UNI[w]; usado = true; if (UNI[w] >= 10) fuerte = true; }
      else if (w === 'mil') { total += (actual || 1) * 1000; actual = 0; usado = true; fuerte = true; }
      else if (w === 'y' && usado && j + 1 < tokens.length && tokens[j + 1] in UNI) { /* treinta y cinco */ }
      else break;
      j++;
    }
    const valor = total + actual;
    const sigue = tokens[j];
    if (sigue === 'pesos' || sigue === 'varos' || sigue === 'baros' || sigue === 'morlacos') fuerte = true;
    if (usado && fuerte && (!mejor || valor > mejor.valor)) mejor = { valor, ini: i, fin: j };
  }
  return mejor;
}

// ───────── Montos ─────────
export function extraerMonto(texto) {
  let t = ` ${texto} `;
  const candidatos = [];
  const re = /(\$\s*)?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s*(k\b|mil\b|pesos\b|varos\b|baros\b|mxn\b|lucas\b)?/g;
  let m;
  while ((m = re.exec(t))) {
    let v = Number(m[2].replace(/,/g, '')) + (m[3] ? Number('0.' + m[3]) : 0);
    const suf = m[4] || '';
    if (suf === 'k' || suf === 'mil' || suf === 'lucas') v *= 1000;
    const antes = t.slice(Math.max(0, m.index - 6), m.index);
    candidatos.push({ v, ini: m.index, fin: m.index + m[0].length, marca: !!m[1] || /pesos|varos|baros|mxn|k|mil|lucas/.test(suf), trasPor: /\bpor\s*$/.test(antes) || /\bde\s*$/.test(antes) });
  }
  if (candidatos.length) {
    const c = candidatos.find((x) => x.marca) || candidatos.find((x) => x.trasPor) || candidatos[0];
    return { monto: c.v, resto: (t.slice(0, c.ini) + ' ' + t.slice(c.fin)).replace(/\s+/g, ' ').trim() };
  }
  const tokens = texto.split(' ');
  const np = numeroPalabras(tokens);
  if (np) return { monto: np.valor, resto: [...tokens.slice(0, np.ini), ...tokens.slice(np.fin)].join(' ') };
  if (/\bmil\b/.test(texto)) return { monto: 1000, resto: texto.replace(/\bmil\b/, ' ').trim() };
  return { monto: null, resto: texto };
}

// ───────── Fechas ─────────
const MESES_N = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const DIAS_N = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
export function extraerFecha(texto, hoy, futuro = false) {
  let t = ` ${texto} `; let fecha = null;
  const quitar = (re) => { t = t.replace(re, ' '); };
  const anio = Number(hoy.slice(0, 4));
  let m;
  if ((m = t.match(/\b(antier|anteayer|antes de ayer)\b/))) { fecha = D.sumarDias(hoy, -2); quitar(m[0]); }
  else if ((m = t.match(/\b(pasado manana)\b/))) { fecha = D.sumarDias(hoy, 2); quitar(m[0]); }
  else if ((m = t.match(/\bayer\b/))) { fecha = D.sumarDias(hoy, -1); quitar(m[0]); }
  else if ((m = t.match(/\bmanana\b/)) && !/\b(en|por) la manana\b/.test(t)) { fecha = D.sumarDias(hoy, 1); quitar(m[0]); }
  else if ((m = t.match(/\bhoy\b/))) { fecha = hoy; quitar(m[0]); }
  else if ((m = t.match(/\b(?:el\s+)?(?:dia\s+)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de|del)\s+(\d{4}))?\b/))) {
    const mes = MESES_N[m[2]]; let a = m[3] ? Number(m[3]) : anio;
    fecha = D.fechaConDia(a, mes, Number(m[1]));
    if (!m[3]) { if (!futuro && fecha > hoy) fecha = D.fechaConDia(a - 1, mes, Number(m[1])); if (futuro && fecha < D.sumarDias(hoy, -200)) fecha = D.fechaConDia(a + 1, mes, Number(m[1])); }
    quitar(m[0]);
  } else if ((m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    let a = m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : anio;
    fecha = D.fechaConDia(a, Number(m[2]), Number(m[1]));
    if (!m[3] && !futuro && fecha > hoy) fecha = D.fechaConDia(a - 1, Number(m[2]), Number(m[1]));
    quitar(m[0]);
  } else if ((m = t.match(/\bel\s+(?:dia\s+)?(\d{1,2})\b(?!\s*(?:pesos|varos|mil|k\b))/)) && Number(m[1]) >= 1 && Number(m[1]) <= 31) {
    fecha = futuro ? D.proximoDia(Number(m[1]), hoy) : D.anteriorDia(Number(m[1]), hoy);
    quitar(m[0]);
  } else if ((m = t.match(/\b(?:el\s+)?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)(\s+pasado)?\b/))) {
    const objetivo = DIAS_N[m[1]]; const actual = D.aFecha(hoy).getDay();
    let dif = (actual - objetivo + 7) % 7; if (m[2] && dif === 0) dif = 7;
    fecha = futuro && !m[2] ? D.sumarDias(hoy, (objetivo - actual + 7) % 7) : D.sumarDias(hoy, -dif);
    quitar(m[0]);
  }
  return { fecha, resto: t.replace(/\s+/g, ' ').trim() };
}

// ───────── Periodos y meses sin intereses ─────────
function extraerFrecuencia(t) {
  if (/\b(cada (3|tres) meses|trimestral|trimestre)\b/.test(t)) return 'trimestral';
  if (/\b(al ano|anual|anualidad|cada ano|por ano|al anio|anuales)\b/.test(t)) return 'anual';
  if (/\b(semanal|cada semana|a la semana|por semana)\b/.test(t)) return 'semanal';
  if (/\b(quincenal|cada (15|quince) dias|a la quincena)\b/.test(t)) return 'quincenal';
  if (/\b(al mes|mensual|mensuales|cada mes|por mes|mensualidad)\b/.test(t)) return 'mensual';
  return null;
}
function quitarFrecuencia(t) {
  return t.replace(/\b(cada (3|tres) meses|trimestral|al ano|anual|cada ano|por ano|semanal|cada semana|a la semana|por semana|quincenal|cada (15|quince) dias|al mes|mensual|mensuales|cada mes|por mes)\b/g, ' ');
}
function extraerMSI(t) {
  let m = t.match(/\b(?:a\s+)?(\d{1,2}|tres|seis|doce|nueve|dieciocho|veinticuatro)\s*(?:meses\s+sin\s+intereses|msi|meses)\b/);
  if (!m) return null;
  const v = isNaN(Number(m[1])) ? UNI[m[1]] : Number(m[1]);
  return { meses: v, resto: t.replace(m[0], ' ') };
}

// ───────── Palabras clave ─────────
const RE_GASTO = /\b(gaste|gastamos|me gaste|gasto de|compre|me compre|compramos|pague|pagamos|page|di|le di|les di|se me fue|se me fueron|se fue|se fueron|me costo|costo|costaron|me salio|salio en|invite|solte|deje|me cobraron|cobraron|me clavaron|desembolse|meti|me echo|me eche|pedi)\b/;
const RE_INGRESO = /\b(gane|ganamos|ganado|me pagaron|pagaron|recibi|recibimos|me dieron|dieron|me depositaron|depositaron|me llego|me llegaron|llego|llegaron|me entro|me entraron|entro|entraron|cobre|me transfirieron|me cayo|me cayeron|cayo|cayeron|vendi|vendimos|me donaron|donaron|me mandaron|obtuve|junte|ingreso de|ingresaron)\b/;
const RE_CONSULTA = /\b(puedo|quiero|quisiera|voy a|pienso|deberia|me conviene|conviene|planeo|me gustaria|me late)\b.*\b(gastar|comprar|pedir|pagar|comprarme|gastarme|darme|ir por|echarme|invitar|contratar)\b|\b(me alcanza|alcanza para|gastare|comprare|pagare)\b/;
const RE_PREGUNTA = /^(cuanto|cuantos|cuanta|cuando|que|cual|cuales|como|dime|muestrame|ensename|resumen|saldo|estado|en que)\b/;
const STOP = new Set('me mi mis te tu un una unos unas el la los las lo al del de en por para con y o a que hoy ayer pesos peso varos baros mxn lucas k mil se le les ya solo nomas unos unitos unas como ahi aqui eso esto este esta mas bien muy pues tambien igual cosa cosas algo nada pero porque total fue fueron gasto gastos ingreso compra como su sus mas menos casi aprox aproximadamente tantito otra otro otras otros mismo misma nuevo nueva'.split(' '));
const VERBOS = new Set(('gaste gastamos gastar gastado compre compramos comprar comprarme pague pagamos pagar page di dar costo costaron salio invite solte deje cobraron clavaron desembolse meti echo eche pedi ' +
  'gane ganamos ganado pagaron recibi recibimos dieron depositaron llego llegaron entro entraron cobre transfirieron cayo cayeron vendi vendimos donaron mandaron obtuve junte ingresaron ' +
  'puedo quiero quisiera voy pienso deberia conviene planeo gustaria late alcanza gastare comprare pagare gastarme darme ir echarme invitar fueron fue').split(' '));
export const SERVICIOS = ['netflix', 'spotify', 'disney', 'disney plus', 'max', 'hbo', 'hbo max', 'prime video', 'amazon prime', 'prime', 'youtube premium', 'youtube music', 'crunchyroll',
  'game pass', 'xbox game pass', 'ps plus', 'playstation plus', 'nintendo online', 'apple music', 'apple tv', 'icloud', 'google one', 'chatgpt', 'claude', 'canva', 'adobe',
  'paramount', 'vix', 'star plus', 'twitch turbo', 'discord nitro', 'nitro', 'deezer', 'mubi', 'microsoft 365', 'office', 'capcut', 'notion', 'midjourney', 'gimnasio', 'gym', 'smart fit', 'mercado pago', 'rappi pro', 'uber one', 'didi pass', 'kick'];

// ───────── Motor del chat ─────────
export function crearChat(ctx) {
  const db = () => ctx.db();
  const hoy = () => (ctx.hoy ? ctx.hoy() : D.hoyISO());
  const cambio = () => ctx.cambio && ctx.cambio();
  let manejadores = {}; let contador = 0; let espera = null; const pilaDeshacer = [];
  let mapaOriginal = {};
  const fechaCorta = (iso) => { const f = D.aFecha(iso); return `${f.getDate()} de ${D.MESES[f.getMonth()]}`; };
  // Regresa las palabras como las escribiste (con acentos), no normalizadas.
  const textoOriginal = (palabras) => palabras.map((w) => mapaOriginal[w] || w).join(' ');

  const chip = (label, fn, estilo) => { const id = `c${++contador}`; manejadores[id] = fn; return { id, label, estilo }; };
  const bot = (lineas, extra = {}) => ({ de: 'bot', lineas: Array.isArray(lineas) ? lineas : [lineas], ...extra });
  const recordarDeshacer = (texto, fn) => { pilaDeshacer.push({ texto, fn }); if (pilaDeshacer.length > 30) pilaDeshacer.shift(); };

  // ── Cuentas y tarjetas por nombre ──
  function pagosPosibles() {
    const out = D.lista(db(), 'cuentas').map((c) => ({ tipo: 'cuenta', id: c.id, nombre: c.nombre, clave: norm(c.nombre), efectivo: c.tipo === 'efectivo' }));
    for (const t of D.lista(db(), 'tarjetas')) out.push({ tipo: 'tarjeta', id: t.id, nombre: t.nombre, clave: norm(t.nombre) });
    return out;
  }
  function buscarPago(t, soloTipo) {
    const lista = pagosPosibles().filter((p) => !soloTipo || p.tipo === soloTipo).sort((a, b) => b.clave.length - a.clave.length);
    for (const p of lista) if (p.clave && new RegExp(`\\b${p.clave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t)) return p;
    if (!soloTipo || soloTipo === 'cuenta') if (/\b(efectivo|cash|en mano|cartera)\b/.test(t)) { const e = lista.find((p) => p.efectivo); if (e) return e; }
    if (!soloTipo || soloTipo === 'tarjeta') if (/\b(con|en|de) (la )?(tarjeta|credito|tdc)\b/.test(t)) { const ts = pagosPosibles().filter((p) => p.tipo === 'tarjeta'); if (ts.length === 1) return ts[0]; }
    return null;
  }
  function quitarNombresPago(t) {
    for (const p of pagosPosibles()) if (p.clave) t = t.replace(new RegExp(`\\b(con|en|de|desde|a|por)?\\s*(la|mi)?\\s*(tarjeta|cuenta)?\\s*${p.clave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), ' ');
    return t.replace(/\b(con|en|de)\s+(la\s+)?(tarjeta|efectivo|cash|credito|debito|transferencia)\b/g, ' ').replace(/\b(efectivo|cash)\b/g, ' ');
  }
  function pagoPredeterminado() {
    const id = db().ajustes.cuentaPredeterminada;
    const c = D.obtener(db(), 'cuentas', id) || D.lista(db(), 'cuentas')[0];
    return c ? { tipo: 'cuenta', id: c.id, nombre: c.nombre } : null;
  }

  // ── Descripción y categoría ──
  function palabrasDescripcion(resto) {
    resto = quitarNombresPago(resto);
    resto = quitarFrecuencia(resto);
    return resto.split(' ').map((w) => w.replace(/[^a-z0-9ñ-]/g, '')).filter((w) => w && !STOP.has(w) && !VERBOS.has(w) && !/^\d+([.,]\d+)?$/.test(w) && w.length > 1);
  }
  function detectarCategoria(palabras) {
    const d = db();
    for (const w of palabras) for (const f of singular(w)) if (d.aprendido[f]) return D.obtener(d, 'categorias', d.aprendido[f].cat) ? d.aprendido[f].cat : null;
    const cats = D.lista(d, 'categorias');
    for (const w of palabras) for (const f of singular(w)) for (const c of cats) if ((c.palabras || []).includes(f) || norm(c.nombre) === f) return c.id;
    for (const w of palabras) if (SERVICIOS.includes(w)) return 'suscripciones';
    return null;
  }
  function detectarFuente(t) {
    for (const f of D.lista(db(), 'fuentes')) {
      if (new RegExp(`\\b${norm(f.nombre).split(' ')[0]}\\b`).test(t)) return f.id;
      for (const w of f.palabras || []) if (new RegExp(`\\b${w}\\b`).test(t)) return f.id;
    }
    return null;
  }

  // ── Resúmenes cortos ──
  function lineaMicro() {
    const d = db(); const mes = D.mesDe(hoy());
    const total = D.sumar(D.microDelMes(d, mes, hoy())); const tope = D.topeMicro(d, hoy());
    return `Microgastos del mes: ${D.dinero(total)} de ${D.dinero(tope)}.`;
  }
  function chipsCategorias(fn) {
    const d = db(); const mes = D.mesDe(hoy());
    const usadas = D.gastosPorCategoria(d, mes).map(([id]) => id);
    const orden = [...new Set([...usadas, 'comida', 'botanas', 'super', 'juegos', 'transporte', 'entretenimiento', 'cafe', 'tecnologia', 'ropa', 'otros'])];
    const cats = orden.map((id) => D.obtener(d, 'categorias', id)).filter(Boolean);
    for (const c of D.lista(d, 'categorias')) if (!cats.includes(c)) cats.push(c);
    return cats.map((c) => chip(`${c.emoji || ''} ${c.nombre}`.trim(), () => fn(c.id)));
  }
  function chipsPago(fn, incluirTarjetas = true) {
    return pagosPosibles().filter((p) => incluirTarjetas || p.tipo === 'cuenta').map((p) => chip(p.tipo === 'tarjeta' ? `💳 ${p.nombre}` : `🏦 ${p.nombre}`, () => fn(p)));
  }
  function chipsFecha(fn, futuro) {
    const h = hoy();
    const base = [chip(`Hoy (${fechaCorta(h)})`, () => fn(h)), chip(`Ayer (${fechaCorta(D.sumarDias(h, -1))})`, () => fn(D.sumarDias(h, -1)))];
    if (futuro) base.push(chip('Mañana', () => fn(D.sumarDias(h, 1))));
    base.push({ ...chip('Otro día', (v) => (v ? fn(v) : [])), fecha: true });
    return base;
  }

  // ───────── GASTO ─────────
  function registrarGasto({ monto, palabras, fecha, pago, micro, original }) {
    const d = db();
    const cat = detectarCategoria(palabras);
    const p = pago || pagoPredeterminado();
    const desc = cap(textoOriginal(palabras)) || (cat ? D.categoria(d, cat).nombre : 'Gasto');
    const mov = D.guardar(d, 'movimientos', { tipo: 'gasto', monto, fecha: fecha || hoy(), categoria: cat || 'otros', descripcion: desc, cuenta: p?.id, pagoTipo: p?.tipo || 'cuenta', ...(micro !== undefined ? { micro } : {}) });
    cambio();
    recordarDeshacer(`el gasto de ${D.dinero(monto)}`, () => { D.borrar(db(), 'movimientos', mov.id); });
    if (!cat && palabras.length) {
      const palabra = palabras[0];
      return [bot([`Anoté ${D.dinero(monto)} de "${desc}" (${p?.nombre || 'sin cuenta'}, ${D.fechaBonita(mov.fecha, hoy())}).`, `¿En qué categoría va "${palabra}"? La voy a recordar para la próxima.`],
        { chips: chipsCategorias((catId) => { const m = D.obtener(db(), 'movimientos', mov.id); if (!m) return [bot('Ese gasto ya no existe.')]; m.categoria = catId; D.guardar(db(), 'movimientos', m); D.aprender(db(), palabra, catId); cambio(); return [confirmacionGasto(m, `Listo, "${palabra}" va en ${D.categoria(db(), catId).nombre}. La próxima lo pongo solo.`)]; }) })];
    }
    return [confirmacionGasto(mov)];
  }
  function confirmacionGasto(mov, previo) {
    const d = db(); const c = D.categoria(d, mov.categoria); const micro = D.esMicro(d, mov, hoy());
    const lineas = [];
    if (previo) lineas.push(previo);
    lineas.push(`✅ Gasto de **${D.dinero(mov.monto)}** · ${c.emoji} ${c.nombre} · ${mov.descripcion}`);
    lineas.push(`Pagado con ${D.nombrePago(d, mov)} · ${D.fechaBonita(mov.fecha, hoy())}`);
    if (micro) lineas.push(`Es microgasto. ${lineaMicro()}`);
    const id = mov.id;
    const recargar = () => D.obtener(db(), 'movimientos', id);
    return bot(lineas, { chips: [
      chip('Cambiar categoría', () => [bot('¿En qué categoría lo pongo?', { chips: chipsCategorias((catId) => { const m = recargar(); if (!m) return [bot('Ese gasto ya no existe.')]; m.categoria = catId; D.guardar(db(), 'movimientos', m); cambio(); return [confirmacionGasto(m)]; }) })]),
      chip('Cambiar con qué pagué', () => [bot('¿Con qué pagaste?', { chips: chipsPago((p) => { const m = recargar(); if (!m) return [bot('Ese gasto ya no existe.')]; m.cuenta = p.id; m.pagoTipo = p.tipo; D.guardar(db(), 'movimientos', m); cambio(); return [confirmacionGasto(m)]; }) })]),
      chip(micro ? 'No contarlo como microgasto' : 'Contarlo como microgasto', () => { const m = recargar(); if (!m) return [bot('Ese gasto ya no existe.')]; m.micro = !micro; D.guardar(db(), 'movimientos', m); cambio(); return [confirmacionGasto(m)]; }),
      chip('Cambiar fecha', () => [bot('¿Qué día fue?', { chips: chipsFecha((f) => { const m = recargar(); if (!m) return [bot('Ese gasto ya no existe.')]; m.fecha = f; D.guardar(db(), 'movimientos', m); cambio(); return [confirmacionGasto(m)]; }) })]),
      chip('Borrar este gasto', () => { const copia = D.borrar(db(), 'movimientos', id); cambio(); return [bot('🗑️ Borré ese gasto.', { chips: [chip('Deshacer (regresarlo)', () => { D.restaurar(db(), 'movimientos', copia); cambio(); return [bot('Listo, lo regresé.')]; })] })]; }, 'peligro'),
    ] });
  }

  // ───────── INGRESO ─────────
  function registrarIngreso({ monto, t, fecha, pago, palabras }) {
    const d = db();
    const fuente = detectarFuente(t);
    const p = pago && pago.tipo === 'cuenta' ? pago : pagoPredeterminado();
    const desc = cap(textoOriginal(palabras.filter((w) => !D.lista(d, 'fuentes').some((f) => (f.palabras || []).includes(w)))));
    const mov = D.guardar(d, 'movimientos', { tipo: 'ingreso', monto, fecha: fecha || hoy(), fuente: fuente || 'otros-ing', descripcion: desc || D.fuente(d, fuente || 'otros-ing').nombre, cuenta: p?.id, pagoTipo: 'cuenta' });
    cambio();
    recordarDeshacer(`el ingreso de ${D.dinero(monto)}`, () => { D.borrar(db(), 'movimientos', mov.id); });
    if (!fuente) return [bot([`💰 Anoté **${D.dinero(monto)}** de ingreso (${p?.nombre}, ${D.fechaBonita(mov.fecha, hoy())}).`, '¿De dónde vino?'], { chips: chipsFuentes(mov.id) })];
    return [confirmacionIngreso(mov)];
  }
  function chipsFuentes(movId) {
    return D.lista(db(), 'fuentes').map((f) => chip(f.nombre, () => { const m = D.obtener(db(), 'movimientos', movId); if (!m) return [bot('Ese ingreso ya no existe.')]; m.fuente = f.id; if (!m.descripcion || m.descripcion === 'Otros ingresos') m.descripcion = f.nombre; D.guardar(db(), 'movimientos', m); cambio(); return [confirmacionIngreso(m)]; }));
  }
  function confirmacionIngreso(mov) {
    const d = db(); const mes = D.mesDe(hoy());
    const totalMes = D.sumar(D.delMes(d, mes, 'ingreso'));
    const id = mov.id; const recargar = () => D.obtener(db(), 'movimientos', id);
    return bot([`💰 Ingreso de **${D.dinero(mov.monto)}** · ${D.fuente(d, mov.fuente).nombre}`, `Entró a ${D.nombrePago(d, mov)} · ${D.fechaBonita(mov.fecha, hoy())}`, `Este mes llevas ${D.dinero(totalMes)} de ingresos.`], { chips: [
      chip('Cambiar de dónde vino', () => [bot('¿De dónde vino?', { chips: chipsFuentes(id) })]),
      chip('Cambiar a qué cuenta entró', () => [bot('¿A qué cuenta entró?', { chips: chipsPago((p) => { const m = recargar(); if (!m) return [bot('Ese ingreso ya no existe.')]; m.cuenta = p.id; D.guardar(db(), 'movimientos', m); cambio(); return [confirmacionIngreso(m)]; }, false) })]),
      chip('Cambiar fecha', () => [bot('¿Qué día fue?', { chips: chipsFecha((f) => { const m = recargar(); if (!m) return [bot('Ese ingreso ya no existe.')]; m.fecha = f; D.guardar(db(), 'movimientos', m); cambio(); return [confirmacionIngreso(m)]; }) })]),
      chip('Borrar este ingreso', () => { const copia = D.borrar(db(), 'movimientos', id); cambio(); return [bot('🗑️ Borré ese ingreso.', { chips: [chip('Deshacer (regresarlo)', () => { D.restaurar(db(), 'movimientos', copia); cambio(); return [bot('Listo, lo regresé.')]; })] })]; }, 'peligro'),
    ] });
  }

  // ───────── ¿PUEDO GASTAR? ─────────
  function consulta({ monto, palabras, pago }) {
    if (!monto) {
      espera = { manejar: (txt) => { const r = extraerMonto(norm(txt)); if (!r.monto) return null; espera = null; return consulta({ monto: r.monto, palabras, pago }); } };
      return [bot(`¿Cuánto cuesta${palabras.length ? ` "${palabras.join(' ')}"` : ''}?`)];
    }
    const cat = detectarCategoria(palabras) || 'otros';
    const r = D.consultarGasto(db(), monto, cat, hoy());
    const que = palabras.length ? textoOriginal(palabras) : 'eso';
    return [bot([`**${r.titulo}** — ${D.dinero(monto)} en ${que}`, ...r.lineas], { semaforo: r.nivel, chips: [
      chip('Lo compré, anótalo', () => registrarGasto({ monto, palabras, pago })),
      chip('Mejor no', () => [bot('👍 Buena decisión. Ese dinero sigue contigo.')]),
    ] })];
  }

  // ───────── SUSCRIPCIONES ─────────
  function buscarSuscripcion(t) {
    const subs = D.lista(db(), 'suscripciones').sort((a, b) => norm(b.nombre).length - norm(a.nombre).length);
    return subs.find((s) => new RegExp(`\\b${norm(s.nombre).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t)) || null;
  }
  function servicioEn(t) {
    const orden = [...SERVICIOS].sort((a, b) => b.length - a.length);
    return orden.find((s) => new RegExp(`\\b${s}\\b`).test(t)) || null;
  }
  function nombreSuscripcionDe(t, palabras) {
    const s = servicioEn(t);
    if (s) return cap(s.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/^(Ps|Hbo|Vix)\b/, (x) => x.toUpperCase()));
    const m = t.match(/\b(?:suscribi|inscribi|contrate|suscripcion|membresia)\w*\s+(?:a|al|en|de|la|el)?\s*(?:la|el)?\s*([a-z0-9ñ+ ]{2,30})/);
    if (m) { const ws = palabrasDescripcion(extraerMonto(m[1]).resto).filter((w) => !/^(suscripcion|membresia|nueva|nuevo)$/.test(w)); if (ws.length) return cap(ws.slice(0, 3).join(' ')); }
    const ws = palabras.filter((w) => !/^(suscribi|suscripcion|inscribi|contrate|membresia)/.test(w));
    return ws.length ? cap(ws.slice(0, 3).join(' ')) : null;
  }
  function flujoSuscripcion(datos) {
    const d = db();
    if (!datos.nombre) {
      espera = { manejar: (txt) => { const n = norm(txt); if (!n) return null; espera = null; datos.nombre = nombreSuscripcionDe(n, palabrasDescripcion(n)) || cap(txt.trim()); return flujoSuscripcion(datos); } };
      return [bot('¿A qué te suscribiste? (por ejemplo: Netflix)')];
    }
    if (!datos.monto) {
      espera = { manejar: (txt) => { const r = extraerMonto(norm(txt)); if (!r.monto) return null; espera = null; datos.monto = r.monto; const f = extraerFrecuencia(norm(txt)); if (f) datos.frecuencia = f; return flujoSuscripcion(datos); } };
      return [bot(`¿Cuánto pagas de ${datos.nombre}?`)];
    }
    if (!datos.frecuencia) {
      return [bot(`¿Cada cuándo se paga ${datos.nombre}?`, { chips: Object.entries(D.FRECUENCIAS).map(([k, v]) => chip(v, () => { datos.frecuencia = k; return flujoSuscripcion(datos); })) })];
    }
    if (!datos.inicio) {
      espera = { manejar: (txt) => { const f = extraerFecha(norm(txt), hoy()); if (!f.fecha) return null; espera = null; datos.inicio = f.fecha; return flujoSuscripcion(datos); } };
      return [bot(`¿Qué día empezó (o se pagó) ${datos.nombre}?`, { chips: chipsFecha((f) => { espera = null; datos.inicio = f; return flujoSuscripcion(datos); }) })];
    }
    const proxima = D.siguientePeriodo(datos.inicio, datos.frecuencia, Number(datos.inicio.slice(8, 10)));
    if (datos.renueva === undefined) {
      return [bot([`Con eso, el periodo de ${datos.nombre} dura hasta el **${D.fechaBonita(proxima, hoy())}**.`, '¿Se renueva sola o se cancela al terminar?'], { chips: [
        chip(`Se renueva sola (${D.FRECUENCIAS[datos.frecuencia].toLowerCase()})`, () => { datos.renueva = true; return flujoSuscripcion(datos); }),
        chip(`Se cancela el ${fechaCorta(proxima)}`, () => { datos.renueva = false; return flujoSuscripcion(datos); }),
      ] })];
    }
    if (!datos.pago) {
      const opciones = pagosPosibles();
      if (opciones.length === 1) datos.pago = opciones[0];
      else return [bot(`¿Con qué pagas ${datos.nombre}?`, { chips: chipsPago((p) => { datos.pago = p; return flujoSuscripcion(datos); }) })];
    }
    // Guardar
    const s = D.guardar(d, 'suscripciones', { id: datos.id, nombre: datos.nombre, monto: datos.monto, frecuencia: datos.frecuencia, inicio: datos.inicio, proxima,
      renueva: datos.renueva, estado: datos.renueva ? 'activa' : 'cancelada', pagaCon: datos.pago.id, pagaTipo: datos.pago.tipo });
    let mov = null;
    if (datos.inicio <= hoy()) mov = D.pagoDeSuscripcion(d, s, datos.inicio, false);
    D.procesarAutomaticos(d, hoy());
    cambio();
    const ultima = D.obtener(d, 'suscripciones', s.id);
    recordarDeshacer(`la suscripción a ${s.nombre}`, () => { D.borrar(db(), 'suscripciones', s.id); if (mov) D.borrar(db(), 'movimientos', mov.id); });
    return [confirmacionSuscripcion(ultima, mov ? mov.id : null, true)];
  }
  function confirmacionSuscripcion(s, movId, nueva) {
    const d = db(); const est = D.estadoSuscripcion(s, hoy());
    const lineas = [`${nueva ? '✅ Guardé' : '🔁'} **${s.nombre}** · ${D.dinero(s.monto)} ${D.FRECUENCIAS[s.frecuencia].toLowerCase()}`,
      `Empezó: ${D.fechaBonita(s.inicio, hoy())} · ${est.texto}`];
    if (movId) lineas.push(`Registré el pago de ${D.dinero(s.monto)} como gasto.`);
    lineas.push(`Total en suscripciones: ${D.dinero(D.costoMensualSuscripciones(d))} al mes.`);
    const id = s.id;
    const chips = [
      chip('Cambiar precio', () => { espera = { manejar: (txt) => { const r = extraerMonto(norm(txt)); if (!r.monto) return null; espera = null; const x = D.obtener(db(), 'suscripciones', id); x.monto = r.monto; D.guardar(db(), 'suscripciones', x); cambio(); return [confirmacionSuscripcion(x, null)]; } }; return [bot('¿Cuál es el precio nuevo?')]; }),
      chip('Cambiar fecha de renovación', () => [bot('¿Qué día se renueva o termina?', { chips: chipsFecha((f) => { const x = D.obtener(db(), 'suscripciones', id); x.proxima = f; D.guardar(db(), 'suscripciones', x); cambio(); return [confirmacionSuscripcion(x, null)]; }, true) })]),
    ];
    if (s.estado === 'activa') chips.push(chip('Ya la cancelé (que no se renueve)', () => cancelar(D.obtener(db(), 'suscripciones', id))));
    else chips.push(chip('Que sí se renueve', () => { const x = D.obtener(db(), 'suscripciones', id); x.estado = 'activa'; x.renueva = true; D.guardar(db(), 'suscripciones', x); cambio(); return [confirmacionSuscripcion(x, null)]; }));
    if (movId) chips.push(chip('No me cobraron (era prueba gratis)', () => { D.borrar(db(), 'movimientos', movId); cambio(); return [bot('Listo, quité ese cobro. La suscripción sigue guardada.')]; }));
    chips.push(chip('Borrar suscripción', () => { const copia = D.borrar(db(), 'suscripciones', id); cambio(); return [bot(`🗑️ Borré ${copia.nombre}.`, { chips: [chip('Deshacer (regresarla)', () => { D.restaurar(db(), 'suscripciones', copia); cambio(); return [bot('Listo, la regresé.')]; })] })]; }, 'peligro'));
    return bot(lineas, { chips });
  }
  function cancelar(s) {
    if (!s) return [bot('No encontré esa suscripción.')];
    const antes = { ...s };
    s.estado = 'cancelada'; s.renueva = false; D.guardar(db(), 'suscripciones', s); cambio();
    return [bot([`❌ Cancelé **${s.nombre}**: ya no se va a renovar.`, `La puedes seguir usando hasta el ${D.fechaBonita(s.proxima, hoy())}. Después queda guardada por si la quieres reactivar.`], { chips: [
      chip('Ya terminó hoy (no la puedo usar)', () => { const x = D.obtener(db(), 'suscripciones', s.id); x.estado = 'terminada'; x.proxima = hoy(); D.guardar(db(), 'suscripciones', x); cambio(); return [bot(`Listo, ${x.nombre} quedó como terminada.`)]; }),
      chip('Deshacer', () => { D.guardar(db(), 'suscripciones', { ...antes }); cambio(); return [bot('Listo, la dejé como estaba.')]; }),
    ] })];
  }
  function reactivar(s, fecha) {
    if (s.estado === 'cancelada' && s.proxima >= hoy() && !fecha) {
      s.estado = 'activa'; s.renueva = true; D.guardar(db(), 'suscripciones', s); cambio();
      return [confirmacionSuscripcion(s, null)];
    }
    if (!fecha) {
      espera = { manejar: (txt) => { const f = extraerFecha(norm(txt), hoy()); if (!f.fecha) return null; espera = null; return reactivar(D.obtener(db(), 'suscripciones', s.id), f.fecha); } };
      return [bot([`Tenías guardada **${s.nombre}** (${D.dinero(s.monto)} ${D.FRECUENCIAS[s.frecuencia].toLowerCase()}).`, '¿Desde qué día la reactivas?'], { chips: chipsFecha((f) => { espera = null; return reactivar(D.obtener(db(), 'suscripciones', s.id), f); }) })];
    }
    s.inicio = fecha; s.proxima = D.siguientePeriodo(fecha, s.frecuencia, Number(fecha.slice(8, 10))); s.estado = 'activa'; s.renueva = true;
    D.guardar(db(), 'suscripciones', s);
    const mov = fecha <= hoy() ? D.pagoDeSuscripcion(db(), s, fecha, false) : null;
    D.procesarAutomaticos(db(), hoy());
    cambio();
    return [confirmacionSuscripcion(D.obtener(db(), 'suscripciones', s.id), mov?.id, false)];
  }

  // ───────── PREGUNTAS ─────────
  function periodoDe(t) {
    const h = hoy();
    if (/\bhoy\b/.test(t)) return { desde: h, hasta: h, nombre: 'hoy' };
    if (/\bayer\b/.test(t)) return { desde: D.sumarDias(h, -1), hasta: D.sumarDias(h, -1), nombre: 'ayer' };
    if (/\bsemana\b/.test(t)) { const dia = (D.aFecha(h).getDay() + 6) % 7; return { desde: D.sumarDias(h, -dia), hasta: h, nombre: 'esta semana' }; }
    if (/\bmes pasado\b/.test(t)) { const m = D.mesDe(D.sumarMeses(D.mesDe(h) + '-01', -1)); return { desde: m + '-01', hasta: D.finDeMes(m + '-01'), nombre: `en ${D.nombreMes(m)}` }; }
    if (/\bano\b/.test(t)) return { desde: h.slice(0, 4) + '-01-01', hasta: h, nombre: 'este año' };
    return { desde: D.mesDe(h) + '-01', hasta: h, nombre: 'este mes' };
  }
  function preguntas(t) {
    const d = db(); const h = hoy(); const mes = D.mesDe(h);
    if (/\b(micro|microgasto|microgastos|hormiga|hormigas)\b/.test(t)) {
      const lista = D.microDelMes(d, mes, h); const total = D.sumar(lista); const tope = D.topeMicro(d, h);
      const semana = D.sumar(D.microDeSemana(d, h));
      const porCat = {}; for (const m of lista) porCat[m.categoria] = (porCat[m.categoria] || 0) + Number(m.monto);
      const top = Object.entries(porCat).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, v]) => `${D.categoria(d, c).emoji} ${D.categoria(d, c).nombre}: ${D.dinero(v)}`);
      return [bot([`🐜 Microgastos de este mes: **${D.dinero(total)}** de ${D.dinero(tope)} (${lista.length} compras).`, `Esta semana: ${D.dinero(semana)}.`,
        total > tope ? `Te pasaste del tope por ${D.dinero(total - tope)}.` : `Te quedan ${D.dinero(tope - total)} para microgastos.`,
        ...(top.length ? ['En lo que más se te va:', ...top] : []), `Un gasto cuenta como microgasto si es de hasta ${D.dinero(D.umbralMicro(d, h))}.`], { semaforo: total > tope ? 'rojo' : total > tope * 0.8 ? 'amarillo' : 'verde' })];
    }
    const sub = buscarSuscripcion(t);
    if (sub && /\b(cuando|vence|termina|renueva|acaba|cancela|corta|cuanto|dia)\b/.test(t)) return [confirmacionSuscripcion(sub, null)];
    const serv = servicioEn(t);
    if (!sub && serv && /\b(cuando|vence|termina|renueva|acaba|cancela)\b/.test(t)) return [bot(`No tienes ${cap(serv)} guardada. Si te suscribiste, escribe por ejemplo: "me suscribí a ${cap(serv)} por 99 al mes".`)];
    if (/\bsuscripcion|suscripciones\b/.test(t)) {
      const subs = D.lista(d, 'suscripciones').filter((s) => s.estado !== 'terminada');
      if (!subs.length) return [bot('No tienes suscripciones guardadas. Escribe por ejemplo: "me suscribí a Netflix por 219 al mes".')];
      return [bot([`🔁 Tus suscripciones (${D.dinero(D.costoMensualSuscripciones(d))} al mes):`, ...subs.sort((a, b) => (a.proxima || '').localeCompare(b.proxima || '')).map((s) => `• ${s.nombre}: ${D.dinero(s.monto)} ${D.FRECUENCIAS[s.frecuencia].toLowerCase()} — ${D.estadoSuscripcion(s, h).texto}`)])];
    }
    const tarjeta = buscarPago(t, 'tarjeta');
    if (/\b(corte|corta|pago de la tarjeta|tarjeta|tarjetas|limite)\b/.test(t) || (tarjeta && /\bcuando|cuanto\b/.test(t))) {
      const ts = tarjeta ? [D.obtener(d, 'tarjetas', tarjeta.id)] : D.lista(d, 'tarjetas');
      if (!ts.length) return [bot('No tienes tarjetas guardadas. Agrégalas en Más → Tarjetas de crédito.')];
      const lineas = [];
      for (const x of ts) {
        lineas.push(`💳 **${x.nombre}** — debes ${D.dinero(D.deudaTarjeta(d, x.id))}`);
        lineas.push(`Corte: ${D.fechaBonita(D.proximoDia(Number(x.diaCorte), h), h)} · Pago: ${D.fechaBonita(D.proximoDia(Number(x.diaPago), h), h)}`);
        lineas.push(`Para no generar intereses paga: ${D.dinero(D.pagoSinIntereses(d, x.id, h))}`);
        if (x.limite) lineas.push(`Disponible: ${D.dinero(Number(x.limite) - D.deudaTarjeta(d, x.id))} de ${D.dinero(x.limite)}`);
      }
      return [bot(lineas)];
    }
    if (/\b(me deben|me debe)\b/.test(t)) {
      const ps = D.lista(d, 'prestamos').filter((p) => p.direccion === 'meDeben' && D.prestamoSaldo(p) > 0);
      return [bot(ps.length ? ['🤝 Te deben:', ...ps.map((p) => `• ${p.persona}: ${D.dinero(D.prestamoSaldo(p))}`)] : 'Nadie te debe nada ahora.')];
    }
    if (/\b(debo|deuda|deudas|adeudo)\b/.test(t)) {
      const lineas = [`📉 Debes en total: **${D.dinero(D.deudaTotalTarjetas(d) + D.totalesPrestamos(d).debo)}**`];
      for (const x of D.lista(d, 'tarjetas')) lineas.push(`• ${x.nombre}: ${D.dinero(D.deudaTarjeta(d, x.id))}`);
      for (const p of D.lista(d, 'prestamos').filter((p) => p.direccion === 'debo' && D.prestamoSaldo(p) > 0)) lineas.push(`• A ${p.persona}: ${D.dinero(D.prestamoSaldo(p))}`);
      return [bot(lineas)];
    }
    if (/\b(pagos|pagar|vence|vencen|proximos|proximo|toca pagar|tengo que pagar)\b/.test(t)) {
      const ev = D.proximosEventos(d, h, 31);
      if (!ev.length) return [bot('No tienes pagos en los próximos 30 días.')];
      return [bot(['📅 Lo que viene (30 días):', ...ev.slice(0, 12).map((e) => `• ${D.fechaBonita(e.fecha, h)}: ${e.texto}${e.monto ? ` — ${D.dinero(e.monto)}` : ''}`), `Por pagar este mes: ${D.dinero(D.porPagar(d, h).total)}.`])];
    }
    if (/\b(gane|ganado|ganancia|ingresos|ingreso|ingrese|entro|entrado|recibi)\b/.test(t)) {
      const p = periodoDe(t);
      const movs = D.movimientos(d).filter((m) => m.tipo === 'ingreso' && m.fecha >= p.desde && m.fecha <= p.hasta);
      const porF = {}; for (const m of movs) porF[m.fuente] = (porF[m.fuente] || 0) + Number(m.monto);
      return [bot([`💰 Ingresos ${p.nombre}: **${D.dinero(D.sumar(movs))}**`, ...Object.entries(porF).sort((a, b) => b[1] - a[1]).map(([f, v]) => `• ${D.fuente(d, f).nombre}: ${D.dinero(v)}`)])];
    }
    if (/\b(gaste|gastado|gasto|gastos|gastamos|se me fue|se fue)\b/.test(t)) {
      const p = periodoDe(t);
      const pal = palabrasDescripcion(t.replace(/\b(cuanto|cuantos|he|llevo|esta|este|semana|mes|ano|pasado|hoy|ayer|gastado|gastos)\b/g, ' '));
      const cat = detectarCategoria(pal);
      let movs = D.movimientos(d).filter((m) => m.tipo === 'gasto' && m.fecha >= p.desde && m.fecha <= p.hasta);
      if (cat) movs = movs.filter((m) => m.categoria === cat);
      const porC = {}; for (const m of movs) porC[m.categoria] = (porC[m.categoria] || 0) + Number(m.monto);
      const titulo = cat ? `en ${D.categoria(d, cat).nombre} ` : '';
      return [bot([`💸 Gastaste ${titulo}${p.nombre}: **${D.dinero(D.sumar(movs))}** (${movs.length} gastos)`, ...(!cat ? Object.entries(porC).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, v]) => `• ${D.categoria(d, c).emoji} ${D.categoria(d, c).nombre}: ${D.dinero(v)}`) : [])])];
    }
    if (/\b(libre|disponible|alcanza|sobra|queda)\b/.test(t)) {
      const libre = D.dineroLibre(d, h); const pp = D.porPagar(d, h);
      return [bot([`🟢 Dinero libre: **${D.dinero(libre)}**`, `Tienes ${D.dinero(D.saldoTotal(d))} en cuentas, menos ${D.dinero(pp.total)} por pagar y ${D.dinero(D.totalApartado(d))} apartados.`])];
    }
    if (/\b(negocio|negocios|proyeccion|podria ganar)\b/.test(t)) {
      const ns = D.lista(d, 'negocios').filter((n) => n.estado !== 'cobrado' && n.estado !== 'descartado');
      if (!ns.length) return [bot('No tienes negocios en proceso. Agrégalos en Más → Negocios.')];
      const total = ns.reduce((s, n) => s + (Number(n.ganancia) || 0) - (Number(n.costo) || 0), 0);
      return [bot([`📈 Podrías ganar: **${D.dinero(total)}** (ganancia menos costos)`, ...ns.map((n) => `• ${n.nombre}: ${D.dinero((Number(n.ganancia) || 0) - (Number(n.costo) || 0))} — ${n.estado === 'idea' ? 'idea' : 'en proceso'}`)])];
    }
    if (/\b(meta|metas|ahorro|ahorrado|apartado|apartados)\b/.test(t)) {
      const ms = D.lista(d, 'metas');
      if (!ms.length) return [bot('No tienes metas. Escribe por ejemplo: "aparté 500 para la PC".')];
      return [bot(['🎯 Tus metas:', ...ms.map((m) => `• ${m.nombre}: ${D.dinero(m.ahorrado)} de ${D.dinero(m.objetivo)} (${Math.round((Number(m.ahorrado) || 0) / Math.max(1, Number(m.objetivo) || 1) * 100)}%)`)])];
    }
    if (/\b(tengo|saldo|saldos|dinero|cuentas|cuenta|banco|bancos|efectivo)\b/.test(t)) {
      const lineas = [`🏦 Tienes en total: **${D.dinero(D.saldoTotal(d))}**`];
      for (const c of D.lista(d, 'cuentas')) lineas.push(`• ${c.nombre}: ${D.dinero(D.saldoCuenta(d, c.id))}`);
      lineas.push(`Libre después de tus pagos: ${D.dinero(D.dineroLibre(d, h))}`);
      return [bot(lineas)];
    }
    return resumen();
  }
  function resumen() {
    const d = db(); const h = hoy(); const mes = D.mesDe(h);
    const ing = D.sumar(D.delMes(d, mes, 'ingreso')); const gas = D.sumar(D.delMes(d, mes, 'gasto'));
    const ev = D.proximosEventos(d, h, 7);
    return [bot([`📊 **Resumen de ${D.nombreMes(mes)}**`, `Tienes: ${D.dinero(D.saldoTotal(d))} · Debes: ${D.dinero(D.deudaTotalTarjetas(d) + D.totalesPrestamos(d).debo)}`,
      `Ganaste: ${D.dinero(ing)} · Gastaste: ${D.dinero(gas)}`, lineaMicro(), `Libre: ${D.dinero(D.dineroLibre(d, h))}`,
      ...(ev.length ? ['Esta semana:', ...ev.slice(0, 4).map((e) => `• ${D.fechaBonita(e.fecha, h)}: ${e.texto}${e.monto ? ` — ${D.dinero(e.monto)}` : ''}`)] : [])])];
  }

  // ───────── PRÉSTAMOS, TARJETAS, TRANSFERENCIAS, METAS ─────────
  function personaDe(t) {
    const m = t.match(/\b(?:a|de|con)\s+(?:mi\s+)?([a-zñ]{3,})(?:\s+([a-zñ]{3,}))?/);
    const malas = new Set(['la', 'el', 'tarjeta', 'cuenta', 'efectivo', 'pesos', 'que', 'mi', 'hoy', 'ayer']);
    if (m && !malas.has(m[1])) return cap(m[1]);
    const m2 = t.match(/^(?:mi\s+)?([a-zñ]{3,})\s+me\s+(?:pago|devolvio|regreso|abono|presto)/);
    if (m2) return cap(m2[1]);
    const m3 = t.match(/\bmi\s+([a-zñ]{3,})/);
    return m3 ? cap(m3[1]) : null;
  }
  function prestamo(t, monto, fecha, direccion) {
    if (!monto) return [bot('¿De cuánto fue el préstamo?')];
    let persona = personaDe(t);
    if (!persona) { espera = { manejar: (txt) => { espera = null; return prestamoGuardar(cap(txt.trim().split(' ')[0]), monto, fecha, direccion); } }; return [bot('¿A quién? (escribe el nombre)')]; }
    return prestamoGuardar(persona, monto, fecha, direccion);
  }
  function prestamoGuardar(persona, monto, fecha, direccion) {
    const p = pagoPredeterminado();
    const r = D.guardar(db(), 'prestamos', { persona, monto, fecha: fecha || hoy(), direccion, cuenta: p?.id, abonos: [] }); cambio();
    recordarDeshacer('el préstamo', () => D.borrar(db(), 'prestamos', r.id));
    return [bot([direccion === 'meDeben' ? `🤝 Anoté que **${persona}** te debe ${D.dinero(monto)}.` : `🤝 Anoté que le debes ${D.dinero(monto)} a **${persona}**.`,
      direccion === 'meDeben' ? `Salió de ${p?.nombre}.` : `Entró a ${p?.nombre}.`], { chips: [
      chip('No movió mi dinero (solo anotar)', () => { const x = D.obtener(db(), 'prestamos', r.id); x.cuenta = null; D.guardar(db(), 'prestamos', x); cambio(); return [bot('Listo, solo queda anotado sin mover tus cuentas.')]; }),
      chip('Borrar', () => { D.borrar(db(), 'prestamos', r.id); cambio(); return [bot('🗑️ Borré ese préstamo.')]; }, 'peligro'),
    ] })];
  }
  function abonoPrestamo(t, monto, direccion) {
    const ps = D.lista(db(), 'prestamos').filter((p) => p.direccion === direccion && D.prestamoSaldo(p) > 0);
    const p = ps.find((x) => new RegExp(`\\b${norm(x.persona)}\\b`).test(t));
    if (!p) return null;
    if (!monto) monto = D.prestamoSaldo(p);
    const cta = pagoPredeterminado();
    p.abonos = [...(p.abonos || []), { monto, fecha: hoy(), cuenta: p.cuenta ? cta?.id : null }];
    D.guardar(db(), 'prestamos', p); cambio();
    const queda = D.prestamoSaldo(p);
    return [bot([direccion === 'meDeben' ? `🤝 ${p.persona} te pagó ${D.dinero(monto)}.` : `🤝 Le pagaste ${D.dinero(monto)} a ${p.persona}.`, queda > 0 ? `Queda pendiente: ${D.dinero(queda)}.` : '¡Quedó saldado!'])];
  }
  function pagoTarjeta(t, monto) {
    const tarjeta = buscarPago(t, 'tarjeta');
    const ts = D.lista(db(), 'tarjetas');
    if (!ts.length) return [bot('No tienes tarjetas guardadas. Agrégalas en Más → Tarjetas de crédito.')];
    const seguir = (tid) => {
      if (!monto) {
        const sug = D.pagoSinIntereses(db(), tid, hoy());
        espera = { manejar: (txt) => { const r = extraerMonto(norm(txt)); if (!r.monto) return null; espera = null; monto = r.monto; return seguir(tid); } };
        return [bot(`¿Cuánto pagaste? Para no generar intereses son ${D.dinero(sug)}.`, { chips: [chip(`Pagué ${D.dinero(sug)}`, () => { espera = null; monto = sug; return seguir(tid); })] })];
      }
      const origen = buscarPago(quitarTarjetaNombre(t, tid), 'cuenta') || pagoPredeterminado();
      const mov = D.guardar(db(), 'movimientos', { tipo: 'pagoTarjeta', monto, fecha: hoy(), cuenta: origen?.id, destino: tid, descripcion: 'Pago de tarjeta' }); cambio();
      recordarDeshacer('el pago de tarjeta', () => D.borrar(db(), 'movimientos', mov.id));
      const tt = D.obtener(db(), 'tarjetas', tid);
      return [bot([`💳 Pago de ${D.dinero(monto)} a **${tt.nombre}** desde ${origen?.nombre}.`, `Ahora debes ${D.dinero(D.deudaTarjeta(db(), tid))}. No cuenta como gasto (el gasto ya se contó al comprar).`], { chips: [
        chip('Cambiar desde qué cuenta', () => [bot('¿Desde qué cuenta pagaste?', { chips: chipsPago((p) => { const m = D.obtener(db(), 'movimientos', mov.id); m.cuenta = p.id; D.guardar(db(), 'movimientos', m); cambio(); return [bot(`Listo, el pago salió de ${p.nombre}.`)]; }, false) })]),
        chip('Borrar este pago', () => { D.borrar(db(), 'movimientos', mov.id); cambio(); return [bot('🗑️ Borré ese pago.')]; }, 'peligro'),
      ] })];
    };
    if (tarjeta) return seguir(tarjeta.id);
    if (ts.length === 1) return seguir(ts[0].id);
    return [bot('¿Qué tarjeta pagaste?', { chips: ts.map((x) => chip(`💳 ${x.nombre}`, () => seguir(x.id))) })];
  }
  function quitarTarjetaNombre(t, tid) { const x = D.obtener(db(), 'tarjetas', tid); return x ? t.replace(new RegExp(`\\b${norm(x.nombre)}\\b`, 'g'), ' ') : t; }
  function transferencia(t, monto, tipo) {
    const cuentas = pagosPosibles().filter((p) => p.tipo === 'cuenta');
    if (cuentas.length < 2) return [bot('Necesitas al menos dos cuentas (por ejemplo tu banco y Efectivo). Agrégalas en Más → Cuentas.')];
    const efectivo = cuentas.find((c) => c.efectivo);
    let origen = null, destino = null;
    const mOri = t.match(/\b(?:de|del|desde)\s+(?:la\s+|mi\s+)?(?:cuenta\s+)?([a-z0-9ñ ]+?)(?=\s+(?:a|al|para|hacia)\b|$)/);
    const mDes = t.match(/\b(?:a|al|para|hacia)\s+(?:la\s+|mi\s+)?(?:cuenta\s+)?([a-z0-9ñ ]+)$/);
    if (mOri) origen = buscarPago(mOri[1], 'cuenta');
    if (mDes) destino = buscarPago(mDes[1], 'cuenta');
    if (tipo === 'retiro') { destino = destino || efectivo; origen = origen || buscarPago(t.replace(/\befectivo\b/g, ''), 'cuenta'); }
    if (tipo === 'deposito') { origen = origen || efectivo; destino = destino || buscarPago(t.replace(/\befectivo\b/g, ''), 'cuenta'); }
    const terminar = () => {
      if (!monto) { espera = { manejar: (txt) => { const r = extraerMonto(norm(txt)); if (!r.monto) return null; espera = null; monto = r.monto; return terminar(); } }; return [bot('¿Cuánto pasaste?')]; }
      if (!origen) return [bot('¿De qué cuenta salió?', { chips: chipsPago((p) => { origen = p; return terminar(); }, false) })];
      if (!destino || destino.id === origen.id) return [bot('¿A qué cuenta llegó?', { chips: chipsPago((p) => { destino = p; return terminar(); }, false).filter((c) => c.label !== `🏦 ${origen.nombre}`) })];
      const mov = D.guardar(db(), 'movimientos', { tipo: 'transferencia', monto, fecha: hoy(), cuenta: origen.id, destino: destino.id, descripcion: `De ${origen.nombre} a ${destino.nombre}` }); cambio();
      recordarDeshacer('la transferencia', () => D.borrar(db(), 'movimientos', mov.id));
      return [bot([`🔄 Pasé ${D.dinero(monto)} de **${origen.nombre}** a **${destino.nombre}**.`, 'No cuenta como gasto ni como ingreso.'], { chips: [chip('Borrar', () => { D.borrar(db(), 'movimientos', mov.id); cambio(); return [bot('🗑️ Borré esa transferencia.')]; }, 'peligro')] })];
    };
    return terminar();
  }
  function abonoMeta(t, monto) {
    const metas = D.lista(db(), 'metas');
    let meta = metas.find((m) => new RegExp(`\\b${norm(m.nombre).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t));
    const guardarAbono = (mt) => {
      mt.ahorrado = (Number(mt.ahorrado) || 0) + monto; D.guardar(db(), 'metas', mt); cambio();
      recordarDeshacer('el apartado', () => { const x = D.obtener(db(), 'metas', mt.id); x.ahorrado = Number(x.ahorrado) - monto; D.guardar(db(), 'metas', x); });
      const pct = Math.round(mt.ahorrado / Math.max(1, Number(mt.objetivo) || 1) * 100);
      return [bot([`🎯 Apartaste ${D.dinero(monto)} para **${mt.nombre}**.`, mt.objetivo ? `Llevas ${D.dinero(mt.ahorrado)} de ${D.dinero(mt.objetivo)} (${pct}%).` : `Llevas ${D.dinero(mt.ahorrado)}.`, 'Ese dinero ya no cuenta como libre.'])];
    };
    if (!monto) return [bot('¿Cuánto apartaste?')];
    if (meta) return guardarAbono(meta);
    const m = t.match(/\bpara\s+(?:la\s+|el\s+|mi\s+|una\s+|un\s+)?([a-z0-9ñ ]{2,30})/);
    const nombre = m ? cap(m[1].trim()) : null;
    if (!nombre) return [bot('¿Para qué meta? Escribe por ejemplo: "aparté 500 para la PC".')];
    return [bot(`No tienes una meta "${nombre}". ¿La creo?`, { chips: [chip(`Sí, crear meta "${nombre}"`, () => {
      const mt = D.guardar(db(), 'metas', { nombre, objetivo: 0, ahorrado: 0 });
      const r = guardarAbono(mt);
      return [...r, bot('Ponle cuánto quieres juntar en Más → Metas.')];
    })] })];
  }
  function compraMSI(t, monto, meses, palabras) {
    const ts = D.lista(db(), 'tarjetas');
    if (!ts.length) return [bot('Para meses sin intereses necesitas una tarjeta. Agrégala en Más → Tarjetas de crédito.')];
    const cat = detectarCategoria(palabras) || 'otros';
    const desc = cap(textoOriginal(palabras.filter((w) => !/^(meses|msi|intereses|sin)$/.test(w)))) || 'Compra a meses';
    const guardarMSI = (tid) => {
      const x = D.guardar(db(), 'msi', { tarjeta: tid, descripcion: desc, total: monto, meses, fecha: hoy(), categoria: cat }); cambio();
      recordarDeshacer('la compra a meses', () => D.borrar(db(), 'msi', x.id));
      return [bot([`🗓️ Compra a **${meses} meses sin intereses**: ${desc}`, `Total ${D.dinero(monto)} · ${D.dinero(monto / meses)} al mes en ${D.obtener(db(), 'tarjetas', tid).nombre}.`], { chips: [chip('Borrar', () => { D.borrar(db(), 'msi', x.id); cambio(); return [bot('🗑️ Borré esa compra a meses.')]; }, 'peligro')] })];
    };
    const tj = buscarPago(t, 'tarjeta');
    if (tj) return guardarMSI(tj.id);
    if (ts.length === 1) return guardarMSI(ts[0].id);
    return [bot('¿Con qué tarjeta?', { chips: ts.map((x) => chip(`💳 ${x.nombre}`, () => guardarMSI(x.id))) })];
  }

  function ayuda() {
    return [bot(['Escríbeme normal, por ejemplo:', '• "gasté 120 en un juego" · "me compré unos chetos por 25"', '• "hoy gané 3,000 de Twitch" · "me depositaron 500"',
      '• "¿puedo gastar 150 en una nieve?"', '• "me suscribí a Netflix por 219 al mes" · "cancelé Spotify" · "reactiva Netflix"',
      '• "¿cuánto llevo en microgastos?" · "¿cuánto gasté esta semana en comida?"', '• "¿cuándo corta mi tarjeta?" · "¿qué pagos tengo?"',
      '• "pagué 2,000 de la tarjeta Nu" · "saqué 500 del cajero" · "pasé 300 de BBVA a Mercado Pago"',
      '• "le presté 200 a Juan" · "Juan me pagó 100" · "aparté 500 para la PC"', '• "compré audífonos de 1,200 a 3 meses sin intereses"', '• "borra el último" · "resumen"'])];
  }
  function noEntendi(original) {
    return [bot([`No entendí "${original}".`, 'Prueba con algo como "gasté 120 en tacos" o "gané 500". ¿Qué querías hacer?'], { chips: [
      chip('Era un gasto', () => { espera = null; return reintentar(original, 'gaste'); }),
      chip('Era un ingreso', () => { espera = null; return reintentar(original, 'gane'); }),
      chip('Ver ejemplos', () => ayuda()),
    ] })];
  }
  function reintentar(original, verbo) {
    const t = norm(original); const { monto } = extraerMonto(t);
    if (!monto) { espera = { manejar: (txt) => { const r = extraerMonto(norm(txt)); if (!r.monto) return null; espera = null; return procesar(`${verbo} ${r.monto} ${original}`); } }; return [bot('¿De cuánto fue?')]; }
    return procesar(`${verbo} ${original}`);
  }
  function deshacer() {
    const a = pilaDeshacer.pop();
    if (!a) {
      const ult = D.movimientos(db()).filter((m) => !m.auto).sort((a, b) => (b.u || 0) - (a.u || 0))[0];
      if (!ult) return [bot('No hay nada que borrar.')];
      const copia = D.borrar(db(), 'movimientos', ult.id); cambio();
      return [bot(`🗑️ Borré el último movimiento: ${copia.descripcion || copia.tipo} de ${D.dinero(copia.monto)}.`, { chips: [chip('Deshacer (regresarlo)', () => { D.restaurar(db(), 'movimientos', copia); cambio(); return [bot('Listo, lo regresé.')]; })] })];
    }
    a.fn(); cambio();
    return [bot(`↩️ Deshice ${a.texto}.`)];
  }

  // ───────── Entrada principal ─────────
  function procesar(original) {
    const t0 = norm(original);
    if (!t0) return [];
    mapaOriginal = {};
    for (const w of String(original).split(/\s+/)) { const limpio = w.replace(/[¿?¡!"“”'`´,;:()\[\]{}.]/g, ''); const n = norm(limpio).replace(/[^a-z0-9ñ-]/g, ''); if (n && limpio) mapaOriginal[n] = limpio.toLowerCase(); }
    const esComando = RE_GASTO.test(t0) || RE_INGRESO.test(t0) || RE_CONSULTA.test(t0) || RE_PREGUNTA.test(t0) || /suscri|cancel|reactiv|preste|presto|aparte|ahorre|saque|transferi|pase|deposite|deshac|borra|ayuda/.test(t0);
    if (espera && !esComando) { const r = espera.manejar(original); if (r) return r; }
    if (espera && esComando) espera = null;
    const h = hoy();
    let t = t0;

    if (/^(ayuda|que puedo (decir|hacer|escribir)|comandos|como funciona|ejemplos)\b/.test(t)) return ayuda();
    if (/\b(deshace|deshacer|deshaz)\b|\b(borra|borrar|elimina|eliminar|quita|quitar)\s+(el\s+|lo\s+)?(ultimo|ultima)\b|\bme equivoque\b/.test(t)) return deshacer();
    if (/^(hola|buenas|buenos dias|buen dia|buenas tardes|buenas noches|que onda|hey|que tal)\b/.test(t) && !extraerMonto(t).monto) return [bot(`¡Hola${db().ajustes.nombre ? ' ' + db().ajustes.nombre : ''}! 👋`), ...resumen()];
    if (/^(resumen|como voy|como vamos|estado)\b/.test(t)) return resumen();

    const futuro = RE_CONSULTA.test(t) || /\b(se renueva|vence|termina)\b/.test(t);
    const f = extraerFecha(t, h, futuro); t = f.resto;
    const msi = /\b(msi|meses sin intereses|a \d{1,2} meses)\b/.test(t) ? extraerMSI(t) : null;
    if (msi) t = msi.resto;
    const frecuencia = extraerFrecuencia(t);
    const sinFrec = frecuencia ? quitarFrecuencia(t) : t;
    const { monto, resto } = extraerMonto(sinFrec);
    const pago = buscarPago(t0);
    const palabras = palabrasDescripcion(resto);

    // Suscripciones: cancelar y reactivar
    const sub = buscarSuscripcion(t0);
    const servicio = servicioEn(t0);
    if (/\b(reactiv\w*|volvi a|de nuevo|otra vez|reanude|regrese a)\b/.test(t0) && (sub || servicio)) {
      if (sub) return reactivar(sub);
      return flujoSuscripcion({ nombre: nombreSuscripcionDe(t0, palabras), monto, frecuencia, inicio: f.fecha, pago: pago || undefined });
    }
    if (/\b(cancele|cancelar|cancela|cancelo|di de baja|dar de baja|ya no (voy a )?pag\w*|desactive|quite la suscripcion)\b/.test(t0)) {
      if (sub) return cancelar(sub);
      if (servicio) return [bot(`No tienes ${cap(servicio)} guardada en tus suscripciones.`)];
      const activas = D.lista(db(), 'suscripciones').filter((s) => s.estado === 'activa');
      if (!activas.length) return [bot('No tienes suscripciones activas para cancelar.')];
      return [bot('¿Cuál cancelaste?', { chips: activas.map((s) => chip(s.nombre, () => cancelar(D.obtener(db(), 'suscripciones', s.id)))) })];
    }
    // ¿Puedo gastar?
    if (RE_CONSULTA.test(t0) && !/\b(cuanto|cuando)\b/.test(t0.split(' ')[0])) return consulta({ monto, palabras, pago });
    if (RE_PREGUNTA.test(t0) || /\?$/.test(String(original).trim())) {
      if (!(RE_GASTO.test(t0) && monto && !/^(cuanto|cuando|que|cual)/.test(t0)) && !(RE_INGRESO.test(t0) && monto && !/^(cuanto|cuando|que|cual)/.test(t0))) return preguntas(t0);
    }
    if (/\b(suscribi\w*|inscribi\w*|contrate|suscripcion|membresia)\b/.test(t0) || (servicio && !sub && (RE_GASTO.test(t0) || frecuencia))) {
      if (sub && sub.estado !== 'activa') return [bot(`Ya tenías ${sub.nombre} guardada.`), ...reactivar(sub)];
      if (sub && sub.estado === 'activa' && !monto) return [confirmacionSuscripcion(sub, null)];
      return flujoSuscripcion({ id: sub?.id, nombre: sub?.nombre || nombreSuscripcionDe(t0, palabras), monto: monto || sub?.monto, frecuencia: frecuencia || (servicio ? null : null), inicio: f.fecha || (/\b(suscribi|inscribi|contrate)\w*\b/.test(t0) ? null : null), pago: pago || undefined });
    }

    // Préstamos
    if (/\b(le preste|preste|les preste)\b/.test(t0)) return prestamo(t0, monto, f.fecha, 'meDeben');
    if (/\b(me presto|me prestaron|pedi prestado|me fio|me fiaron)\b/.test(t0)) return prestamo(t0, monto, f.fecha, 'debo');
    if (/\b(me pago|me devolvio|me regreso|me abono|me pagaron)\b/.test(t0)) { const r = abonoPrestamo(t0, monto, 'meDeben'); if (r) return r; }
    if (/\b(le pague a|le devolvi|le regrese|le abone a|le pague)\b/.test(t0)) { const r = abonoPrestamo(t0, monto, 'debo'); if (r) return r; }

    // Pago de tarjeta
    if (/\b(pague|abone|liquide|pagamos|deposite|pago)\b/.test(t0) && (/\btarjeta\b/.test(t0) || (buscarPago(t0, 'tarjeta') && !palabras.filter((w) => !buscarPago(w, 'tarjeta') && w !== 'tarjeta').length))) {
      if (!msi) return pagoTarjeta(t0, monto);
    }
    // Transferencias / cajero
    if (/\b(saque|retire)\b/.test(t0) && /\b(cajero|banco|cuenta|efectivo|de)\b/.test(t0)) return transferencia(t0, monto, 'retiro');
    if (/\b(deposite)\b/.test(t0) && /\befectivo|banco|cuenta|a\b/.test(t0)) return transferencia(t0, monto, 'deposito');
    if (/\b(pase|transferi|movi|traspase|mande)\b/.test(t0) && /\b(de|desde)\b.*\b(a|al)\b/.test(t0) && pagosPosibles().filter((p) => p.tipo === 'cuenta' && new RegExp(`\\b${p.clave}\\b`).test(t0)).length >= 1) return transferencia(t0, monto, 'transferencia');
    // Metas
    if (/\b(aparte|ahorre|guarde|separe|abone a la meta)\b/.test(t0) && /\bpara\b/.test(t0)) return abonoMeta(t0, monto);
    // Meses sin intereses
    if (msi && monto && (RE_GASTO.test(t0) || /\bcompra\b/.test(t0))) return compraMSI(t0, monto, msi.meses, palabras);

    // Ingreso / gasto
    const esIngreso = RE_INGRESO.test(t0) && !/\b(me cobraron|cobraron)\b/.test(t0);
    const esGasto = RE_GASTO.test(t0);
    if (esIngreso && !(esGasto && /\b(pague|compre|gaste)\b/.test(t0))) {
      if (!monto) { espera = { manejar: (txt) => { const r = extraerMonto(norm(txt)); if (!r.monto) return null; espera = null; return registrarIngreso({ monto: r.monto, t: t0, fecha: f.fecha, pago, palabras }); } }; return [bot('¿Cuánto fue?')]; }
      return registrarIngreso({ monto, t: t0, fecha: f.fecha, pago, palabras });
    }
    if (esGasto) {
      if (!monto) { espera = { manejar: (txt) => { const r = extraerMonto(norm(txt)); if (!r.monto) return null; espera = null; return registrarGasto({ monto: r.monto, palabras, fecha: f.fecha, pago }); } }; return [bot(`¿Cuánto gastaste${palabras.length ? ` en ${palabras.join(' ')}` : ''}?`)]; }
      return registrarGasto({ monto, palabras, fecha: f.fecha, pago });
    }
    // "tacos 50" o "50 de tacos": número con algo que se reconoce como categoría → gasto
    if (monto && palabras.length && detectarCategoria(palabras)) return registrarGasto({ monto, palabras, fecha: f.fecha, pago });
    if (monto && palabras.length) {
      return [bot(`¿"${original}" fue un gasto o un ingreso?`, { chips: [
        chip(`Gasto de ${D.dinero(monto)}`, () => registrarGasto({ monto, palabras, fecha: f.fecha, pago })),
        chip(`Ingreso de ${D.dinero(monto)}`, () => registrarIngreso({ monto, t: t0, fecha: f.fecha, pago, palabras })),
      ] })];
    }
    return noEntendi(original);
  }

  function tocar(id, valor) {
    const fn = manejadores[id];
    if (!fn) return [bot('Ese botón ya no está disponible. Escríbelo de nuevo, por favor.')];
    const r = valor !== undefined ? fn(valor) : fn();
    return r || [];
  }
  function saludo() {
    const d = db(); const h = hoy(); const hora = new Date().getHours();
    const sal = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
    const lineas = [`${sal}${d.ajustes.nombre ? ', ' + d.ajustes.nombre : ''} 👋 ¿Qué gastaste o ganaste hoy?`];
    const ev = D.proximosEventos(d, h, Number(d.ajustes.avisosDiasAntes) || 3);
    for (const e of ev.slice(0, 4)) lineas.push(`📅 ${cap(D.fechaBonita(e.fecha, h))}: ${e.texto}${e.monto ? ` — ten listos ${D.dinero(e.monto)}` : ''}`);
    return [bot(lineas, { chips: [chip('¿Cuánto llevo en microgastos?', () => procesar('cuanto llevo en microgastos')), chip('Resumen del mes', () => resumen()), chip('Próximos pagos', () => procesar('que pagos tengo')), chip('Ejemplos de lo que entiendo', () => ayuda())] })];
  }
  function avisoAutomaticos(hechos) { return hechos.length ? [bot(hechos.map((x) => `🔔 ${x}`))] : []; }
  function limpiarManejadores() { manejadores = {}; }

  return { procesar, tocar, saludo, avisoAutomaticos, limpiarManejadores, get esperando() { return !!espera; } };
}
