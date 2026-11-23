// Economua — datos y cálculos (sin pantalla). Lo usan la app, el chat y las pruebas.

export const COLECCIONES = ['cuentas', 'tarjetas', 'msi', 'suscripciones', 'fijos', 'movimientos',
  'negocios', 'prestamos', 'metas', 'categorias', 'fuentes'];

// ───────── Fechas (siempre texto 'AAAA-MM-DD', hora local) ─────────
const p2 = (n) => String(n).padStart(2, '0');
export function hoyISO(d = new Date()) { return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; }
export function aFecha(iso) { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); }
export function sumarDias(iso, n) { const f = aFecha(iso); f.setDate(f.getDate() + n); return hoyISO(f); }
export function diasEnMes(a, m) { return new Date(a, m, 0).getDate(); } // m: 1..12
export function diasEntre(desde, hasta) { return Math.round((aFecha(hasta) - aFecha(desde)) / 86400000); }
export function mesDe(iso) { return iso.slice(0, 7); }
export function finDeMes(iso) { const [a, m] = iso.split('-').map(Number); return `${a}-${p2(m)}-${p2(diasEnMes(a, m))}`; }
// Suma meses respetando el día original (31 → 30/28 si el mes es más corto).
export function sumarMeses(iso, n, diaAncla) {
  const [a, m, d] = iso.split('-').map(Number);
  const dia = diaAncla || d;
  const total = (a * 12 + (m - 1)) + n;
  const na = Math.floor(total / 12), nm = (total % 12) + 1;
  return `${na}-${p2(nm)}-${p2(Math.min(dia, diasEnMes(na, nm)))}`;
}
export function fechaConDia(anio, mes, dia) { return `${anio}-${p2(mes)}-${p2(Math.min(dia, diasEnMes(anio, mes)))}`; }
// Próxima fecha (>= hoy) que cae en el día indicado del mes.
export function proximoDia(dia, hoy = hoyISO()) {
  const [a, m] = hoy.split('-').map(Number);
  let f = fechaConDia(a, m, dia);
  if (f < hoy) { const s = sumarMeses(`${a}-${p2(m)}-01`, 1); const [a2, m2] = s.split('-').map(Number); f = fechaConDia(a2, m2, dia); }
  return f;
}
export function anteriorDia(dia, hoy = hoyISO()) { // última fecha (<= hoy) con ese día
  const [a, m] = hoy.split('-').map(Number);
  let f = fechaConDia(a, m, dia);
  if (f > hoy) { const s = sumarMeses(`${a}-${p2(m)}-01`, -1); const [a2, m2] = s.split('-').map(Number); f = fechaConDia(a2, m2, dia); }
  return f;
}
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export { MESES, DIAS };
export function fechaBonita(iso, hoy = hoyISO()) {
  if (!iso) return '';
  if (iso === hoy) return 'hoy';
  if (iso === sumarDias(hoy, -1)) return 'ayer';
  if (iso === sumarDias(hoy, 1)) return 'mañana';
  const f = aFecha(iso);
  const base = `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}`;
  return f.getFullYear() !== aFecha(hoy).getFullYear() ? `${base} de ${f.getFullYear()}` : base;
}
export function nombreMes(mes) { const [a, m] = mes.split('-').map(Number); return `${MESES[m - 1]} ${a}`; }

// ───────── Dinero ─────────
const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 2 });
export function dinero(n) { return fmt.format(Math.round((Number(n) || 0) * 100) / 100); }
export const redondear = (n, a = 1) => Math.round(n / a) * a;

