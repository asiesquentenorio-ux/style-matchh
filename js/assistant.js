// js/assistant.js
// Vender prenda, panel del equipo, asistente de estilo y pedido por WhatsApp.
// Se carga antes de app.js; usa $, PRODUCTS, cart, note, icons y applyFilters de app.js.

const CONFIG = { pin: "1234" }; // PIN del panel del equipo (cámbialo)
const F = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white";
const BTN = "w-full bg-indigo-600 hover:bg-indigo-700 text-on font-bold py-3 rounded-xl transition";
const wa = t => { const l = CAT("nums"), n = (l.find(x => x.main) || l[0] || {}).num || ""; window.open(`https://wa.me/${n}?text=${encodeURIComponent(t)}`, "_blank", "noopener"); };
const esc = s => s.replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
};

const DB = { get: k => store.get("sm_" + k, k === "nums" ? [{ id: 1, label: "Principal", num: "51939130324", main: true }] : k === "over" || k === "photos" ? {} : []), set: (k, v) => store.set("sm_" + k, v) };
let cam, adminOK = false, SHARED = null, sellPhoto = null, pendingPhoto = null;
// Catálogo compartido: catalog.json (junto a index.html) lo ven todos los visitantes
async function loadShared() { try { const r = await fetch("catalog.json", { cache: "no-store" }); if (r.ok) SHARED = await r.json(); } catch {} }
function CAT(k) { try { if (localStorage.getItem("sm_" + k) !== null) return DB.get(k); } catch {} return SHARED && SHARED[k] !== undefined ? SHARED[k] : DB.get(k); }
function seed() { ["nums", "extra", "del", "over", "photos"].forEach(k => { try { if (localStorage.getItem("sm_" + k) === null && SHARED && SHARED[k] !== undefined) DB.set(k, SHARED[k]); } catch {} }); }
function shrink(file) { return new Promise(res => { const im = new Image(); im.onload = () => { const k = Math.min(1, 640 / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = im.width * k; c.height = im.height * k; c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", 0.72)); }; im.onerror = () => res(null); im.src = URL.createObjectURL(file); }); }
function paintPhotos() {
  const ph = CAT("photos");
  document.querySelectorAll("#product-grid article").forEach(a => { const m = /addToCart\((\d+)\)/.exec(a.innerHTML), src = m && ph[m[1]]; if (src) a.firstElementChild.innerHTML = `<img src="${src}" alt="" class="w-full h-full object-cover">`; });
}
const stopCam = () => { if (cam) cam.getTracks().forEach(t => t.stop()); cam = null; };
function closeSheet(id) { stopCam(); const m = document.getElementById(id); if (m) m.remove(); }
function sheet(id, title, body, w = "max-w-md") {
  let m = document.getElementById(id);
  if (!m) { m = document.createElement("div"); m.id = id; document.body.appendChild(m); }
  m.className = "fixed inset-0 z-[65] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4";
  m.innerHTML = `<div class="bg-white rounded-3xl ${w} w-full p-6 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto"><div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold text-slate-900">${title}</h3><button data-x class="p-1 rounded-lg text-slate-400 hover:text-slate-600" aria-label="Cerrar"><i data-lucide="x" class="w-5 h-5"></i></button></div>${body}</div>`;
  m.onclick = e => { if (e.target === m || e.target.closest("[data-x]")) closeSheet(id); };
  icons();
}
function refreshCats() {
  const s = $("f-cat"), v = s.value;
  s.innerHTML = '<option value="">Todas las categorías</option>' + [...new Set(PRODUCTS.map(x => x.c))].map(c => `<option>${c}</option>`).join("");
  s.value = v;
}

// ---- Vender mi prenda ----
function openSell() {
  sellPhoto = null;
  const cats = [...new Set(PRODUCTS.map(x => x.c))];
  sheet("sell-modal", "Vender mi prenda", `<div class="space-y-3">
    <input id="sl-photo" type="file" accept="image/*" class="${F}">
    <img id="sl-prev" class="hidden w-full h-40 object-cover rounded-xl" alt="Vista previa">
    <input id="sl-name" placeholder="¿Qué prenda es?" class="${F}">
    <div class="grid grid-cols-2 gap-3"><select id="sl-cat" class="${F}">${cats.map(c => `<option>${c}</option>`).join("")}</select><input id="sl-price" type="number" min="1" placeholder="Precio $" class="${F}"></div>
    <input id="sl-desc" placeholder="Talla, estado, marca..." class="${F}">
    <input id="sl-who" placeholder="Tu nombre" autocomplete="name" class="${F}">
    <button id="sl-send" class="w-full bg-emerald-600 hover:bg-emerald-700 text-snow font-bold py-3 rounded-xl transition">Enviar por WhatsApp</button></div>`);
  $("sl-photo").onchange = async e => { const f = e.target.files[0]; if (!f) return; sellPhoto = await shrink(f); const p = $("sl-prev"); if (sellPhoto) { p.src = sellPhoto; p.classList.remove("hidden"); } };
  $("sl-send").onclick = () => {
    const n = $("sl-name").value.trim(), w = $("sl-who").value.trim();
    if (!n || !w) return note("Falta el nombre de la prenda y el tuyo");
    wa(`Hola Style Match, quiero vender una prenda:\n• ${n} (${$("sl-cat").value})\n• Precio: $${$("sl-price").value || "a consultar"}\n• ${$("sl-desc").value || "Sin detalles"}\n• Soy ${w}\nTe envío la foto por aquí.`);
    DB.set("sells", [{ id: Date.now(), f: new Date().toISOString(), who: w, n, cat: $("sl-cat").value, price: $("sl-price").value, img: sellPhoto, desc: $("sl-desc").value, st: "pendiente" }, ...DB.get("sells")]);
    closeSheet("sell-modal"); note("Listo: adjunta la foto en el chat de WhatsApp");
  };
}

// ---- Pedido del carrito ----
function sendToWhatsApp() {
  if (!cart.length) return note("Tu carrito está vacío");
  const n = $("co-name").value.trim(), nt = $("co-note").value.trim(), total = cart.reduce((t, x) => t + x.p, 0);
  if (!n) return note("Escribe tu nombre");
  DB.set("orders", [{ id: Date.now(), f: new Date().toISOString(), who: n, items: cart.map(x => ({ n: x.n, p: x.p })), total, ship: $("co-ship").value, nt, st: "nuevo" }, ...DB.get("orders")]);
  wa(`Hola Style Match, soy ${n}. Quiero pedir:\n${cart.map(x => `• ${x.n} - $${x.p.toFixed(2)}`).join("\n")}\nTotal: $${total.toFixed(2)}\nEntrega: ${$("co-ship").value}${nt ? "\nNota: " + nt : ""}`);
}

// ---- Catálogo con cambios del equipo (se guardan en el navegador) ----
let BASE;
function applyCatalog() {
  BASE = BASE || PRODUCTS.map(x => ({ ...x }));
  const del = CAT("del"), over = CAT("over");
  PRODUCTS.length = 0;
  PRODUCTS.push(...BASE.filter(x => !del.includes(x.id)).concat(CAT("extra")).map(x => ({ ...x, ...over[x.id] })));
  refreshCats(); applyFilters();
}
addEventListener("DOMContentLoaded", async () => {
  const af = applyFilters; applyFilters = () => { af(); paintPhotos(); };
  await loadShared(); applyCatalog();
});

// ---- Panel del equipo (PIN en CONFIG.pin) ----
const KEYS = ["nums", "extra", "del", "over", "photos", "orders", "sells"];
const SKIN = [["calido", "Cálido"], ["frio", "Frío"], ["neutro", "Neutro"]];
const BODY = [["reloj-arena", "Reloj de arena"], ["rectangular", "Rectangular"], ["triangulo", "Triángulo"], ["triangulo-invertido", "Triángulo invertido"]];
const ORD = ["nuevo", "confirmado", "enviado", "entregado", "cancelado"], SELL = ["pendiente", "aprobada", "publicada", "rechazada"];
const CARD = "rounded-xl border border-slate-200 p-3 text-sm", MINI = "px-3 py-1.5 rounded-lg text-xs font-bold";
const opt = (a, cur) => a.map(v => Array.isArray(v) ? `<option value="${v[0]}">${v[1]}</option>` : `<option ${v === cur ? "selected" : ""}>${v}</option>`).join("");
const day = i => new Date(i).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
const trash = (a, id) => `<button data-a="${a}" data-id="${id}" class="p-1 text-slate-400 hover:text-red-500" aria-label="Quitar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
const upd = (k, id, patch) => DB.set(k, DB.get(k).map(x => x.id === id ? { ...x, ...patch } : x));
let adminTab = "cat";

const TABS = {
  cat: () => { const ph = DB.get("photos"); return `<div class="${CARD} space-y-2"><p class="font-bold text-slate-900">Nueva prenda</p>
    <div class="grid grid-cols-2 gap-2"><input id="ad-name" placeholder="Nombre" class="${F}"><input id="ad-cat" list="ad-cats" placeholder="Categoría" class="${F}"><input id="ad-price" type="number" min="1" placeholder="Precio $" class="${F}"><div class="grid grid-cols-2 gap-2"><select id="ad-skin" class="${F}">${opt(SKIN)}</select><select id="ad-body" class="${F}">${opt(BODY)}</select></div></div>
    <input id="ad-photo" type="file" accept="image/*" class="${F}"><datalist id="ad-cats">${[...new Set(PRODUCTS.map(x => x.c))].map(c => `<option value="${c}">`).join("")}</datalist>
    <button data-a="add" class="${BTN}">Agregar al catálogo</button></div>
    <p class="text-xs font-bold uppercase tracking-wider text-slate-700">En el catálogo (${PRODUCTS.length})</p>
    ${PRODUCTS.map(x => `<div data-row="${x.id}" class="flex items-center gap-2"><input data-f="n" value="${x.n}" class="${F}"><input data-f="p" type="number" min="1" value="${x.p}" class="${F} !w-20">${ph[x.id] ? `<img src="${ph[x.id]}" class="w-9 h-9 rounded-lg object-cover" alt="">` : ""}<button data-a="save" data-id="${x.id}" class="${MINI} bg-indigo-50 text-indigo-700">Guardar</button><label class="${MINI} bg-slate-100 text-slate-700 cursor-pointer">Foto<input type="file" accept="image/*" data-photo="${x.id}" class="hidden"></label>${trash("del", x.id)}</div>`).join("")}
    <button data-a="restore" class="${MINI} bg-slate-100 text-slate-700">Restaurar prendas originales</button> <button data-a="publish" class="${MINI} bg-indigo-600 text-on">Publicar para todos</button>`; },
  sells: () => { const l = DB.get("sells"); return `<p class="text-xs text-slate-500">Prendas que te ofrecen desde «Vender mi prenda». Apruébalas y publícalas en el catálogo.</p>` + (l.map(s => `<div data-srow="${s.id}" class="${CARD} space-y-2">
    <div class="flex justify-between gap-2">${s.img ? `<img src="${s.img}" class="w-16 h-16 rounded-lg object-cover" alt="">` : ""}<div><p class="font-bold text-slate-900">${esc(s.n)} <span class="font-normal text-slate-500">· ${esc(s.cat)} · ${s.price ? "$" + esc(String(s.price)) : "sin precio"}</span></p><p class="text-slate-600">${esc(s.desc || "Sin detalles")}</p><p class="text-xs text-slate-500">${esc(s.who)} · ${day(s.f)}</p></div>${trash("delsell", s.id)}</div>
    <div class="flex flex-wrap items-center gap-2"><select data-sst="${s.id}" class="${F} !w-auto !py-1">${opt(SELL, s.st)}</select>${s.st === "publicada" ? "" : `<select data-f="s" class="${F} !w-auto !py-1">${opt(SKIN)}</select><select data-f="b" class="${F} !w-auto !py-1">${opt(BODY)}</select><button data-a="pub" data-id="${s.id}" class="${MINI} bg-indigo-600 text-on">Publicar</button>`}</div></div>`).join("") || `<p class="text-sm text-slate-500">Aún no hay solicitudes de venta.</p>`); },
  orders: () => { const l = DB.get("orders"), ok = l.filter(o => o.st === "entregado"); return `<div class="grid grid-cols-3 gap-2 text-center">${[["Pedidos", l.length], ["Nuevos", l.filter(o => o.st === "nuevo").length], ["Cobrado", "$" + ok.reduce((t, o) => t + o.total, 0).toFixed(2)]].map(([a, b]) => `<div class="${CARD}"><p class="text-xs text-slate-500">${a}</p><p class="font-extrabold text-slate-900">${b}</p></div>`).join("")}</div>` + (l.map(o => `<div class="${CARD} space-y-2"><div class="flex justify-between gap-2"><div><p class="font-bold text-slate-900">${esc(o.who)} · $${o.total.toFixed(2)}</p><p class="text-slate-600">${o.items.map(i => i.n).join(", ")}</p><p class="text-xs text-slate-500">${day(o.f)} · ${esc(o.ship)}${o.nt ? " · " + esc(o.nt) : ""}</p></div>${trash("delord", o.id)}</div><select data-ost="${o.id}" class="${F} !w-auto !py-1">${opt(ORD, o.st)}</select></div>`).join("") || `<p class="text-sm text-slate-500">Aún no hay pedidos.</p>`); },
  wa: () => `<p class="text-xs text-slate-500">El número principal recibe los pedidos y las ventas.</p>` + DB.get("nums").map(n => `<div class="${CARD} flex items-center justify-between gap-2"><div><p class="font-bold text-slate-900">${n.label}${n.main ? ` <span class="${MINI} bg-indigo-50 text-indigo-700">Principal</span>` : ""}</p><p class="text-slate-600">+${n.num}</p></div><div class="flex items-center gap-1">${n.main ? "" : `<button data-a="main" data-id="${n.id}" class="${MINI} bg-slate-100 text-slate-700">Hacer principal</button>`}${trash("delnum", n.id)}</div></div>`).join("") + `<div class="${CARD} space-y-2"><p class="font-bold text-slate-900">Agregar número</p><div class="grid grid-cols-2 gap-2"><input id="wn-l" placeholder="Nombre (ej. Ventas)" class="${F}"><input id="wn-n" inputmode="tel" placeholder="939130324" class="${F}"></div><button data-a="addnum" class="${BTN}">Agregar número</button></div>`,
  data: () => `<p class="text-sm text-slate-600">Lo que cambies aquí (prendas, fotos, números) solo lo ves tú hasta que toques <b>Publicar para todos</b> en Catálogo: se descarga <b>catalog.json</b> y lo subes a GitHub junto a index.html. Pedidos y ventas se quedan en este navegador; esta copia sirve para respaldarlos.</p><button data-a="publish" class="${BTN}">Publicar para todos (catalog.json)</button><button data-a="export" class="${BTN}">Descargar copia de todo (JSON)</button><input id="im-file" type="file" accept="application/json" class="${F}">`
};
const A = {
  tab: id => { adminTab = id; },
  add: () => {
    const n = $("ad-name").value.trim(), c = $("ad-cat").value.trim(), p = parseFloat($("ad-price").value);
    if (!n || !c || !(p > 0)) return note("Completa nombre, categoría y precio");
    const id = Date.now(); DB.set("extra", [...DB.get("extra"), { id, n: esc(n), c: esc(c), p, s: $("ad-skin").value, b: $("ad-body").value }]);
    if (pendingPhoto) { DB.set("photos", { ...DB.get("photos"), [id]: pendingPhoto }); pendingPhoto = null; }
    applyCatalog(); note("Prenda agregada");
  },
  save: id => {
    const r = document.querySelector(`[data-row="${id}"]`), n = r.querySelector('[data-f="n"]').value.trim(), p = parseFloat(r.querySelector('[data-f="p"]').value);
    if (!n || !(p > 0)) return note("Pon un nombre y un precio válidos");
    DB.set("over", { ...DB.get("over"), [id]: { n: esc(n), p } }); applyCatalog(); note("Guardado");
  },
  del: id => { const ex = DB.get("extra"); if (ex.some(x => x.id === id)) DB.set("extra", ex.filter(x => x.id !== id)); else DB.set("del", [...DB.get("del"), id]); const ph = DB.get("photos"); delete ph[id]; DB.set("photos", ph); applyCatalog(); },
  restore: () => { DB.set("del", []); DB.set("over", {}); applyCatalog(); note("Prendas originales restauradas"); },
  pub: id => {
    const s = DB.get("sells").find(x => x.id === id), r = document.querySelector(`[data-srow="${id}"]`), p = parseFloat(s.price);
    if (!(p > 0)) return note("Esa solicitud no tiene precio");
    const nid = Date.now(); if (s.img) DB.set("photos", { ...DB.get("photos"), [nid]: s.img });
    DB.set("extra", [...DB.get("extra"), { id: nid, n: esc(s.n), c: esc(s.cat), p, s: r.querySelector('[data-f="s"]').value, b: r.querySelector('[data-f="b"]').value }]);
    upd("sells", id, { st: "publicada" }); applyCatalog(); note("Publicada en el catálogo");
  },
  delsell: id => DB.set("sells", DB.get("sells").filter(x => x.id !== id)),
  delord: id => DB.set("orders", DB.get("orders").filter(x => x.id !== id)),
  addnum: () => {
    const d = $("wn-n").value.replace(/\D/g, ""), num = d.length === 9 && d[0] === "9" ? "51" + d : d, a = DB.get("nums");
    if (num.length < 10) return note("Número no válido");
    DB.set("nums", [...a, { id: Date.now(), label: esc($("wn-l").value.trim() || "Contacto"), num, main: !a.length }]);
  },
  main: id => DB.set("nums", DB.get("nums").map(x => ({ ...x, main: x.id === id }))),
  delnum: id => {
    const a = DB.get("nums"); if (a.length < 2) return note("Deja al menos un número");
    const r = a.filter(x => x.id !== id); if (!r.some(x => x.main)) r[0].main = true; DB.set("nums", r);
  },
  publish: () => {
    const l = document.createElement("a"); l.href = URL.createObjectURL(new Blob([JSON.stringify(Object.fromEntries(["nums", "extra", "del", "over", "photos"].map(k => [k, DB.get(k)])))], { type: "application/json" }));
    l.download = "catalog.json"; l.click(); note("Descargado. Súbelo a GitHub junto a index.html");
  },
  export: () => {
    const l = document.createElement("a"); l.href = URL.createObjectURL(new Blob([JSON.stringify(Object.fromEntries(KEYS.map(k => [k, DB.get(k)])), null, 2)], { type: "application/json" }));
    l.download = "style-match-datos.json"; l.click();
  }
};
function importData(f) {
  if (!f) return; const r = new FileReader();
  r.onload = () => { try { const d = JSON.parse(r.result); KEYS.filter(k => k in d).forEach(k => DB.set(k, d[k])); applyCatalog(); note("Datos importados"); } catch { note("Archivo no válido"); } openAdmin(); };
  r.readAsText(f);
}
function openAdmin() {
  if (!adminOK) {
    sheet("admin-modal", "Acceso del equipo", `<input id="ad-pin" type="password" placeholder="PIN" class="${F}"><button id="ad-go" class="${BTN} mt-3">Entrar</button>`);
    $("ad-go").onclick = () => { if ($("ad-pin").value === CONFIG.pin) { adminOK = true; seed(); openAdmin(); } else note("PIN incorrecto"); };
    return;
  }
  const tabs = [["cat", "Catálogo"], ["sells", "Ventas"], ["orders", "Pedidos"], ["wa", "WhatsApp"], ["data", "Datos"]];
  sheet("admin-modal", "Panel del equipo", `<div class="flex flex-wrap gap-1 mb-4">${tabs.map(([k, l]) => `<button data-a="tab" data-id="${k}" class="${MINI} ${k === adminTab ? "bg-indigo-600 text-on" : "bg-slate-100 text-slate-700"}">${l}</button>`).join("")}</div><div class="space-y-3">${TABS[adminTab]()}</div>`, "max-w-2xl");
  const m = $("admin-modal"), close = m.onclick;
  m.onclick = e => {
    close(e); const b = e.target.closest("[data-a]"); if (!b) return;
    A[b.dataset.a](b.dataset.id && !isNaN(b.dataset.id) ? +b.dataset.id : b.dataset.id); if ($("admin-modal")) openAdmin();
  };
  m.onchange = e => {
    const t = e.target;
    if (t.id === "ad-photo") { shrink(t.files[0]).then(d => { pendingPhoto = d; note(d ? "Foto lista" : "No pude leer la foto"); }); return; }
    if (t.dataset.photo) { shrink(t.files[0]).then(d => { if (!d) return note("No pude leer la foto"); if (!DB.set("photos", { ...DB.get("photos"), [t.dataset.photo]: d })) note("No cabe: usa menos fotos"); applyCatalog(); openAdmin(); }); return; }
    if (t.id === "im-file") return importData(t.files[0]);
    if (t.dataset.ost) upd("orders", +t.dataset.ost, { st: t.value }); else if (t.dataset.sst) upd("sells", +t.dataset.sst, { st: t.value }); else return;
    openAdmin();
  };
}

// ---- Asistente de estilo (cámara / foto / describirme) ----
function skinFrom(img) {
  const w = img.videoWidth || img.naturalWidth, h = img.videoHeight || img.naturalHeight, s = Math.min(w, h) * 0.2;
  const c = document.createElement("canvas"); c.width = c.height = 40;
  const x = c.getContext("2d"); x.drawImage(img, w / 2 - s / 2, h / 2 - s / 2, s, s, 0, 0, 40, 40);
  const d = x.getImageData(0, 0, 40, 40).data; let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === mn) return "neutro";
  let hue = (mx === r ? (g - b) / (mx - mn) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn)) * 60;
  if (hue < 0) hue += 360;
  return hue >= 24 ? "calido" : hue <= 14 ? "frio" : "neutro";
}
function openAssistant(mode) {
  const live = mode === "camara", sel = (id, from) => `<select id="${id}" class="${F}">${$(from).innerHTML}</select>`;
  sheet("as-modal", live ? "Tomar foto" : "Subir foto o describirme", `<div class="space-y-3">
    ${live ? `<video id="as-video" autoplay playsinline muted class="w-full h-48 rounded-xl bg-slate-900 object-cover"></video><button id="as-snap" class="${BTN}">Capturar</button>` : `<input id="as-file" type="file" accept="image/*" class="${F}">`}
    <p id="as-msg" class="text-xs text-slate-500">${live ? "Centra tu rostro con buena luz natural." : "Sube una foto con buena luz o elige tus rasgos abajo."}</p>
    ${sel("as-skin", "user-skin")}${sel("as-eyes", "user-eyes")}${sel("as-body", "user-body")}
    <button id="as-ok" class="${BTN}">Aplicar a mi perfil</button></div>`);
  [["skin", "user-skin"], ["eyes", "user-eyes"], ["body", "user-body"]].forEach(([a, b]) => $("as-" + a).value = $(b).value);
  const guess = el => { const v = skinFrom(el); $("as-skin").value = v; $("as-msg").textContent = `Tono estimado: ${v}. Es una estimación por color; ajústalo si no coincide.`; };
  if (live) {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "user" } })
      .then(s => { cam = s; $("as-video").srcObject = s; })
      .catch(() => { $("as-msg").textContent = "No pude abrir la cámara. Usa «Subir foto o describirme»."; });
    $("as-snap").onclick = () => $("as-video").videoWidth ? guess($("as-video")) : note("La cámara aún no está lista");
  } else {
    $("as-file").onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const im = new Image(); im.onload = () => guess(im); im.src = URL.createObjectURL(f);
    };
  }
  $("as-ok").onclick = () => {
    [["skin", "user-skin"], ["eyes", "user-eyes"], ["body", "user-body"]].forEach(([a, b]) => $(b).value = $("as-" + a).value);
    applyFilters(); closeSheet("as-modal"); note("Perfil aplicado al catálogo");
    $("test").scrollIntoView({ behavior: "smooth" });
  };
}
