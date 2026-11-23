// Economua — diccionario del chat: verbos en todos sus tiempos, sinónimos, modismos y palabras relacionadas.
// Todo va sin acentos (el chat quita los acentos antes de buscar).

// ───────── Conjugador sencillo (verbos regulares + cambios de ortografía) ─────────
// Cada forma se marca con la persona: '1' = yo/nosotros, '3' = él/ellos, 'n' = neutra (infinitivo, gerundio, participio).
function conjugar(lemma, irregulares = {}) {
  const out = [];
  const add = (f, p) => { if (f) out.push([f, p]); };
  const fin = lemma.slice(-2); const raiz = lemma.slice(0, -2);
  let preYo = raiz + (fin === 'ar' ? 'e' : 'i');
  if (fin === 'ar') {
    if (raiz.endsWith('c')) preYo = raiz.slice(0, -1) + 'que';
    else if (raiz.endsWith('g')) preYo = raiz + 'ue';
    else if (raiz.endsWith('z')) preYo = raiz.slice(0, -1) + 'ce';
  }
  add(lemma, 'n'); add(lemma + 'me', 'n'); add(lemma + 'lo', 'n'); add(lemma + 'la', 'n'); add(lemma + 'le', 'n'); add(lemma + 'les', 'n');
  if (fin === 'ar') {
    add(raiz + 'o', '1'); add(raiz + 'as', '1'); add(raiz + 'a', '3'); add(raiz + 'amos', '1'); add(raiz + 'an', '3');
    add(preYo, '1'); add(raiz + 'aste', '1'); add(raiz + 'o', '1'); add(raiz + 'o', '3'); add(raiz + 'aron', '3');
    add(raiz + 'aba', '1'); add(raiz + 'abamos', '1'); add(raiz + 'aban', '3');
    add(raiz + 'are', '1'); add(raiz + 'ara', '3'); add(raiz + 'aremos', '1'); add(raiz + 'aran', '3');
    add(raiz + 'aria', '1');
    add(raiz + 'ando', 'n'); add(raiz + 'ado', 'n'); add(raiz + 'ada', 'n'); add(raiz + 'ados', 'n'); add(raiz + 'adas', 'n');
  } else {
    const v = fin === 'er' ? 'e' : 'i';
    add(raiz + 'o', '1'); add(raiz + 'es', '1'); add(raiz + 'e', '3'); add(raiz + v + 'mos', '1'); add(raiz + 'en', '3');
    add(raiz + 'i', '1'); add(raiz + 'iste', '1'); add(raiz + 'imos', '1'); add(raiz + 'io', '3'); add(raiz + 'ieron', '3');
    add(raiz + 'ia', '1'); add(raiz + 'iamos', '1'); add(raiz + 'ian', '3');
    add(raiz + v + 're', '1'); add(raiz + v + 'ra', '3'); add(raiz + v + 'remos', '1'); add(raiz + v + 'ran', '3');
    add(raiz + v + 'ria', '1');
    add(raiz + 'iendo', 'n'); add(raiz + 'ido', 'n'); add(raiz + 'ida', 'n'); add(raiz + 'idos', 'n'); add(raiz + 'idas', 'n');
  }
  for (const [p, formas] of Object.entries(irregulares)) for (const f of formas.split(' ')) add(f, p);
  return out;
}