// ───────── Identificadores ─────────
export function nuevoId(prefijo = 'r') { return `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }

// ───────── Base inicial ─────────
export const CATEGORIAS_BASE = [
  ['comida', 'Comida', '🍔', 'comida tacos taco torta tortas pizza hamburguesa hamburguesas sushi restaurante restaurant desayuno almuerzo cena antojitos quesadilla quesadillas gorditas tamales tamal pollo alitas boneless hotdog hotdogs elote esquite birria pozole menudo burrito burritos comer lonche lunch mcdonalds kfc dominos subway carnitas pastor propina propinas'],
  ['botanas', 'Botanas y dulces', '🍫', 'chetos cheetos sabritas papitas papas dulce dulces chocolate chocolates galletas galleta refresco refrescos coca cocacola soda nieve nieves helado helados paleta paletas chicle chicles botana botanas doritos takis gansito pan panes bolillo concha donas dona jugo agua aguas gomitas mazapan pinguinos chips churros raspado'],
  ['cafe', 'Café', '☕', 'cafe cafecito starbucks frappe latte capuchino capuccino americano te'],
  ['super', 'Súper y tiendita', '🛒', 'super supermercado despensa mandado walmart soriana chedraui bodega costco sams tienda tiendita oxxo abarrotes seven 7eleven mercado leche huevo huevos tortillas frutas verduras carne'],
  ['transporte', 'Transporte', '🚗', 'uber didi taxi gasolina gas camion metro metrobus pasaje pasajes estacionamiento caseta casetas transporte combi micro peaje'],
  ['juegos', 'Juegos', '🎮', 'juego juegos videojuego videojuegos steam xbox playstation ps5 ps4 nintendo switch minecraft robux roblox pavos fortnite gemas skin skins dlc pase battlepass minecoins epic'],
  ['entretenimiento', 'Entretenimiento', '🎬', 'cine pelicula peliculas fiesta concierto boletos boleto salida antro bar cerveza cervezas chelas chela alcohol bebidas karaoke feria'],
  ['ropa', 'Ropa', '👕', 'ropa playera playeras camisa pantalon pantalones tenis zapatos sudadera chamarra gorra calcetines short shorts'],
  ['salud', 'Salud', '💊', 'farmacia medicina medicinas medicamento doctor medico consulta dentista analisis vitaminas lentes'],
  ['hogar', 'Hogar y servicios', '🏠', 'renta luz agua gas internet cfe telmex totalplay izzi megacable predial mantenimiento limpieza detergente jabon focos'],
  ['celular', 'Celular', '📱', 'recarga recargas saldo plan telcel att movistar bait datos'],
  ['tecnologia', 'Tecnología', '💻', 'pc computadora laptop cable cables audifonos mouse teclado monitor microfono camara memoria usb disco ssd grafica tarjeta-grafica celular-nuevo cargador'],
  ['suscripciones', 'Suscripciones', '🔁', 'suscripcion suscripciones membresia mensualidad'],
  ['streaming', 'Mi canal y negocio', '🎥', 'stream streaming obs programa licencia dibujo dibujos arte comision comisiones publicidad anuncio anuncios promocion dominio hosting materiales'],
  ['regalos', 'Regalos', '🎁', 'regalo regalos cumpleanos detalle flores'],
  ['mascotas', 'Mascotas', '🐾', 'perro gato mascota croquetas veterinario'],
  ['personal', 'Cuidado personal', '💈', 'corte peluqueria barberia shampoo crema perfume desodorante'],
  ['educacion', 'Educación', '📚', 'curso cursos libro libros escuela colegiatura clase clases'],
  ['otros', 'Otros', '📦', ''],
];
// Categorías que nunca cuentan como microgasto (son gastos planeados).
export const NO_MICRO = new Set(['hogar', 'suscripciones', 'salud', 'educacion']);

export const FUENTES_BASE = [
  ['twitch', 'Twitch', 'twitch bits subs'], ['kick', 'Kick', 'kick'], ['tiktok', 'TikTok', 'tiktok tik tok regalos'],
  ['patreon', 'Patreon', 'patreon'], ['paypal', 'PayPal / donaciones', 'paypal donacion donaciones donaron dono'],
  ['ventas', 'Ventas de mis programas', 'venta vendi ventas wattoon programa licencia llave renta'],
  ['trabajo', 'Trabajo / sueldo', 'sueldo nomina quincena trabajo chamba salario'],
  ['otros-ing', 'Otros ingresos', ''],
];

export const AJUSTES_BASE = {
  nombre: '', umbralMicroModo: 'auto', umbralMicro: 150, topeMicroModo: 'auto', topeMicroPct: 5, topeMicro: 600,
  avisosDiasAntes: 3, cantidadesEnAvisos: false, bloqueoMinutos: 5, cuentaPredeterminada: 'cta-efectivo',
};

export function nuevaBase() {
  const ahora = Date.now();
  const db = { meta: { v: 1, creado: ahora, paquetes: [] }, col: {}, ajustes: { ...AJUSTES_BASE, u: ahora }, aprendido: {} };
  for (const c of COLECCIONES) db.col[c] = {};
  for (const [id, nombre, emoji, palabras] of CATEGORIAS_BASE)
    db.col.categorias[id] = { id, nombre, emoji, palabras: palabras.split(/\s+/).filter(Boolean), u: ahora };
  for (const [id, nombre, palabras] of FUENTES_BASE)
    db.col.fuentes[id] = { id, nombre, palabras: palabras.split(/\s+/).filter(Boolean), u: ahora };
  db.col.cuentas['cta-efectivo'] = { id: 'cta-efectivo', nombre: 'Efectivo', tipo: 'efectivo', saldoInicial: 0, u: ahora };
  return db;
}

// Pone todos los registros con marca 1 (para que cualquier dato real gane al unir).
export function envejecer(db) {
  for (const c of COLECCIONES) for (const r of Object.values(db.col[c])) r.u = 1;
  db.ajustes.u = 1;
  return db;
}

// Repara una base vieja o incompleta (por si se agregan cosas en versiones nuevas).
export function normalizarBase(db) {
  db.meta = db.meta || { v: 1, creado: Date.now(), paquetes: [] };
  db.meta.paquetes = db.meta.paquetes || [];
  db.col = db.col || {};
  for (const c of COLECCIONES) db.col[c] = db.col[c] || {};
  db.ajustes = { ...AJUSTES_BASE, ...(db.ajustes || {}) };
  db.aprendido = db.aprendido || {};
  return db;
}

// ───────── Guardar / borrar con marca de tiempo (para sincronizar sin perder nada) ─────────
let ultimaMarca = 0;
function marca(prev) { let t = Date.now(); if (t <= ultimaMarca) t = ultimaMarca + 1; if (prev && t <= prev) t = prev + 1; ultimaMarca = t; return t; }

export function lista(db, col) { return Object.values(db.col[col] || {}).filter((r) => !r.del); }
export function obtener(db, col, id) { const r = db.col[col]?.[id]; return r && !r.del ? r : null; }
export function guardar(db, col, rec) {
  if (!rec.id) rec.id = nuevoId(col.slice(0, 3));
  const prev = db.col[col][rec.id];
  rec.u = marca(prev?.u);
  delete rec.del;
  db.col[col][rec.id] = rec;
  return rec;
}
export function borrar(db, col, id) {
  const prev = db.col[col][id];
  if (!prev) return null;
  const copia = { ...prev };
  db.col[col][id] = { id, del: true, u: marca(prev.u) };
  return copia;
}
export function restaurar(db, col, copia) { return guardar(db, col, { ...copia }); }
export function guardarAjustes(db, cambios) { db.ajustes = { ...db.ajustes, ...cambios, u: marca(db.ajustes.u) }; }
export function aprender(db, palabra, categoria) { db.aprendido[palabra] = { cat: categoria, u: marca(db.aprendido[palabra]?.u) }; }

// Une dos bases: en cada registro gana el cambio más nuevo.
export function unir(a, b) {
  const r = normalizarBase(JSON.parse(JSON.stringify(a)));
  b = normalizarBase(b);
  for (const c of COLECCIONES) {
    for (const [id, rec] of Object.entries(b.col[c])) {
      const actual = r.col[c][id];
      if (!actual || (rec.u || 0) > (actual.u || 0)) r.col[c][id] = rec;
    }
  }
  if ((b.ajustes.u || 0) > (r.ajustes.u || 0)) r.ajustes = { ...b.ajustes };
  for (const [k, v] of Object.entries(b.aprendido)) if (!r.aprendido[k] || v.u > r.aprendido[k].u) r.aprendido[k] = v;
  r.meta.paquetes = Array.from(new Set([...r.meta.paquetes, ...b.meta.paquetes])).slice(-500);
  return r;
}
// Solo los registros que cambiaron desde una marca (para mandar paquetes pequeños desde el cel).
export function cambiosDesde(db, desde) {
  const p = { meta: { v: 1, paquetes: [] }, col: {}, ajustes: { u: 0 }, aprendido: {} };
  for (const c of COLECCIONES) {
    p.col[c] = {};
    for (const [id, rec] of Object.entries(db.col[c])) if ((rec.u || 0) > desde) p.col[c][id] = rec;
  }
  if ((db.ajustes.u || 0) > desde) p.ajustes = db.ajustes;
  for (const [k, v] of Object.entries(db.aprendido)) if (v.u > desde) p.aprendido[k] = v;
  return p;
}
export function ultimaMarcaDe(db) {
  let m = db.ajustes.u || 0;
  for (const c of COLECCIONES) for (const r of Object.values(db.col[c])) if ((r.u || 0) > m) m = r.u;
  for (const v of Object.values(db.aprendido)) if (v.u > m) m = v.u;
  return m;
}

// ───────── Saldos ─────────
export function movimientos(db) { return lista(db, 'movimientos'); }

export function saldoCuenta(db, id) {
  const c = obtener(db, 'cuentas', id); if (!c) return 0;
  let s = Number(c.saldoInicial) || 0;
  for (const m of movimientos(db)) {
    const v = Number(m.monto) || 0;
    if (m.tipo === 'ingreso' && m.cuenta === id) s += v;
    if (m.tipo === 'gasto' && m.pagoTipo !== 'tarjeta' && m.cuenta === id) s -= v;
    if (m.tipo === 'transferencia') { if (m.cuenta === id) s -= v; if (m.destino === id) s += v; }
    if (m.tipo === 'pagoTarjeta' && m.cuenta === id) s -= v;
  }
  for (const p of lista(db, 'prestamos')) {
    if (p.cuenta === id) s += p.direccion === 'meDeben' ? -(Number(p.monto) || 0) : (Number(p.monto) || 0);
    for (const ab of p.abonos || []) if (ab.cuenta === id) s += p.direccion === 'meDeben' ? (Number(ab.monto) || 0) : -(Number(ab.monto) || 0);
  }
  return s;
}
export function saldoTotal(db) { return lista(db, 'cuentas').reduce((t, c) => t + saldoCuenta(db, c.id), 0); }
export const esAhorro = (c) => c.tipo === 'ahorro';
export function saldoDisponible(db) { return lista(db, 'cuentas').filter((c) => !esAhorro(c)).reduce((t, c) => t + saldoCuenta(db, c.id), 0); }
export function saldoAhorrado(db) { return lista(db, 'cuentas').filter(esAhorro).reduce((t, c) => t + saldoCuenta(db, c.id), 0); }

// ───────── Bancos: cada banco con su dinero disponible, sus ahorros y su crédito ─────────
export function bancoDe(r) { return (r.banco || '').trim() || (r.tipo === 'efectivo' ? 'Efectivo' : r.nombre); }
export function bancos(db) {
  const mapa = new Map();
  const grupo = (nombre) => { const k = nombre.toLowerCase(); if (!mapa.has(k)) mapa.set(k, { nombre, cuentas: [], tarjetas: [], disponible: 0, ahorrado: 0, deuda: 0, limite: 0 }); return mapa.get(k); };
  for (const c of lista(db, 'cuentas')) { const g = grupo(bancoDe(c)); const s = saldoCuenta(db, c.id); g.cuentas.push({ ...c, saldo: s }); if (esAhorro(c)) g.ahorrado += s; else g.disponible += s; }
  for (const t of lista(db, 'tarjetas')) { const g = grupo(bancoDe(t)); const d = deudaTarjeta(db, t.id); g.tarjetas.push({ ...t, deuda: d }); g.deuda += Math.max(0, d); g.limite += Number(t.limite) || 0; }
  const out = [...mapa.values()].map((g) => ({ ...g, neto: g.disponible + g.ahorrado - g.deuda }));
  return out.sort((a, b) => (a.nombre === 'Efectivo') - (b.nombre === 'Efectivo') || (b.disponible + b.ahorrado + b.deuda) - (a.disponible + a.ahorrado + a.deuda) || a.nombre.localeCompare(b.nombre));
}
// Entró y salió este mes por banco (para saber a dónde se va el dinero)
export function movimientoBanco(db, banco, mes) {
  const ids = new Set([...lista(db, 'cuentas').filter((c) => bancoDe(c).toLowerCase() === banco.toLowerCase()).map((c) => c.id), ...lista(db, 'tarjetas').filter((t) => bancoDe(t).toLowerCase() === banco.toLowerCase()).map((t) => t.id)]);
  let entro = 0, salio = 0; const cats = {};
  for (const m of movimientos(db)) {
    if (mesDe(m.fecha || '') !== mes) continue;
    const v = Number(m.monto) || 0;
    if (m.tipo === 'ingreso' && ids.has(m.cuenta)) entro += v;
    if (m.tipo === 'gasto' && ids.has(m.cuenta)) { salio += v; cats[m.categoria || 'otros'] = (cats[m.categoria || 'otros'] || 0) + v; }
  }
  return { entro, salio, categorias: Object.entries(cats).sort((a, b) => b[1] - a[1]) };
}

export function deudaTarjeta(db, id) {
  const t = obtener(db, 'tarjetas', id); if (!t) return 0;
  let d = Number(t.deudaInicial) || 0;
  for (const m of movimientos(db)) {
    const v = Number(m.monto) || 0;
    if (m.tipo === 'gasto' && m.pagoTipo === 'tarjeta' && m.cuenta === id) d += v;
    if (m.tipo === 'pagoTarjeta' && m.destino === id) d -= v;
  }
  for (const x of lista(db, 'msi')) if (x.tarjeta === id) d += Number(x.total) || 0;
  return d;
}
// Mensualidades de MSI que ya llegaron a corte desde la compra.
export function msiEstado(db, x, hoy = hoyISO()) {
  const t = obtener(db, 'tarjetas', x.tarjeta);
  const meses = Math.max(1, Number(x.meses) || 1);
  const mensualidad = (Number(x.total) || 0) / meses;
  let facturadas = 0;
  if (t && x.fecha) {
    let corte = proximoDia(Number(t.diaCorte) || 1, sumarDias(x.fecha, 1));
    while (corte <= hoy && facturadas < meses) { facturadas++; corte = sumarMeses(corte, 1, Number(t.diaCorte) || 1); }
  }
  return { mensualidad, facturadas, restantes: meses - facturadas, pendiente: mensualidad * (meses - facturadas), terminado: facturadas >= meses };
}
export function msiPorFacturar(db, tarjetaId, hoy = hoyISO()) {
  return lista(db, 'msi').filter((x) => x.tarjeta === tarjetaId).reduce((s, x) => s + msiEstado(db, x, hoy).pendiente, 0);
}
export function pagoSinIntereses(db, id, hoy = hoyISO()) { return Math.max(0, deudaTarjeta(db, id) - msiPorFacturar(db, id, hoy)); }
export function deudaTotalTarjetas(db) { return lista(db, 'tarjetas').reduce((s, t) => s + Math.max(0, deudaTarjeta(db, t.id)), 0); }
export function prestamoSaldo(p) { return (Number(p.monto) || 0) - (p.abonos || []).reduce((s, a) => s + (Number(a.monto) || 0), 0); }
export function totalesPrestamos(db) {
  let meDeben = 0, debo = 0;
  for (const p of lista(db, 'prestamos')) { const s = Math.max(0, prestamoSaldo(p)); if (p.direccion === 'meDeben') meDeben += s; else debo += s; }
  return { meDeben, debo };
}
export function totalApartado(db) { return lista(db, 'metas').reduce((s, m) => s + (Number(m.ahorrado) || 0), 0); }
export function patrimonio(db) {
  const pr = totalesPrestamos(db);
  return saldoTotal(db) + pr.meDeben - deudaTotalTarjetas(db) - pr.debo;
}

// ───────── Estadísticas ─────────
export function delMes(db, mes, tipo) { return movimientos(db).filter((m) => m.tipo === tipo && mesDe(m.fecha) === mes); }
export function sumar(arr) { return arr.reduce((s, m) => s + (Number(m.monto) || 0), 0); }
export function ingresoReferencia(db, hoy = hoyISO()) {
  const mes = mesDe(hoy); const valores = [];
  for (let i = 1; i <= 3; i++) { const v = sumar(delMes(db, mesDe(sumarMeses(mes + '-01', -i)), 'ingreso')); if (v > 0) valores.push(v); }
  // Solo meses completos: con medio mes los topes saldrían demasiado bajos.
  return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
}
export function umbralMicro(db, hoy = hoyISO()) {
  const a = db.ajustes;
  if (a.umbralMicroModo === 'manual') return Number(a.umbralMicro) || 150;
  const ref = ingresoReferencia(db, hoy);
  if (!ref) return 150;
  return Math.min(300, Math.max(50, redondear(ref * 0.015, 10)));
}
export function topeMicro(db, hoy = hoyISO()) {
  const a = db.ajustes;
  if (a.topeMicroModo === 'manual') return Number(a.topeMicro) || 600;
  const ref = ingresoReferencia(db, hoy);
  if (!ref) return 600;
  return Math.max(100, redondear(ref * (Number(a.topeMicroPct) || 5) / 100, 50));
}
export function esMicro(db, m, hoy) {
  if (m.tipo !== 'gasto') return false;
  if (m.micro === true) return true;
  if (m.micro === false) return false;
  if (m.auto || NO_MICRO.has(m.categoria)) return false;
  return (Number(m.monto) || 0) <= umbralMicro(db, hoy);
}
export function microDelMes(db, mes, hoy = hoyISO()) { return delMes(db, mes, 'gasto').filter((m) => esMicro(db, m, hoy)); }
export function microDeSemana(db, hoy = hoyISO()) {
  const f = aFecha(hoy); const dia = (f.getDay() + 6) % 7; const lunes = sumarDias(hoy, -dia);
  return movimientos(db).filter((m) => m.tipo === 'gasto' && m.fecha >= lunes && m.fecha <= hoy && esMicro(db, m, hoy));
}
export function gastosPorCategoria(db, mes) {
  const r = {};
  for (const m of delMes(db, mes, 'gasto')) r[m.categoria || 'otros'] = (r[m.categoria || 'otros'] || 0) + (Number(m.monto) || 0);
  for (const x of lista(db, 'msi')) if (x.fecha && mesDe(x.fecha) === mes) r[x.categoria || 'otros'] = (r[x.categoria || 'otros'] || 0) + (Number(x.total) || 0);
  return Object.entries(r).sort((a, b) => b[1] - a[1]);
}
export function ingresosPorFuente(db, mes) {
  const r = {};
  for (const m of delMes(db, mes, 'ingreso')) r[m.fuente || 'otros-ing'] = (r[m.fuente || 'otros-ing'] || 0) + (Number(m.monto) || 0);
  return Object.entries(r).sort((a, b) => b[1] - a[1]);
}
export function historialMeses(db, n = 6, hoy = hoyISO()) {
  const out = []; const mes = mesDe(hoy);
  for (let i = n - 1; i >= 0; i--) {
    const m = mesDe(sumarMeses(mes + '-01', -i));
    const msiMes = lista(db, 'msi').filter((x) => x.fecha && mesDe(x.fecha) === m).reduce((s, x) => s + (Number(x.total) || 0), 0);
    out.push({ mes: m, ingresos: sumar(delMes(db, m, 'ingreso')), gastos: sumar(delMes(db, m, 'gasto')) + msiMes });
  }
  return out;
}

// ───────── Suscripciones ─────────
export const FRECUENCIAS = { mensual: 'Cada mes', anual: 'Cada año', semanal: 'Cada semana', quincenal: 'Cada 15 días', trimestral: 'Cada 3 meses' };
export function siguientePeriodo(iso, frecuencia, diaAncla) {
  switch (frecuencia) {
    case 'anual': return sumarMeses(iso, 12, diaAncla);
    case 'trimestral': return sumarMeses(iso, 3, diaAncla);
    case 'semanal': return sumarDias(iso, 7);
    case 'quincenal': return sumarDias(iso, 15);
    default: return sumarMeses(iso, 1, diaAncla);
  }
}
export function diaAnclaDe(s) { return Number((s.inicio || s.proxima || '2000-01-01').slice(8, 10)); }
export function estadoSuscripcion(s, hoy = hoyISO()) {
  if (s.estado === 'terminada') return { texto: 'Terminada', clase: 'gris' };
  const dias = diasEntre(hoy, s.proxima);
  if (s.estado === 'cancelada') return { texto: dias >= 0 ? `Cancelada · termina ${fechaBonita(s.proxima, hoy)}` : 'Terminada', clase: 'amarillo' };
  return { texto: `Se renueva ${fechaBonita(s.proxima, hoy)}${dias > 1 ? ` (en ${dias} días)` : ''}`, clase: dias <= 3 ? 'amarillo' : 'verde' };
}
export function pagoDeSuscripcion(db, s, fecha, auto) {
  const id = auto ? `auto-sus-${s.id}-${fecha}` : nuevoId('mov');
  if (db.col.movimientos[id]) return null; // ya registrado (no duplicar entre cel y PC)
  return guardar(db, 'movimientos', {
    id, tipo: 'gasto', monto: Number(s.monto) || 0, fecha, categoria: 'suscripciones', descripcion: s.nombre,
    cuenta: s.pagaCon || db.ajustes.cuentaPredeterminada, pagoTipo: s.pagaTipo || 'cuenta', auto: true, suscripcion: s.id,
  });
}
export function costoMensualSuscripciones(db) {
  const factor = { mensual: 1, anual: 1 / 12, semanal: 52 / 12, quincenal: 2, trimestral: 1 / 3 };
  return lista(db, 'suscripciones').filter((s) => s.estado === 'activa').reduce((t, s) => t + (Number(s.monto) || 0) * (factor[s.frecuencia] ?? 1), 0);
}

// Cosas automáticas al abrir: renovar suscripciones, terminar canceladas, registrar gastos fijos.
export function procesarAutomaticos(db, hoy = hoyISO()) {
  const hechos = [];
  for (const s of lista(db, 'suscripciones')) {
    if (!s.proxima) continue;
    let guardarS = false; let vueltas = 0;
    while (s.proxima <= hoy && vueltas < 60) {
      vueltas++;
      if (s.estado === 'activa' && s.renueva !== false) {
        const m = pagoDeSuscripcion(db, s, s.proxima, true);
        if (m) hechos.push(`Se renovó ${s.nombre}: ${dinero(s.monto)}`);
        s.proxima = siguientePeriodo(s.proxima, s.frecuencia, diaAnclaDe(s)); guardarS = true;
      } else if (s.estado === 'activa' || s.estado === 'cancelada') {
        if (s.proxima <= hoy) { s.estado = 'terminada'; guardarS = true; hechos.push(`Terminó tu suscripción a ${s.nombre}`); }
        break;
      } else break;
    }
    if (guardarS) guardar(db, 'suscripciones', s);
  }
  const mes = mesDe(hoy); const [a, mm] = hoy.split('-').map(Number);
  for (const f of lista(db, 'fijos')) {
    if (f.auto === false) continue;
    const dia = fechaConDia(a, mm, Number(f.dia) || 1);
    if (dia > hoy) continue;
    if (f.desde && dia < f.desde) continue;
    const id = `auto-fijo-${f.id}-${mes}`;
    if (db.col.movimientos[id]) continue;
    guardar(db, 'movimientos', { id, tipo: 'gasto', monto: Number(f.monto) || 0, fecha: dia, categoria: f.categoria || 'hogar',
      descripcion: f.nombre, cuenta: f.pagaCon || db.ajustes.cuentaPredeterminada, pagoTipo: f.pagaTipo || 'cuenta', auto: true, fijo: f.id });
    hechos.push(`Registré tu gasto fijo ${f.nombre}: ${dinero(f.monto)}`);
  }
  return hechos;
}
export function fijoPagadoEsteMes(db, f, hoy = hoyISO()) {
  const mes = mesDe(hoy);
  return movimientos(db).some((m) => m.fijo === f.id && mesDe(m.fecha) === mes);
}

// ───────── Lo que falta pagar y lo libre ─────────
export function porPagar(db, hoy = hoyISO()) {
  const items = []; const fin = finDeMes(hoy); const en31 = sumarDias(hoy, 31);
  for (const f of lista(db, 'fijos')) if (!fijoPagadoEsteMes(db, f, hoy)) items.push({ tipo: 'fijo', nombre: f.nombre, monto: Number(f.monto) || 0, fecha: fechaConDia(...hoy.split('-').slice(0, 2).map(Number), Number(f.dia) || 1) });
  for (const s of lista(db, 'suscripciones')) {
    if (s.estado !== 'activa' || s.renueva === false || !s.proxima) continue;
    if (s.pagaTipo === 'tarjeta') continue; // se suma a la tarjeta
    if (s.proxima > hoy && s.proxima <= fin) items.push({ tipo: 'suscripcion', nombre: s.nombre, monto: Number(s.monto) || 0, fecha: s.proxima });
  }
  for (const t of lista(db, 'tarjetas')) {
    const pago = pagoSinIntereses(db, t.id, hoy);
    const fecha = proximoDia(Number(t.diaPago) || 1, hoy);
    if (pago > 0 && fecha <= en31) items.push({ tipo: 'tarjeta', nombre: t.nombre, monto: pago, fecha });
  }
  items.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return { items, total: items.reduce((s, i) => s + i.monto, 0) };
}
// Lo libre no cuenta tus ahorros (ese dinero es para guardar, no para gastar)
export function dineroLibre(db, hoy = hoyISO()) { return saldoDisponible(db) - porPagar(db, hoy).total - totalApartado(db); }

// ───────── ¿Puedo gastar? ─────────
export function consultarGasto(db, monto, categoria, hoy = hoyISO()) {
  const umbral = umbralMicro(db, hoy), tope = topeMicro(db, hoy);
  const microMes = sumar(microDelMes(db, mesDe(hoy), hoy));
  const libre = dineroLibre(db, hoy);
  const micro = monto <= umbral && !NO_MICRO.has(categoria);
  const diasRest = diasEntre(hoy, finDeMes(hoy)) + 1;
  const lineas = []; let nivel, titulo, sugerencia = null;
  const sinDatos = lista(db, 'cuentas').every((c) => saldoCuenta(db, c.id) === 0) && movimientos(db).length === 0;
  if (sinDatos) {
    return { nivel: 'amarillo', titulo: 'Todavía no tengo tus números', lineas: ['Pon tus cuentas con su saldo y tus ingresos para poder decirte si te conviene.'], micro, sugerencia: null };
  }
  if (libre <= 0) {
    nivel = 'rojo'; titulo = 'No te lo recomiendo';
    lineas.push(`Ahora mismo no tienes dinero libre: tus pagos próximos y tus apartados ya ocupan todo lo que tienes (te faltan ${dinero(-libre)}).`);
  } else if (monto > libre) {
    nivel = 'rojo'; titulo = 'No te lo recomiendo';
    lineas.push(`Tienes ${dinero(libre)} libres después de tus pagos próximos. Con este gasto te faltarían ${dinero(monto - libre)} para cubrirlos.`);
    sugerencia = Math.min(umbral, redondear(libre * 0.1, 10));
  } else if (micro) {
    const nuevo = microMes + monto;
    lineas.push(`Es un microgasto (hasta ${dinero(umbral)}).`);
    if (nuevo <= tope * 0.8) { nivel = 'verde'; titulo = 'Sí puedes'; lineas.push(`Llevarías ${dinero(nuevo)} de ${dinero(tope)} de microgastos este mes.`); }
    else if (nuevo <= tope) { nivel = 'amarillo'; titulo = 'Puedes, pero ya vas cerca del tope'; lineas.push(`Llevarías ${dinero(nuevo)} de ${dinero(tope)} de microgastos este mes.`); }
    else { nivel = 'rojo'; titulo = 'Mejor no'; lineas.push(`Te pasarías de tu tope de microgastos (${dinero(tope)}) por ${dinero(nuevo - tope)}. Ya llevas ${dinero(microMes)}.`); sugerencia = Math.max(0, tope - microMes); }
    if (nivel !== 'rojo' && diasRest > 1) { const porDia = (tope - nuevo) / diasRest; lineas.push(`Para llegar bien a fin de mes: unos ${dinero(Math.max(0, porDia))} diarios en microgastos.`); }
  } else {
    const pct = monto / libre;
    lineas.push(`Esto ya no es microgasto (más de ${dinero(umbral)}).`);
    if (pct <= 0.1) { nivel = 'verde'; titulo = 'Sí puedes'; lineas.push(`Se lleva el ${Math.round(pct * 100)}% de tu dinero libre; te quedarían ${dinero(libre - monto)}.`); }
    else if (pct <= 0.3) { nivel = 'amarillo'; titulo = 'Piénsalo'; lineas.push(`Se lleva el ${Math.round(pct * 100)}% de tu dinero libre (${dinero(libre)}). Te quedarían ${dinero(libre - monto)}.`); }
    else { nivel = 'rojo'; titulo = 'No te lo recomiendo'; lineas.push(`Se lleva el ${Math.round(pct * 100)}% de tu dinero libre (${dinero(libre)}).`); sugerencia = Math.max(umbral, redondear(libre * 0.1, 10)); }
  }
  if (sugerencia) lineas.push(`Si es un gusto, te recomiendo no gastar más de ${dinero(sugerencia)}.`);
  return { nivel, titulo, lineas, micro, sugerencia, libre, microMes, tope, umbral };
}

// ───────── Avisos (fechas de corte, pagos, renovaciones) ─────────
export function avisos(db, hoy = hoyISO(), dias = 40) {
  const antes = Number(db.ajustes.avisosDiasAntes) || 3; const fin = sumarDias(hoy, dias); const out = [];
  const conMonto = db.ajustes.cantidadesEnAvisos;
  const agregar = (fechaEvento, id, titulo, detalle, monto) => {
    for (const d of [antes, 1, 0]) {
      const f = sumarDias(fechaEvento, -d);
      if (f < hoy || f > fin) continue;
      const cuando = d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`;
      out.push({ id: `${id}-${fechaEvento}-${d}`, fecha: f, evento: fechaEvento, titulo: `${titulo} ${cuando}`, texto: detalle + (conMonto && monto ? ` · ${dinero(monto)}` : ''), monto });
    }
  };
  for (const t of lista(db, 'tarjetas')) {
    let c = proximoDia(Number(t.diaCorte) || 1, hoy);
    while (c <= sumarDias(fin, antes)) { agregar(c, `corte-${t.id}`, `Corte de ${t.nombre}`, 'Fecha de corte de tu tarjeta', deudaTarjeta(db, t.id)); c = sumarMeses(c, 1, Number(t.diaCorte) || 1); }
    let p = proximoDia(Number(t.diaPago) || 1, hoy);
    while (p <= sumarDias(fin, antes)) { agregar(p, `pago-${t.id}`, `Pago de ${t.nombre}`, 'Paga para no generar intereses', pagoSinIntereses(db, t.id, hoy)); p = sumarMeses(p, 1, Number(t.diaPago) || 1); }
  }
  for (const s of lista(db, 'suscripciones')) {
    if (!s.proxima || s.estado === 'terminada') continue;
    if (s.estado === 'cancelada' || s.renueva === false) agregar(s.proxima, `fin-${s.id}`, `${s.nombre} termina`, 'Tu suscripción termina', null);
    else agregar(s.proxima, `sus-${s.id}`, `${s.nombre} se renueva`, 'Ten listo el dinero de la renovación', s.monto);
  }
  for (const f of lista(db, 'fijos')) {
    let d = proximoDia(Number(f.dia) || 1, hoy);
    while (d <= sumarDias(fin, antes)) { agregar(d, `fijo-${f.id}`, `Pago de ${f.nombre}`, 'Gasto fijo del mes', f.monto); d = sumarMeses(d, 1, Number(f.dia) || 1); }
  }
  out.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.evento.localeCompare(b.evento));
  return out;
}

