// ══════════════════════════════════════════════
// CONFIGURACIÓN SUPABASE
// ══════════════════════════════════════════════

const SUPABASE_URL = "https://wnaxkfnkhwveamrswwim.supabase.co";
const SUPABASE_KEY = "sb_publishable_nnJa7QKdYLiwxKEyvos9qg_YNRUU185";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

// ══════════════════════════════════════════════
// UTILIDADES
// ══════════════════════════════════════════════

function todayStr() {
  return new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function nowTime() {
  return new Date().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMonto(cur, amt) {
  if (cur === "ARS") {
    return "$" + Number(amt).toLocaleString("es-AR");
  }

  if (cur === "USD") {
    return "U$D " + Number(amt).toFixed(2);
  }

  if (cur === "BRL") {
    return "R$ " + Number(amt).toFixed(2);
  }

  return amt;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(msg, type = "ok") {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = msg;
  toast.className = "toast " + type + " show";

  setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });

  const screen = document.getElementById(id);

  if (screen) {
    screen.classList.add("active");
  }
}

// ══════════════════════════════════════════════
// LOGIN / LOGOUT
// ══════════════════════════════════════════════

const passInput = document.getElementById("inp-pass");

if (passInput) {
  passInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      doLogin();
    }
  });
}

function togglePass(inputId, btn) {
  const input = document.getElementById(inputId);

  if (!input) return;

  const svgs = btn ? btn.querySelectorAll("svg") : [];

  if (input.type === "password") {
    input.type = "text";

    if (svgs[0]) svgs[0].style.display = "none";
    if (svgs[1]) svgs[1].style.display = "block";
  } else {
    input.type = "password";

    if (svgs[0]) svgs[0].style.display = "block";
    if (svgs[1]) svgs[1].style.display = "none";
  }
}

async function doLogin() {
  const userInput = document.getElementById("inp-user");
  const passwordInput = document.getElementById("inp-pass");
  const errorText = document.getElementById("login-err");
  const button = document.querySelector("#screen-login .btn-accent");

  if (!userInput || !passwordInput) return;

  const username = userInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (errorText) {
    errorText.textContent = "";
  }

  if (!username || !password) {
    if (errorText) {
      errorText.textContent = "Completá los campos.";
    }

    return;
  }

  if (button) {
    button.textContent = "Entrando...";
    button.disabled = true;
  }

  const { data, error } = await sb
    .from("usuarios")
    .select("*")
    .eq("usuario", username)
    .eq("password", password)
    .single();

  if (button) {
    button.textContent = "Entrar";
    button.disabled = false;
  }

  if (error || !data) {
    if (errorText) {
      errorText.textContent = "Usuario o contraseña incorrectos.";
    }

    return;
  }

  currentUser = {
    id: data.id,
    usuario: data.usuario,
    display: data.nombre,
    rol: data.rol,
  };

  const vendorChip = document.getElementById("vendor-chip");

  if (vendorChip) {
    vendorChip.textContent = currentUser.display;
  }

  const sidebarUserName = document.getElementById("sidebar-user-name");

  if (sidebarUserName) {
    sidebarUserName.textContent = currentUser.display;
  }

  const esAdmin = currentUser.rol === "admin";

  const usuariosTab = document.getElementById("tab-btn-usuarios");
  const usuariosMobileTab = document.getElementById("mob-tab-btn-usuarios");

  if (usuariosTab) {
    usuariosTab.style.display = esAdmin ? "inline-block" : "none";
  }

  if (usuariosMobileTab) {
    usuariosMobileTab.style.display = esAdmin ? "inline-block" : "none";
  }

  showScreen("screen-app");

  await loadProductOptions();
  await loadDashboard();
}

function doLogout() {
  currentUser = null;

  const userInput = document.getElementById("inp-user");
  const passwordInput = document.getElementById("inp-pass");

  if (userInput) userInput.value = "";
  if (passwordInput) passwordInput.value = "";

  showScreen("screen-login");
}

// ══════════════════════════════════════════════
// USUARIOS
// ══════════════════════════════════════════════