// ───────── Verbos por significado ─────────
// tipo: 'gasto' | 'ingreso' | 'doble' (yo → gasto, me + él/ellos → ingreso) | 'cobrar' (yo → ingreso, me cobraron → gasto)
//       'saldo' | 'deber' | 'prestar' | 'apartar' | 'mover' | 'llegar' (siempre ingreso)
const VERBOS = {
  gasto: {
    gastar: {}, comprar: {}, adquirir: { 1: 'adquiero adquieres', 3: 'adquiere adquieren' }, consumir: {}, desembolsar: {}, costear: {}, sufragar: {},
    erogar: {}, invertir: { 1: 'invierto inviertes invirtieron', 3: 'invierte invierten invirtio invirtieron' }, derrochar: {}, despilfarrar: {}, malgastar: {},
    dilapidar: {}, tirar: {}, botar: {}, fundir: {}, quemar: {}, perder: { 1: 'pierdo pierdes', 3: 'pierde pierden' }, apostar: { 1: 'apuesto apuestas', 3: 'apuesta apuestan' },
    soltar: { 1: 'suelto sueltas', 3: 'suelta sueltan' }, aflojar: {}, apoquinar: {}, invitar: {}, ordenar: {}, contratar: {}, rentar: {}, alquilar: {}, reservar: {},
    encargar: {}, echar: {}, cargar: {}, recargar: {}, llenar: {}, surtir: {}, cooperar: {}, arreglar: {}, reparar: {}, componer: { 1: 'compongo compuse', 3: 'compuso compusieron' },
    comer: {}, cenar: {}, desayunar: {}, almorzar: { 1: 'almuerzo almorce', 3: 'almuerza' }, merendar: { 1: 'meriendo', 3: 'merienda' }, tomar: {}, beber: {},
    agarrar: {}, pedir: { 1: 'pido pides pedi', 3: 'pide piden pidio pidieron' }, meter: {}, poner: { 1: 'pongo puse pusimos', 3: 'pone ponen puso pusieron' },
    cubrir: {}, solventar: {}, costar: { 3: 'cuesta cuestan costo costaron' }, salir: { 1: 'salgo', 3: 'sale salen salio salieron' }, entregar: {},
    financiar: {}, liquidar: {}, saldar: {}, suscribir: { 1: 'suscribi', 3: 'suscribio' },
    inscribir: {}, contribuir: { 1: 'contribuyo', 3: 'contribuye contribuyo contribuyeron' }, aportar: {},
    canjear: {}, vaciar: {}, estrenar: {}, consentir: { 1: 'consiento consenti', 3: 'consintio' }, chingar: {}, robar: {}, quitar: {},
    clavar: {}, volar: {}, tumbar: {}, desplumar: {},
  },
  doble: {
    pagar: {}, dar: { 1: 'doy das dimos di diste dare daremos', 3: 'da dan dio dieron dara daran' }, depositar: {}, transferir: { 1: 'transfiero transfieres transferi', 3: 'transfiere transfieren transfirio transfirieron' },
    mandar: {}, enviar: { 1: 'envio envias', 3: 'envia envian' }, regalar: {}, donar: {}, devolver: { 1: 'devuelvo devuelves', 3: 'devuelve devuelven' }, reembolsar: {},
    abonar: {}, girar: {}, pasar: {}, adelantar: {}, dispersar: {}, acreditar: {}, reponer: { 1: 'repongo repuse', 3: 'repuso repusieron' }, regresar: {}, rembolsar: {},
    obsequiar: {}, premiar: {}, apoyar: {},
  },
  cobrar: { cobrar: {} },
  ingreso: {
    ganar: {}, recibir: {}, obtener: { 1: 'obtengo obtuve obtuvimos', 3: 'obtiene obtienen obtuvo obtuvieron' }, conseguir: { 1: 'consigo consigues consegui', 3: 'consigue consiguen consiguio consiguieron' },
    juntar: {}, percibir: {}, ingresar: {}, embolsar: {}, vender: {}, facturar: {}, generar: {}, producir: { 1: 'produzco produje', 3: 'produjo produjeron' },
    recaudar: {}, colectar: {}, recolectar: {}, reunir: { 1: 'reuno', 3: 'reune reunen' }, heredar: {}, lograr: {}, cosechar: {}, monetizar: {},
    hacer: { 1: 'hago hice hicimos', 3: 'hace hacen hizo hicieron' }, sacar: {}, rendir: { 1: 'rindo', 3: 'rinde rinden rindio rindieron' }, chambear: {}, trabajar: {},
  },
  llegar: { llegar: {}, entrar: {}, caer: { 1: 'caigo', 3: 'cae caen cayo cayeron' }, caerme: {}, llover: { 3: 'llueve llovio' } },
  saldo: {
    sobrar: {}, acumular: {},
    tener: { 1: 'tengo tienes tuve tuvimos tenia tendre tenemos', 3: 'tiene tienen tuvo tuvieron tenia tendra' }, traer: { 1: 'traigo traes traje trajimos', 3: 'trae traen trajo trajeron' },
    disponer: { 1: 'dispongo', 3: 'dispone' }, quedar: {}, haber: { 3: 'hay habia habra' }, conservar: {}, poseer: { 1: 'poseo', 3: 'posee' },
  },
  deber: { deber: {}, adeudar: {}, endeudar: {} },
  prestar: { prestar: {}, fiar: { 1: 'fio fie', 3: 'fia fio fiaron' } },
  apartar: { apartar: {}, ahorrar: {}, guardar: {}, separar: {}, destinar: {} },
  mover: { traspasar: {}, mover: { 1: 'muevo mueves', 3: 'mueve mueven' }, retirar: {} },
};

