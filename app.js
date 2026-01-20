const { createClient } = supabase;

// Supabase
const SUPABASE_URL = "https://jhhejboarcscbjvufviz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoaGVqYm9hcmNzY2JqdnVmdml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjYwODAsImV4cCI6MjA4NDQ0MjA4MH0.oUHNvK-OHo4z-cJuPu-ADaZ7Q6Q5_Ocr6ofpYnvvDto";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helpers
const $ = (id) => document.getElementById(id);

function safeText(s) { return (s ?? "").toString().trim(); }

function money(n) {
  const x = Number(n || 0);
  return `S/ ${x.toFixed(2)}`;
}

function setNotice(id, text, tone = "muted") {
  const el = $(id);
  if (!el) return;
  el.textContent = text || "";
  el.style.color =
    tone === "ok" ? "var(--ok)" :
    tone === "bad" ? "var(--danger)" :
    "var(--muted)";
}

function setHidden(el, hidden) {
  if (!el) return;
  el.classList.toggle("hidden", !!hidden);
}

// =====================
// Storage: imágenes
// =====================
// Usa bucket público "images" y paths tipo "categories/mana.png". [web:509]
function publicImg(path) {
  if (!path) return null;
  const { data } = db.storage.from("images").getPublicUrl(path);
  return data?.publicUrl || null;
}

function normalizeKey(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .trim()
    .replaceAll(" ", "_")
    .replaceAll("á","a").replaceAll("é","e").replaceAll("í","i").replaceAll("ó","o").replaceAll("ú","u")
    .replaceAll("ñ","n");
}

// Mapea categoría -> nombre de archivo en Storage
function categoryImageFile(cat) {
  const c = (cat || "").toUpperCase().trim();

  // Si tú subiste nombres distintos, ajusta SOLO aquí:
  if (c === "ESPECIALIDADES BOTICAS NATURISTAS") return "especialidades_boticas_naturistas.png";
  if (c === "DR WILLPHAR") return "willphar.png"; // por si alguna vez usas este nombre
  if (c === "WILLPHAR") return "willphar.png";

  // default: "mana" -> "mana.png", "colagenos" -> "colagenos.png"
  return `${normalizeKey(c)}.png`;
}

// =====================
// Carrito
// =====================
let carrito = []; // [{producto_id, nombre, precio, cantidad}]

function carritoTotal() {
  return carrito.reduce((acc, it) => acc + (Number(it.precio) * Number(it.cantidad)), 0);
}

function carritoAdd(p) {
  const it = carrito.find(x => x.producto_id === p.id);
  if (it) it.cantidad += 1;
  else carrito.push({ producto_id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1 });
  renderCarrito();
}

function carritoDec(producto_id) {
  const it = carrito.find(x => x.producto_id === producto_id);
  if (!it) return;
  it.cantidad -= 1;
  if (it.cantidad <= 0) carrito = carrito.filter(x => x.producto_id !== producto_id);
  renderCarrito();
}

function carritoRemove(producto_id) {
  carrito = carrito.filter(x => x.producto_id !== producto_id);
  renderCarrito();
}

function carritoClear() {
  carrito = [];
  renderCarrito();
}

function renderCarrito() {
  const el = $("carrito_ui");
  const totalEl = $("total");

  if (totalEl) totalEl.textContent = money(carritoTotal());
  if (!el) return;

  el.innerHTML = "";

  if (carrito.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Tu carrito está vacío.";
    el.appendChild(empty);
    return;
  }

  carrito.forEach((it) => {
    const row = document.createElement("div");
    row.className = "cart-item";

    const left = document.createElement("div");
    left.className = "cart-left";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = it.nombre;

    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = `${money(it.precio)} · Subtotal: ${money(it.precio * it.cantidad)}`;

    left.appendChild(title);
    left.appendChild(sub);

    const qty = document.createElement("div");
    qty.className = "qty";

    const dec = document.createElement("button");
    dec.textContent = "−";
    dec.onclick = () => carritoDec(it.producto_id);

    const val = document.createElement("div");
    val.className = "pill";
    val.textContent = it.cantidad;

    const inc = document.createElement("button");
    inc.textContent = "+";
    inc.onclick = () => carritoAdd({ id: it.producto_id, nombre: it.nombre, precio: it.precio });

    const del = document.createElement("button");
    del.textContent = "×";
    del.className = "btn danger";
    del.style.padding = "8px 10px";
    del.onclick = () => carritoRemove(it.producto_id);

    qty.appendChild(dec);
    qty.appendChild(val);
    qty.appendChild(inc);
    qty.appendChild(del);

    row.appendChild(left);
    row.appendChild(qty);

    el.appendChild(row);
  });
}

