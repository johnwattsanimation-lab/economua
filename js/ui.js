// Economua — piezas de pantalla reutilizables.
import { dinero } from './datos.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const m = (n) => `<span class="m-dinero">${esc(dinero(n))}</span>`;
// Texto del chat: escapa y convierte **negritas** y cantidades en dinero ocultable.
export function md(linea) {
  return esc(linea).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/-?\$[\d,]+(\.\d{1,2})?/g, (x) => `<span class="m-dinero">${x}</span>`);
}

// ── Aviso flotante con "Deshacer" ──
let temporizador = null;
export function aviso(texto, accion) {
  const el = document.getElementById('aviso');
  el.innerHTML = `<span>${esc(texto)}</span>${accion ? `<button type="button">${esc(accion.texto || 'Deshacer')}</button>` : ''}`;
  el.hidden = false;
  if (accion) el.querySelector('button').onclick = () => { el.hidden = true; accion.fn(); };
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { el.hidden = true; }, accion ? 7000 : 3500);
}

// ── Editor en línea (se abre dentro de la lista) ──
// campo: { k, label, tipo: texto|numero|dinero|fecha|dia|select|bool|area|palabras, opciones:[[valor, texto]], ayuda, ancho }
export function editorHTML(campos, valores = {}, prefijo = 'e') {
  return `<div class="campos">${campos.map((c) => campoHTML(c, valores[c.k], prefijo)).join('')}</div>`;
}
function campoHTML(c, v, prefijo) {
  const id = `${prefijo}-${c.k}`;
  const ayuda = c.ayuda ? `<div class="ayuda">${esc(c.ayuda)}</div>` : '';
  const ancho = c.ancho || c.tipo === 'area' ? ' ancho' : '';
  if (c.tipo === 'bool') return `<div class="campo${ancho}"><label class="interruptor"><input type="checkbox" id="${id}" data-campo="${c.k}" data-tipo="bool" ${v ? 'checked' : ''}> <span>${esc(c.label)}</span></label>${ayuda}</div>`;
  let control;
  switch (c.tipo) {
    case 'select': control = `<select id="${id}" data-campo="${c.k}" data-tipo="select">${(c.opciones || []).map(([val, txt]) => `<option value="${esc(val)}" ${String(val) === String(v ?? '') ? 'selected' : ''}>${esc(txt)}</option>`).join('')}</select>`; break;
    case 'area': control = `<textarea id="${id}" data-campo="${c.k}" data-tipo="texto" maxlength="2000">${esc(v ?? '')}</textarea>`; break;
    case 'fecha': control = `<input type="date" id="${id}" data-campo="${c.k}" data-tipo="texto" value="${esc(v ?? '')}">`; break;
    case 'dia': control = `<input type="number" inputmode="numeric" min="1" max="31" step="1" id="${id}" data-campo="${c.k}" data-tipo="numero" value="${esc(v ?? '')}" placeholder="1 a 31">`; break;
    case 'dinero': control = `<input type="text" inputmode="decimal" id="${id}" data-campo="${c.k}" data-tipo="numero" value="${v === undefined || v === null || v === '' ? '' : esc(v)}" placeholder="$0" autocomplete="off">`; break;
    case 'numero': control = `<input type="text" inputmode="decimal" id="${id}" data-campo="${c.k}" data-tipo="numero" value="${v === undefined || v === null || v === '' ? '' : esc(v)}" autocomplete="off">`; break;
    case 'clave': control = `<input type="password" id="${id}" data-campo="${c.k}" data-tipo="texto" value="" autocomplete="new-password">`; break;
    case 'palabras': control = `<input type="text" id="${id}" data-campo="${c.k}" data-tipo="palabras" value="${esc((v || []).join(', '))}" autocomplete="off">`; break;
    default: control = `<input type="text" id="${id}" data-campo="${c.k}" data-tipo="texto" value="${esc(v ?? '')}" maxlength="120" autocomplete="off">`;
  }
  return `<div class="campo${ancho}"><label for="${id}">${esc(c.label)}</label>${control}${ayuda}</div>`;
}
export function leerEditor(contenedor) {
  const out = {};
  for (const el of contenedor.querySelectorAll('[data-campo]')) {
    const k = el.dataset.campo;
    if (el.dataset.tipo === 'bool') out[k] = el.checked;
    else if (el.dataset.tipo === 'numero') { const t = el.value.replace(/[$\s,]/g, ''); out[k] = t === '' ? null : Number(t); }
    else if (el.dataset.tipo === 'palabras') out[k] = el.value.split(',').map((x) => x.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')).filter(Boolean);
    else out[k] = el.value.trim();
  }
  return out;
}
export function numeroValido(v) { return typeof v === 'number' && isFinite(v); }