// Mapa forma → [{lema, tipo, persona}]
export const FORMAS = new Map();
for (const [tipo, verbos] of Object.entries(VERBOS)) {
  for (const [lema, irr] of Object.entries(verbos)) {
    for (const [forma, persona] of conjugar(lema, irr)) {
      const lista = FORMAS.get(forma) || [];
      if (!lista.some((x) => x.lema === lema && x.tipo === tipo && x.persona === persona)) lista.push({ lema, tipo, persona });
      FORMAS.set(forma, lista);
    }
  }
}
// Palabras que también son sustantivos muy comunes: no las tomamos como verbo
for (const w of ['de', 'do', 'des', 'den', 'a', 'e', 'o', 'la', 'lo', 'le', 'me', 'se', 'es', 'en', 'un', 'una', 'el', 'al', 'del', 'con', 'por', 'para', 'mas', 'fue', 'va', 've', 'dar', 'saldo', 'saldos', 'salda', 'cuenta', 'cuentas', 'gastos', 'compras', 'pagos', 'tomas', 'meta', 'metas', 'deposito', 'depositos', 'regalo', 'regalos', 'cargo', 'cargos', 'abono', 'abonos', 'ahorro', 'ahorros', 'cobro', 'cobros', 'entrada', 'entradas', 'renta', 'cena', 'comida', 'comidas', 'pedido', 'pedidos', 'apuesta', 'apuestas', 'reserva', 'paso', 'pasos', 'llegada', 'salida', 'gana', 'ganas', 'vale', 'quedo']) FORMAS.delete(w);

// ───────── Frases hechas (se buscan antes que las palabras sueltas) ─────────
export const FRASES_GASTO = ['se me fue', 'se me fueron', 'se fue en', 'se me fue en', 'se me escapo', 'me clavaron', 'me bajaron', 'me quitaron', 'me robaron', 'me sacaron',
  'me tumbaron', 'me volaron', 'me chingaron', 'me cobraron', 'me cobro', 'me costo', 'me costaron', 'me salio', 'me salieron', 'me hice', 'me compre', 'me di un gusto',
  'me consenti', 'me lleve', 'me eche', 'me tome', 'me pedi', 'pague con', 'gasto de', 'compra de', 'pago de', 'pagos de', 'se pago', 'se gasto', 'di de', 'deje de propina'];
export const FRASES_INGRESO = ['me llego', 'me llegaron', 'me entro', 'me entraron', 'me cayo', 'me cayeron', 'me depositaron', 'me deposito', 'me pagaron', 'me pago',
  'me dieron', 'me dio', 'me transfirieron', 'me transfirio', 'me mandaron', 'me mando', 'me enviaron', 'me envio', 'me regalaron', 'me regalo', 'me donaron', 'me dono',
  'me devolvieron', 'me devolvio', 'me reembolsaron', 'me abonaron', 'me soltaron', 'me pasaron', 'me paso', 'me adelantaron', 'me acreditaron', 'me dispersaron', 'me regresaron',
  'me regreso', 'me repusieron', 'me premiaron', 'me apoyaron', 'me cayo lana', 'ingreso de', 'entrada de', 'ganancia de', 'ganancias de', 'sueldo de', 'quincena de', 'nomina de',
  'bono de', 'aguinaldo de', 'comision de', 'propina de', 'propinas de', 'regalias de', 'venta de', 'ventas de', 'donacion de', 'donaciones de', 'me tocaron', 'me toco de'];
