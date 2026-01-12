// ========== CONFIGURACIÓN DE SUPABASE ==========
const SUPABASE_URL = 'https://ihdvcgculnadvunfeeoo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZHZjZ2N1bG5hZHZ1bmZlZW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3MTQyNzksImV4cCI6MjA1MjI5MDI3OX0.t39gListed3Listed4Listed5Listed6Listed7Listed8Listed9';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales
let productos = [];
let carrito = [];
let categoriaActual = '';

// Referencias a elementos del DOM
const seccionInicio = document.getElementById('seccionInicio');
const seccionCategorias = document.getElementById('seccionCategorias');
const seccionProductos = document.getElementById('seccionProductos');
const listaCategorias = document.getElementById('listaCategorias');
const listaProductos = document.getElementById('listaProductos');
const modalCarrito = document.getElementById('modalCarrito');
const contenidoCarrito = document.getElementById('contenidoCarrito');
const totalCarrito = document.getElementById('totalCarrito');
const contadorCarrito = document.getElementById('contadorCarrito');
const formularioPedido = document.getElementById('formularioPedido');

// Cargar productos al iniciar
cargarProductos();
cargarPedidos();

// Función para cargar productos desde Supabase
async function cargarProductos() {
    try {
        const { data, error } = await supabase
            .from('productos')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) throw error;

        productos = data;
        console.log('✅ Productos cargados:', productos.length);
    } catch (error) {
        console.error('❌ Error al cargar productos:', error);
        alert('Error al cargar productos. Verifica tu conexión.');
    }
}

// Mostrar categorías
function mostrarCategorias() {
    history.pushState({ vista: 'categorias' }, '', '#categorias');
    
    seccionInicio.style.display = 'none';
    seccionCategorias.style.display = 'block';
    seccionProductos.style.display = 'none';

    const categorias = [...new Set(productos.map(p => p.presentacion))];
    
    let html = '';
    categorias.forEach(cat => {
        const cantidad = productos.filter(p => p.presentacion === cat).length;
        html += `
            <div class="categoria-card" onclick="verProductos('${cat}')">
                <h3>${cat}</h3>
                <p>${cantidad} productos</p>
            </div>
        `;
    });
    
    listaCategorias.innerHTML = html;
}

// Ver productos de una categoría
function verProductos(cat) {
    categoriaActual = cat;
    history.pushState({ vista: 'productos', categoria: cat }, '', `#productos/${cat}`);
    
    seccionCategorias.style.display = 'none';
    seccionProductos.style.display = 'block';
    
    document.getElementById('categoriaActualTitulo').textContent = cat;
    
    const productosFiltrados = productos.filter(p => p.presentacion === cat);
    renderizarProductos(productosFiltrados);
}

// Renderizar productos
function renderizarProductos(prods) {
    let html = '';
    prods.forEach(p => {
        html += `
            <div class="producto-card">
                <h3>${p.nombre}</h3>
                <p>S/ ${p.precio.toFixed(2)}</p>
                <p style="font-size: 12px; color: #666;">Stock: ${p.presentacion || 'N/A'}</p>
                <button onclick="agregarAlCarrito('${p.codigo}')">Agregar al Carrito</button>
            </div>
        `;
    });
    listaProductos.innerHTML = html;
}

// Agregar al carrito
function agregarAlCarrito(codigo) {
    const producto = productos.find(p => p.codigo === codigo);
    
    if (!producto) {
        console.error('❌ Producto no encontrado:', codigo);
        alert('Error: Producto no encontrado');
        return;
    }

    const itemExistente = carrito.find(item => item.codigo === codigo);
    
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({
            codigo: producto.codigo,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: 1
        });
    }

    actualizarCarrito();
    alert(`✅ ${producto.nombre} agregado al carrito`);
}

// Actualizar carrito
function actualizarCarrito() {
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    contadorCarrito.textContent = totalItems;
}

