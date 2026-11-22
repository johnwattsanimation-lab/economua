// Economua — pantallas (Resumen, Movimientos, Pagos, Más y cada apartado).
import * as D from './datos.js';
import * as C from './cripto.js';
import * as S from './sync.js';
import { esc, m, aviso, editorHTML, leerEditor, numeroValido } from './ui.js';

export const NAV = {
  abajo: [['chat', '💬', 'Chat'], ['resumen', '📊', 'Resumen'], ['movimientos', '📒', 'Movimientos'], ['pagos', '📅', 'Pagos'], ['mas', '☰', 'Más']],
  lado: [['chat', '💬', 'Chat'], ['resumen', '📊', 'Resumen'], ['movimientos', '📒', 'Movimientos'], ['pagos', '📅', 'Pagos'], '-',
    ['cuentas', '🏦', 'Cuentas'], ['tarjetas', '💳', 'Tarjetas de crédito'], ['msi', '🗓️', 'Meses sin intereses'], ['suscripciones', '🔁', 'Suscripciones'], ['fijos', '🏠', 'Gastos fijos'],
    ['negocios', '📈', 'Negocios'], ['prestamos', '🤝', 'Préstamos'], ['metas', '🎯', 'Metas'], '-', ['categorias', '🏷️', 'Categorías'], ['fuentes', '💰', 'Fuentes de ingreso'], ['ajustes', '⚙️', 'Ajustes'], ['conexion', '🔒', 'Conexión y seguridad']],
};
export const TITULOS = { resumen: 'Resumen', movimientos: 'Movimientos', pagos: 'Pagos y fechas', mas: 'Más', cuentas: 'Cuentas', tarjetas: 'Tarjetas de crédito', msi: 'Meses sin intereses',
  suscripciones: 'Suscripciones', fijos: 'Gastos fijos', negocios: 'Negocios', prestamos: 'Préstamos', metas: 'Metas y apartados', categorias: 'Categorías', fuentes: 'Fuentes de ingreso', ajustes: 'Ajustes', conexion: 'Conexión y seguridad' };

const TIPOS_CUENTA = [['banco', 'Banco'], ['efectivo', 'Efectivo'], ['digital', 'Cartera digital (Mercado Pago, PayPal…)'], ['ahorro', 'Ahorro / inversión']];
const ESTADOS_NEGOCIO = [['idea', 'Idea'], ['proceso', 'En proceso'], ['cobrado', 'Cobrado'], ['descartado', 'Descartado']];
const ESTADOS_SUS = [['activa', 'Activa'], ['cancelada', 'Cancelada (ya no se renueva)'], ['terminada', 'Terminada (guardada para reactivar)']];

