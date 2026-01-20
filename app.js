// app.js
// Requiere que el HTML tenga:
// <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
// <script type="module" src="./app.js"></script>

const { createClient } = supabase;

const SUPABASE_URL = "https://jhhejboarcscbjvufviz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoaGVqYm9hcmNzY2JqdnVmdml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjYwODAsImV4cCI6MjA4NDQ0MjA4MH0.oUHNvK-OHo4z-cJuPu-ADaZ7Q6Q5_Ocr6ofpYnvvDto";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --------------------
// Carrito (solo navegador)
// --------------------
let carrito = []; // [{producto_id, nombre, precio, cantidad}]

function $(id) {
  return document.getElementById(id);
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text ?? "";
}

function renderCarrito() {
  const el = $("carrito");
  if (!el) return;

  const total = carrito.reduce((acc, it) => acc + it.precio * it.cantidad, 0);
  el.textContent = JSON.stringify({ items: carrito, total }, null, 2);
}

function addToCarrito(p) {
  const item = carrito.find((x) => x.producto_id === p.id);
  if (item) item.cantidad += 1;
  else carrito.push({ producto_id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1 });
  renderCarrito();
}

function clearCarrito() {
  carrito = [];
  renderCarrito();
}

// --------------------
// Público: cargar productos
// --------------------
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

  cont.innerHTML = "";
  data.forEach((p) => {
    const row = document.createElement("div");
    row.style.marginBottom = "8px";

    const btn = document.createElement("button");
    btn.textContent = `Agregar: ${p.nombre} (S/ ${p.precio})`;
    btn.onclick = () => addToCarrito(p);

    row.appendChild(btn);
    cont.appendChild(row);
  });

  renderCarrito();
}

// --------------------
// Público: enviar pedido (INSERT pedidos + pedido_items)
// --------------------
async function enviarPedido() {
  const msgId = "msg";
  if (!$("btn_enviar")) return;

  setText(msgId, "");

  if (carrito.length === 0) {
    setText(msgId, "Carrito vacío.");
    return;
  }

  const metodo_pago = $("metodo_pago")?.value || null;
  const credito_dias_raw = $("credito_dias")?.value || "";
  const credito_dias = credito_dias_raw ? Number(credito_dias_raw) : null;

  // Si es contado, fuerza credito_dias null (por tu CHECK)
  const credito_dias_final = metodo_pago === "contado" ? null : credito_dias;

  const payload = {
    cliente_nombre: $("cliente_nombre")?.value?.trim() || null,
    cliente_telefono: $("cliente_telefono")?.value?.trim() || null,

    doc_tipo: $("doc_tipo")?.value?.trim() || null, // 'DNI' o 'RUC'
    doc_numero: $("doc_numero")?.value?.trim() || null,

    botica_nombre: $("botica_nombre")?.value?.trim() || null,
    ubicacion: $("ubicacion")?.value?.trim() || null,

    metodo_pago,
    credito_dias: credito_dias_final,
    comprobante: $("comprobante")?.value || null,

    estado: "nuevo",
  };

  // 1) Insert pedido
  const { data: pedido, error: e1 } = await db.from("pedidos").insert(payload).select("id").single();
  if (e1) {
    setText(msgId, "Error pedido: " + e1.message);
    return;
  }

  // 2) Insert items
  const items = carrito.map((i) => ({
    pedido_id: pedido.id,
    producto_id: i.producto_id,
    cantidad: i.cantidad,
    precio_unit: i.precio,
  }));

  const { error: e2 } = await db.from("pedido_items").insert(items);
  if (e2) {
    setText(msgId, "Error items: " + e2.message);
    return;
  }

  clearCarrito();
  setText(msgId, `Pedido enviado (#${pedido.id}).`);
}

// --------------------
// Admin: Auth + listar pedidos
// --------------------
async function loginAdmin() {
  if (!$("btn_login")) return;

  const email = $("email")?.value?.trim();
  const password = $("password")?.value;

  if (!email || !password) {
    setText("auth_msg", "Falta email o password.");
    return;
  }

  const { error } = await db.auth.signInWithPassword({ email, password }); // v2 [web:400]
  setText("auth_msg", error ? "Error: " + error.message : "OK: sesión iniciada.");
}

async function logoutAdmin() {
  if (!$("btn_logout")) return;
  await db.auth.signOut();
  setText("auth_msg", "Sesión cerrada.");
}

async function cargarPedidos() {
  if (!$("btn_cargar")) return;

  setText("pedidos", "Cargando...");

  const { data, error } = await db
    .from("pedidos")
    .select("id,created_at,cliente_nombre,cliente_telefono,doc_tipo,doc_numero,botica_nombre,ubicacion,metodo_pago,credito_dias,comprobante,estado")
    .order("id", { ascending: false })
    .limit(100);

  if (error) {
    setText("pedidos", "Error: " + error.message);
    return;
  }

  setText("pedidos", JSON.stringify(data, null, 2));
}

// --------------------
// Wireup (según la página)
// --------------------
$("btn_enviar")?.addEventListener("click", enviarPedido);

$("btn_login")?.addEventListener("click", loginAdmin);
$("btn_logout")?.addEventListener("click", logoutAdmin);
$("btn_cargar")?.addEventListener("click", cargarPedidos);

// Auto-load productos si estamos en index.html
cargarProductos();
renderCarrito();