// Ver carrito
function verCarrito() {
    if (carrito.length === 0) {
        alert('El carrito está vacío');
        return;
    }

    let html = '';
    let total = 0;

    carrito.forEach((item, index) => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        
        html += `
            <div class="carrito-item">
                <div>
                    <strong>${item.nombre}</strong><br>
                    S/ ${item.precio.toFixed(2)} x ${item.cantidad} = S/ ${subtotal.toFixed(2)}
                </div>
                <button onclick="eliminarDelCarrito(${index})">Eliminar</button>
            </div>
        `;
    });

    contenidoCarrito.innerHTML = html;
    totalCarrito.textContent = total.toFixed(2);
    modalCarrito.style.display = 'block';
}

// Cerrar carrito
function cerrarCarrito() {
    modalCarrito.style.display = 'none';
}

// Eliminar del carrito
function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
    verCarrito();
}

// Mostrar formulario de pedido
function mostrarFormularioPedido() {
    modalCarrito.style.display = 'none';
    formularioPedido.style.display = 'block';
}

// Cancelar pedido
function cancelarPedido() {
    formularioPedido.style.display = 'none';
}

// Volver a categorías
function volverACategorias() {
    history.back();
}

// Hacer pedido
document.getElementById('formDatosPedido').addEventListener('submit', async (e) => {
    e.preventDefault();

    const cliente = document.getElementById('inputCliente').value;
    const email = document.getElementById('inputEmail').value;
    const telefono = document.getElementById('inputTelefono').value;
    const direccion = document.getElementById('inputDireccion').value;

    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    try {
        const { data: pedido, error: errorPedido } = await supabase
            .from('pedidos')
            .insert([{
                cliente,
                email,
                telefono,
                direccion,
                total,
                estado: 'Pendiente'
            }])
            .select()
            .single();

        if (errorPedido) throw errorPedido;

        const items = carrito.map(item => ({
            pedido_id: pedido.id,
            codigo: item.codigo,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precio: item.precio
        }));

        const { error: errorItems } = await supabase
            .from('pedido_items')
            .insert(items);

        if (errorItems) throw errorItems;

        alert('✅ Pedido realizado con éxito. ID: ' + pedido.id);

        await exportarPedidoActual(pedido.id);

        carrito = [];
        actualizarCarrito();
        formularioPedido.style.display = 'none';
        document.getElementById('formDatosPedido').reset();
        cargarPedidos();

    } catch (error) {
        console.error('❌ Error al hacer pedido:', error);
        alert('Error al realizar el pedido: ' + error.message);
    }
});

