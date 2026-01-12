// Configuración de Supabase
const SUPABASE_URL = 'https://ihdvcgculnadvunfeeoo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZHZjZ2N1bG5hZHZ1bmZlZW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3MjM1NjcsImV4cCI6MjA1MjI5OTU2N30.Ze-a6yGnl-kR4rK7M5w_cJmDIcJO';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales
let productos = [];
let carrito = [];
let categorias = [];

// Cargar productos al inicio
document.addEventListener('DOMContentLoaded', async () => {
    await cargarProductos();
});

// Cargar productos desde Supabase
async function cargarProductos() {
    try {
        const { data, error } = await supabaseClient
            .from('productos')
            .select('*')
            .order('categoria', { ascending: true });

        if (error) throw error;

        productos = data;

        // Extraer categorías únicas
        categorias = [...new Set(productos.map(p => p.categoria))];

        // Renderizar filtros de categorías
        renderizarFiltros();

        // Renderizar productos
        renderizarProductos(productos);

    } catch (error) {
        console.error('Error al cargar productos:', error);
        mostrarMensaje('Error al cargar productos', 'error');
    }
}

// Renderizar filtros de categorías
function renderizarFiltros() {
    const container = document.getElementById('categorias-filter');
    let html = '<button class="filter-btn active" onclick="filterCategoria('todas')">Todas</button>';

    categorias.forEach(cat => {
        const catSafe = cat.replace(/'/g, "\\'");
        html += `<button class="filter-btn" onclick="filterCategoria('${catSafe}')">${cat}</button>`;
    });

    container.innerHTML = html;
}

// Filtrar por categoría
function filterCategoria(categoria) {
    // Actualizar botones activos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Filtrar productos
    if (categoria === 'todas') {
        renderizarProductos(productos);
    } else {
        const filtrados = productos.filter(p => p.categoria === categoria);
        renderizarProductos(filtrados);
    }
}

// Renderizar productos
function renderizarProductos(prods) {
    const grid = document.getElementById('productos-grid');

    if (prods.length === 0) {
        grid.innerHTML = '<p style="text-align: center; padding: 40px;">No hay productos disponibles</p>';
        return;
    }

    grid.innerHTML = prods.map(p => `
        <div class="producto-card">
            <div class="producto-categoria">${p.categoria}</div>
            <div class="producto-nombre">${p.nombre}</div>
            <div class="producto-presentacion">Presentación: ${p.presentacion}</div>
            <div class="producto-precio">S/ ${parseFloat(p.precio).toFixed(2)}</div>
            <div class="producto-actions">
                <input type="number" id="cant-${p.codigo}" value="1" min="1">
                <button onclick="agregarAlCarrito('${p.codigo}')">Agregar</button>
            </div>
        </div>
    `).join('');
}

// Agregar al carrito
function agregarAlCarrito(codigo) {
    const producto = productos.find(p => p.codigo === codigo);
    const cantidadInput = document.getElementById(`cant-${codigo}`);
    const cantidad = parseInt(cantidadInput.value) || 1;

    // Verificar si ya existe en el carrito
    const existente = carrito.find(item => item.codigo === codigo);

    if (existente) {
        existente.cantidad += cantidad;
    } else {
        carrito.push({
            codigo: producto.codigo,
            nombre: producto.nombre,
            precio: parseFloat(producto.precio),
            cantidad: cantidad
        });
    }

    actualizarCarrito();
    mostrarMensaje('Producto agregado al carrito', 'exito');
}

// Actualizar carrito
function actualizarCarrito() {
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');

    cartCount.textContent = carrito.reduce((sum, item) => sum + item.cantidad, 0);

    if (carrito.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">El carrito está vacío</p>';
        return;
    }

    cartItems.innerHTML = carrito.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h4>${item.nombre}</h4>
                <p>Cantidad: ${item.cantidad}</p>
                <p class="cart-item-price">S/ ${(item.precio * item.cantidad).toFixed(2)}</p>
            </div>
            <button class="remove-item" onclick="removerDelCarrito(${index})">✕</button>
        </div>
    `).join('');
}

// Remover del carrito
function removerDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

// Toggle carrito
function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    sidebar.classList.toggle('open');
}

// Mostrar checkout
function showCheckout() {
    if (carrito.length === 0) {
        mostrarMensaje('El carrito está vacío', 'error');
        return;
    }

    document.getElementById('productos-section').style.display = 'none';
    document.getElementById('checkout-section').style.display = 'block';
    toggleCart();
    window.scrollTo(0, 0);
}

// Volver a productos
function backToProducts() {
    document.getElementById('productos-section').style.display = 'block';
    document.getElementById('checkout-section').style.display = 'none';
}

// Toggle días de crédito
function toggleDiasCredito() {
    const formaPago = document.getElementById('forma_pago').value;
    const diasGroup = document.getElementById('dias_credito_group');
    const diasSelect = document.getElementById('dias_credito');

    if (formaPago === 'Crédito') {
        diasGroup.style.display = 'block';
        diasSelect.required = true;
    } else {
        diasGroup.style.display = 'none';
        diasSelect.required = false;
        diasSelect.value = '';
    }
}

// Enviar pedido
document.getElementById('pedido-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (carrito.length === 0) {
        mostrarMensaje('El carrito está vacío', 'error');
        return;
    }

    try {
        // Preparar datos del pedido
        const pedidoData = {
            nombre_cliente: document.getElementById('nombre_cliente').value,
            nombre_botica: document.getElementById('nombre_botica').value || null,
            dni_ruc: document.getElementById('dni_ruc').value,
            telefono: document.getElementById('telefono').value,
            email: document.getElementById('email').value,
            departamento: document.getElementById('departamento').value,
            provincia: document.getElementById('provincia').value,
            distrito: document.getElementById('distrito').value,
            direccion: document.getElementById('direccion').value,
            tipo_comprobante: document.getElementById('tipo_comprobante').value,
            forma_pago: document.getElementById('forma_pago').value,
            dias_credito: document.getElementById('dias_credito').value ? parseInt(document.getElementById('dias_credito').value) : null
        };

        // Insertar pedido
        const { data: pedido, error: errorPedido } = await supabaseClient
            .from('pedidos')
            .insert([pedidoData])
            .select();

        if (errorPedido) throw errorPedido;

        const pedidoId = pedido[0].id;

        // Insertar items del pedido
        const items = carrito.map(item => ({
            pedido_id: pedidoId,
            producto_codigo: item.codigo,
            cantidad: item.cantidad,
            precio_unitario: item.precio
        }));

        const { error: errorItems } = await supabaseClient
            .from('pedido_items')
            .insert(items);

        if (errorItems) throw errorItems;

        // Éxito
        mostrarMensaje('¡Pedido enviado exitosamente! Pedido #' + pedidoId, 'exito');

        // Limpiar formulario y carrito
        document.getElementById('pedido-form').reset();
        carrito = [];
        actualizarCarrito();

        // Volver a productos después de 3 segundos
        setTimeout(() => {
            backToProducts();
        }, 3000);

    } catch (error) {
        console.error('Error al enviar pedido:', error);
        mostrarMensaje('Error al enviar el pedido: ' + error.message, 'error');
    }
});

// Mostrar mensaje
function mostrarMensaje(texto, tipo) {
    const mensaje = document.getElementById('mensaje');
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo}`;

    setTimeout(() => {
        mensaje.className = 'mensaje';
    }, 5000);
}