export const FRASES_SALDO = ['tengo', 'traigo', 'me quedan', 'me queda', 'quedan', 'queda', 'hay', 'cuento con', 'dispongo de', 'mi saldo', 'saldo de', 'saldo en', 'el saldo',
  'tengo ahorrado', 'tengo guardado', 'tengo juntado', 'llevo ahorrado', 'llevo juntado', 'tengo disponible', 'disponible en', 'tiene mi cuenta', 'mi cuenta tiene', 'en mi cuenta hay',
  'tengo en', 'esta en', 'estan en', 'traigo en', 'cuento con', 'contamos con', 'cuenta con',
  'tengo de ahorro', 'tengo de ahorros', 'mis ahorros son', 'mis ahorros', 'en mis ahorros', 'en la cajita', 'en mi cajita', 'en el apartado', 'tengo invertido', 'tengo invertidos',
  'tengo en el banco', 'me sobra', 'me sobran', 'sobran', 'tengo disponible', 'saldo disponible', 'queda en', 'tengo acumulado', 'tengo acumulados', 'tengo reunido', 'tengo reunidos',
  'llevo guardado', 'llevo guardados', 'tengo guardados', 'tengo ahorrados', 'tengo juntados', 'tengo apartado', 'tengo apartados', 'mi cuenta trae', 'en la cuenta hay', 'en mi cuenta tengo',
  'cuento ahorita con', 'ahorita tengo', 'ahora tengo', 'actualmente tengo', 'tengo un saldo de', 'tengo saldo de', 'el saldo es', 'mi saldo es', 'saldo actual', 'balance', 'mi balance'];
export const PALABRAS_INGRESO = new Set(['sueldo', 'quincena', 'nomina', 'salario', 'bono', 'aguinaldo', 'comision', 'comisiones', 'propinas', 'regalias', 'ganancia', 'ganancias',
  'utilidad', 'utilidades', 'ingreso', 'ingresos', 'entrada', 'donacion', 'donaciones', 'subs', 'bits', 'regalitos', 'diamantes', 'monedas', 'patrocinio', 'patrocinios', 'pago', 'cobro',
  'reembolso', 'devolucion', 'premio', 'herencia', 'finiquito', 'liquidacion', 'utilidades', 'rendimiento', 'rendimientos', 'intereses', 'dividendos', 'cashback', 'beca', 'apoyo', 'pension']);
export const PALABRAS_GASTO = new Set(['gasto', 'gastos', 'compra', 'compras', 'pago', 'cuenta', 'consumo', 'antojo', 'gustito', 'gusto', 'capricho', 'propina', 'multa', 'cuota', 'colegiatura',
  'inscripcion', 'mensualidad', 'renta', 'recibo', 'factura', 'boleto', 'boletos', 'pasaje', 'cooperacion', 'cooperacha', 'vaquita', 'tanda']);
export const PALABRAS_DINERO = new Set(['pesos', 'peso', 'varos', 'varo', 'baros', 'baro', 'lana', 'feria', 'billete', 'billetes', 'morlacos', 'morlaco', 'pesitos', 'mxn', 'lucas', 'luca',
  'dinero', 'efectivo', 'cash', 'plata', 'centavos', 'kilos', 'kilo', 'mil', 'k']);

// Modales: "¿puedo gastar…?", "quiero comprar…", "voy a…", "me alcanza…"
export const RE_CONSULTA = /\b(puedo|podria|podre|quiero|quisiera|queria|voy a|vamos a|pienso|planeo|me gustaria|tengo ganas de|me late|deberia|debo|me conviene|conviene|convendria|vale la pena|es buena idea|seria buena idea|me alcanza|alcanza|me da para|estoy pensando en|ando pensando|se me antoja|me quiero|necesito)\b.*\b(gastar|gastarme|comprar|comprarme|pedir|pedirme|pagar|darme|ir por|echarme|invitar|contratar|rentar|suscribirme|meterle|meter|tomar|tomarme|comer|llevarme|agarrar|adquirir|invertir|apostar|ir al|ir a|salir)\b|\b(me alcanza para|alcanza para|gastare|comprare|pagare|me comprare|pedire|invertire)\b/;