// =====================
// Categorías (TODAS) + orden custom
// =====================
let productos = [];       // activos
let vista = "categorias"; // 'categorias' | 'productos'
let categoriaActual = null;

// Orden exacto que quieres + luego los demás
const CATEGORY_ORDER = [
  "MANA",
  "COLAGENOS",
  "CAPSULAS",
  "LSF",
  // el resto (si existen en tu lista)
  "ESPECIALIDADES",
  "ESPECIALIDADES BOTICAS NATURISTAS",
  "CONCENTRADOS",
  "EXTRACTOS",
  "JARABES",
  "WILLPHAR",
  "OTROS",
];

// Detecta categoría SIN columna (por prefijo/código/nombre) basado en tu lista
function getCategoria(p) {
  const nombre = (p.nombre || "").toUpperCase();
  const codigo = (p.codigo || "").toUpperCase().trim();

  // MANA: B0001/B0002... (BROMKISAN/GENGI)
  if (/^B\d+/.test(codigo) || nombre.includes("BROMKISAN") || nombre.includes("GENGI")) return "MANA";

  // COLAGENOS: PT-NPCO...
  if (codigo.startsWith("PT-NPCO") || nombre.includes("COLAG")) return "COLAGENOS";

  // CAPSULAS: PT-NPCA...
  if (codigo.startsWith("PT-NPCA") || nombre.includes(" CAPS")) return "CAPSULAS";

  // LSF: PT-LPEF...
  if (codigo.startsWith("PT-LPEF") || nombre.includes("EFERV") || nombre.includes("SACHET")) return "LSF";

  // CONCENTRADOS: PT-NLEX...
  if (codigo.startsWith("PT-NLEX") || nombre.includes("CONCENTRADO")) return "CONCENTRADOS";

  // JARABES: PT-NLJA...
  if (codigo.startsWith("PT-NLJA") || nombre.includes("JARABE")) return "JARABES";

  // ESPECIALIDADES: PT-NPLE / PT-NPBA / PT-NPES (según tu lista)
  if (codigo.startsWith("PT-NPLE") || codigo.startsWith("PT-NPBA") || codigo.startsWith("PT-NPES")) return "ESPECIALIDADES";

  // ESPECIALIDADES BOTICAS NATURISTAS (proteínas)
  if (nombre.includes("HEALTH PROTEIN") || nombre.includes("PROTEINA")) return "ESPECIALIDADES BOTICAS NATURISTAS";

  // WILLPHAR (códigos numéricos 1090/1111/1112...)
  if (/^\d{4}$/.test(codigo) || nombre.includes("WILLSURE") || nombre.includes("PALARTRIC")) return "WILLPHAR";

  // EXTRACTOS (en tu lista son PT-NLEX021 etc; lo tratamos por palabra)
  if (nombre.includes("EXTRACTO")) return "EXTRACTOS";

  return "OTROS";
}

function sortCategorias(a, b) {
  const ia = CATEGORY_ORDER.indexOf(a);
  const ib = CATEGORY_ORDER.indexOf(b);

  // primero los que están en la lista (en su orden)
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;

  // luego alfabético
  return a.localeCompare(b);
}

