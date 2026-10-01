// ══════════════════════════════════════════════
// VENTAS.JS
// ══════════════════════════════════════════════

// ------------------------------------------------
// PRODUCTOS PARA REGISTRAR VENTA
// ------------------------------------------------

// ══════════════════════════════════════════════
//  SELECTOR VISUAL DE PRODUCTOS
// ══════════════════════════════════════════════

let ventaProductos = [];
let ventaProductoFiltro = "Todos";

// ──────────────────────────────────────────────
// ABRIR MODAL
// ──────────────────────────────────────────────

function openProductModal() {
  const modal = document.getElementById("producto-modal");

  if (!modal) return;

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");

  document.body.classList.add("producto-modal-open");

  const search = document.getElementById("producto-search");

  if (search) {
    search.value = "";

    setTimeout(() => {
      search.focus();
    }, 100);
  }

  renderProductPicker();
}

// ──────────────────────────────────────────────
// CERRAR MODAL
// ──────────────────────────────────────────────

function closeProductModal() {
  const modal = document.getElementById("producto-modal");

  if (!modal) return;

  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");

  document.body.classList.remove("producto-modal-open");
}

// ──────────────────────────────────────────────
// FILTRO
// ──────────────────────────────────────────────

function setProductFilter(filter, button) {
  ventaProductoFiltro = filter;

  document.querySelectorAll(".producto-filter").forEach((btn) => {
    btn.classList.remove("active");
  });

  if (button) {
    button.classList.add("active");
  }

  renderProductPicker();
}

// ──────────────────────────────────────────────
// ESCAPAR HTML
// ──────────────────────────────────────────────

function escapeProductHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ──────────────────────────────────────────────
// CARGAR PRODUCTOS
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// RENDER DE PRODUCTOS
// ──────────────────────────────────────────────

function renderProductPicker() {
  const grid = document.getElementById("producto-picker-grid");
  const count = document.getElementById("producto-modal-count");
  const searchInput = document.getElementById("producto-search");

  if (!grid) return;

  const search = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

  let products = ventaProductos.filter((product) => {

    // Solo mostrar productos que tengan stock
    if (Number(product.cantidad) <= 0) {
      return false;
    }

    // Filtro por categoría
    if (
      ventaProductoFiltro !== "Todos" &&
      product.categoria !== ventaProductoFiltro
    ) {
      return false;
    }

    // Buscador
    if (search) {
      const searchableText = [
        product.nombre,
        product.categoria,
        product.talla
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(search)) {
        return false;
      }
    }

    return true;
  });

  // Primero los productos con más stock
  products.sort((a, b) => {
    const stockA = Number(a.cantidad) || 0;
    const stockB = Number(b.cantidad) || 0;

    return stockB - stockA;
  });

  // Contador
  if (count) {
    count.textContent =
      products.length === 1
        ? "1 producto disponible"
        : `${products.length} productos disponibles`;
  }

  // Sin productos
  if (!products.length) {
    grid.innerHTML = `
      <div class="producto-picker-empty">

        <div class="producto-empty-icon">
          ⌕
        </div>

        <strong>No encontramos productos</strong>

        <span>
          Probá con otro nombre o cambiá el filtro.
        </span>

      </div>
    `;

    return;
  }

  // Crear tarjetas
  grid.innerHTML = products
    .map((product) => {

      const id = Number(product.id);
      const stock = Number(product.cantidad) || 0;

      const nombre = escapeProductHTML(
        product.nombre || "Producto sin nombre"
      );

      const categoria = escapeProductHTML(
        product.categoria || "Sin categoría"
      );

      const talla = product.talla
        ? escapeProductHTML(product.talla)
        : "Sin talle";

      // Imagen
      const image = product.imagen_url
        ? `
          <img
            src="${escapeProductHTML(product.imagen_url)}"
            alt="${nombre}"
            loading="lazy"
          />
        `
        : `
          <div class="producto-card-no-image">
            <span>⌑</span>
          </div>
        `;

      // Icono según categoría
      let categoriaIcon = "📦";

      if (
        String(product.categoria).toLowerCase() === "ropa"
      ) {
        categoriaIcon = "👕";
      }

      if (
        String(product.categoria).toLowerCase() === "accesorios"
      ) {
        categoriaIcon = "👜";
      }

      return `
        <button
          type="button"
          class="producto-picker-card"
          onclick="selectVentaProductById(${id})"
        >

          <!-- IMAGEN -->
          <div class="producto-picker-image">

            ${image}

            <span class="producto-stock-badge">
              ${stock} disponible${stock === 1 ? "" : "s"}
            </span>

          </div>


          <!-- INFORMACIÓN -->
          <div class="producto-picker-info">

            <!-- CATEGORÍA -->
            <span class="producto-picker-category">
              ${categoriaIcon} ${categoria}
            </span>


            <!-- NOMBRE -->
            <strong class="producto-picker-name">
              ${nombre}
            </strong>


            <!-- DETALLES -->
            <div class="producto-picker-meta">

              <span>
                Talle:
                <b>${talla}</b>
              </span>

              <span>
                Stock:
                <b>${stock}</b>
              </span>

            </div>

          </div>

        </button>
      `;
    })
    .join("");
}