// Bancos y carteras conocidos (para reconocer cuentas nuevas por su nombre)
export const BANCOS = {
  'bbva': 'BBVA', 'bancomer': 'BBVA', 'banamex': 'Banamex', 'citibanamex': 'Banamex', 'santander': 'Santander', 'banorte': 'Banorte', 'hsbc': 'HSBC', 'scotiabank': 'Scotiabank',
  'scotia': 'Scotiabank', 'banco azteca': 'Banco Azteca', 'azteca': 'Banco Azteca', 'nu': 'Nu', 'nubank': 'Nu', 'mercado pago': 'Mercado Pago', 'mercadopago': 'Mercado Pago',
  'spin': 'Spin', 'spin by oxxo': 'Spin', 'klar': 'Klar', 'stori': 'Stori', 'hey banco': 'Hey Banco', 'bancoppel': 'BanCoppel', 
  'inbursa': 'Inbursa', 'afirme': 'Afirme', 'banregio': 'Banregio', 'paypal': 'PayPal', 'didi card': 'DiDi', 'ualá': 'Ualá', 'uala': 'Ualá', 'revolut': 'Revolut',
  'vexi': 'Vexi', 'rappicard': 'Rappi', 'openbank': 'Openbank', 'fondeadora': 'Fondeadora', 'bitso': 'Bitso', 'binance': 'Binance', 'cetes': 'CETES',
  'cetesdirecto': 'CETES', 'gbm': 'GBM', 'banco del bienestar': 'Banco del Bienestar', 'bankaool': 'Bankaool', 'albo': 'albo', 'finsus': 'Finsus',
  'kapital': 'Kapital', 'mifel': 'Mifel', 'banbajio': 'BanBajío', 'bajio': 'BanBajío', 'amex': 'American Express', 'american express': 'American Express', 
  'invex': 'Invex', 'banjercito': 'Banjército', 'twitch': 'Twitch', 'kick': 'Kick', 'tiktok': 'TikTok', 'patreon': 'Patreon',
};
export const PALABRAS_EFECTIVO = /\b(efectivo|cash|cartera|billetera|bolsillo|bolsa|mano|en la mano|alcancia|cochinito|guardadito)\b/;

