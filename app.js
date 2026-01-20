const { createClient } = supabase;

// =====================
// Supabase
// =====================
const SUPABASE_URL = "https://jhhejboarcscbjvufviz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoaGVqYm9hcmNzY2JqdnVmdml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjYwODAsImV4cCI6MjA4NDQ0MjA4MH0.oUHNvK-OHo4z-cJuPu-ADaZ7Q6Q5_Ocr6ofpYnvvDto";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================
// Helpers
// =====================
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
// Storage: imágenes (categorías)
// =====================
// Usa bucket público "images" y paths tipo "categories/mana.png".
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

function categoryImageFile(cat) {
  const c = (cat || "").toUpperCase().trim();
  if (c === "ESPECIALIDADES BOTICAS NATURISTAS") return "especialidades_boticas_naturistas.png";
  if (c === "DR WILLPHAR") return "willphar.png";
  if (c === "WILLPHAR") return "willphar.png";
  return `${normalizeKey(c)}.png`;
}

const SVG_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='100%25' height='100%25' rx='18' fill='%230b1a12'/%3E%3C/svg%3E";

// =====================
// Carrito (estado)
// =====================
let carrito = []; // [{producto_id, nombre, precio, cantidad}]

function carritoTotal() {
  return carrito.reduce((acc, it) => acc + (Number(it.precio) * Number(it.cantidad)), 0);
}

function carritoCount() {
  return carrito.reduce((acc, it) => acc + Number(it.cantidad), 0);
}