async function loadUsuarios() {
  const grid = document.getElementById("users-grid");

  if (!grid) return;

  grid.innerHTML = `
    <div class="loader">
      <div class="spinner"></div>
      Cargando...
    </div>
  `;

  const { data, error } = await sb
    .from("usuarios")
    .select("*")
    .order("created_at");

  if (error) {
    grid.innerHTML = `
      <p style="color:var(--red);padding:16px">
        Error al cargar usuarios.
      </p>
    `;

    console.error(error);
    return;
  }

  if (!data || !data.length) {
    grid.innerHTML = "<p>No hay usuarios cargados.</p>";
    return;
  }

  grid.innerHTML = data
    .map(
      (user) => `
    <div class="user-card">
      <div class="user-info">
        <span class="user-name">
          ${escapeHTML(user.nombre)}
        </span>

        <span class="user-meta">
          @${escapeHTML(user.usuario)}
        </span>

        <span
          class="tag ${user.rol === "admin" ? "tag-admin" : "tag-vendedor"}"
          style="margin-top:4px;width:fit-content"
        >
          ${escapeHTML(user.rol)}
        </span>
      </div>

      ${
        user.usuario !== "admin"
          ? `
            <button
              class="btn-del-user"
              onclick="deleteUsuario(${user.id}, '${escapeHTML(user.nombre)}')"
              title="Eliminar"
            >
              ×
            </button>
          `
          : ""
      }
    </div>
  `,
    )
    .join("");
}

async function crearUsuario() {
  const nombreInput = document.getElementById("u-nombre");
  const usuarioInput = document.getElementById("u-usuario");
  const passwordInput = document.getElementById("u-pass");
  const rolInput = document.getElementById("u-rol");
  const errorText = document.getElementById("u-err");
  const button = document.getElementById("u-btn");

  if (!nombreInput || !usuarioInput || !passwordInput || !rolInput) {
    return;
  }

  const nombre = nombreInput.value.trim();
  const usuario = usuarioInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  const rol = rolInput.value;

  if (errorText) {
    errorText.textContent = "";
  }

  if (!nombre || !usuario || !password) {
    if (errorText) {
      errorText.textContent = "Completá todos los campos.";
    }

    return;
  }

  if (password.length < 4) {
    if (errorText) {
      errorText.textContent = "La contraseña debe tener al menos 4 caracteres.";
    }

    return;
  }

  if (button) {
    button.textContent = "Creando...";
    button.disabled = true;
  }

  const { error } = await sb.from("usuarios").insert([
    {
      nombre,
      usuario,
      password,
      rol,
    },
  ]);

  if (button) {
    button.textContent = "Crear usuario";
    button.disabled = false;
  }

  if (error) {
    if (errorText) {
      errorText.textContent =
        error.code === "23505"
          ? "Ese nombre de usuario ya existe."
          : "Error al crear usuario.";
    }

    console.error(error);
    return;
  }

  nombreInput.value = "";
  usuarioInput.value = "";
  passwordInput.value = "";

  showToast("✓ Usuario creado", "ok");

  await loadUsuarios();
}

async function deleteUsuario(id, nombre) {
  if (!confirm(`¿Eliminar al usuario "${nombre}"?`)) {
    return;
  }

  const { error } = await sb.from("usuarios").delete().eq("id", id);

  if (error) {
    showToast("No se pudo eliminar el usuario", "fail");
    console.error(error);
    return;
  }

  showToast("Usuario eliminado", "ok");

  await loadUsuarios();
}

// ══════════════════════════════════════════════
// NAVEGACIÓN
// ══════════════════════════════════════════════

function goTab(tab, btn) {
  document.querySelectorAll(".nav-tab").forEach((tabButton) => {
    tabButton.classList.remove("active");
  });

  if (btn) {
    btn.classList.add("active");
  }

  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  const selectedTab = document.getElementById("tab-" + tab);

  if (selectedTab) {
    selectedTab.classList.add("active");
  }

  if (tab === "dashboard") loadDashboard();
  if (tab === "stock") loadStock();
  if (tab === "historial") loadHistorial();
  if (tab === "usuarios") loadUsuarios();
}

// ══════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════

