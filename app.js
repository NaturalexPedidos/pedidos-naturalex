// app.js (GitHub Pages + Supabase)
// Requiere en el HTML:
// <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
// <script type="module" src="./app.js"></script>

const { createClient } = supabase;

// Tus datos (OK para frontend con RLS)
const SUPABASE_URL = "https://jhhejboarcscbjvufviz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoaGVqYm9hcmNzY2JqdnVmdml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjYwODAsImV4cCI6MjA4NDQ0MjA4MH0.oUHNvK-OHo4z-cJuPu-ADaZ7Q6Q5_Ocr6ofpYnvvDto";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -----------------------------
// Helpers
// -----------------------------
const $ = (id) => document.getElementById(id);

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

function safeText(s) {
  return (s ?? "").toString().trim();
}

// -----------------------------
// Estado (catálogo + carrito)
// -----------------------------
let productos = []; // cache
let carrito = [];   // [{producto_id, nombre, precio, cantidad}]

function carritoTotal() {
  return carrito.reduce((acc, it) => acc + (Number(it.precio) * Number(it.cantidad)), 0);
}

function carritoCount() {
  return carrito.reduce((acc, it) => acc + Number(it.cantidad), 0);
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

// -----------------------------
// UI: Productos
// -----------------------------
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
    code.textContent = p.codigo;

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

async function cargarProductos() {
  const cont = $("productos");
  if (!cont) return; // estamos en admin.html

  cont.textContent = "Cargando productos...";

  const { data, error } = await db
    .from("productos")
    .select("id,codigo,nombre,precio,activo")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    cont.textContent = "Error: " + error.message;
    return;
  }

  productos = data || [];
  renderProductos(productos);
}

// -----------------------------
// UI: Carrito
// -----------------------------
function renderCarrito() {
  const el = $("carrito_ui");
  const totalEl = $("total");

  if (totalEl) totalEl.textContent = money(carritoTotal());

  if (!el) return; // admin.html
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

// -----------------------------
// Lógica formulario (crédito + doc)
// -----------------------------
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
      // Si eligen factura, sugerimos RUC
      if (comprobante.value === "factura" && !docTipo.value) docTipo.value = "RUC";
    });
  }
}

// -----------------------------
// Enviar pedido (INSERT)
// -----------------------------
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

  // Insert pedido
  const { data: pedido, error: e1 } = await db
    .from("pedidos")
    .insert(payload)
    .select("id")
    .single();

  if (e1) {
    setNotice("msg", "Error pedido: " + e1.message, "bad");
    return;
  }

  // Insert items
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

// -----------------------------
// Admin: Auth + pedidos
// -----------------------------
async function loginAdmin() {
  if (!$("btn_login")) return;

  const email = safeText($("email")?.value);
  const password = $("password")?.value || "";

  if (!email || !password) {
    setNotice("auth_msg", "Falta email o password.", "bad");
    return;
  }

  const { error } = await db.auth.signInWithPassword({ email, password }); // v2 [web:400]
  setNotice("auth_msg", error ? ("Error: " + error.message) : "OK: sesión iniciada.", error ? "bad" : "ok");
}

async function logoutAdmin() {
  if (!$("btn_logout")) return;
  await db.auth.signOut();
  setNotice("auth_msg", "Sesión cerrada.", "ok");
}

function renderPedidosCards(list) {
  const cont = $("pedidos_cards");
  if (!cont) return;

  cont.innerHTML = "";
  if (!list?.length) {
    const d = document.createElement("div");
    d.className = "muted";
    d.textContent = "No hay pedidos.";
    cont.appendChild(d);
    return;
  }

  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "order";

    const row1 = document.createElement("div");
    row1.className = "row";
    row1.innerHTML = `
      <div class="id">#${p.id}</div>
      <div class="pill">${p.estado || ""}</div>
      <div class="muted">${p.created_at || ""}</div>
    `;

    const row2 = document.createElement("div");
    row2.className = "row";
    row2.innerHTML = `
      <div><span class="muted">Cliente:</span> ${p.cliente_nombre || "-"}</div>
      <div><span class="muted">Cel:</span> ${p.cliente_telefono || "-"}</div>
    `;

    const row3 = document.createElement("div");
    row3.className = "row";
    row3.innerHTML = `
      <div><span class="muted">Doc:</span> ${p.doc_tipo || "-"} ${p.doc_numero || ""}</div>
      <div><span class="muted">Botica:</span> ${p.botica_nombre || "-"}</div>
    `;

    const row4 = document.createElement("div");
    row4.className = "row";
    row4.innerHTML = `
      <div><span class="muted">Ubicación:</span> ${p.ubicacion || "-"}</div>
      <div><span class="muted">Pago:</span> ${p.metodo_pago || "-"} ${p.credito_dias ? `(${p.credito_dias} días)` : ""}</div>
      <div><span class="muted">Comprobante:</span> ${p.comprobante || "-"}</div>
    `;

    card.appendChild(row1);
    card.appendChild(row2);
    card.appendChild(row3);
    card.appendChild(row4);

    cont.appendChild(card);
  });
}

async function cargarPedidos() {
  if (!$("btn_cargar")) return;

  const out = $("pedidos_cards");
  if (out) out.innerHTML = `<div class="muted">Cargando...</div>`;

  const { data, error } = await db
    .from("pedidos")
    .select("id,created_at,cliente_nombre,cliente_telefono,doc_tipo,doc_numero,botica_nombre,ubicacion,metodo_pago,credito_dias,comprobante,estado")
    .order("id", { ascending: false })
    .limit(50);

  if (error) {
    if (out) out.innerHTML = `<div class="muted">Error: ${error.message}</div>`;
    return;
  }

  renderPedidosCards(data || []);
}

// -----------------------------
// Wireup
// -----------------------------
$("btn_enviar")?.addEventListener("click", enviarPedido);
$("btn_limpiar")?.addEventListener("click", carritoClear);

$("btn_login")?.addEventListener("click", loginAdmin);
$("btn_logout")?.addEventListener("click", logoutAdmin);
$("btn_cargar")?.addEventListener("click", cargarPedidos);

$("busqueda")?.addEventListener("input", (e) => {
  const q = safeText(e.target.value).toLowerCase();
  const filtered = !q ? productos : productos.filter(p =>
    (p.nombre || "").toLowerCase().includes(q) || (p.codigo || "").toLowerCase().includes(q)
  );
  renderProductos(filtered);
});

// init (solo si existe el formulario)
setupFormUX();
cargarProductos();
renderCarrito();
