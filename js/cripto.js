// Economua — cifrado. Todo pasa por aquí: AES-GCM 256 con una llave maestra.
// La llave maestra se guarda envuelta con tu contraseña (PBKDF2, 600,000 vueltas).
const enc = new TextEncoder();
const dec = new TextDecoder();
const ITERACIONES = 600000;

export function aB64(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}
export function deB64(texto) {
  const s = atob(texto);
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}
export function aleatorio(n) { return crypto.getRandomValues(new Uint8Array(n)); }

export function nuevaLlaveMaestra() { return aleatorio(32); }

export function importarLlave(raw, extraible = false) {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, extraible, ['encrypt', 'decrypt']);
}

export async function cifrar(llave, objeto) {
  const iv = aleatorio(12);
  const datos = enc.encode(JSON.stringify(objeto));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, llave, datos);
  return { v: 1, iv: aB64(iv), ct: aB64(ct) };
}

export async function descifrar(llave, sobre) {
  if (!sobre || sobre.v !== 1 || !sobre.iv || !sobre.ct) throw new Error('Archivo cifrado no válido');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(sobre.iv) }, llave, deB64(sobre.ct));
  return JSON.parse(dec.decode(pt));
}

async function llaveDeContrasena(contrasena, sal, iter) {
  const base = await crypto.subtle.importKey('raw', enc.encode(contrasena), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

// Envuelve la llave maestra con la contraseña. El resultado se puede guardar en cualquier lado.
export async function envolverConContrasena(raw, contrasena) {
  const sal = aleatorio(16);
  const iv = aleatorio(12);
  const k = await llaveDeContrasena(contrasena, sal, ITERACIONES);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, raw);
  return { v: 1, tipo: 'llave-economua', sal: aB64(sal), iter: ITERACIONES, iv: aB64(iv), ct: aB64(ct) };
}

// Devuelve la llave maestra (bytes) o lanza error si la contraseña está mal.
export async function abrirConContrasena(sobre, contrasena) {
  const k = await llaveDeContrasena(contrasena, deB64(sobre.sal), sobre.iter || ITERACIONES);
  try {
    const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(sobre.iv) }, k, deB64(sobre.ct));
    return new Uint8Array(raw);
  } catch (e) {
    throw new Error('Contraseña incorrecta');
  }
}

// Llave derivada de la huella (extensión PRF de WebAuthn) para envolver la llave maestra en el cel.
export async function llaveDeSecreto(secretoBytes) {
  const base = await crypto.subtle.importKey('raw', secretoBytes, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('economua-huella'), info: enc.encode('llave') },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function envolverConLlave(llave, raw) {
  const iv = aleatorio(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, llave, raw);
  return { iv: aB64(iv), ct: aB64(ct) };
}
export async function abrirConLlave(llave, sobre) {
  const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(sobre.iv) }, llave, deB64(sobre.ct));
  return new Uint8Array(raw);
}