// ──────────────────────────────────────────────
// SELECCIONAR POR ID
// ──────────────────────────────────────────────

function selectVentaProductById(productId) {
  const product = ventaProductos.find(
    (item) => String(item.id) === String(productId),
  );

  if (!product) return;

  selectVentaProduct(product, true);
}

// ──────────────────────────────────────────────
// SELECCIONAR PRODUCTO
// ──────────────────────────────────────────────

function selectVentaProduct(product, closeModal = true) {
  const productInput = document.getElementById("v-prod");

  const selector = document.getElementById("venta-producto-selector");

  const selected = document.getElementById("venta-producto-selected");

  const selectedImg = document.getElementById("venta-producto-selected-img");

  const selectedName = document.getElementById("venta-producto-selected-name");

  const selectedDetails = document.getElementById(
    "venta-producto-selected-details",
  );

  const stockInfo = document.getElementById("v-stock-info");

  const quantityInput = document.getElementById("v-cantidad");

  if (!productInput) return;

  // Guardamos el ID real
  productInput.value = product.id;

  // Guardamos también información útil
  productInput.dataset.stock = product.cantidad;
  productInput.dataset.nombre = product.nombre || "";
  productInput.dataset.categoria = product.categoria || "";
  productInput.dataset.talla = product.talla || "";

  // Ocultar selector inicial
  if (selector) {
    selector.style.display = "none";
  }

  // Mostrar tarjeta seleccionada
  if (selected) {
    selected.style.display = "flex";
  }

  // Imagen
  if (selectedImg) {
    if (product.imagen_url) {
      selectedImg.src = product.imagen_url;
      selectedImg.alt = product.nombre || "Producto";
      selectedImg.style.display = "block";
    } else {
      selectedImg.removeAttribute("src");
      selectedImg.alt = "";
      selectedImg.style.display = "none";
    }
  }

  // Nombre
  if (selectedName) {
    selectedName.textContent = product.nombre || "Producto";
  }

  // Detalles
  if (selectedDetails) {
    const talla = product.talla ? `Talle ${product.talla}` : "Sin talle";

    const categoria = product.categoria || "Sin categoría";

    selectedDetails.textContent = `${talla} · ${categoria} · Stock disponible: ${product.cantidad}`;
  }

  // Stock disponible
  if (stockInfo) {
    stockInfo.textContent = `Stock disponible: ${product.cantidad}`;

    stockInfo.classList.add("active");
  }

  // Limitar cantidad máxima
  if (quantityInput) {
    quantityInput.max = product.cantidad;

    const currentQuantity = parseInt(quantityInput.value, 10) || 1;

    if (currentQuantity > Number(product.cantidad)) {
      quantityInput.value = product.cantidad;
    }

    if (currentQuantity < 1) {
      quantityInput.value = 1;
    }
  }

  if (closeModal) {
    closeProductModal();
  }
}

// ──────────────────────────────────────────────
// LIMPIAR PRODUCTO SELECCIONADO
// ──────────────────────────────────────────────

function clearSelectedVentaProduct() {
  const productInput = document.getElementById("v-prod");

  const selector = document.getElementById("venta-producto-selector");

  const selected = document.getElementById("venta-producto-selected");

  const stockInfo = document.getElementById("v-stock-info");

  const quantityInput = document.getElementById("v-cantidad");

  if (productInput) {
    productInput.value = "";
    productInput.removeAttribute("data-stock");
    productInput.removeAttribute("data-nombre");
    productInput.removeAttribute("data-categoria");
    productInput.removeAttribute("data-talla");
  }

  if (selector) {
    selector.style.display = "flex";
  }

  if (selected) {
    selected.style.display = "none";
  }

  if (stockInfo) {
    stockInfo.textContent = "Seleccioná un producto";

    stockInfo.classList.remove("active");
  }

  if (quantityInput) {
    quantityInput.removeAttribute("max");
    quantityInput.value = "1";
  }
}

