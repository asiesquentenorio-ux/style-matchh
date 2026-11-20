// js/app.js
// Catálogo, filtros, carrito, panel de apariencia y animaciones GSAP.
// Usa Theme y PALETTES, definidos en index.html.

const $ = id => document.getElementById(id);
const PRODUCTS = [
  { id: 1, n: "Blazer estructurado", c: "Blazers", p: 89, s: "frio", b: "rectangular" },
  { id: 2, n: "Vestido wrap terracota", c: "Vestidos", p: 64, s: "calido", b: "reloj-arena" },
  { id: 3, n: "Pantalón palazzo", c: "Pantalones", p: 52, s: "neutro", b: "triangulo" },
  { id: 4, n: "Camisa de lino", c: "Camisas", p: 38, s: "calido", b: "rectangular" },
  { id: 5, n: "Chaqueta hombros marcados", c: "Blazers", p: 95, s: "neutro", b: "triangulo" },
  { id: 6, n: "Vestido midi azul", c: "Vestidos", p: 70, s: "frio", b: "reloj-arena" },
  { id: 7, n: "Jean recto", c: "Pantalones", p: 46, s: "neutro", b: "triangulo-invertido" },
  { id: 8, n: "Blusa satinada", c: "Camisas", p: 41, s: "frio", b: "reloj-arena" }
];
const HUE = { calido: 25, frio: 215, neutro: 150 };
let cart = [], toastT;
const icons = () => window.lucide && lucide.createIcons();
function note(t) { const e = $("toast"); e.textContent = t; e.classList.remove("hidden"); clearTimeout(toastT); toastT = setTimeout(() => e.classList.add("hidden"), 2400); }

[...new Set(PRODUCTS.map(x => x.c))].forEach(c => $("f-cat").insertAdjacentHTML("beforeend", `<option>${c}</option>`));

function applyFilters() {
  const q = $("f-q").value.toLowerCase(), c = $("f-cat").value, o = $("f-sort").value, sk = $("user-skin").value, bd = $("user-body").value;
  const list = PRODUCTS.filter(x => (!q || x.n.toLowerCase().includes(q)) && (!c || x.c === c))
    .map(x => ({ ...x, m: (sk && x.s === sk ? 1 : 0) + (bd && x.b === bd ? 1 : 0) }))
    .sort((a, b) => o === "asc" ? a.p - b.p : o === "desc" ? b.p - a.p : b.m - a.m);
  $("match-status").textContent = sk || bd ? "Recomendadas para tu perfil primero" : "Mostrando todas las prendas disponibles";
  $("product-grid").innerHTML = list.map(x => `
    <article class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      <div class="h-44 flex items-center justify-center" style="background:hsl(${HUE[x.s]} 45% 85%)"><i data-lucide="shirt" class="w-12 h-12" style="color:hsl(${HUE[x.s]} 40% 35%)"></i></div>
      <div class="p-4 flex flex-col gap-1 flex-1">
        <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-600">${x.c}${x.m ? " · Match" : ""}</span>
        <h4 class="font-bold text-slate-900">${x.n}</h4>
        <div class="mt-auto pt-3 flex items-center justify-between">
          <span class="font-extrabold text-slate-900">$${x.p.toFixed(2)}</span>
          <button onclick="addToCart(${x.id})" class="bg-indigo-600 hover:bg-indigo-700 text-on text-xs font-bold px-3 py-2 rounded-lg transition">Agregar</button>
        </div>
      </div>
    </article>`).join("") || '<p class="text-slate-500 text-sm col-span-full">No hay prendas con esos filtros.</p>';
  icons(); revealCards();
}
let cardTriggers = [];
function revealCards() {
  if (!window.gsap || !window.ScrollTrigger) return;
  cardTriggers.forEach(t => t.kill());
  const cards = gsap.utils.toArray("#product-grid article");
  gsap.set(cards, { opacity: 0, y: 40 });
  cardTriggers = ScrollTrigger.batch(cards, { start: "top 92%", once: true, onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power2.out" }) });
}
function animatePage() {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.from("#hero-img", { scale: 1.15, duration: 1.8, ease: "power2.out" });
  gsap.from("#hero-text, #scroll-to-test", { y: 40, opacity: 0, duration: 0.9, stagger: 0.15, delay: 0.3, ease: "power3.out" });
  gsap.to("#hero-img", { yPercent: 12, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.from("#test", { y: 50, opacity: 0, duration: 0.8, ease: "power2.out", scrollTrigger: { trigger: "#test", start: "top 85%", once: true } });
  gsap.from("#band h3, #band p, #band button", { y: 40, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power2.out", scrollTrigger: { trigger: "#band", start: "top 70%", once: true } });
}
function renderCart() {
  $("cart-items").innerHTML = cart.map((x, i) => `<div class="flex items-center justify-between text-sm"><span class="text-slate-700">${x.n}</span><span class="flex items-center gap-3"><b class="text-slate-900">$${x.p.toFixed(2)}</b><button onclick="removeFromCart(${i})" class="text-slate-400 hover:text-red-500" aria-label="Quitar"><i data-lucide="trash-2" class="w-4 h-4"></i></button></span></div>`).join("") || '<p class="text-sm text-slate-500">Tu carrito está vacío.</p>';
  $("cart-total").textContent = "$" + cart.reduce((t, x) => t + x.p, 0).toFixed(2);
  const b = $("cart-badge"); b.textContent = cart.length; b.classList.toggle("hidden", !cart.length);
  icons();
}
function addToCart(id) { cart.push(PRODUCTS.find(x => x.id === id)); renderCart(); note("Agregada al carrito"); }
function removeFromCart(i) { cart.splice(i, 1); renderCart(); }
function toggleCartModal() { $("cart-modal").classList.toggle("hidden"); }

function paintTheme() {
  $("tp-pal").innerHTML = Object.entries(PALETTES).map(([k, p]) => `<button data-pal="${k}" title="${p.n}" aria-label="${p.n}" class="w-8 h-8 rounded-full border-2 ${Theme.state.palette === k ? "border-slate-900" : "border-transparent"}" style="background:linear-gradient(135deg,hsl(${p.a[0]} ${p.a[1]}% ${p.a[2]}%),hsl(${p.b[0]} ${p.b[1]}% ${p.b[2]}%))"></button>`).join("");
  document.querySelectorAll(".tp-mode").forEach(b => b.classList.toggle("bg-indigo-50", b.dataset.mode === Theme.state.mode));
}
function openTheme() { $("theme-panel").classList.toggle("hidden"); paintTheme(); }
$("theme-panel").addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t) return;
  Theme.set(t.dataset.pal ? { palette: t.dataset.pal } : { mode: t.dataset.mode }); paintTheme();
});
$("scroll-to-test").addEventListener("click", () => $("test").scrollIntoView({ behavior: "smooth" }));

applyFilters(); renderCart(); animatePage();
