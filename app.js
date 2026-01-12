// Configuración de Supabase
const SUPABASE_URL = 'https://ihdvcgculnadvunfeeoo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZHZjZ2N1bG5hZHZ1bmZlZW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3MjM1NjcsImV4cCI6MjA1MjI5OTU2N30.Ze-a6yGnl-kR4rK7M5w_cJmDIcJO';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let productos = [];
let carrito = [];
let categorias = [];

document.addEventListener('DOMContentLoaded', function() {
    cargarProductos();
});

async function cargarProductos() {
    try {
        const { data, error } = await supabaseClient
            .from('productos')
            .select('*')
            .order('categoria', { ascending: true });

        if (error) {
            console.error('Error:', error);
            mostrarMensaje('Error al cargar productos: ' + error.message, 'error');
            return;
        }

        productos = data;
        categorias = [...new Set(productos.map(p => p.categoria))];

        renderizarFiltros();
        renderizarProductos(productos);

    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error al cargar productos', 'error');
    }
}

function renderizarFiltros() {
    const container = document.getElementById('categorias-filter');
    let html = '<button class="filter-btn active" onclick="filterCategoria(null)">Todas</button>';

    categorias.forEach((cat, index) => {
        html += '<button class="filter-btn" onclick="filterCategoria(' + index + ')">' + cat + '</button>';
    });

    container.innerHTML = html;
}

function filterCategoria(index) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (index === null) {
        renderizarProductos(productos);
    } else {
        const categoria = categorias[index];
        const filtrados = productos.filter(p => p.categoria === categoria);
        renderizarProductos(filtrados);
    }
}

function renderizarProductos(prods) {
    const grid = document.getElementById('productos-grid');

    if (prods.length === 0) {
        grid.innerHTML = '<p style="text-align: center; padding: 40px; grid-column: 1/-1;">No hay productos disponibles</p>';
        return;
    }

    let html = '';
    prods.forEach(function(p) {
        html += '<div class="producto-card">';
        html += '<div class="producto-categoria">' + p.categoria + '</div>';
        html += '<div class="producto-nombre">' + p.nombre + '</div>';
        html += '<div class="producto-presentacion">Presentación: ' + p.presentacion + '</div>';
        html += '<div class="producto-precio">S/ ' + parseFloat(p.precio).toFixed(2) + '</div>';
        html += '<div class="producto-actions">';
        html += '<input type="number" id="cant-' + p.codigo + '" value="1" min="1">';
        html += '<button onclick="agregarAlCarrito('' + p.codigo + '')">Agregar</button>';
        html += '</div>';
        html += '</div>';
    });

    grid.innerHTML = html;
}

function agregarAlCarrito(codigo) {
    const producto = productos.find(p => p.codigo === codigo);
    const cantidadInput = document.getElementById('cant-' + codigo);
    const cantidad = parseInt(cantidadInput.value) || 1;

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

function actualizarCarrito() {
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');

    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    cartCount.textContent = totalItems;

    if (carrito.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">El carrito está vacío</p>';
        return;
    }

    let html = '';
    carrito.forEach(function(item, index) {
        html += '<div class="cart-item">';
        html += '<div class="cart-item-info">';
        html += '<h4>' + item.nombre + '</h4>';
        html += '<p>Cantidad: ' + item.cantidad + '</p>';
        html += '<p class="cart-item-price">S/ ' + (item.precio * item.cantidad).toFixed(2) + '</p>';
        html += '</div>';
        html += '<button class="remove-item" onclick="removerDelCarrito(' + index + ')">✕</button>';
        html += '</div>';
    });

    cartItems.innerHTML = html;
}

function removerDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    sidebar.classList.toggle('open');
}

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

function backToProducts() {
    document.getElementById('productos-section').style.display = 'block';
    document.getElementById('checkout-section').style.display = 'none';
}

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

document.getElementById('pedido-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (carrito.length === 0) {
        mostrarMensaje('El carrito está vacío', 'error');
        return;
    }

    try {
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

        const { data: pedido, error: errorPedido } = await supabaseClient
            .from('pedidos')
            .insert([pedidoData])
            .select();

        if (errorPedido) throw errorPedido;

        const pedidoId = pedido[0].id;

        const items = carrito.map(function(item) {
            return {
                pedido_id: pedidoId,
                producto_codigo: item.codigo,
                cantidad: item.cantidad,
                precio_unitario: item.precio
            };
        });

        const { error: errorItems } = await supabaseClient
            .from('pedido_items')
            .insert(items);

        if (errorItems) throw errorItems;

        mostrarMensaje('¡Pedido enviado exitosamente! Pedido #' + pedidoId, 'exito');

        document.getElementById('pedido-form').reset();
        carrito = [];
        actualizarCarrito();

        setTimeout(function() {
            backToProducts();
        }, 3000);

    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error al enviar el pedido: ' + error.message, 'error');
    }
});

function mostrarMensaje(texto, tipo) {
    const mensaje = document.getElementById('mensaje');
    mensaje.textContent = texto;
    mensaje.className = 'mensaje ' + tipo;

    setTimeout(function() {
        mensaje.className = 'mensaje';
    }, 5000);
}