// ──────────────────────────────────────────────
// BUSCADOR
// ──────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("producto-search");

  if (search) {
    search.addEventListener("input", () => {
      renderProductPicker();
    });
  }

  // ESC para cerrar
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeProductModal();
    }
  });
});

async function loadProductOptions() {
  const { data, error } = await sb
    .from("stock")
    .select("*")
    .order("categoria")
    .order("nombre");

  if (error) {
    console.error("Error cargando productos:", error);

    ventaProductos = [];

    renderProductPicker();

    return;
  }

  ventaProductos = Array.isArray(data) ? data : [];

  console.log("Productos cargados para venta:", ventaProductos);

  renderProductPicker();

  // Si ya había un producto seleccionado,
  // volver a mostrarlo después de actualizar stock.
  const productInput = document.getElementById("v-prod");

  if (productInput && productInput.value) {
    const product = ventaProductos.find(
      (item) => String(item.id) === String(productInput.value),
    );

    if (product) {
      selectVentaProduct(product, false);
    } else {
      clearSelectedVentaProduct();
    }
  }
}

// ------------------------------------------------
// REGISTRAR VENTA
// ------------------------------------------------

async function submitVenta() {
  const productInput = document.getElementById("v-prod");

  const quantityInput = document.getElementById("v-cantidad");

  const currencyInput = document.getElementById("v-cur");

  const amountInput = document.getElementById("v-amt");

  const methodInput = document.getElementById("v-met");

  const noteInput = document.getElementById("v-nota");

  const errorText = document.getElementById("v-err");

  const button = document.getElementById("v-btn");

  if (
    !productInput ||
    !quantityInput ||
    !currencyInput ||
    !amountInput ||
    !methodInput ||
    !noteInput
  ) {
    return;
  }

  const productId = productInput.value;

  const cantidad = parseInt(quantityInput.value, 10);

  const moneda = currencyInput.value;

  const monto = parseFloat(amountInput.value);

  const metodo = methodInput.value;

  const nota = noteInput.value.trim();

  if (errorText) {
    errorText.textContent = "";
  }

  // Producto
  if (!productId) {
    if (errorText) {
      errorText.textContent = "Seleccioná un producto.";
    }

    return;
  }

  // Cantidad
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    if (errorText) {
      errorText.textContent = "Ingresá una cantidad válida.";
    }

    return;
  }

  // Monto
  if (!Number.isFinite(monto) || monto <= 0) {
    if (errorText) {
      errorText.textContent = "Ingresá un monto válido.";
    }

    return;
  }

  // Consultar stock actual
  const { data: producto, error: stockError } = await sb
    .from("stock")
    .select("*")
    .eq("id", productId)
    .single();

  if (stockError || !producto) {
    if (errorText) {
      errorText.textContent = "No se pudo encontrar el producto.";
    }

    console.error(stockError);
    return;
  }

  // Verificar stock
  if (Number(producto.cantidad) < cantidad) {
    if (errorText) {
      errorText.textContent = `Stock insuficiente. Disponible: ${producto.cantidad}.`;
    }

    return;
  }

  if (button) {
    button.textContent = "Guardando...";
    button.disabled = true;
  }

  // Registrar venta + descontar stock
  // mediante una sola operación en Supabase.
  const { data: resultado, error: ventaError } = await sb.rpc(
    "registrar_venta",
    {
      p_producto_id: Number(producto.id),
      p_cantidad: cantidad,
      p_moneda: moneda,
      p_monto: monto,
      p_metodo: metodo,
      p_nota: nota || "",
      p_vendedor: currentUser ? currentUser.display : "Sin vendedor",
    },
  );

  if (button) {
    button.textContent = "Registrar venta";

    button.disabled = false;
  }

  if (ventaError) {
    console.error(ventaError);

    if (errorText) {
      if (
        ventaError.message &&
        ventaError.message.includes("STOCK_INSUFICIENTE")
      ) {
        errorText.textContent = "No hay suficiente stock para esa cantidad.";
      } else {
        errorText.textContent = "No se pudo registrar la venta.";
      }
    }

    return;
  }

  // Limpiar formulario
  productInput.value = "";

  quantityInput.value = "1";
  quantityInput.removeAttribute("max");

  amountInput.value = "";
  noteInput.value = "";

  const stockInfo = document.getElementById("v-stock-info");

  if (stockInfo) {
    stockInfo.textContent = "Seleccioná un producto";
  }

  clearSelectedVentaProduct();

  document.getElementById("v-cantidad").value = "1";
  document.getElementById("v-amt").value = "";
  document.getElementById("v-nota").value = "";
  // Actualizar productos
  await loadProductOptions();

  showToast("✓ Venta registrada y stock actualizado", "ok");

  // Actualizar Dashboard
  await loadDashboard();

  // Si existe historial, actualizarlo también
  if (document.getElementById("hist-tbody")) {
    await loadHistorial();
  }
}