async function loadDashboard() {
  const tbody = document.getElementById("today-tbody");

  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="empty">
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
    .order("created_at", { ascending: false });

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

  const ropa = ventas.filter((sale) => sale.categoria === "Ropa").length;

  const accesorios = ventas.filter(
    (sale) => sale.categoria === "Accesorios",
  ).length;

  const metrics = document.getElementById("metrics");

  if (metrics) {
    // Traer acumulado histórico
    const { data: historial } = await sb.from("ventas").select("moneda, monto");

    const acumARS = (historial || [])
      .filter((v) => v.moneda === "ARS")
      .reduce((a, b) => a + Number(b.monto), 0);

    const acumUSD = (historial || [])
      .filter((v) => v.moneda === "USD")
      .reduce((a, b) => a + Number(b.monto), 0);

    const acumBRL = (historial || [])
      .filter((v) => v.moneda === "BRL")
      .reduce((a, b) => a + Number(b.monto), 0);

    metrics.innerHTML = `
  <div class="metric-card">
    <div class="metric-label">Ventas hoy</div>
    <div class="metric-val">${ventas.length}</div>
    <div class="metric-sub">total del día</div>
  </div>

  <div class="metric-card">
    <div class="metric-label">Ingresos ARS hoy</div>
    <div class="metric-val">$${totalARS.toLocaleString("es-AR")}</div>
    <div class="metric-sub">pesos argentinos</div>
  </div>

  <div class="metric-card">
    <div class="metric-label">Ingresos USD hoy</div>
    <div class="metric-val">U$D ${totalUSD.toFixed(2)}</div>
    <div class="metric-sub">dólares</div>
  </div>

  <div class="metric-card">
    <div class="metric-label">Ropa / Accesorios</div>
    <div class="metric-val">${ropa} / ${accesorios}</div>
    <div class="metric-sub">por categoría</div>
  </div>

  <div class="metric-card">
    <div class="metric-label">Acumulado total ARS</div>
    <div class="metric-val">$${acumARS.toLocaleString("es-AR")}</div>
    <div class="metric-sub">todos los tiempos</div>
  </div>

  <div class="metric-card">
    <div class="metric-label">Acumulado total USD</div>
    <div class="metric-val">U$D ${acumUSD.toFixed(2)}</div>
    <div class="metric-sub">todos los tiempos</div>
  </div>

  <div class="metric-card">
    <div class="metric-label">Acumulado total BRL</div>
    <div class="metric-val">R$ ${acumBRL.toFixed(2)}</div>
    <div class="metric-sub">todos los tiempos</div>
  </div>
`;
  }

  if (!ventas.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty">
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
      <td>${escapeHTML(sale.hora)}</td>

      <td>
        ${escapeHTML(sale.producto)}

        ${sale.cantidad ? `<br><small>Cantidad: ${sale.cantidad}</small>` : ""}

        ${
          sale.nota
            ? `
              <br>
              <span style="font-size:11px;color:var(--text3)">
                ${escapeHTML(sale.nota)}
              </span>
            `
            : ""
        }
      </td>

      <td>
        <span class="tag ${
          sale.categoria === "Ropa" ? "tag-ropa" : "tag-accs"
        }">
          ${escapeHTML(sale.categoria)}
        </span>
      </td>

      <td>
        <span class="tag tag-${String(sale.moneda).toLowerCase()}">
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

// ══════════════════════════════════════════════
// REGISTRAR VENTA
// ══════════════════════════════════════════════

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

  if (!productId) {
    if (errorText) errorText.textContent = "Seleccioná un producto.";
    return;
  }

  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    if (errorText) {
      errorText.textContent = "Ingresá una cantidad válida.";
    }

    return;
  }

  if (!Number.isFinite(monto) || monto <= 0) {
    if (errorText) {
      errorText.textContent = "Ingresá un monto válido.";
    }

    return;
  }

  const { data: producto, error: stockError } = await sb
    .from("stock")
    .select("*")
    .eq("id", productId)
    .single();

  if (stockError || !producto) {
    if (errorText) {
      errorText.textContent = "No se pudo encontrar el producto.";
    }

    return;
  }

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

  const { error: ventaError } = await sb.from("ventas").insert([
    {
      fecha: todayStr(),
      hora: nowTime(),
      producto_id: producto.id,
      producto: producto.nombre,
      categoria: producto.categoria,
      cantidad,
      moneda,
      monto,
      metodo,
      nota: nota || null,
      vendedor: currentUser ? currentUser.display : "Sin vendedor",
    },
  ]);

  if (ventaError) {
    if (button) {
      button.textContent = "Registrar venta";
      button.disabled = false;
    }

    if (errorText) {
      errorText.textContent = "Error al guardar la venta. Intentá de nuevo.";
    }

    console.error(ventaError);
    return;
  }

  const { error: updateError } = await sb
    .from("stock")
    .update({
      cantidad: Number(producto.cantidad) - cantidad,
    })
    .eq("id", producto.id);

  if (updateError) {
    if (button) {
      button.textContent = "Registrar venta";
      button.disabled = false;
    }

    if (errorText) {
      errorText.textContent =
        "La venta se guardó, pero no se pudo actualizar el stock.";
    }

    console.error(updateError);
    return;
  }

  if (button) {
    button.textContent = "Registrar venta";
    button.disabled = false;
  }

  productInput.value = "";
  quantityInput.value = "1";
  amountInput.value = "";
  noteInput.value = "";

  const stockInfo = document.getElementById("v-stock-info");

  if (stockInfo) {
    stockInfo.textContent = "Seleccioná un producto";
  }

  await loadProductOptions();

  showToast("✓ Venta registrada y stock actualizado", "ok");

  await loadDashboard();
}