function mostrarCategorias() {
  vista = "categorias";
  categoriaActual = null;

  const catsEl = $("categorias");
  const prodEl = $("productos");
  const btnVolver = $("btn_volver");
  const busc = $("busqueda");
  const titulo = $("titulo_catalogo");

  if (titulo) titulo.textContent = "Categorías";
  setHidden(btnVolver, true);
  setHidden(busc, true);
  setHidden(prodEl, true);
  setHidden(catsEl, false);

  // armar categorias reales desde productos
  const counts = new Map();
  productos.forEach(p => {
    const c = getCategoria(p);
    counts.set(c, (counts.get(c) || 0) + 1);
  });

  const categorias = Array.from(counts.keys()).sort(sortCategorias);

  catsEl.innerHTML = "";
  categorias.forEach((cat) => {
    const card = document.createElement("div");
    card.className = "category";
    card.onclick = () => mostrarProductos(cat);

    // IMAGEN categoría
    const img = document.createElement("img");
    img.className = "cat-img";
    img.alt = cat;

    const file = categoryImageFile(cat);
    const url = publicImg(`categories/${file}`);
    img.src = url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='100%25' height='100%25' rx='12' fill='%230e1626'/%3E%3C/svg%3E";

    const box = document.createElement("div");

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = cat;

    const d = document.createElement("div");
    d.className = "desc";
    d.textContent = `${counts.get(cat)} productos`;

    box.appendChild(t);
    box.appendChild(d);

    card.appendChild(img);
    card.appendChild(box);
    catsEl.appendChild(card);
  });
}

function renderProductos(list) {
  const cont = $("productos");
  if (!cont) return;

  cont.innerHTML = "";
  list.forEach((p) => {
    const card = document.createElement("div");
    card.className = "product";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = p.nombre;

    const meta = document.createElement("div");
    meta.className = "meta";

    const code = document.createElement("span");
    code.className = "pill";
    code.textContent = p.codigo || "-";

    const price = document.createElement("span");
    price.className = "pill";
    price.textContent = money(p.precio);

    meta.appendChild(code);
    meta.appendChild(price);

    const btn = document.createElement("button");
    btn.className = "btn primary block";
    btn.textContent = "Agregar al carrito";
    btn.onclick = () => carritoAdd(p);

    card.appendChild(name);
    card.appendChild(meta);
    card.appendChild(btn);

    cont.appendChild(card);
  });
}

function mostrarProductos(cat) {
  vista = "productos";
  categoriaActual = cat;

  const catsEl = $("categorias");
  const prodEl = $("productos");
  const btnVolver = $("btn_volver");
  const busc = $("busqueda");
  const titulo = $("titulo_catalogo");

  if (titulo) titulo.textContent = cat;
  setHidden(btnVolver, false);
  setHidden(busc, false);
  setHidden(catsEl, true);
  setHidden(prodEl, false);

  if (busc) busc.value = "";

  const list = productos.filter(p => getCategoria(p) === cat);
  renderProductos(list);
}

// =====================
// Form UX
// =====================
function setupFormUX() {
  const metodo = $("metodo_pago");
  const credito = $("credito_dias");
  const comprobante = $("comprobante");
  const docTipo = $("doc_tipo");

  if (metodo && credito) {
    const sync = () => {
      const isCredito = metodo.value === "credito";
      credito.disabled = !isCredito;
      if (!isCredito) credito.value = "";
    };
    metodo.addEventListener("change", sync);
    sync();
  }

  if (comprobante && docTipo) {
    comprobante.addEventListener("change", () => {
      if (comprobante.value === "factura" && !docTipo.value) docTipo.value = "RUC";
    });
  }
}

// =====================
// Enviar pedido
// =====================
async function enviarPedido() {
  if (!$("btn_enviar")) return;

  setNotice("msg", "");

  if (carrito.length === 0) {
    setNotice("msg", "Carrito vacío.", "bad");
    return;
  }

  const doc_tipo = safeText($("doc_tipo")?.value).toUpperCase() || null;
  const metodo_pago = safeText($("metodo_pago")?.value) || null;

  const creditoRaw = safeText($("credito_dias")?.value);
  const credito_dias = creditoRaw ? Number(creditoRaw) : null;
  const credito_dias_final = metodo_pago === "contado" ? null : credito_dias;

  const payload = {
    doc_tipo,
    doc_numero: safeText($("doc_numero")?.value) || null,

    cliente_nombre: safeText($("cliente_nombre")?.value) || null,
    cliente_telefono: safeText($("cliente_telefono")?.value) || null,

    botica_nombre: safeText($("botica_nombre")?.value) || null,
    ubicacion: safeText($("ubicacion")?.value) || null,

    metodo_pago,
    credito_dias: credito_dias_final,
    comprobante: safeText($("comprobante")?.value) || null,

    nota: safeText($("nota")?.value) || null,
    estado: "nuevo",
  };

  const { data: pedido, error: e1 } = await db
    .from("pedidos")
    .insert(payload)
    .select("id")
    .single();

  if (e1) {
    setNotice("msg", "Error pedido: " + e1.message, "bad");
    return;
  }

  const items = carrito.map((i) => ({
    pedido_id: pedido.id,
    producto_id: i.producto_id,
    cantidad: i.cantidad,
    precio_unit: i.precio,
  }));

  const { error: e2 } = await db.from("pedido_items").insert(items);
  if (e2) {
    setNotice("msg", "Error items: " + e2.message, "bad");
    return;
  }

  carritoClear();
  setNotice("msg", `Pedido enviado (#${pedido.id}).`, "ok");
}