// Cargar historial de pedidos
async function cargarPedidos() {
    try {
        const { data, error } = await supabase
            .from('pedidos')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        let html = '';
        
        if (data.length === 0) {
            html = '<p>No hay pedidos registrados</p>';
        } else {
            for (const pedido of data) {
                const { data: items } = await supabase
                    .from('pedido_items')
                    .select('*')
                    .eq('pedido_id', pedido.id);

                html += `
                    <div class="pedido-card">
                        <h3>Pedido #${pedido.id}</h3>
                        <p><strong>Cliente:</strong> ${pedido.cliente}</p>
                        <p><strong>Email:</strong> ${pedido.email}</p>
                        <p><strong>Teléfono:</strong> ${pedido.telefono}</p>
                        <p><strong>Dirección:</strong> ${pedido.direccion}</p>
                        <p><strong>Total:</strong> S/ ${pedido.total.toFixed(2)}</p>
                        <p><strong>Estado:</strong> ${pedido.estado || 'Pendiente'}</p>
                        <p><strong>Fecha:</strong> ${new Date(pedido.created_at).toLocaleString('es-PE')}</p>
                        <div class="pedido-items">
                            <strong>Productos:</strong>
                            <ul>
                                ${items.map(i => `<li>${i.nombre} x${i.cantidad} - S/ ${(i.precio * i.cantidad).toFixed(2)}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `;
            }
        }

        document.getElementById('listaPedidos').innerHTML = html;
    } catch (error) {
        console.error('❌ Error al cargar pedidos:', error);
    }
}

// Exportar TODOS los pedidos a Excel
async function exportarPedidosExcel() {
    try {
        const { data: pedidos, error: errorPedidos } = await supabase
            .from('pedidos')
            .select('*')
            .order('created_at', { ascending: false });

        if (errorPedidos) throw errorPedidos;

        if (pedidos.length === 0) {
            alert('No hay pedidos para exportar');
            return;
        }

        const datosExcel = [];
        
        for (const pedido of pedidos) {
            const { data: detalles } = await supabase
                .from('pedido_items')
                .select('*')
                .eq('pedido_id', pedido.id);

            datosExcel.push({
                'ID Pedido': pedido.id,
                'Cliente': pedido.cliente,
                'Email': pedido.email,
                'Teléfono': pedido.telefono,
                'Dirección': pedido.direccion,
                'Total': pedido.total.toFixed(2),
                'Estado': pedido.estado || 'Pendiente',
                'Fecha': new Date(pedido.created_at).toLocaleString('es-PE'),
                'Productos': detalles.map(d => `${d.nombre} (x${d.cantidad})`).join(' | '),
                'Cantidad Artículos': detalles.length
            });
        }

        const ws = XLSX.utils.json_to_sheet(datosExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');

        ws['!cols'] = [
            { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 15 },
            { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 25 },
            { wch: 50 }, { wch: 15 }
        ];

        const nombreArchivo = `Pedidos_NATURALEX_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, nombreArchivo);

        alert('✅ Reporte descargado correctamente');
    } catch (error) {
        console.error('❌ Error al exportar:', error);
        alert('Error al exportar pedidos: ' + error.message);
    }
}

// Exportar pedido individual a Excel
async function exportarPedidoActual(pedidoId) {
    try {
        const { data: pedido } = await supabase
            .from('pedidos')
            .select('*')
            .eq('id', pedidoId)
            .single();

        const { data: detalles } = await supabase
            .from('pedido_items')
            .select('*')
            .eq('pedido_id', pedidoId);

        const datos = [
            ['NATURALEX - COMPROBANTE DE PEDIDO'],
            [],
            ['ID Pedido:', pedido.id],
            ['Cliente:', pedido.cliente],
            ['Email:', pedido.email],
            ['Teléfono:', pedido.telefono],
            ['Dirección:', pedido.direccion],
            ['Fecha:', new Date(pedido.created_at).toLocaleString('es-PE')],
            ['Estado:', pedido.estado || 'Pendiente'],
            [],
            ['DETALLE DE PRODUCTOS'],
            ['Producto', 'Cantidad', 'Precio Unit.', 'Subtotal'],
        ];

        detalles.forEach(item => {
            const subtotal = item.cantidad * item.precio;
            datos.push([
                item.nombre,
                item.cantidad,
                `S/ ${item.precio.toFixed(2)}`,
                `S/ ${subtotal.toFixed(2)}`
            ]);
        });

        datos.push([]);
        datos.push(['', '', 'TOTAL A PAGAR:', `S/ ${pedido.total.toFixed(2)}`]);

        const ws = XLSX.utils.aoa_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pedido');

        ws['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];

        const nombreArchivo = `Pedido_${pedido.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, nombreArchivo);

    } catch (error) {
        console.error('❌ Error al exportar pedido:', error);
    }
}

// Manejar navegación con botones Atrás/Adelante
window.addEventListener('popstate', (event) => {
    if (event.state) {
        if (event.state.vista === 'categorias') {
            seccionInicio.style.display = 'none';
            seccionCategorias.style.display = 'block';
            seccionProductos.style.display = 'none';
            mostrarCategorias();
        } else if (event.state.vista === 'productos') {
            verProductos(event.state.categoria);
        }
    } else {
        seccionInicio.style.display = 'block';
        seccionCategorias.style.display = 'none';
        seccionProductos.style.display = 'none';
    }
});

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    if (event.target == modalCarrito) {
        cerrarCarrito();
    }
}