// ══════════════════════════════════════════════
// PRODUCTOS PARA REGISTRAR VENTA
// ══════════════════════════════════════════════

async function loadProductOptions() {
  const select = document.getElementById("v-prod");
  const catSelect = document.getElementById("v-cat");
  if (!select || !catSelect) return;

  const { data, error } = await sb
    .from("stock")
    .select("*")
    .order("categoria")
    .order("nombre");

  if (error) {
    select.innerHTML = `<option value="">Error al cargar productos</option>`;
    console.error(error);
    return;
  }

  window._allProducts = data || [];

  // Filtrar por categoría seleccionada
  function renderProducts() {
    const cat = catSelect.value;
    const filtered = cat
      ? window._allProducts.filter((p) => p.categoria === cat)
      : window._allProducts;

    if (!filtered.length) {
      select.innerHTML = `<option value="">Sin productos en esta categoría</option>`;
      return;
    }

    select.innerHTML = `<option value="">Seleccioná un producto</option>`;
    filtered.forEach((product) => {
      const option = document.createElement("option");
      option.value = product.id;
      option.dataset.stock = product.cantidad;
      option.textContent = `${product.nombre} — stock: ${product.cantidad}`;
      select.appendChild(option);
    });

    // Actualizar info de stock al cambiar producto
    select.onchange = () => {
      const selected = select.options[select.selectedIndex];
      const stockInfo = document.getElementById("v-stock-info");
      if (!stockInfo) return;
      stockInfo.textContent = selected?.value
        ? `Stock disponible: ${selected.dataset.stock}`
        : "Seleccioná un producto";
    };
  }

  // Renderizar al cargar y al cambiar categoría
  renderProducts();
  catSelect.onchange = () => {
    select.value = "";
    const stockInfo = document.getElementById("v-stock-info");
    if (stockInfo) stockInfo.textContent = "Seleccioná un producto";
    renderProducts();
  };
}
// ══════════════════════════════════════════════
// STOCK
// ══════════════════════════════════════════════

async function loadStock() {
  const wrapper = document.getElementById("stock-cols");
  if (!wrapper) return;

  wrapper.innerHTML = `<div class="loader"><div class="spinner"></div> Cargando...</div>`;

  const { data, error } = await sb
    .from("stock")
    .select("*")
    .order("categoria")
    .order("nombre");

  if (error) {
    wrapper.innerHTML = `<p style="color:var(--red);padding:16px">Error al cargar stock.</p>`;
    console.error(error);
    return;
  }

  const products = data || [];
  const categories = ["Ropa", "Accesorios"];

  wrapper.innerHTML = `
    <div class="stock-search-wrap">
      <input
        class="stock-search"
        id="stock-search"
        type="text"
        placeholder="🔍 Buscar producto..."
        oninput="filterStock()"
      >
    </div>
    ${categories
      .map((category) => {
        const items = products.filter((p) => p.categoria === category);
        return `
        <div class="stock-section" data-category="${category}">
          <p class="stock-category-title">${category}</p>
          <div class="stock-grid-cards" id="grid-${category}">
            ${items.length ? items.map((p) => stockCardHTML(p)).join("") : '<p class="empty">Sin productos.</p>'}
          </div>
          <div class="add-row">
            <input type="text" id="new-${category}" placeholder="Nuevo producto...">
            <input type="number" id="qty-${category}" min="0" value="0" placeholder="Cantidad" style="max-width:90px">
            <button class="btn-outline" onclick="addStock('${category}')">Agregar</button>
          </div>
        </div>
      `;
      })
      .join("")}
  `;

  // guardar lista completa para el filtro
  window._stockData = products;
}