export function crearPantallas(app) {
  const E = app.estado;
  const db = () => E.db;
  const hoy = () => D.hoyISO();
  const cap1 = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

  // ───────── Ayudantes ─────────
  const opcionesCuentas = (vacio) => [...(vacio ? [['', vacio]] : []), ...D.lista(db(), 'cuentas').map((c) => [c.id, c.nombre])];
  const opcionesTarjetas = () => D.lista(db(), 'tarjetas').map((t) => [t.id, t.nombre]);
  const opcionesPago = () => [...D.lista(db(), 'cuentas').map((c) => [`cuenta:${c.id}`, `🏦 ${c.nombre}`]), ...D.lista(db(), 'tarjetas').map((t) => [`tarjeta:${t.id}`, `💳 ${t.nombre}`])];
  const opcionesCategorias = () => D.lista(db(), 'categorias').sort((a, b) => a.nombre.localeCompare(b.nombre)).map((c) => [c.id, `${c.emoji || ''} ${c.nombre}`]);
  const opcionesFuentes = () => D.lista(db(), 'fuentes').map((f) => [f.id, f.nombre]);
  const pagoValor = (tipo, id) => (id ? `${tipo || 'cuenta'}:${id}` : '');
  const pagoLeer = (v) => { const [tipo, ...r] = String(v || '').split(':'); return { tipo: tipo || 'cuenta', id: r.join(':') || null }; };
  const fila = ({ emo, titulo, sub, cant, cantSub, clase = '', acc = 'editar', id }) => `<div class="fila tocable" data-acc="${acc}" data-id="${esc(id)}" role="button" tabindex="0">
    <div class="emo">${emo || '•'}</div><div class="txt"><b>${esc(titulo)}</b>${sub ? `<span>${sub}</span>` : ''}</div>
    ${cant !== undefined ? `<div class="cant ${clase}">${cant}${cantSub ? `<small>${cantSub}</small>` : ''}</div>` : ''}</div>`;
  const botonesEditor = (col, id, nombre, extra = '') => `<div class="botones">
    <button class="btn prim" data-acc="guardar" data-col="${col}" data-id="${esc(id)}">${id === 'nuevo' ? `Agregar ${nombre}` : 'Guardar cambios'}</button>
    <button class="btn" data-acc="cancelar">Cancelar</button>
    ${extra}
    ${id !== 'nuevo' ? `<button class="btn peligro" data-acc="borrar" data-col="${col}" data-id="${esc(id)}">Borrar ${nombre}</button>` : ''}</div>`;

  // ───────── Configuración de cada apartado (listas editables) ─────────
  const COL = {
    cuentas: {
      nombre: 'cuenta', texto: 'Bancos, efectivo y carteras digitales. El saldo se calcula solo con tus movimientos.',
      campos: (r) => [
        { k: 'nombre', label: 'Nombre (como la vas a llamar en el chat)', tipo: 'texto' },
        { k: 'tipo', label: 'Tipo', tipo: 'select', opciones: TIPOS_CUENTA },
        r.id ? { k: 'saldoActual', label: 'Saldo actual', tipo: 'dinero', ayuda: 'Si no coincide con tu banco, escribe el saldo real y se corrige.' } : { k: 'saldoActual', label: 'Cuánto tienes ahora', tipo: 'dinero' },
      ],
      valores: (r) => ({ ...r, saldoActual: r.id ? Math.round(D.saldoCuenta(db(), r.id) * 100) / 100 : '' }),
      aplicar: (r, v) => {
        if (!v.nombre) return 'Ponle un nombre.';
        const actual = r.id && db().col.cuentas[r.id] && !db().col.cuentas[r.id].del ? D.saldoCuenta(db(), r.id) : 0;
        const ini = Number(r.saldoInicial) || 0;
        r.nombre = v.nombre; r.tipo = v.tipo;
        if (numeroValido(v.saldoActual)) r.saldoInicial = ini + (v.saldoActual - actual);
        else if (!r.id) r.saldoInicial = 0;
      },
      fila: (r) => ({ emo: r.tipo === 'efectivo' ? '💵' : r.tipo === 'digital' ? '📱' : r.tipo === 'ahorro' ? '🐷' : '🏦', titulo: r.nombre, sub: esc(TIPOS_CUENTA.find((t) => t[0] === r.tipo)?.[1] || ''), cant: m(D.saldoCuenta(db(), r.id)) }),
      antesDeBorrar: (r) => (D.movimientos(db()).some((x) => x.cuenta === r.id || x.destino === r.id) ? 'Esta cuenta tiene movimientos. Si la borras, esos movimientos se quedan pero sin cuenta.' : null),
    },
    tarjetas: {
      nombre: 'tarjeta', texto: 'Te avisa la fecha de corte y cuánto pagar para no generar intereses.',
      campos: (r) => [
        { k: 'nombre', label: 'Nombre (ej. Nu, BBVA Azul)', tipo: 'texto' },
        { k: 'limite', label: 'Límite de crédito', tipo: 'dinero' },
        { k: 'diaCorte', label: 'Día de corte', tipo: 'dia' },
        { k: 'diaPago', label: 'Día límite de pago', tipo: 'dia' },
        { k: 'deudaActual', label: r.id ? 'Deuda actual' : 'Cuánto debes ahora', tipo: 'dinero', ayuda: r.id ? 'Si no coincide con tu banco, escribe la deuda real y se corrige.' : '' },
        { k: 'tasa', label: 'Tasa de interés anual % (opcional)', tipo: 'numero' },
      ],
      valores: (r) => ({ ...r, deudaActual: r.id ? Math.round(D.deudaTarjeta(db(), r.id) * 100) / 100 : '' }),
      aplicar: (r, v) => {
        if (!v.nombre) return 'Ponle un nombre.';
        if (!(v.diaCorte >= 1 && v.diaCorte <= 31) || !(v.diaPago >= 1 && v.diaPago <= 31)) return 'El día de corte y el de pago deben ser del 1 al 31.';
        const actual = r.id && db().col.tarjetas[r.id] && !db().col.tarjetas[r.id].del ? D.deudaTarjeta(db(), r.id) : 0;
        const ini = Number(r.deudaInicial) || 0;
        Object.assign(r, { nombre: v.nombre, limite: v.limite, diaCorte: v.diaCorte, diaPago: v.diaPago, tasa: v.tasa });
        if (numeroValido(v.deudaActual)) r.deudaInicial = ini + (v.deudaActual - actual); else if (!r.id) r.deudaInicial = 0;
      },
      fila: (r) => ({ emo: '💳', titulo: r.nombre, sub: `Corte día ${r.diaCorte} · Pago día ${r.diaPago} · Sin intereses: ${m(D.pagoSinIntereses(db(), r.id, hoy()))}`, cant: m(D.deudaTarjeta(db(), r.id)), cantSub: r.limite ? `de ${m(r.limite)}` : '' }),
    },
    msi: {
      nombre: 'compra a meses', texto: 'Compras a meses sin intereses: cuánto pagas al mes y cuántos meses faltan.',
      campos: () => [
        { k: 'descripcion', label: '¿Qué compraste?', tipo: 'texto' },
        { k: 'tarjeta', label: 'Tarjeta', tipo: 'select', opciones: opcionesTarjetas() },
        { k: 'total', label: 'Precio total', tipo: 'dinero' },
        { k: 'meses', label: 'Meses', tipo: 'select', opciones: [3, 6, 9, 12, 13, 15, 18, 24, 36, 48].map((n) => [n, `${n} meses`]) },
        { k: 'fecha', label: 'Fecha de compra', tipo: 'fecha' },
        { k: 'categoria', label: 'Categoría', tipo: 'select', opciones: opcionesCategorias() },
      ],
      nuevo: () => ({ fecha: hoy(), meses: 3, categoria: 'tecnologia' }),
      aplicar: (r, v) => {
        if (!v.tarjeta) return 'Primero agrega una tarjeta de crédito.';
        if (!numeroValido(v.total) || v.total <= 0) return 'Escribe el precio total.';
        if (!v.fecha) return 'Pon la fecha de compra.';
        Object.assign(r, { descripcion: v.descripcion || 'Compra a meses', tarjeta: v.tarjeta, total: v.total, meses: Number(v.meses), fecha: v.fecha, categoria: v.categoria });
      },
      fila: (r) => { const e = D.msiEstado(db(), r, hoy()); return { emo: '🗓️', titulo: r.descripcion, sub: `${esc(D.obtener(db(), 'tarjetas', r.tarjeta)?.nombre || 'Tarjeta')} · ${e.terminado ? 'Terminado' : `faltan ${e.restantes} de ${r.meses}`}`, cant: m(e.mensualidad), cantSub: 'al mes' }; },
      orden: (a, b) => (b.fecha || '').localeCompare(a.fecha || ''),
    },
    suscripciones: {
      nombre: 'suscripción', texto: 'Cuándo se renueva o termina cada una, cuánto pagas y si la cancelaste. Las terminadas se guardan para reactivarlas.',
      campos: () => [
        { k: 'nombre', label: 'Nombre', tipo: 'texto' },
        { k: 'monto', label: 'Precio', tipo: 'dinero' },
        { k: 'frecuencia', label: '¿Cada cuándo?', tipo: 'select', opciones: Object.entries(D.FRECUENCIAS) },
        { k: 'inicio', label: 'Día que empezó', tipo: 'fecha' },
        { k: 'proxima', label: 'Se renueva / termina el', tipo: 'fecha', ayuda: 'Si lo dejas vacío se calcula con el día que empezó.' },
        { k: 'estado', label: 'Estado', tipo: 'select', opciones: ESTADOS_SUS },
        { k: 'pago', label: 'Se paga con', tipo: 'select', opciones: opcionesPago() },
      ],
      nuevo: () => ({ frecuencia: 'mensual', inicio: hoy(), estado: 'activa' }),
      valores: (r) => ({ ...r, pago: pagoValor(r.pagaTipo, r.pagaCon) }),
      aplicar: (r, v) => {
        if (!v.nombre) return 'Ponle un nombre.';
        if (!numeroValido(v.monto)) return 'Escribe el precio.';
        if (!v.inicio) return 'Pon el día que empezó.';
        const p = pagoLeer(v.pago);
        const proxima = v.proxima || D.siguientePeriodo(v.inicio, v.frecuencia, Number(v.inicio.slice(8, 10)));
        Object.assign(r, { nombre: v.nombre, monto: v.monto, frecuencia: v.frecuencia, inicio: v.inicio, proxima, estado: v.estado, renueva: v.estado === 'activa', pagaCon: p.id, pagaTipo: p.tipo });
      },
      fila: (r) => { const e = D.estadoSuscripcion(r, hoy()); return { emo: '🔁', titulo: r.nombre, sub: `<span class="etiqueta ${e.clase}">${esc(e.texto)}</span>`, cant: m(r.monto), cantSub: esc(D.FRECUENCIAS[r.frecuencia] || '') }; },
      orden: (a, b) => (a.estado === 'terminada') - (b.estado === 'terminada') || (a.proxima || '').localeCompare(b.proxima || ''),
      extra: (r) => r.id === 'nuevo' ? '' : `${r.estado === 'activa' ? `<button class="btn" data-acc="sus-cancelar" data-id="${r.id}">Ya la cancelé (que no se renueve)</button>` : `<button class="btn" data-acc="sus-reactivar" data-id="${r.id}">Reactivar desde hoy</button>`}
        <button class="btn" data-acc="sus-pago" data-id="${r.id}">Registrar un pago hoy</button>`,
      despues: (r, nuevo) => { if (nuevo && r.inicio <= hoy()) { D.pagoDeSuscripcion(db(), r, r.inicio, false); D.procesarAutomaticos(db(), hoy()); return 'Guardé la suscripción y su primer pago.'; } return null; },
    },
    fijos: {
      nombre: 'gasto fijo', texto: 'Renta, luz, internet… Se registran solos el día que toca (lo puedes apagar si el monto cambia cada mes).',
      campos: () => [
        { k: 'nombre', label: 'Nombre', tipo: 'texto' },
        { k: 'monto', label: 'Monto', tipo: 'dinero' },
        { k: 'dia', label: 'Día del mes que se paga', tipo: 'dia' },
        { k: 'categoria', label: 'Categoría', tipo: 'select', opciones: opcionesCategorias() },
        { k: 'pago', label: 'Se paga con', tipo: 'select', opciones: opcionesPago() },
        { k: 'auto', label: 'Registrarlo solo cada mes', tipo: 'bool' },
      ],
      nuevo: () => ({ categoria: 'hogar', auto: true, dia: 1 }),
      valores: (r) => ({ ...r, pago: pagoValor(r.pagaTipo, r.pagaCon) }),
      aplicar: (r, v) => {
        if (!v.nombre) return 'Ponle un nombre.';
        if (!numeroValido(v.monto)) return 'Escribe el monto.';
        if (!(v.dia >= 1 && v.dia <= 31)) return 'El día debe ser del 1 al 31.';
        const p = pagoLeer(v.pago);
        if (!r.id) r.desde = D.fechaConDia(...hoy().split('-').slice(0, 2).map(Number), Number(v.dia)) >= hoy() ? hoy() : D.sumarDias(hoy(), 1);
        Object.assign(r, { nombre: v.nombre, monto: v.monto, dia: v.dia, categoria: v.categoria, pagaCon: p.id, pagaTipo: p.tipo, auto: v.auto });
      },
      fila: (r) => { const pagado = D.fijoPagadoEsteMes(db(), r, hoy()); return { emo: D.categoria(db(), r.categoria).emoji, titulo: r.nombre, sub: `Día ${r.dia} · <span class="etiqueta ${pagado ? 'verde' : 'amarillo'}">${pagado ? 'Pagado este mes' : 'Pendiente este mes'}</span>${r.auto === false ? ' · se marca a mano' : ''}`, cant: m(r.monto) }; },
      extra: (r) => r.id !== 'nuevo' && !D.fijoPagadoEsteMes(db(), r, hoy()) ? `<button class="btn" data-acc="fijo-pagado" data-id="${r.id}">Marcar pagado este mes</button>` : '',
    },
    negocios: {
      nombre: 'negocio', texto: 'Lo que podrías ganar. No cuenta como dinero real hasta que lo cobras.',
      campos: () => [
        { k: 'nombre', label: 'Negocio', tipo: 'texto' },
        { k: 'ganancia', label: 'Lo que podría ganar', tipo: 'dinero' },
        { k: 'costo', label: 'Lo que me cuesta', tipo: 'dinero' },
        { k: 'estado', label: 'Estado', tipo: 'select', opciones: ESTADOS_NEGOCIO },
        { k: 'fechaEstimada', label: 'Fecha estimada de cobro', tipo: 'fecha' },
        { k: 'notas', label: 'Notas', tipo: 'area' },
      ],
      nuevo: () => ({ estado: 'idea' }),
      aplicar: (r, v) => { if (!v.nombre) return 'Ponle un nombre.'; Object.assign(r, v); },
      fila: (r) => ({ emo: '📈', titulo: r.nombre, sub: `<span class="etiqueta ${r.estado === 'cobrado' ? 'verde' : r.estado === 'descartado' ? 'gris' : 'amarillo'}">${esc(ESTADOS_NEGOCIO.find((x) => x[0] === r.estado)?.[1] || '')}</span>${r.fechaEstimada ? ' · ' + esc(D.fechaBonita(r.fechaEstimada, hoy())) : ''}`, cant: m((Number(r.ganancia) || 0) - (Number(r.costo) || 0)), cantSub: 'ganancia neta' }),
      orden: (a, b) => ['proceso', 'idea', 'cobrado', 'descartado'].indexOf(a.estado) - ['proceso', 'idea', 'cobrado', 'descartado'].indexOf(b.estado),
      extra: (r) => r.id !== 'nuevo' && r.estado !== 'cobrado' ? `<button class="btn" data-acc="neg-cobrar" data-id="${r.id}">Ya cobré: pasarlo a ingreso</button>` : '',
    },
    prestamos: {
      nombre: 'préstamo', texto: 'Quién te debe y a quién le debes.',
      campos: () => [
        { k: 'persona', label: 'Persona', tipo: 'texto' },
        { k: 'direccion', label: '¿Quién debe?', tipo: 'select', opciones: [['meDeben', 'Me debe a mí'], ['debo', 'Yo le debo']] },
        { k: 'monto', label: 'Monto', tipo: 'dinero' },
        { k: 'fecha', label: 'Fecha', tipo: 'fecha' },
        { k: 'cuenta', label: 'Cuenta donde salió o entró el dinero', tipo: 'select', opciones: opcionesCuentas('Solo anotar (no movió mis cuentas)') },
        { k: 'notas', label: 'Notas', tipo: 'area' },
      ],
      nuevo: () => ({ direccion: 'meDeben', fecha: hoy(), abonos: [] }),
      aplicar: (r, v) => { if (!v.persona) return 'Escribe el nombre de la persona.'; if (!numeroValido(v.monto)) return 'Escribe el monto.'; Object.assign(r, v, { cuenta: v.cuenta || null, abonos: r.abonos || [] }); },
      fila: (r) => { const s = D.prestamoSaldo(r); return { emo: '🤝', titulo: r.persona, sub: `${r.direccion === 'meDeben' ? 'Te debe' : 'Le debes'}${(r.abonos || []).length ? ` · ${r.abonos.length} abono(s)` : ''}${s <= 0 ? ' · <span class="etiqueta verde">Saldado</span>' : ''}`, cant: m(Math.max(0, s)), clase: r.direccion === 'meDeben' ? 'mas' : '' }; },
      extra: (r) => r.id === 'nuevo' ? '' : `<div class="campo" style="margin-top:8px;width:100%"><label for="abono-${r.id}">Agregar abono</label><div style="display:flex;gap:8px"><input id="abono-${r.id}" inputmode="decimal" placeholder="$0" style="flex:1"><button class="btn" data-acc="prest-abono" data-id="${r.id}">Agregar abono</button></div>
        ${(r.abonos || []).length ? `<div class="ayuda">${r.abonos.map((a) => `${esc(D.fechaBonita(a.fecha, hoy()))}: ${m(a.monto)}`).join(' · ')}</div>` : ''}</div>`,
    },
    metas: {
      nombre: 'meta', texto: 'Dinero apartado para algo. Lo apartado no cuenta como dinero libre.',
      campos: () => [
        { k: 'nombre', label: 'Meta (ej. PC nueva)', tipo: 'texto' },
        { k: 'objetivo', label: 'Cuánto quiero juntar', tipo: 'dinero' },
        { k: 'ahorrado', label: 'Cuánto llevo apartado', tipo: 'dinero' },
        { k: 'fechaLimite', label: 'Para cuándo (opcional)', tipo: 'fecha' },
      ],
      nuevo: () => ({ ahorrado: 0 }),
      aplicar: (r, v) => { if (!v.nombre) return 'Ponle un nombre.'; Object.assign(r, v, { ahorrado: Number(v.ahorrado) || 0, objetivo: Number(v.objetivo) || 0 }); },
      fila: (r) => { const pct = r.objetivo ? Math.min(100, Math.round((Number(r.ahorrado) || 0) / r.objetivo * 100)) : 0; return { emo: '🎯', titulo: r.nombre, sub: `${r.objetivo ? `${pct}% de ${m(r.objetivo)}` : 'Sin cantidad objetivo'}${r.fechaLimite ? ' · para el ' + esc(D.fechaBonita(r.fechaLimite, hoy())) : ''}`, cant: m(r.ahorrado) }; },
      extra: (r) => r.id === 'nuevo' ? '' : `<div class="campo" style="margin-top:8px;width:100%"><label for="meta-${r.id}">Mover dinero</label><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="meta-${r.id}" inputmode="decimal" placeholder="$0" style="flex:1;min-width:100px"><button class="btn" data-acc="meta-apartar" data-id="${r.id}">Apartar</button><button class="btn" data-acc="meta-sacar" data-id="${r.id}">Sacar</button></div></div>`,
    },
    categorias: {
      nombre: 'categoría', texto: 'Las palabras sirven para que el chat ponga cada gasto en su categoría sin preguntarte.',
      campos: () => [
        { k: 'emoji', label: 'Emoji', tipo: 'texto' },
        { k: 'nombre', label: 'Nombre', tipo: 'texto' },
        { k: 'palabras', label: 'Palabras que la identifican (separadas por comas)', tipo: 'palabras', ancho: true },
      ],
      nuevo: () => ({ emoji: '🏷️', palabras: [] }),
      aplicar: (r, v) => { if (!v.nombre) return 'Ponle un nombre.'; Object.assign(r, v); },
      fila: (r) => ({ emo: esc(r.emoji || '🏷️'), titulo: r.nombre, sub: esc((r.palabras || []).slice(0, 8).join(', ')) || 'Sin palabras' }),
      orden: (a, b) => a.nombre.localeCompare(b.nombre),
      noBorrar: (r) => (r.id === 'otros' ? 'La categoría "Otros" no se puede borrar.' : null),
    },
    fuentes: {
      nombre: 'fuente', texto: 'De dónde viene tu dinero (Twitch, Kick, TikTok…). Las palabras ayudan al chat a reconocerla.',
      campos: () => [{ k: 'nombre', label: 'Nombre', tipo: 'texto' }, { k: 'palabras', label: 'Palabras que la identifican (separadas por comas)', tipo: 'palabras', ancho: true }],
      nuevo: () => ({ palabras: [] }),
      aplicar: (r, v) => { if (!v.nombre) return 'Ponle un nombre.'; Object.assign(r, v); },
      fila: (r) => ({ emo: '💰', titulo: r.nombre, sub: esc((r.palabras || []).join(', ')) || 'Sin palabras', cant: m(D.sumar(D.delMes(db(), D.mesDe(hoy()), 'ingreso').filter((x) => x.fuente === r.id))), cantSub: 'este mes' }),
      noBorrar: (r) => (r.id === 'otros-ing' ? 'Esta fuente no se puede borrar.' : null),
    },
  };

  function pantallaLista(col) {
    const cfg = COL[col]; const ab = E.abierto;
    let items = D.lista(db(), col);
    if (cfg.orden) items.sort(cfg.orden);
    const editor = (r, id) => {
      const vals = cfg.valores ? cfg.valores(r) : r;
      return `<div class="editor" data-editor="${col}">${editorHTML(cfg.campos(r), vals)}<p class="error" id="error-editor"></p>${botonesEditor(col, id, cfg.nombre, cfg.extra ? cfg.extra({ ...r, id }) : '')}</div>`;
    };
    let html = `<p class="nota" style="margin-top:0">${esc(cfg.texto)}</p>`;
    html += ab === 'nuevo' ? editor(cfg.nuevo ? cfg.nuevo() : {}, 'nuevo') : `<button class="btn-agregar" data-acc="nuevo">+ Agregar ${esc(cfg.nombre)}</button>`;
    html += `<div class="tarjeta" style="padding:6px 10px">${items.length ? items.map((r) => (ab === r.id ? fila({ ...cfg.fila(r), id: r.id, acc: 'cancelar' }) + editor(r, r.id) : fila({ ...cfg.fila(r), id: r.id }))).join('') : `<div class="vacio">Todavía no hay nada aquí.</div>`}</div>`;
    return html;
  }

  // ───────── Resumen ─────────
  function pantallaResumen() {
    const d = db(); const h = hoy(); const mes = D.mesDe(h);
    const tengo = D.saldoTotal(d), deudas = D.deudaTotalTarjetas(d) + D.totalesPrestamos(d).debo, libre = D.dineroLibre(d, h);
    const ing = D.sumar(D.delMes(d, mes, 'ingreso')), gas = D.sumar(D.delMes(d, mes, 'gasto'));
    const micro = D.sumar(D.microDelMes(d, mes, h)), tope = D.topeMicro(d, h);
    const pctMicro = Math.min(100, Math.round(micro / Math.max(1, tope) * 100));
    const colorMicro = micro > tope ? 'var(--rojo)' : micro > tope * 0.8 ? 'var(--amarillo)' : 'var(--verde)';
    const textoMicro = micro > tope ? '🔴 Te pasaste del tope' : micro > tope * 0.8 ? '🟡 Cerca del tope' : '🟢 Vas bien';
    const cats = D.gastosPorCategoria(d, mes); const maxCat = Math.max(1, ...cats.map((c) => c[1]));
    const fuentes = D.ingresosPorFuente(d, mes); const maxF = Math.max(1, ...fuentes.map((c) => c[1]));
    const hist = D.historialMeses(d, 6, h); const maxH = Math.max(1, ...hist.flatMap((x) => [x.ingresos, x.gastos]));
    const negocios = D.lista(d, 'negocios').filter((n) => n.estado === 'idea' || n.estado === 'proceso');
    const proy = negocios.reduce((s, n) => s + (Number(n.ganancia) || 0) - (Number(n.costo) || 0), 0);
    const metas = D.lista(d, 'metas');
    const pr = D.totalesPrestamos(d);
    return `
      <div class="cuadros">
        <div class="cuadro"><div class="et">Tengo</div><div class="val">${m(tengo)}</div><div class="sub">En ${D.lista(d, 'cuentas').length} cuenta(s)</div></div>
        <div class="cuadro"><div class="et">Debo</div><div class="val">${m(deudas)}</div><div class="sub">Tarjetas y préstamos</div></div>
        <div class="cuadro"><div class="et">Libre</div><div class="val" style="color:${libre < 0 ? 'var(--rojo)' : 'inherit'}">${m(libre)}</div><div class="sub">Después de pagos y apartados</div></div>
        <div class="cuadro"><div class="et">Lo que valgo</div><div class="val">${m(D.patrimonio(d))}</div><div class="sub">Tengo + me deben − debo</div></div>
      </div>
      <div class="tarjeta"><h2>🐜 Microgastos de ${esc(D.MESES[Number(mes.slice(5)) - 1])} <small>(gastos de hasta ${m(D.umbralMicro(d, h))})</small></h2>
        <div style="display:flex;justify-content:space-between"><b>${m(micro)} de ${m(tope)}</b><span style="color:var(--txt2)">${textoMicro}</span></div>
        <div class="medidor" role="img" aria-label="Microgastos ${pctMicro}% del tope"><div style="width:${pctMicro}%;background:${colorMicro}"></div></div>
        <div class="nota">Esta semana: ${m(D.sumar(D.microDeSemana(d, h)))} · ${D.microDelMes(d, mes, h).length} compras chiquitas este mes. El tope ${d.ajustes.topeMicroModo === 'manual' ? 'lo pusiste tú' : `es el ${d.ajustes.topeMicroPct}% de lo que ganas al mes`} (se cambia en Ajustes).</div></div>
      <div class="tarjeta"><h2>Este mes</h2>
        <div class="cuadros" style="margin:0"><div class="cuadro"><div class="et">Gané</div><div class="val mas">${m(ing)}</div></div><div class="cuadro"><div class="et">Gasté</div><div class="val">${m(gas)}</div></div>
        <div class="cuadro"><div class="et">Me queda del mes</div><div class="val">${m(ing - gas)}</div></div><div class="cuadro"><div class="et">Suscripciones al mes</div><div class="val">${m(D.costoMensualSuscripciones(d))}</div></div></div></div>
      <div class="tarjeta"><h2>En qué se me va <small>(${esc(D.nombreMes(mes))})</small></h2>
        ${cats.length ? `<div class="barras">${cats.slice(0, 8).map(([c, v]) => { const cat = D.categoria(d, c); return `<div class="b" title="${esc(cat.nombre)}: ${esc(D.dinero(v))}"><div class="lin"><span>${esc(cat.emoji)} ${esc(cat.nombre)}</span><span>${m(v)}</span></div><div class="riel"><div class="rel" style="width:${Math.max(2, v / maxCat * 100)}%"></div></div></div>`; }).join('')}</div>` : '<div class="vacio">Sin gastos este mes.</div>'}</div>
      <div class="tarjeta"><h2>De dónde viene mi dinero <small>(${esc(D.nombreMes(mes))})</small></h2>
        ${fuentes.length ? `<div class="barras">${fuentes.map(([f, v]) => `<div class="b" title="${esc(D.fuente(d, f).nombre)}: ${esc(D.dinero(v))}"><div class="lin"><span>${esc(D.fuente(d, f).nombre)}</span><span>${m(v)}</span></div><div class="riel"><div class="rel" style="width:${Math.max(2, v / maxF * 100)}%"></div></div></div>`).join('')}</div>` : '<div class="vacio">Sin ingresos este mes.</div>'}</div>
      <div class="tarjeta"><h2>Últimos 6 meses</h2>
        <div class="leyenda"><span><i style="background:var(--serie1)"></i>Ingresos</span><span><i style="background:var(--serie2)"></i>Gastos</span></div>
        <div class="meses">${hist.map((x) => `<div class="m" title="${esc(D.nombreMes(x.mes))}: ganaste ${esc(D.dinero(x.ingresos))}, gastaste ${esc(D.dinero(x.gastos))}"><div class="pares"><div style="height:${x.ingresos / maxH * 100}%;background:var(--serie1)"></div><div style="height:${x.gastos / maxH * 100}%;background:var(--serie2)"></div></div><span>${esc(D.MESES[Number(x.mes.slice(5)) - 1].slice(0, 3))}</span></div>`).join('')}</div>
        <details style="margin-top:8px"><summary class="nota">Ver como tabla</summary><div style="margin-top:6px">${hist.map((x) => `<div class="fila"><div class="txt"><b>${esc(cap1(D.nombreMes(x.mes)))}</b></div><div class="cant">${m(x.ingresos)}<small>gastos ${m(x.gastos)}</small></div></div>`).join('')}</div></details></div>
      <div class="tarjeta"><h2>📈 Negocios <small>(lo que podría ganar)</small></h2>
        ${negocios.length ? `<b>${m(proy)}</b> <span class="nota">en ${negocios.length} negocio(s) — no cuenta como dinero real</span>` : '<span class="nota">Sin negocios en proceso.</span>'}
        <div class="botones"><button class="btn chico" data-ir="negocios">Ver negocios</button></div></div>
      ${metas.length ? `<div class="tarjeta"><h2>🎯 Metas</h2><div class="barras">${metas.map((x) => `<div class="b"><div class="lin"><span>${esc(x.nombre)}</span><span>${m(x.ahorrado)}${x.objetivo ? ` / ${m(x.objetivo)}` : ''}</span></div><div class="riel"><div class="rel" style="width:${x.objetivo ? Math.min(100, (Number(x.ahorrado) || 0) / x.objetivo * 100) : 0}%"></div></div></div>`).join('')}</div></div>` : ''}
      ${pr.meDeben || pr.debo ? `<div class="tarjeta"><h2>🤝 Préstamos</h2>Te deben ${m(pr.meDeben)} · Debes ${m(pr.debo)}</div>` : ''}`;
  }

  // ───────── Movimientos ─────────
  function camposMovimiento(tipo) {
    const base = [{ k: 'tipo', label: 'Tipo', tipo: 'select', opciones: [['gasto', 'Gasto'], ['ingreso', 'Ingreso'], ['transferencia', 'Pasar dinero entre mis cuentas'], ['pagoTarjeta', 'Pago de tarjeta']] },
      { k: 'monto', label: 'Monto', tipo: 'dinero' }, { k: 'descripcion', label: 'Descripción', tipo: 'texto' }, { k: 'fecha', label: 'Fecha', tipo: 'fecha' }];
    if (tipo === 'gasto') base.push({ k: 'categoria', label: 'Categoría', tipo: 'select', opciones: opcionesCategorias() }, { k: 'pago', label: 'Pagado con', tipo: 'select', opciones: opcionesPago() }, { k: 'micro', label: '¿Microgasto?', tipo: 'select', opciones: [['auto', 'Automático (según el monto)'], ['si', 'Sí, contarlo'], ['no', 'No contarlo']] });
    if (tipo === 'ingreso') base.push({ k: 'fuente', label: '¿De dónde vino?', tipo: 'select', opciones: opcionesFuentes() }, { k: 'cuenta', label: 'Entró a', tipo: 'select', opciones: opcionesCuentas() });
    if (tipo === 'transferencia') base.push({ k: 'cuenta', label: 'Sale de', tipo: 'select', opciones: opcionesCuentas() }, { k: 'destino', label: 'Llega a', tipo: 'select', opciones: opcionesCuentas() });
    if (tipo === 'pagoTarjeta') base.push({ k: 'cuenta', label: 'Pagué desde', tipo: 'select', opciones: opcionesCuentas() }, { k: 'destino', label: 'Tarjeta', tipo: 'select', opciones: opcionesTarjetas() });
    return base;
  }
  function editorMovimiento(r, id) {
    const tipo = r.tipo || 'gasto';
    const vals = { ...r, pago: pagoValor(r.pagoTipo, r.cuenta), micro: r.micro === true ? 'si' : r.micro === false ? 'no' : 'auto' };
    return `<div class="editor" data-editor="movimientos">${editorHTML(camposMovimiento(tipo), vals)}<p class="error" id="error-editor"></p>${botonesEditor('movimientos', id, 'movimiento')}</div>`;
  }
  function pantallaMovimientos() {
    const d = db(); const f = E.filtros; const ab = E.abierto;
    const busca = (f.busca || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let movs = D.movimientos(d).filter((x) => D.mesDe(x.fecha || '') === f.mes);
    if (f.tipo === 'gastos') movs = movs.filter((x) => x.tipo === 'gasto');
    if (f.tipo === 'ingresos') movs = movs.filter((x) => x.tipo === 'ingreso');
    if (f.tipo === 'micro') movs = movs.filter((x) => D.esMicro(d, x, hoy()));
    if (f.tipo === 'otros') movs = movs.filter((x) => x.tipo === 'transferencia' || x.tipo === 'pagoTarjeta');
    if (busca) movs = movs.filter((x) => `${x.descripcion} ${D.categoria(d, x.categoria).nombre} ${x.monto}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(busca));
    movs.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.u || 0) - (a.u || 0));
    const totalG = D.sumar(movs.filter((x) => x.tipo === 'gasto')), totalI = D.sumar(movs.filter((x) => x.tipo === 'ingreso'));
    let html = `<div class="buscador"><input type="search" id="busca" placeholder="Buscar (ej. tacos, Netflix, 120)" value="${esc(f.busca)}" aria-label="Buscar movimientos"></div>
      <div class="filtros">${[['todos', 'Todos'], ['gastos', 'Gastos'], ['ingresos', 'Ingresos'], ['micro', 'Microgastos'], ['otros', 'Transferencias y pagos']].map(([k, t]) => `<button data-acc="filtro" data-v="${k}" class="${f.tipo === k ? 'activo' : ''}">${t}</button>`).join('')}</div>
      <div class="selector-mes"><button class="icono-btn" data-acc="mes" data-v="-1" aria-label="Mes anterior">‹</button><b>${esc(D.nombreMes(f.mes))}</b><button class="icono-btn" data-acc="mes" data-v="1" aria-label="Mes siguiente">›</button></div>
      <p class="nota" style="margin:0 0 8px">Gastos: ${m(totalG)} · Ingresos: ${m(totalI)} · ${movs.length} movimiento(s)</p>`;
    html += ab === 'nuevo' ? editorMovimiento({ tipo: 'gasto', fecha: hoy(), pagoTipo: 'cuenta', cuenta: d.ajustes.cuentaPredeterminada, categoria: 'otros' }, 'nuevo') : `<button class="btn-agregar" data-acc="nuevo">+ Agregar movimiento a mano</button>`;
    if (!movs.length) return html + '<div class="vacio">No hay movimientos con esos filtros.</div>';
    let fechaAnt = '';
    html += '<div class="tarjeta" style="padding:4px 10px">';
    for (const x of movs) {
      if (x.fecha !== fechaAnt) { html += `<div class="grupo-fecha">${esc(cap1(D.fechaBonita(x.fecha, hoy())))}</div>`; fechaAnt = x.fecha; }
      const info = infoMovimiento(x);
      html += ab === x.id ? fila({ ...info, id: x.id, acc: 'cancelar' }) + editorMovimiento(x, x.id) : fila({ ...info, id: x.id });
    }
    return html + '</div>';
  }
  function infoMovimiento(x) {
    const d = db();
    if (x.tipo === 'ingreso') return { emo: '💰', titulo: x.descripcion || 'Ingreso', sub: `${esc(D.fuente(d, x.fuente).nombre)} · ${esc(D.nombrePago(d, x))}`, cant: '+' + m(x.monto), clase: 'mas' };
    if (x.tipo === 'transferencia') return { emo: '🔄', titulo: x.descripcion || 'Transferencia', sub: 'Entre mis cuentas', cant: m(x.monto), clase: 'neutro' };
    if (x.tipo === 'pagoTarjeta') return { emo: '💳', titulo: `Pago a ${D.obtener(d, 'tarjetas', x.destino)?.nombre || 'tarjeta'}`, sub: `Desde ${esc(D.obtener(d, 'cuentas', x.cuenta)?.nombre || 'cuenta')}`, cant: m(x.monto), clase: 'neutro' };
    const c = D.categoria(d, x.categoria);
    return { emo: c.emoji, titulo: x.descripcion || c.nombre, sub: `${esc(c.nombre)} · ${esc(D.nombrePago(d, x))}${D.esMicro(d, x, hoy()) ? ' · 🐜 micro' : ''}${x.auto ? ' · automático' : ''}`, cant: '−' + m(x.monto) };
  }

  // ───────── Pagos ─────────
  function pantallaPagos() {
    const d = db(); const h = hoy();
    const ev = D.proximosEventos(d, h, 45); const pp = D.porPagar(d, h);
    const ico = { corte: '✂️', pago: '💳', renovacion: '🔁', fin: '⏹️', fijo: '🏠' };
    let html = `<div class="cuadros"><div class="cuadro"><div class="et">Por pagar este mes</div><div class="val">${m(pp.total)}</div></div><div class="cuadro"><div class="et">Libre después de pagar</div><div class="val">${m(D.dineroLibre(d, h))}</div></div></div>`;
    html += `<div class="tarjeta"><h2>📅 Próximos 45 días</h2>${ev.length ? ev.map((e) => `<div class="fila"><div class="emo">${ico[e.tipo]}</div><div class="txt"><b>${esc(e.texto)}</b><span>${esc(cap1(D.fechaBonita(e.fecha, h)))}${D.diasEntre(h, e.fecha) > 1 ? ` · en ${D.diasEntre(h, e.fecha)} días` : ''}</span></div>${e.monto ? `<div class="cant">${m(e.monto)}</div>` : ''}</div>`).join('') : '<div class="vacio">Nada en los próximos días. Agrega tus tarjetas, suscripciones y gastos fijos.</div>'}</div>`;
    const ts = D.lista(d, 'tarjetas');
    if (ts.length) html += `<div class="tarjeta"><h2>💳 Tarjetas</h2>${ts.map((t) => `<div class="fila tocable" data-ir="tarjetas"><div class="emo">💳</div><div class="txt"><b>${esc(t.nombre)}</b><span>Para no generar intereses: ${m(D.pagoSinIntereses(d, t.id, h))} antes del ${esc(D.fechaBonita(D.proximoDia(Number(t.diaPago), h), h))}</span></div><div class="cant">${m(D.deudaTarjeta(d, t.id))}<small>deuda</small></div></div>`).join('')}</div>`;
    const fijos = D.lista(d, 'fijos');
    if (fijos.length) html += `<div class="tarjeta"><h2>🏠 Gastos fijos de este mes</h2>${fijos.map((f) => { const pag = D.fijoPagadoEsteMes(d, f, h); return `<div class="fila"><div class="emo">${pag ? '✅' : '⏳'}</div><div class="txt"><b>${esc(f.nombre)}</b><span>Día ${f.dia} · ${pag ? 'Pagado' : 'Pendiente'}</span></div><div class="cant">${m(f.monto)}</div>${pag ? '' : `<button class="btn chico" data-acc="fijo-pagado" data-id="${f.id}">Marcar pagado</button>`}</div>`; }).join('')}</div>`;
    html += `<div class="botones"><button class="btn" data-ir="suscripciones">🔁 Suscripciones</button><button class="btn" data-ir="tarjetas">💳 Tarjetas</button><button class="btn" data-ir="fijos">🏠 Gastos fijos</button><button class="btn" data-ir="msi">🗓️ Meses sin intereses</button></div>`;
    return html;
  }

  // ───────── Más ─────────
  function pantallaMas() {
    const d = db();
    const items = [['cuentas', '🏦', 'Cuentas', `${D.lista(d, 'cuentas').length} · ${D.dinero(D.saldoTotal(d))}`], ['tarjetas', '💳', 'Tarjetas de crédito', `${D.lista(d, 'tarjetas').length} · debes ${D.dinero(D.deudaTotalTarjetas(d))}`],
      ['msi', '🗓️', 'Meses sin intereses', `${D.lista(d, 'msi').length} compra(s)`], ['suscripciones', '🔁', 'Suscripciones', `${D.dinero(D.costoMensualSuscripciones(d))} al mes`], ['fijos', '🏠', 'Gastos fijos', `${D.lista(d, 'fijos').length} gasto(s)`],
      ['negocios', '📈', 'Negocios', 'Lo que podría ganar'], ['prestamos', '🤝', 'Préstamos', 'Quién me debe y a quién le debo'], ['metas', '🎯', 'Metas y apartados', `${D.lista(d, 'metas').length} meta(s)`],
      ['categorias', '🏷️', 'Categorías', 'Y palabras del chat'], ['fuentes', '💰', 'Fuentes de ingreso', 'Twitch, Kick, TikTok…'], ['ajustes', '⚙️', 'Ajustes', 'Microgastos, avisos, nombre'], ['conexion', '🔒', 'Conexión y seguridad', 'Drive, contraseña, notificaciones']];
    return `<div class="menu-mas">${items.map(([p, ic, t, s]) => `<button data-ir="${p}"><span class="ic">${ic}</span><b>${esc(t)}</b><span class="${p === 'cuentas' || p === 'tarjetas' || p === 'suscripciones' ? 'm-dinero' : ''}">${esc(s)}</span></button>`).join('')}</div>`;
  }

  // ───────── Ajustes ─────────
  function pantallaAjustes() {
    const d = db(); const a = d.ajustes; const h = hoy();
    const ref = D.ingresoReferencia(d, h);
    const campos = [
      { k: 'nombre', label: '¿Cómo te llamo?', tipo: 'texto' },
      { k: 'cuentaPredeterminada', label: 'Cuenta que uso si no digo cuál', tipo: 'select', opciones: opcionesCuentas() },
      { k: 'umbralMicroModo', label: 'Qué cuenta como microgasto', tipo: 'select', opciones: [['auto', `Automático (ahora: hasta ${D.dinero(D.umbralMicro({ ...d, ajustes: { ...a, umbralMicroModo: 'auto' } }, h))})`], ['manual', 'Lo pongo yo']] },
      { k: 'umbralMicro', label: 'Microgasto: gastos de hasta', tipo: 'dinero', ayuda: 'Solo si elegiste "Lo pongo yo".' },
      { k: 'topeMicroModo', label: 'Tope de microgastos al mes', tipo: 'select', opciones: [['auto', 'Automático (un % de lo que gano)'], ['manual', 'Una cantidad fija']] },
      { k: 'topeMicroPct', label: 'Porcentaje de lo que gano (automático)', tipo: 'numero', ayuda: `5% es una buena base. ${ref ? `Ganas en promedio ${D.dinero(ref)} al mes.` : 'Se ajusta solo cuando tenga al menos un mes completo de tus ingresos; mientras, usa $600.'}` },
      { k: 'topeMicro', label: 'Cantidad fija al mes', tipo: 'dinero', ayuda: 'Solo si elegiste "Una cantidad fija".' },
      { k: 'avisosDiasAntes', label: 'Avisarme cuántos días antes', tipo: 'numero' },
      { k: 'cantidadesEnAvisos', label: 'Mostrar cantidades en las notificaciones', tipo: 'bool', ayuda: 'Apagado es más privado: la notificación no dice cuánto.' },
    ];
    if (!S.ES_PC) campos.push({ k: 'bloqueoMinutos', label: 'Bloquear el cel si salgo de la app por (minutos)', tipo: 'numero' });
    return `<div class="tarjeta"><div class="editor" data-editor="ajustes" style="margin:0;background:none;border:0;padding:0">${editorHTML(campos, a, 'aj')}<p class="error" id="error-editor"></p>
      <div class="botones"><button class="btn prim" data-acc="ajustes-guardar">Guardar ajustes</button></div></div></div>
      <div class="tarjeta"><h2>Tope de microgastos ahora</h2>Gastos de hasta <b>${m(D.umbralMicro(d, h))}</b> cuentan como microgasto. Tope del mes: <b>${m(D.topeMicro(d, h))}</b>.</div>`;
  }

  // ───────── Conexión y seguridad ─────────
  function pantallaConexion() {
    const cfg = window.ECONOMUA_CONFIG || {};
    if (S.ES_PC) {
      const e = E.estadoPC || {};
      return `<div class="tarjeta"><h2>☁ Google Drive</h2>
          <p>${e.driveConectado ? '✅ Conectado' : '❌ Sin conectar'}${e.ultimaSync ? ` · ${esc(e.ultimaSync)}` : ''}${e.celConAvisos ? ' · 🔔 Cel con avisos' : ''}</p>
          ${e.error ? `<p class="error">${esc(e.error)}</p>` : ''}
          <div class="editor" data-editor="google">${editorHTML([
            { k: 'clientIdWeb', label: 'ID de cliente WEB (para el cel)', tipo: 'texto', ancho: true },
            { k: 'clientIdEscritorio', label: 'ID de cliente de ESCRITORIO (para esta PC)', tipo: 'texto', ancho: true },
            { k: 'secretoEscritorio', label: 'Secreto del cliente de ESCRITORIO', tipo: 'clave', ancho: true, ayuda: e.tieneSecreto ? 'Ya está guardado (cifrado). Déjalo vacío para no cambiarlo.' : '' },
            { k: 'paginaCel', label: 'Dirección de la app del cel (GitHub Pages)', tipo: 'texto', ancho: true },
          ], { clientIdWeb: e.clientIdWeb || (S.driveConfigurado() ? cfg.clientIdWeb : ''), clientIdEscritorio: e.clientIdEscritorio || '', paginaCel: e.paginaCel || cfg.paginaCel || 'https://johncitoymeru-eng.github.io/economua/' }, 'g')}
          <p class="error" id="error-editor"></p>
          <div class="botones"><button class="btn" data-acc="google-guardar">1. Guardar datos de Google</button><button class="btn prim" data-acc="google-conectar">2. Conectar con Google Drive</button>
          <button class="btn" data-acc="google-sync">Sincronizar ahora</button>${e.driveConectado ? '<button class="btn peligro" data-acc="google-desconectar">Desconectar Drive</button>' : ''}</div></div>
          <p class="nota">La guía paso a paso está en el archivo <b>LEEME - Como conectar.txt</b> de tu carpeta economua.</p></div>
        <div class="tarjeta"><h2>📱 Tu cel</h2>${cfg.paginaCel || e.paginaCel ? `<p>Abre en Chrome de tu cel: <span class="mono">${esc(e.paginaCel || cfg.paginaCel)}</span> y elige "Agregar a pantalla principal".</p>` : '<p class="nota">Primero termina la conexión con Google y sube la carpeta app a GitHub.</p>'}</div>
        <div class="tarjeta"><h2>🖥️ Esta PC</h2>
          <label class="interruptor"><input type="checkbox" data-acc2="inicio-windows" ${e.inicioWindows ? 'checked' : ''}> <span>Abrir Economua en segundo plano al encender la PC</span></label>
          <div class="botones"><button class="btn" data-acc="probar-aviso">Probar notificación en esta PC</button><button class="btn" data-acc="respaldo">Guardar un respaldo cifrado ahora</button></div>
          <p class="nota">Respaldos automáticos (cifrados) en la carpeta datos\\respaldos: uno por día, se guardan los últimos 30.</p></div>
        <div class="tarjeta"><h2>🔒 Seguridad</h2>
          <div class="editor" data-editor="pass">${editorHTML([{ k: 'nueva', label: 'Contraseña nueva (mínimo 8)', tipo: 'clave' }, { k: 'nueva2', label: 'Repite la contraseña nueva', tipo: 'clave' }], {}, 'pw')}<p class="error" id="error-pass"></p>
          <div class="botones"><button class="btn" data-acc="cambiar-pass">Cambiar contraseña</button></div></div>
          <div class="botones"><button class="btn peligro" data-acc="olvidar-pc">Olvidar esta PC (pedir contraseña al abrir)</button></div></div>`;
    }
    const perm = typeof Notification !== 'undefined' ? Notification.permission : 'no';
    return `<div class="tarjeta"><h2>☁ Google Drive</h2><p id="drive-estado">${S.tokenValido() ? '✅ Conectado' : '⚪ Toca "Sincronizar ahora" para conectar'}</p>
        <div class="botones"><button class="btn prim" data-acc="cel-sync">Sincronizar ahora</button></div>
        <p class="nota">Lo que anotas aquí se guarda cifrado en el cel y se manda a tu PC por una carpeta privada de Drive. Funciona sin internet y se manda cuando vuelve la señal.</p></div>
      <div class="tarjeta"><h2>🔔 Notificaciones</h2><p>${perm === 'granted' ? '✅ Activadas' : perm === 'denied' ? '❌ Bloqueadas en Chrome (actívalas en los ajustes del sitio)' : '⚪ Sin activar'}</p>
        <div class="botones">${perm !== 'granted' ? '<button class="btn prim" data-acc="cel-notif">Activar notificaciones</button>' : ''}<button class="btn" data-acc="cel-probar">Probar notificación</button></div>
        <p class="nota">Con la app cerrada, el aviso llega cuando tu PC está prendida (ella manda el toque) y además Chrome revisa tus fechas una vez al día.</p></div>
      <div class="tarjeta"><h2>🔒 Seguridad</h2>
        <div class="botones"><button class="btn" data-acc="cel-bloquear">Bloquear ahora</button><button class="btn peligro" data-acc="cel-olvidar">Olvidar este cel</button></div>
        <div class="campo" style="margin-top:12px"><label for="cel-pass">Volver a registrar mi huella (escribe tu contraseña)</label><div style="display:flex;gap:8px"><input id="cel-pass" type="password" autocomplete="current-password" style="flex:1"><button class="btn" data-acc="cel-huella">Registrar huella</button></div></div>
        <p class="nota">La contraseña se cambia desde la PC.</p></div>`;
  }

  // ───────── HTML por pantalla ─────────
  function html(p) {
    const titulo = (t) => `<div class="titulo-pantalla"><h2>${esc(t)}</h2></div>`;
    switch (p) {
      case 'resumen': return titulo(`Resumen de ${D.nombreMes(D.mesDe(hoy()))}`) + pantallaResumen();
      case 'movimientos': return pantallaMovimientos();
      case 'pagos': return pantallaPagos();
      case 'mas': return pantallaMas();
      case 'ajustes': return pantallaAjustes();
      case 'conexion': return pantallaConexion();
      default: return COL[p] ? pantallaLista(p) : '<div class="vacio">Pantalla no encontrada.</div>';
    }
  }

  // ───────── Acciones ─────────
  const errorEditor = (t) => { const el = document.getElementById('error-editor'); if (el) el.textContent = t; else aviso(t); };
  const leerEditorAbierto = () => { const ed = document.querySelector('.editor[data-editor]'); return ed ? leerEditor(ed) : {}; };
  const montoDe = (id) => { const v = Number(String(document.getElementById(id)?.value || '').replace(/[$\s,]/g, '')); return isFinite(v) && v > 0 ? v : null; };
  const listo = (texto, deshacer) => { app.guardar(); aviso(texto, deshacer ? { texto: 'Deshacer', fn: () => { deshacer(); app.guardar(); app.render(); } } : null); };

  function guardarRegistro(col, id) {
    const d = db();
    const v = leerEditorAbierto();
    if (col === 'movimientos') {
      if (!numeroValido(v.monto) || v.monto <= 0) return errorEditor('Escribe un monto mayor a 0.');
      if (!v.fecha) return errorEditor('Pon la fecha.');
      const r = id === 'nuevo' ? {} : { ...D.obtener(d, 'movimientos', id) };
      Object.assign(r, { tipo: v.tipo, monto: v.monto, descripcion: v.descripcion, fecha: v.fecha });
      if (v.tipo === 'gasto') { const p = pagoLeer(v.pago); Object.assign(r, { categoria: v.categoria, cuenta: p.id, pagoTipo: p.tipo }); if (v.micro === 'si') r.micro = true; else if (v.micro === 'no') r.micro = false; else delete r.micro; }
      if (v.tipo === 'ingreso') Object.assign(r, { fuente: v.fuente, cuenta: v.cuenta, pagoTipo: 'cuenta' });
      if (v.tipo === 'transferencia' || v.tipo === 'pagoTarjeta') { if (!v.cuenta || !v.destino) return errorEditor('Elige de dónde sale y a dónde llega.'); if (v.tipo === 'transferencia' && v.cuenta === v.destino) return errorEditor('La cuenta de salida y la de llegada deben ser distintas.'); Object.assign(r, { cuenta: v.cuenta, destino: v.destino, pagoTipo: 'cuenta' }); }
      if (!r.descripcion) r.descripcion = v.tipo === 'gasto' ? D.categoria(d, r.categoria).nombre : v.tipo === 'ingreso' ? D.fuente(d, r.fuente).nombre : v.tipo === 'transferencia' ? 'Transferencia' : 'Pago de tarjeta';
      delete r.auto;
      D.guardar(d, 'movimientos', r);
      app.cerrar(); listo(id === 'nuevo' ? 'Movimiento agregado' : 'Cambios guardados');
      return;
    }
    const cfg = COL[col];
    const r = id === 'nuevo' ? { ...(cfg.nuevo ? cfg.nuevo() : {}) } : { ...D.obtener(d, col, id) };
    const err = cfg.aplicar(r, v);
    if (err) return errorEditor(err);
    const guardado = D.guardar(d, col, r);
    const extra = cfg.despues ? cfg.despues(guardado, id === 'nuevo') : null;
    app.cerrar(); listo(extra || (id === 'nuevo' ? `Agregué ${cfg.nombre}` : 'Cambios guardados'));
  }
  function borrarRegistro(boton, col, id) {
    const d = db(); const cfg = COL[col] || {};
    const r = D.obtener(d, col, id); if (!r) return;
    const no = cfg.noBorrar?.(r); if (no) return errorEditor(no);
    if (!boton.classList.contains('confirmar')) {
      boton.classList.add('confirmar');
      const aviso2 = cfg.antesDeBorrar?.(r);
      boton.textContent = aviso2 ? `${aviso2} Toca otra vez para borrar.` : '¿Seguro? Toca otra vez para borrar';
      return;
    }
    const copia = D.borrar(d, col, id);
    app.cerrar(); listo('Borrado', () => D.restaurar(db(), col, copia));
  }

  async function accion(a, el) {
    const d = db(); const id = el.dataset.id;
    switch (a) {
      case 'nuevo': app.abrir('nuevo'); return;
      case 'editar': app.abrir(id); return;
      case 'cancelar': app.cerrar(); return;
      case 'guardar': guardarRegistro(el.dataset.col, id); return;
      case 'borrar': borrarRegistro(el, el.dataset.col, id); return;
      case 'filtro': E.filtros.tipo = el.dataset.v; app.render(); return;
      case 'mes': E.filtros.mes = D.mesDe(D.sumarMeses(E.filtros.mes + '-01', Number(el.dataset.v))); app.render(); return;
      case 'sus-cancelar': { const s = { ...D.obtener(d, 'suscripciones', id) }; const antes = { ...s }; s.estado = 'cancelada'; s.renueva = false; D.guardar(d, 'suscripciones', s); app.cerrar(); listo(`${s.nombre} ya no se renovará. La puedes usar hasta el ${D.fechaBonita(s.proxima, hoy())}.`, () => D.guardar(db(), 'suscripciones', antes)); return; }
      case 'sus-reactivar': {
        const s = { ...D.obtener(d, 'suscripciones', id) }; const antes = { ...s };
        if (s.estado === 'cancelada' && s.proxima >= hoy()) { s.estado = 'activa'; s.renueva = true; D.guardar(d, 'suscripciones', s); app.cerrar(); listo(`${s.nombre} se volverá a renovar el ${D.fechaBonita(s.proxima, hoy())}.`, () => D.guardar(db(), 'suscripciones', antes)); return; }
        s.inicio = hoy(); s.proxima = D.siguientePeriodo(hoy(), s.frecuencia, Number(hoy().slice(8, 10))); s.estado = 'activa'; s.renueva = true;
        const g = D.guardar(d, 'suscripciones', s); const mov = D.pagoDeSuscripcion(d, g, hoy(), false);
        app.cerrar(); listo(`Reactivé ${s.nombre} desde hoy y registré el pago. Se renueva el ${D.fechaBonita(s.proxima, hoy())}.`, () => { D.guardar(db(), 'suscripciones', antes); if (mov) D.borrar(db(), 'movimientos', mov.id); });
        return;
      }
      case 'sus-pago': { const s = D.obtener(d, 'suscripciones', id); const mov = D.pagoDeSuscripcion(d, s, hoy(), false); app.cerrar(); listo(`Registré el pago de ${s.nombre}: ${D.dinero(s.monto)}`, () => mov && D.borrar(db(), 'movimientos', mov.id)); return; }
      case 'fijo-pagado': {
        const f = D.obtener(d, 'fijos', id);
        const mov = D.guardar(d, 'movimientos', { id: `auto-fijo-${f.id}-${D.mesDe(hoy())}`, tipo: 'gasto', monto: Number(f.monto) || 0, fecha: hoy(), categoria: f.categoria || 'hogar', descripcion: f.nombre, cuenta: f.pagaCon || d.ajustes.cuentaPredeterminada, pagoTipo: f.pagaTipo || 'cuenta', fijo: f.id });
        if (E.abierto) app.cerrar(); else app.render();
        listo(`Marqué ${f.nombre} como pagado`, () => D.borrar(db(), 'movimientos', mov.id)); return;
      }
      case 'neg-cobrar': {
        const n = { ...D.obtener(d, 'negocios', id) }; const antes = { ...n };
        const monto = (Number(n.ganancia) || 0) - (Number(n.costo) || 0);
        if (monto <= 0) return errorEditor('Pon cuánto ganaste en "Lo que podría ganar" antes de pasarlo a ingreso.');
        const mov = D.guardar(d, 'movimientos', { tipo: 'ingreso', monto, fecha: hoy(), fuente: 'ventas', descripcion: n.nombre, cuenta: d.ajustes.cuentaPredeterminada, pagoTipo: 'cuenta' });
        n.estado = 'cobrado'; D.guardar(d, 'negocios', n);
        app.cerrar(); listo(`Pasé ${D.dinero(monto)} a ingresos. Puedes cambiar la cuenta o la fuente en Movimientos.`, () => { D.borrar(db(), 'movimientos', mov.id); D.guardar(db(), 'negocios', antes); });
        return;
      }
      case 'prest-abono': {
        const monto = montoDe(`abono-${id}`); if (!monto) return errorEditor('Escribe cuánto abonó.');
        const p = { ...D.obtener(d, 'prestamos', id) }; const antes = { ...p, abonos: [...(p.abonos || [])] };
        p.abonos = [...(p.abonos || []), { monto, fecha: hoy(), cuenta: p.cuenta || null }]; D.guardar(d, 'prestamos', p);
        app.render(); listo(`Abono de ${D.dinero(monto)} agregado. Queda ${D.dinero(Math.max(0, D.prestamoSaldo(p)))}.`, () => D.guardar(db(), 'prestamos', antes)); return;
      }
      case 'meta-apartar': case 'meta-sacar': {
        const monto = montoDe(`meta-${id}`); if (!monto) return errorEditor('Escribe la cantidad.');
        const mt = { ...D.obtener(d, 'metas', id) }; const antes = { ...mt };
        mt.ahorrado = Math.max(0, (Number(mt.ahorrado) || 0) + (a === 'meta-apartar' ? monto : -monto)); D.guardar(d, 'metas', mt);
        app.render(); listo(a === 'meta-apartar' ? `Apartaste ${D.dinero(monto)} para ${mt.nombre}` : `Sacaste ${D.dinero(monto)} de ${mt.nombre}`, () => D.guardar(db(), 'metas', antes)); return;
      }
      case 'ajustes-guardar': {
        const v = leerEditorAbierto();
        if (v.umbralMicroModo === 'manual' && !(v.umbralMicro > 0)) return errorEditor('Escribe hasta cuánto cuenta como microgasto.');
        if (v.topeMicroModo === 'manual' && !(v.topeMicro > 0)) return errorEditor('Escribe el tope fijo de microgastos.');
        if (v.topeMicroModo === 'auto' && !(v.topeMicroPct > 0 && v.topeMicroPct <= 50)) return errorEditor('El porcentaje debe ser entre 1 y 50.');
        const cambios = { ...v, avisosDiasAntes: Math.min(15, Math.max(1, Math.round(v.avisosDiasAntes || 3))) };
        if ('bloqueoMinutos' in v) cambios.bloqueoMinutos = Math.min(120, Math.max(0, Math.round(v.bloqueoMinutos ?? 5)));
        D.guardarAjustes(d, cambios); app.render(); listo('Ajustes guardados'); return;
      }
      // ── PC ──
      case 'google-guardar': {
        const v = leerEditorAbierto();
        if (!v.clientIdWeb || !v.clientIdEscritorio) return errorEditor('Pega los dos ID de cliente.');
        try { await S.pc.configGoogle(v); E.estadoPC = await S.pc.estado(); aviso('Datos de Google guardados. Ahora toca "2. Conectar con Google Drive".'); app.render(); } catch (e) { errorEditor(e.message); }
        return;
      }
      case 'google-conectar': {
        try { await S.pc.conectarGoogle(); aviso('Se abrió Google en tu navegador. Acepta el permiso y regresa aquí.'); esperarConexion(); } catch (e) { errorEditor(e.message); }
        return;
      }
      case 'google-sync': try { await S.pc.sincronizar(); aviso('Sincronizando…'); setTimeout(async () => { E.estadoPC = await S.pc.estado(); app.render(); }, 4000); } catch (e) { errorEditor(e.message); } return;
      case 'google-desconectar': if (!el.classList.contains('confirmar')) { el.classList.add('confirmar'); el.textContent = '¿Seguro? Toca otra vez para desconectar'; return; } try { await S.pc.desconectarGoogle(); E.estadoPC = await S.pc.estado(); app.render(); aviso('Drive desconectado'); } catch (e) { errorEditor(e.message); } return;
      case 'probar-aviso': try { await S.pc.probarAviso(); aviso('Mira junto al reloj: debe salir una notificación.'); } catch (e) { aviso(e.message); } return;
      case 'respaldo': try { const r = await S.pc.respaldo(); aviso(`Respaldo guardado: ${r.archivo || 'listo'}`); } catch (e) { aviso(e.message); } return;
      case 'cambiar-pass': {
        const v = leerEditor(el.closest('.editor')); const err = document.getElementById('error-pass');
        if ((v.nueva || '').length < 8) { err.textContent = 'Mínimo 8 caracteres.'; return; }
        if (v.nueva !== v.nueva2) { err.textContent = 'No son iguales.'; return; }
        try {
          const r = await S.pc.llaveDispositivo(); if (!r?.mk) { err.textContent = 'Esta PC no está reconocida; vuelve a entrar con tu contraseña y marca "Recordar esta PC".'; return; }
          await S.pc.guardarLlave(await C.envolverConContrasena(C.deB64(r.mk), v.nueva));
          el.closest('.editor').querySelectorAll('input').forEach((i) => { i.value = ''; }); err.textContent = '';
          aviso('Contraseña cambiada. En el cel usa la nueva la próxima vez que te la pida.');
        } catch (e) { err.textContent = e.message; }
        return;
      }
      case 'olvidar-pc': if (!el.classList.contains('confirmar')) { el.classList.add('confirmar'); el.textContent = '¿Seguro? Al abrir te pedirá la contraseña. Toca otra vez.'; return; } await S.pc.olvidarDispositivo(); location.reload(); return;
      // ── Cel ──
      case 'cel-sync': await app.sincronizarCel(true); app.render(); return;
      case 'cel-notif': try { await app.activarNotificacionesCel(); aviso('Notificaciones activadas'); app.render(); } catch (e) { aviso(e.message); } return;
      case 'cel-probar': {
        if (Notification.permission !== 'granted') { aviso('Primero activa las notificaciones.'); return; }
        const reg = await navigator.serviceWorker.ready; await reg.showNotification('Economua', { body: 'Así te van a llegar los avisos de tus pagos.', icon: 'iconos/icono-192.png', badge: 'iconos/icono-192.png', tag: 'prueba' });
        return;
      }
      case 'cel-bloquear': app.bloquear(); return;
      case 'cel-huella': {
        const pass = document.getElementById('cel-pass')?.value || ''; if (!pass) { aviso('Escribe tu contraseña.'); return; }
        try { const mk = await C.abrirConContrasena(await S.kvLeer('llaveSobre'), pass); await app.registrarHuella(mk); document.getElementById('cel-pass').value = ''; aviso('Huella registrada de nuevo'); } catch (e) { aviso(e.message); }
        return;
      }
      case 'cel-olvidar': if (!el.classList.contains('confirmar')) { el.classList.add('confirmar'); el.textContent = '¿Seguro? Se borra todo de este cel (tus datos siguen en la PC). Toca otra vez.'; return; }
        for (const k of ['dispositivo', 'base', 'llaveSobre', 'enviadoHasta', 'baseMod', 'llaveMod', 'tokenDrive', 'avisos', 'llaveAvisos', 'pushClave', 'mostrados']) await S.kvBorrar(k);
        location.reload(); return;
      default: return;
    }
  }
  let reloj = null;
  function esperarConexion() {
    clearInterval(reloj); let vueltas = 0;
    reloj = setInterval(async () => {
      vueltas++;
      try { const e = await S.pc.estado(); E.estadoPC = e; if (e.driveConectado || vueltas > 60) { clearInterval(reloj); if (e.driveConectado) { aviso('✅ Google Drive conectado'); app.render(); } } } catch (er) { /* sigue */ }
    }, 3000);
  }

  function cambio(e) {
    const t = e.target;
    if (t.matches('[data-editor="movimientos"] [data-campo="tipo"]')) {
      const ed = t.closest('.editor'); const v = leerEditor(ed); const id = ed.querySelector('[data-acc="guardar"]').dataset.id;
      const orig = (id !== 'nuevo' && D.obtener(db(), 'movimientos', id)) || {};
      ed.outerHTML = editorMovimiento({ ...orig, ...v, tipo: t.value, cuenta: v.cuenta || orig.cuenta || db().ajustes.cuentaPredeterminada, categoria: v.categoria || orig.categoria || 'otros', fuente: v.fuente || orig.fuente || 'otros-ing' }, id);
    }
    if (t.dataset.acc2 === 'inicio-windows') S.pc.inicioWindows(t.checked).then(() => aviso(t.checked ? 'Economua se abrirá al encender la PC' : 'Economua ya no se abrirá solo')).catch((er) => aviso(er.message));
  }
  function montar(p, main) {
    if (p === 'movimientos') {
      const b = main.querySelector('#busca');
      if (b) { b.oninput = () => { E.filtros.busca = b.value; clearTimeout(b._t); b._t = setTimeout(() => { app.render(); const nb = document.querySelector('#busca'); if (nb) { nb.focus(); nb.setSelectionRange(nb.value.length, nb.value.length); } }, 350); }; }
    }
    if (p === 'conexion' && S.ES_PC && !E.estadoPC) S.pc.estado().then((e) => { E.estadoPC = e; app.render(); }).catch(() => {});
    main.querySelectorAll('.fila.tocable').forEach((f) => { f.onkeydown = (ev) => { if (ev.key === 'Enter') f.click(); }; });
  }

  return { html, accion, cambio, montar };
}