// Servicios de suscripción con su nombre bonito
export const SERVICIOS = {
  'netflix': 'Netflix', 'spotify': 'Spotify', 'disney plus': 'Disney+', 'disney': 'Disney+', 'hbo max': 'Max', 'max': 'Max', 'hbo': 'Max', 'prime video': 'Prime Video', 'amazon prime': 'Amazon Prime',
  'prime': 'Amazon Prime', 'youtube premium': 'YouTube Premium', 'youtube music': 'YouTube Music', 'crunchyroll': 'Crunchyroll', 'xbox game pass': 'Xbox Game Pass', 'game pass': 'Xbox Game Pass',
  'gamepass': 'Xbox Game Pass', 'ps plus': 'PS Plus', 'playstation plus': 'PS Plus', 'nintendo online': 'Nintendo Switch Online', 'nintendo switch online': 'Nintendo Switch Online',
  'apple music': 'Apple Music', 'apple tv': 'Apple TV+', 'icloud': 'iCloud', 'google one': 'Google One', 'chatgpt plus': 'ChatGPT Plus', 'chatgpt go': 'ChatGPT Go', 'chatgpt pro': 'ChatGPT Pro',
  'chatgpt': 'ChatGPT', 'chat gpt': 'ChatGPT', 'openai': 'ChatGPT', 'claude': 'Claude', 'claude pro': 'Claude Pro', 'gemini': 'Gemini', 'canva': 'Canva', 'adobe': 'Adobe', 'photoshop': 'Adobe Photoshop',
  'paramount': 'Paramount+', 'vix': 'ViX', 'star plus': 'Star+', 'twitch turbo': 'Twitch Turbo', 'discord nitro': 'Discord Nitro', 'nitro': 'Discord Nitro', 'deezer': 'Deezer', 'mubi': 'MUBI',
  'microsoft 365': 'Microsoft 365', 'office': 'Microsoft 365', 'capcut': 'CapCut', 'notion': 'Notion', 'midjourney': 'Midjourney', 'gimnasio': 'Gimnasio', 'gym': 'Gimnasio', 'smart fit': 'Smart Fit',
  'rappi pro': 'Rappi Pro', 'uber one': 'Uber One', 'didi pass': 'DiDi Pass', 'meli plus': 'Meli+', 'mercado libre': 'Meli+', 'telcel': 'Telcel', 'totalplay': 'Totalplay', 'izzi': 'izzi',
  'megacable': 'Megacable', 'telmex': 'Telmex', 'blim': 'Blim', 'pluto': 'Pluto TV', 'tidal': 'Tidal', 'audible': 'Audible', 'kindle unlimited': 'Kindle Unlimited', 'duolingo': 'Duolingo',
  'elevenlabs': 'ElevenLabs', 'suno': 'Suno', 'patreon': 'Patreon', 'onlyfans': 'OnlyFans', 'github copilot': 'GitHub Copilot', 'copilot': 'Copilot', 'cursor': 'Cursor', 'perplexity': 'Perplexity',
  'grok': 'Grok', 'x premium': 'X Premium', 'vpn': 'VPN', 'nordvpn': 'NordVPN', 'dropbox': 'Dropbox', 'steam': 'Steam', 'ea play': 'EA Play', 'ubisoft': 'Ubisoft+', 'minecraft realms': 'Minecraft Realms',
  'realms': 'Minecraft Realms', 'streamelements': 'StreamElements', 'streamlabs': 'Streamlabs',
};
export const RE_SUSCRIPCION = /\b(suscri\w*|subscri\w*|membresia\w*|mensualidad\w*|renovacion|se renueva|renueva|plan mensual|plan anual|premium|se cobra cada|me cobran cada|cobran cada|cada mes|mensual|mensuales|al mes|por mes|anual|anualidad|cada ano|al ano|por ano|semanal|cada semana|quincenal|cada (15|quince) dias|trimestral|cada (3|tres) meses|cada \d{1,2} del mes|cada dia \d{1,2}|de cada mes|los dias \d{1,2})\b/;

// Palabras que no describen nada (se quitan para sacar la descripción)
export const STOP = new Set(('me mi mis te tu tus un una unos unas uno el la los las lo al del de en por para con y o a que hoy ayer antier se le les ya solo nomas como ahi aqui eso esto este esta ' +
  'estos estas ese esa mas bien muy pues tambien igual cosa cosas algo nada pero porque total casi aprox aproximadamente tantito otra otro otras otros mismo misma nuevo nueva ' +
  'es era fue son eran fueron sera seria suscripcion suscripciones mensual mensuales mensualidad cada mes meses dia dias del semana semanas ano anos anual quincenal semanal trimestral ' +
  'renueva renovacion cobra cobran plan nos su sus sobre desde hasta entre hacia segun sin tras ahora luego despues antes tarde manana noche como cuando donde quien cual ' +
  'pesos peso varos varo baros baro lana feria billete billetes morlacos morlaco pesitos mxn lucas luca dinero cash plata centavos mil k gasto gastos compra pago ingreso ' +
  'cuenta tarjeta credito debito saldo efectivo transferencia deposito unos unas haber hay le lo ' +
  'puedo podria podre quiero quisiera queria voy vamos pienso planeo gustaria ganas late deberia debo conviene convendria alcanza necesito antoja pensando ando estoy idea buena vale pena seria tengo tenemos que').split(' '));

// Palabras de confirmar / cancelar escritas
export const RE_SI = /^(si|sip|sii|simon|sale|va|vale|dale|ok|okay|okey|oki|listo|correcto|asi|asi esta|asi es|esta bien|perfecto|confirmo|confirmar|confirma|guardalo|guardar|guarda|anotalo|registralo|claro|exacto|eso|eso es|de acuerdo|adelante|hazlo)\b/;
export const RE_NO = /^(no|nop|nel|cancela|cancelar|cancelalo|olvidalo|olvida|dejalo|mejor no|nada|borra eso|no lo guardes|no gracias|ya no)$/;