// Próximos eventos de pago (para el chat y la pantalla de Pagos)
export function proximosEventos(db, hoy = hoyISO(), dias = 31) {
  const fin = sumarDias(hoy, dias); const ev = [];
  for (const t of lista(db, 'tarjetas')) {
    ev.push({ fecha: proximoDia(Number(t.diaCorte) || 1, hoy), tipo: 'corte', nombre: t.nombre, texto: `Corte de ${t.nombre}`, monto: deudaTarjeta(db, t.id) });
    ev.push({ fecha: proximoDia(Number(t.diaPago) || 1, hoy), tipo: 'pago', nombre: t.nombre, texto: `Pagar ${t.nombre} (para no generar intereses)`, monto: pagoSinIntereses(db, t.id, hoy) });
  }
  for (const s of lista(db, 'suscripciones')) {
    if (!s.proxima || s.estado === 'terminada') continue;
    const renueva = s.estado === 'activa' && s.renueva !== false;
    ev.push({ fecha: s.proxima, tipo: renueva ? 'renovacion' : 'fin', nombre: s.nombre, texto: renueva ? `Se renueva ${s.nombre}` : `Termina ${s.nombre}`, monto: renueva ? Number(s.monto) : null });
  }
  for (const f of lista(db, 'fijos')) ev.push({ fecha: proximoDia(Number(f.dia) || 1, hoy), tipo: 'fijo', nombre: f.nombre, texto: `Pago de ${f.nombre}`, monto: Number(f.monto) });
  return ev.filter((e) => e.fecha >= hoy && e.fecha <= fin).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Nombre corto para mostrar con qué se pagó
export function nombrePago(db, m) {
  if (m.pagoTipo === 'tarjeta') return obtener(db, 'tarjetas', m.cuenta)?.nombre || 'Tarjeta';
  return obtener(db, 'cuentas', m.cuenta)?.nombre || 'Cuenta';
}
export function categoria(db, id) { return obtener(db, 'categorias', id) || obtener(db, 'categorias', 'otros') || { id: 'otros', nombre: 'Otros', emoji: '📦' }; }
export function fuente(db, id) { return obtener(db, 'fuentes', id) || { id, nombre: 'Otros ingresos' }; }