function stockCardHTML(p) {
  return `
    <div class="stock-card ${Number(p.cantidad) <= 2 ? "low-stock" : ""}" data-name="${p.nombre.toLowerCase()}">
      <div class="stock-card-name">${escapeHTML(p.nombre)}</div>
      <div class="stock-card-qty ${Number(p.cantidad) <= 2 ? "low" : ""}">${p.cantidad}</div>
      <div class="stock-card-controls">
        <button class="btn-qty" onclick="changeStock(${p.id}, -1)">−</button>
        <button class="btn-qty" onclick="changeStock(${p.id}, 1)">+</button>
        <button class="btn-del" onclick="deleteStock(${p.id})" title="Eliminar">×</button>
      </div>
    </div>
  `;
}

function filterStock() {
  const query =
    document.getElementById("stock-search")?.value.toLowerCase().trim() || "";
  const products = window._stockData || [];
  const categories = ["Ropa", "Accesorios"];

  categories.forEach((category) => {
    const grid = document.getElementById("grid-" + category);
    if (!grid) return;

    const filtered = products.filter(
      (p) => p.categoria === category && p.nombre.toLowerCase().includes(query),
    );

    grid.innerHTML = filtered.length
      ? filtered.map((p) => stockCardHTML(p)).join("")
      : '<p class="empty">Sin resultados.</p>';
  });
}

async function changeStock(id, delta) {
  const { data, error } = await sb
    .from("stock")
    .select("cantidad")
    .eq("id", id)
    .single();

  if (error || !data) {
    showToast("No se pudo consultar el stock", "fail");
    return;
  }

  const newQuantity = Math.max(0, Number(data.cantidad) + delta);

  const { error: updateError } = await sb
    .from("stock")
    .update({
      cantidad: newQuantity,
    })
    .eq("id", id);

  if (updateError) {
    showToast("No se pudo actualizar el stock", "fail");
    console.error(updateError);
    return;
  }

  await loadStock();
  await loadProductOptions();
}

async function deleteStock(id) {
  if (!confirm("¿Eliminar este producto del stock?")) {
    return;
  }

  const { error } = await sb.from("stock").delete().eq("id", id);

  if (error) {
    showToast("No se pudo eliminar el producto", "fail");
    console.error(error);
    return;
  }

  await loadStock();
  await loadProductOptions();

  showToast("Producto eliminado", "ok");
}

async function addStock(category) {
  const nameInput = document.getElementById("new-" + category);
  const quantityInput = document.getElementById("qty-" + category);

  if (!nameInput || !quantityInput) {
    return;
  }

  const name = nameInput.value.trim();
  const quantity = parseInt(quantityInput.value, 10);

  if (!name) {
    showToast("Ingresá el nombre del producto", "fail");
    return;
  }

  if (!Number.isInteger(quantity) || quantity < 0) {
    showToast("Ingresá una cantidad válida", "fail");
    return;
  }

  const { error } = await sb.from("stock").insert([
    {
      nombre: name,
      categoria: category,
      cantidad: quantity,
    },
  ]);

  if (error) {
    showToast("No se pudo agregar el producto", "fail");
    console.error(error);
    return;
  }

  nameInput.value = "";
  quantityInput.value = "0";

  await loadStock();
  await loadProductOptions();

  showToast("Producto agregado correctamente", "ok");
}

// ══════════════════════════════════════════════
// HISTORIAL
// ══════════════════════════════════════════════

async function loadHistorial() {
  const tbody = document.getElementById("hist-tbody");

  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="empty">
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
    .order("created_at", { ascending: false })
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
        <td colspan="7" class="empty">
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
      <td style="font-size:12px;color:var(--text2)">
        ${escapeHTML(sale.fecha)} ${escapeHTML(sale.hora)}
      </td>

      <td>
        ${escapeHTML(sale.producto)}

        ${sale.cantidad ? `<br><small>Cantidad: ${sale.cantidad}</small>` : ""}

        ${
          sale.nota
            ? `
              <br>
              <span style="font-size:11px;color:var(--text3)">
                ${escapeHTML(sale.nota)}
              </span>
            `
            : ""
        }
      </td>

      <td>
        <span class="tag ${
          sale.categoria === "Ropa" ? "tag-ropa" : "tag-accs"
        }">
          ${escapeHTML(sale.categoria)}
        </span>
      </td>

      <td>
        <span class="tag tag-${String(sale.moneda).toLowerCase()}">
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

// ══════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  showScreen("screen-login");
});