// ------------------------------------------------
// DASHBOARD
// ------------------------------------------------

async function loadDashboard() {
  const tbody = document.getElementById("today-tbody");

  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="8" class="empty">
        <div class="loader">
          <div class="spinner"></div>
          Cargando...
        </div>
      </td>
    </tr>
  `;

  const { data, error } = await sb
    .from("ventas")
    .select("*")
    .eq("fecha", todayStr())
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    showToast("Error al cargar datos", "fail");

    console.error(error);
    return;
  }

  const ventas = data || [];

  const totalARS = ventas
    .filter((sale) => sale.moneda === "ARS")
    .reduce((total, sale) => total + Number(sale.monto), 0);

  const totalUSD = ventas
    .filter((sale) => sale.moneda === "USD")
    .reduce((total, sale) => total + Number(sale.monto), 0);

  const unidadesHoy = ventas.reduce(
    (total, sale) => total + Number(sale.cantidad || 1),
    0,
  );

  const ropa = ventas.filter((sale) => sale.categoria === "Ropa").length;

  const accesorios = ventas.filter(
    (sale) => sale.categoria === "Accesorios",
  ).length;

  // --------------------------------------------
  // MÉTRICAS
  // --------------------------------------------

  const metrics = document.getElementById("metrics");

  if (metrics) {
    const { data: historial } = await sb
      .from("ventas")
      .select("moneda, monto, cantidad");

    const ventasHistoricas = historial || [];

    const acumARS = ventasHistoricas
      .filter((v) => v.moneda === "ARS")
      .reduce((a, b) => a + Number(b.monto), 0);

    const acumUSD = ventasHistoricas
      .filter((v) => v.moneda === "USD")
      .reduce((a, b) => a + Number(b.monto), 0);

    const acumBRL = ventasHistoricas
      .filter((v) => v.moneda === "BRL")
      .reduce((a, b) => a + Number(b.monto), 0);

    metrics.innerHTML = `
      <div class="metric-card">
        <div class="metric-label">
          Ventas hoy
        </div>

        <div class="metric-val">
          ${ventas.length}
        </div>

        <div class="metric-sub">
          operaciones
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">
          Unidades vendidas
        </div>

        <div class="metric-val">
          ${unidadesHoy}
        </div>

        <div class="metric-sub">
          unidades hoy
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">
          Ingresos ARS hoy
        </div>

        <div class="metric-val">
          $${totalARS.toLocaleString("es-AR")}
        </div>

        <div class="metric-sub">
          pesos argentinos
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">
          Ingresos USD hoy
        </div>

        <div class="metric-val">
          U$D ${totalUSD.toFixed(2)}
        </div>

        <div class="metric-sub">
          dólares
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">
          Ropa / Accesorios
        </div>

        <div class="metric-val">
          ${ropa} / ${accesorios}
        </div>

        <div class="metric-sub">
          operaciones
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">
          Acumulado ARS
        </div>

        <div class="metric-val">
          $${acumARS.toLocaleString("es-AR")}
        </div>

        <div class="metric-sub">
          todos los tiempos
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">
          Acumulado USD
        </div>

        <div class="metric-val">
          U$D ${acumUSD.toFixed(2)}
        </div>

        <div class="metric-sub">
          todos los tiempos
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">
          Acumulado BRL
        </div>

        <div class="metric-val">
          R$ ${acumBRL.toFixed(2)}
        </div>

        <div class="metric-sub">
          todos los tiempos
        </div>
      </div>
    `;
  }

  // --------------------------------------------
  // TABLA
  // --------------------------------------------

  if (!ventas.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          Sin ventas cargadas hoy.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = ventas
    .map(
      (sale) => `
      <tr>

        <td>
          ${escapeHTML(sale.hora)}
        </td>

        <td>
          ${escapeHTML(sale.producto)}

          ${
            sale.talla
              ? `<br>
                 <small>
                   Talle: ${escapeHTML(sale.talla)}
                 </small>`
              : ""
          }

          ${
            sale.nota
              ? `<br>
                 <span
                   style="
                     font-size:11px;
                     color:var(--text3)
                   "
                 >
                   ${escapeHTML(sale.nota)}
                 </span>`
              : ""
          }
        </td>

        <td>
          <span
            class="tag ${sale.categoria === "Ropa" ? "tag-ropa" : "tag-accs"}"
          >
            ${escapeHTML(sale.categoria)}
          </span>
        </td>

        <td>
          ${Number(sale.cantidad || 1)}
        </td>

        <td>
          <span
            class="tag tag-${String(sale.moneda).toLowerCase()}"
          >
            ${escapeHTML(sale.moneda)}
          </span>
        </td>

        <td style="font-weight:500">
          ${fmtMonto(sale.moneda, sale.monto)}
        </td>

        <td style="color:var(--text2)">
          ${escapeHTML(sale.metodo)}
        </td>

        <td style="color:var(--text2)">
          ${escapeHTML(sale.vendedor)}
        </td>

      </tr>
    `,
    )
    .join("");
}

// ------------------------------------------------
// HISTORIAL
// ------------------------------------------------

async function loadHistorial() {
  const tbody = document.getElementById("hist-tbody");

  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="8" class="empty">
        <div class="loader">
          <div class="spinner"></div>
          Cargando...
        </div>
      </td>
    </tr>
  `;

  const vendorFilter = document.getElementById("f-vend")?.value || "";

  const categoryFilter = document.getElementById("f-cat")?.value || "";

  const currencyFilter = document.getElementById("f-cur")?.value || "";

  let query = sb
    .from("ventas")
    .select("*")
    .order("created_at", {
      ascending: false,
    })
    .limit(200);

  if (vendorFilter) {
    query = query.eq("vendedor", vendorFilter);
  }

  if (categoryFilter) {
    query = query.eq("categoria", categoryFilter);
  }

  if (currencyFilter) {
    query = query.eq("moneda", currencyFilter);
  }

  const { data, error } = await query;

  if (error) {
    showToast("Error al cargar historial", "fail");

    console.error(error);
    return;
  }

  if (!data || !data.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          Sin ventas para mostrar.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = data
    .map(
      (sale) => `
      <tr>

        <td
          style="
            font-size:12px;
            color:var(--text2)
          "
        >
          ${escapeHTML(sale.fecha)}
          ${escapeHTML(sale.hora)}
        </td>

        <td>
          ${escapeHTML(sale.producto)}

          ${
            sale.talla
              ? `<br>
                 <small>
                   Talle:
                   ${escapeHTML(sale.talla)}
                 </small>`
              : ""
          }

          ${
            sale.nota
              ? `<br>
                 <span
                   style="
                     font-size:11px;
                     color:var(--text3)
                   "
                 >
                   ${escapeHTML(sale.nota)}
                 </span>`
              : ""
          }
        </td>

        <td>
          <span
            class="tag ${sale.categoria === "Ropa" ? "tag-ropa" : "tag-accs"}"
          >
            ${escapeHTML(sale.categoria)}
          </span>
        </td>

        <td>
          ${Number(sale.cantidad || 1)}
        </td>

        <td>
          <span
            class="tag tag-${String(sale.moneda).toLowerCase()}"
          >
            ${escapeHTML(sale.moneda)}
          </span>
        </td>

        <td style="font-weight:500">
          ${fmtMonto(sale.moneda, sale.monto)}
        </td>

        <td style="color:var(--text2)">
          ${escapeHTML(sale.metodo)}
        </td>

        <td style="color:var(--text2)">
          ${escapeHTML(sale.vendedor)}
        </td>

      </tr>
    `,
    )
    .join("");
}