function carritoGetQty(producto_id) {
  const it = carrito.find(x => x.producto_id === producto_id);
  return it ? Number(it.cantidad) : 0;
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

// =====================
// UI: Drawer + FAB (se inyecta sin cambiar HTML)
// =====================
function ensureCartDrawerUI() {
  // Solo en index (no en admin)
  if (!$("categorias") && !$("productos")) return;

  if (!$("cart_fab")) {
    const fab = document.createElement("button");
    fab.id = "cart_fab";
    fab.className = "cart-fab";
    fab.type = "button";
    fab.innerHTML = `Carrito <span id="cart_badge" class="badge">0</span>`;
    document.body.appendChild(fab);
  }

  if (!$("cart_overlay")) {
    const ov = document.createElement("div");
    ov.id = "cart_overlay";
    ov.className = "cart-overlay";
    document.body.appendChild(ov);
  }

  if (!$("cart_drawer")) {
    const drawer = document.createElement("aside");
    drawer.id = "cart_drawer";
    drawer.className = "cart-drawer";
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `
      <div class="drawer-head">
        <div class="drawer-title">Tu compra</div>
        <button id="cart_close" class="drawer-close" type="button">Cerrar</button>
      </div>

      <h2>Carrito</h2>
      <div id="carrito_ui_drawer" class="cart"></div>

      <div class="cart-footer">
        <div class="muted">Total</div>
        <div id="total_drawer" class="total">S/ 0.00</div>
      </div>

      <div class="actions">
        <button id="btn_limpiar_drawer" class="btn secondary" type="button">Limpiar</button>
      </div>

      <div class="divider"></div>

      <h2>Datos del pedido</h2>
      <div class="form">
        <select id="doc_tipo_drawer">
          <option value="">Documento</option>
          <option value="DNI">DNI</option>
          <option value="RUC">RUC</option>
        </select>
        <input id="doc_numero_drawer" placeholder="N° DNI/RUC" />

        <input id="cliente_nombre_drawer" placeholder="Nombre del cliente" />
        <input id="cliente_telefono_drawer" placeholder="Celular" />

        <input id="botica_nombre_drawer" placeholder="Nombre de botica" />
        <input id="ubicacion_drawer" placeholder="Ubicación / Dirección" />

        <select id="metodo_pago_drawer">
          <option value="contado">Contado</option>
          <option value="credito">Crédito</option>
        </select>

        <select id="credito_dias_drawer" disabled>
          <option value="">Días de crédito</option>
          <option value="10">10</option>
          <option value="15">15</option>
          <option value="20">20</option>
          <option value="30">30</option>
          <option value="40">40</option>
        </select>

        <select id="comprobante_drawer">
          <option value="boleta">Boleta</option>
          <option value="factura">Factura</option>
          <option value="nota_pedido">Nota de pedido</option>
        </select>

        <textarea id="nota_drawer" rows="2" placeholder="Nota (opcional)"></textarea>

        <button id="btn_enviar_drawer" class="btn primary" type="button">Enviar pedido</button>
      </div>

      <div id="msg_drawer" class="notice"></div>
    `;
    document.body.appendChild(drawer);
  }

  // Wireup drawer UI events
  $("cart_fab")?.addEventListener("click", openCart);
  $("cart_close")?.addEventListener("click", closeCart);
  $("cart_overlay")?.addEventListener("click", closeCart);
  $("btn_limpiar_drawer")?.addEventListener("click", carritoClear);
  $("btn_enviar_drawer")?.addEventListener("click", enviarPedidoFromDrawer);

  setupFormUXDrawer();
}

function openCart() {
  $("cart_overlay")?.classList.add("open");
  $("cart_drawer")?.classList.add("open");
  $("cart_drawer")?.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  $("cart_overlay")?.classList.remove("open");
  $("cart_drawer")?.classList.remove("open");
  $("cart_drawer")?.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// =====================
// Render carrito (izquierda original) + drawer
// =====================
function renderCarrito() {
  // Actualiza drawer siempre
  renderCarritoDrawer();

  // Si existe el carrito viejo (aside), también lo mantiene actualizado (por si lo dejas visible)
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

function renderCarritoDrawer() {
  const el = $("carrito_ui_drawer");
  const totalEl = $("total_drawer");
  const badge = $("cart_badge");

  const total = carritoTotal();
  if (totalEl) totalEl.textContent = money(total);
  if (badge) badge.textContent = String(carritoCount());

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
// Catálogo: categorías + productos (con +/− en cada producto)
// =====================
let productos = [];       // activos
let vista = "categorias"; // 'categorias' | 'productos'
let categoriaActual = null;

const CATEGORY_ORDER = [
  "MANA",
  "COLAGENOS",
  "CAPSULAS",
  "LSF",
  "ESPECIALIDADES",
  "ESPECIALIDADES BOTICAS NATURISTAS",
  "CONCENTRADOS",
  "EXTRACTOS",
  "JARABES",
  "WILLPHAR",
  "OTROS",
];

function getCategoria(p) {
  const nombre = (p.nombre || "").toUpperCase();
  const codigo = (p.codigo || "").toUpperCase().trim();

  if (/^B\d+/.test(codigo) || nombre.includes("BROMKISAN") || nombre.includes("GENGI")) return "MANA";
  if (codigo.startsWith("PT-NPCO") || nombre.includes("COLAG")) return "COLAGENOS";
  if (codigo.startsWith("PT-NPCA") || nombre.includes(" CAPS")) return "CAPSULAS";
  if (codigo.startsWith("PT-LPEF") || nombre.includes("EFERV") || nombre.includes("SACHET")) return "LSF";
  if (codigo.startsWith("PT-NLEX") || nombre.includes("CONCENTRADO")) return "CONCENTRADOS";
  if (codigo.startsWith("PT-NLJA") || nombre.includes("JARABE")) return "JARABES";
  if (codigo.startsWith("PT-NPLE") || codigo.startsWith("PT-NPBA") || codigo.startsWith("PT-NPES")) return "ESPECIALIDADES";
  if (nombre.includes("HEALTH PROTEIN") || nombre.includes("PROTEINA")) return "ESPECIALIDADES BOTICAS NATURISTAS";
  if (/^\d{4}$/.test(codigo) || nombre.includes("WILLSURE") || nombre.includes("PALARTRIC")) return "WILLPHAR";
  if (nombre.includes("EXTRACTO")) return "EXTRACTOS";
  return "OTROS";
}

function sortCategorias(a, b) {
  const ia = CATEGORY_ORDER.indexOf(a);
  const ib = CATEGORY_ORDER.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
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

  if (!catsEl || !prodEl) return;

  if (titulo) titulo.textContent = "Categorías";
  setHidden(btnVolver, true);
  setHidden(busc, true);
  setHidden(prodEl, true);
  setHidden(catsEl, false);

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

    const img = document.createElement("img");
    img.className = "cat-img";
    img.alt = cat;

    const file = categoryImageFile(cat);
    const url = publicImg(`categories/${file}`);
    img.src = url || SVG_FALLBACK;

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

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.flexDirection = "column";
    left.style.gap = "6px";
    left.style.flex = "1 1 auto";
    left.style.minWidth = "0";

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

    left.appendChild(name);
    left.appendChild(meta);

    // Controles +/− en el producto (SIN botón "Agregar")
    const qty = document.createElement("div");
    qty.className = "qty";
    qty.style.flex = "0 0 auto";

    const dec = document.createElement("button");
    dec.textContent = "−";

    const val = document.createElement("div");
    val.className = "pill";
    val.textContent = String(carritoGetQty(p.id));

    const inc = document.createElement("button");
    inc.textContent = "+";

    dec.onclick = () => {
      carritoDec(p.id);
      val.textContent = String(carritoGetQty(p.id));
    };
    inc.onclick = () => {
      carritoAdd(p);
      val.textContent = String(carritoGetQty(p.id));
    };

    qty.appendChild(dec);
    qty.appendChild(val);
    qty.appendChild(inc);

    card.appendChild(left);
    card.appendChild(qty);

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

  if (!catsEl || !prodEl) return;

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
// Form UX (drawer)
// =====================
function setupFormUXDrawer() {
  const metodo = $("metodo_pago_drawer");
  const credito = $("credito_dias_drawer");
  const comprobante = $("comprobante_drawer");
  const docTipo = $("doc_tipo_drawer");

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
// Enviar pedido (desde drawer)
// =====================
async function enviarPedidoFromDrawer() {
  if (!$("btn_enviar_drawer")) return;

  setNotice("msg_drawer", "");
  if (carrito.length === 0) {
    setNotice("msg_drawer", "Carrito vacío.", "bad");
    return;
  }

  const doc_tipo = safeText($("doc_tipo_drawer")?.value).toUpperCase() || null;
  const metodo_pago = safeText($("metodo_pago_drawer")?.value) || null;

  const creditoRaw = safeText($("credito_dias_drawer")?.value);
  const credito_dias = creditoRaw ? Number(creditoRaw) : null;
  const credito_dias_final = metodo_pago === "contado" ? null : credito_dias;

  const payload = {
    doc_tipo,
    doc_numero: safeText($("doc_numero_drawer")?.value) || null,
    cliente_nombre: safeText($("cliente_nombre_drawer")?.value) || null,
    cliente_telefono: safeText($("cliente_telefono_drawer")?.value) || null,
    botica_nombre: safeText($("botica_nombre_drawer")?.value) || null,
    ubicacion: safeText($("ubicacion_drawer")?.value) || null,
    metodo_pago,
    credito_dias: credito_dias_final,
    comprobante: safeText($("comprobante_drawer")?.value) || null,
    nota: safeText($("nota_drawer")?.value) || null,
    estado: "nuevo",
  };

  const { data: pedido, error: e1 } = await db
    .from("pedidos")
    .insert(payload)
    .select("id")
    .single();

  if (e1) {
    setNotice("msg_drawer", "Error pedido: " + e1.message, "bad");
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
    setNotice("msg_drawer", "Error items: " + e2.message, "bad");
    return;
  }

  carritoClear();
  setNotice("msg_drawer", `Pedido enviado (#${pedido.id}).`, "ok");
  closeCart();
}

// =====================
// Admin: login + cargar pedidos
// =====================
async function adminLogin() {
  if (!$("btn_login")) return;

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
  if (!$("btn_logout")) return;

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

  // Limpiar
  if (cards) cards.innerHTML = "";
  if (out) {
    out.textContent = "";
    out.classList.add("hidden"); // no mostrar JSON
  }

  const { data: pedidos, error: e1 } = await db
    .from("pedidos")
    .select("*")
    .order("id", { ascending: false })
    .limit(50);

  if (e1) {
    if (cards) cards.textContent = "Error: " + e1.message;
    return;
  }

  if (!cards) return;

  pedidos.forEach((p) => {
    const c = document.createElement("div");
    c.className = "card";
    c.style.marginTop = "12px";

    const creado = p.created_at ? new Date(p.created_at).toLocaleString() : "-";
    const cliente = p.cliente_nombre || "-";
    const tel = p.cliente_telefono || "-";
    const botica = p.botica_nombre || "-";
    const ub = p.ubicacion || "-";

    const docTipo = p.doc_tipo || "-";
    const docNum = p.doc_numero || "-";

    const metodo = p.metodo_pago || "-";
    const credito = p.credito_dias == null ? "-" : String(p.credito_dias);
    const comp = p.comprobante || "-";
    const nota = p.nota || "-";
    const estado = p.estado || "-";

    c.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <div><strong>#${p.id}</strong> · ${botica} · ${cliente}</div>
        <div class="muted">${estado}</div>
      </div>

      <div class="muted" style="margin-top:8px;">
        <strong>Documento:</strong> ${docTipo} ${docNum}
      </div>

      <div class="muted" style="margin-top:6px;">
        <strong>Tel:</strong> ${tel}
      </div>

      <div class="muted" style="margin-top:6px;">
        <strong>Ubicación:</strong> ${ub}
      </div>

      <div class="muted" style="margin-top:6px;">
        <strong>Pago:</strong> ${metodo} ${metodo === "credito" ? `(días: ${credito})` : ""}
      </div>

      <div class="muted" style="margin-top:6px;">
        <strong>Comprobante:</strong> ${comp}
      </div>

      <div class="muted" style="margin-top:6px;">
        <strong>Nota:</strong> ${nota}
      </div>

      <div class="muted" style="margin-top:6px;">
        <strong>Fecha:</strong> ${creado}
      </div>
    `;

    cards.appendChild(c);
  });
}

// =====================
// Cargar productos desde Supabase
// =====================
async function cargarProductos() {
  const catsEl = $("categorias");
  const prodEl = $("productos");
  if (!catsEl && !prodEl) return;

  if (catsEl) catsEl.textContent = "Cargando categorías...";

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
// Wireup (index)
// =====================
$("btn_limpiar")?.addEventListener("click", carritoClear);
$("btn_volver")?.addEventListener("click", mostrarCategorias);

$("busqueda")?.addEventListener("input", (e) => {
  if (vista !== "productos") return;
  const q = safeText(e.target.value).toLowerCase();
  const base = productos.filter(p => getCategoria(p) === categoriaActual);
  const filtered = !q ? base : base.filter(p =>
    (p.nombre || "").toLowerCase().includes(q) || (p.codigo || "").toLowerCase().includes(q)
  );
  renderProductos(filtered);
});

// =====================
// Wireup (admin)
// =====================
$("btn_login")?.addEventListener("click", adminLogin);
$("btn_logout")?.addEventListener("click", adminLogout);
$("btn_cargar")?.addEventListener("click", cargarPedidosAdmin);

// =====================
// Init
// =====================
ensureCartDrawerUI();

// Logos (Supabase Storage bucket: images)
const urlNaturalex = publicImg("branding/naturalex.png") || "";
const urlSyf = publicImg("branding/syf.png") || "";

// Header (Naturalex grande centrado)
const ln = $("logo_naturalex");
if (ln) ln.src = urlNaturalex;

// Footer (Naturalex + SYF)
const lnf = $("logo_naturalex_footer");
if (lnf) lnf.src = urlNaturalex;

const lsf = $("logo_syf_footer");
if (lsf) lsf.src = urlSyf;
cargarProductos();
renderCarrito();