// =====================
// Admin: login + cargar pedidos
// =====================
async function adminLogin() {
  const email = safeText($("email")?.value);
  const password = safeText($("password")?.value);

  if (!email || !password) {
    setNotice("auth_msg", "Completa email y password.", "bad");
    return;
  }

  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    setNotice("auth_msg", "Error login: " + error.message, "bad");
    return;
  }

  setNotice("auth_msg", "Login OK.", "ok");
}

async function adminLogout() {
  const { error } = await db.auth.signOut();
  if (error) {
    setNotice("auth_msg", "Error logout: " + error.message, "bad");
    return;
  }
  setNotice("auth_msg", "Sesión cerrada.", "ok");
}

async function cargarPedidosAdmin() {
  const out = $("pedidos");
  const cards = $("pedidos_cards");

  if (cards) cards.innerHTML = "";
  if (out) out.textContent = "";

  // Pedidos
  const { data: pedidos, error: e1 } = await db
    .from("pedidos")
    .select("*")
    .order("id", { ascending: false })
    .limit(30);

  if (e1) {
    if (cards) cards.textContent = "Error: " + e1.message;
    if (out) out.textContent = "Error: " + e1.message;
    return;
  }

  if (out) {
    out.classList.remove("hidden");
    out.textContent = JSON.stringify(pedidos, null, 2);
  }

  // Render cards simples
  if (cards) {
    pedidos.forEach(p => {
      const c = document.createElement("div");
      c.className = "card";
      c.style.marginTop = "10px";

      c.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <div><strong>#${p.id}</strong> · ${p.botica_nombre || "-"} · ${p.cliente_nombre || "-"}</div>
          <div class="muted">${p.metodo_pago || "-"} · ${p.comprobante || "-"}</div>
        </div>
        <div class="muted" style="margin-top:8px;">
          ${p.ubicacion || ""} ${p.cliente_telefono ? "· " + p.cliente_telefono : ""}
        </div>
        <div class="muted" style="margin-top:6px;">
          ${p.nota ? "Nota: " + p.nota : ""}
        </div>
      `;

      cards.appendChild(c);
    });
  }
}

// =====================
// Cargar productos desde Supabase
// =====================
async function cargarProductos() {
  const catsEl = $("categorias");
  const prodEl = $("productos");
  if (!catsEl && !prodEl) return;

  if (catsEl) catsEl.textContent = "Cargando categorías...";

  // Trae también descripcion si existe (si no existe, no pasa nada si la BD lo permite)
  const { data, error } = await db
    .from("productos")
    .select("id,codigo,nombre,precio,activo,descripcion")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    if (catsEl) catsEl.textContent = "Error: " + error.message;
    if (prodEl) prodEl.textContent = "Error: " + error.message;
    return;
  }

  productos = data || [];
  mostrarCategorias();
}

// =====================
// Wireup
// =====================
$("btn_enviar")?.addEventListener("click", enviarPedido);
$("btn_limpiar")?.addEventListener("click", carritoClear);
$("btn_volver")?.addEventListener("click", mostrarCategorias);

$("btn_login")?.addEventListener("click", adminLogin);
$("btn_logout")?.addEventListener("click", adminLogout);
$("btn_cargar")?.addEventListener("click", cargarPedidosAdmin);

$("busqueda")?.addEventListener("input", (e) => {
  if (vista !== "productos") return;
  const q = safeText(e.target.value).toLowerCase();

  const base = productos.filter(p => getCategoria(p) === categoriaActual);
  const filtered = !q ? base : base.filter(p =>
    (p.nombre || "").toLowerCase().includes(q) || (p.codigo || "").toLowerCase().includes(q)
  );

  renderProductos(filtered);
});

// init
setupFormUX();
cargarProductos();
renderCarrito();
