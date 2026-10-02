const SUPABASE_URL = "https://wnaxkfnkhwveamrswwim.supabase.co";
const SUPABASE_KEY = "sb_publishable_nnJa7QKdYLiwxKEyvos9qg_YNRUU185";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let stockData = [];
let productPickerData = [];
let productPickerFilter = "Todos";
let selectedVentaProducto = null;

// ==============================
// UTILIDADES
// ==============================

function todayStr() {
  return new Date().toLocaleDateString("es-AR");
}

function nowTime() {
  return new Date().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function fmtMonto(moneda, monto) {
  const valor = Number(monto || 0);

  if (moneda === "ARS") {
    return "$ " + valor.toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  if (moneda === "USD") {
    return "U$D " + valor.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  if (moneda === "BRL") {
    return "R$ " + valor.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  return valor.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function showToast(message, type = "success") {
  let toast = document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `toast ${type} show`;

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  const target = document.getElementById(id);

  if (target) {
    target.classList.add("active");
  }
}

// ==============================
// LOGIN
// ==============================

async function doLogin() {
  const userInput = document.getElementById("inp-user");
  const passInput = document.getElementById("inp-pass");
  const error = document.getElementById("login-err");
  const button = document.querySelector("#screen-login .btn-accent");

  const usuario = (userInput?.value || "").trim().toLowerCase();
  const password = passInput?.value || "";

  if (error) {
    error.textContent = "";
  }

  if (!usuario || !password) {
    if (error) {
      error.textContent = "Completá usuario y contraseña.";
    }
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Ingresando...";
  }

  try {
    const { data, error: loginError } = await sb
      .from("usuarios")
      .select("id, usuario, nombre, rol")
      .eq("usuario", usuario)
      .eq("password", password)
      .maybeSingle();

    if (loginError) {
      console.error("Error de login:", loginError);

      if (error) {
        error.textContent = "No se pudo conectar con el sistema.";
      }

      return;
    }

    if (!data) {
      if (error) {
        error.textContent = "Usuario o contraseña incorrectos.";
      }

      return;
    }

    currentUser = {
      id: data.id,
      usuario: data.usuario,
      display: data.nombre,
      rol: data.rol
    };

    const vendorChip = document.getElementById("vendor-chip");
    const sidebarUserName = document.getElementById("sidebar-user-name");

    if (vendorChip) {
      vendorChip.textContent = data.nombre;
    }

    if (sidebarUserName) {
      sidebarUserName.textContent = data.nombre;
    }

    const adminTab = document.getElementById("tab-btn-usuarios");
    const adminMobileTab = document.getElementById("mob-tab-btn-usuarios");

    const isAdmin = String(data.rol || "").toLowerCase() === "admin";

    if (adminTab) {
      adminTab.style.display = isAdmin ? "" : "none";
    }

    if (adminMobileTab) {
      adminMobileTab.style.display = isAdmin ? "" : "none";
    }

    showScreen("screen-app");

    await loadProductOptions();
    await loadDashboard();

  } catch (err) {
    console.error("Error inesperado en login:", err);

    if (error) {
      error.textContent = "Ocurrió un error al iniciar sesión.";
    }

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Ingresar";
    }
  }
}

function doLogout() {
  currentUser = null;
  selectedVentaProducto = null;

  const userInput = document.getElementById("inp-user");
  const passInput = document.getElementById("inp-pass");
  const error = document.getElementById("login-err");

  if (userInput) userInput.value = "";
  if (passInput) passInput.value = "";
  if (error) error.textContent = "";

  showScreen("screen-login");
}

// Enter para iniciar sesión
document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.getElementById("inp-pass");

  if (passwordInput) {
    passwordInput.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        doLogin();
      }
    });
  }
});

// ==============================
// NAVEGACIÓN ENTRE TABS
// ==============================

function goTab(tab, btn) {
  // Quitar "active" de TODOS los botones del menú
  document.querySelectorAll(".nav-tab").forEach((item) => {
    item.classList.remove("active");
  });

  // Marcar solamente el botón actual
  if (btn) {
    btn.classList.add("active");
  }

  // Ocultar todas las secciones
  document.querySelectorAll(".tab-content").forEach((section) => {
    section.classList.remove("active");
  });

  // Mostrar solamente la sección seleccionada
  const target = document.getElementById(`tab-${tab}`);

  if (target) {
    target.classList.add("active");
  }

  // Cargar los datos correspondientes
  if (tab === "dashboard") {
    loadDashboard();
  }

  if (tab === "stock") {
    loadStock();
  }

  if (tab === "historial") {
    loadHistorial();
  }

  if (tab === "usuarios") {
    loadUsuarios();
  }

  if (tab === "cubitos") {
    loadCubitos();
  }
}

// ==============================
// USUARIOS
// ==============================

async function loadUsuarios() {
  const container = document.getElementById("usuarios-list");

  if (!container) return;

  container.innerHTML = `
    <div class="loading-state">
      Cargando usuarios...
    </div>
  `;

  try {
    const { data, error } = await sb
      .from("usuarios")
      .select("id, usuario, nombre, rol")
      .order("id", { ascending: true });

    if (error) {
      console.error(error);

      container.innerHTML = `
        <div class="empty-state">
          No se pudieron cargar los usuarios.
        </div>
      `;

      return;
    }

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          No hay usuarios registrados.
        </div>
      `;

      return;
    }

    container.innerHTML = data.map(user => `
      <div class="usuario-card">
        <div class="usuario-card-main">
          <div class="usuario-avatar">
            ${(user.nombre || user.usuario || "?").charAt(0).toUpperCase()}
          </div>

          <div class="usuario-info">
            <strong>${escapeHTML(user.nombre || "")}</strong>
            <span>@${escapeHTML(user.usuario || "")}</span>
          </div>
        </div>

        <div class="usuario-card-side">
          <span class="usuario-role">
            ${escapeHTML(user.rol || "vendedor")}
          </span>

          ${
            user.usuario !== "admin"
              ? `
                <button
                  type="button"
                  class="btn-danger-sm"
                  onclick="eliminarUsuario(${user.id}, '${escapeJS(user.usuario || "")}')"
                >
                  Eliminar
                </button>
              `
              : ""
          }
        </div>
      </div>
    `).join("");

  } catch (err) {
    console.error(err);

    container.innerHTML = `
      <div class="empty-state">
        Ocurrió un error al cargar los usuarios.
      </div>
    `;
  }
}

async function crearUsuario() {
  const usuarioInput = document.getElementById("nuevo-usuario");
  const nombreInput = document.getElementById("nuevo-nombre");
  const passwordInput = document.getElementById("nuevo-password");
  const rolInput = document.getElementById("nuevo-rol");
  const error = document.getElementById("usuario-err");

  const usuario = (usuarioInput?.value || "").trim().toLowerCase();
  const nombre = (nombreInput?.value || "").trim();
  const password = passwordInput?.value || "";
  const rol = rolInput?.value || "vendedor";

  if (error) {
    error.textContent = "";
  }

  if (!usuario || !nombre || !password) {
    if (error) {
      error.textContent = "Completá todos los campos.";
    }
    return;
  }

  if (password.length < 4) {
    if (error) {
      error.textContent = "La contraseña debe tener al menos 4 caracteres.";
    }
    return;
  }

  try {
    const { error: insertError } = await sb
      .from("usuarios")
      .insert({
        usuario,
        nombre,
        password,
        rol
      });

    if (insertError) {
      console.error(insertError);

      if (insertError.code === "23505") {
        if (error) {
          error.textContent = "Ese usuario ya existe.";
        }
      } else {
        if (error) {
          error.textContent = "No se pudo crear el usuario.";
        }
      }

      return;
    }

    if (usuarioInput) usuarioInput.value = "";
    if (nombreInput) nombreInput.value = "";
    if (passwordInput) passwordInput.value = "";

    showToast("Usuario creado correctamente.");
    await loadUsuarios();

  } catch (err) {
    console.error(err);

    if (error) {
      error.textContent = "Ocurrió un error al crear el usuario.";
    }
  }
}

async function eliminarUsuario(id, usuario) {
  if (usuario === "admin") {
    showToast("El usuario admin no se puede eliminar.", "error");
    return;
  }

  const confirmar = confirm(
    `¿Seguro que querés eliminar al usuario "${usuario}"?`
  );

  if (!confirmar) return;

  try {
    const { error } = await sb
      .from("usuarios")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      showToast("No se pudo eliminar el usuario.", "error");
      return;
    }

    showToast("Usuario eliminado.");
    await loadUsuarios();

  } catch (err) {
    console.error(err);
    showToast("Ocurrió un error.", "error");
  }
}

// ==============================
// DASHBOARD
// ==============================

async function loadDashboard() {
  const today = todayStr();

  try {
    const { data: ventas, error } = await sb
      .from("ventas")
      .select("*")
      .eq("fecha", today)
      .order("id", { ascending: false });

    if (error) {
      console.error("Error cargando dashboard:", error);
      return;
    }

    const lista = ventas || [];

    let totalARS = 0;
    let totalUSD = 0;
    let ropa = 0;
    let accesorios = 0;

    lista.forEach(sale => {
      const monto = Number(sale.monto || 0);

      if (sale.moneda === "ARS") {
        totalARS += monto;
      }

      if (sale.moneda === "USD") {
        totalUSD += monto;
      }

      if (sale.categoria === "Ropa") {
        ropa++;
      }

      if (sale.categoria === "Accesorios") {
        accesorios++;
      }
    });

    setText("metric-ventas", lista.length);
    setText("metric-ars", fmtMonto("ARS", totalARS));
    setText("metric-usd", fmtMonto("USD", totalUSD));
    setText("metric-ropa", ropa);
    setText("metric-accesorios", accesorios);

    const tbody = document.getElementById("dashboard-ventas-body");

    if (!tbody) return;

    if (lista.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="table-empty">
            No hay ventas registradas hoy.
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML = lista.map(sale => `
      <tr>
        <td>${escapeHTML(sale.hora || "")}</td>

        <td>
          <strong>${escapeHTML(sale.producto || "")}</strong>

          ${
            sale.cantidad
              ? `<small>${sale.cantidad} unidad${Number(sale.cantidad) === 1 ? "" : "es"}</small>`
              : ""
          }

          ${
            sale.talle
              ? `<small>Talle: ${escapeHTML(sale.talle)}</small>`
              : ""
          }

          ${
            sale.nota
              ? `<small>${escapeHTML(sale.nota)}</small>`
              : ""
          }
        </td>

        <td>${escapeHTML(sale.categoria || "")}</td>

        <td>${escapeHTML(sale.moneda || "")}</td>

        <td>${fmtMonto(sale.moneda, sale.monto)}</td>

        <td>${escapeHTML(sale.metodo || "")}</td>

        <td>${escapeHTML(sale.vendedor || "")}</td>
      </tr>
    `).join("");

  } catch (err) {
    console.error("Error inesperado dashboard:", err);
  }
}

// ==============================
// HISTORIAL
// ==============================

async function loadHistorial() {
  const tbody = document.getElementById("historial-body");

  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="8" class="table-empty">
        Cargando historial...
      </td>
    </tr>
  `;

  try {
    const { data, error } = await sb
      .from("ventas")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error(error);

      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="table-empty">
            No se pudo cargar el historial.
          </td>
        </tr>
      `;

      return;
    }

    if (!data || data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="table-empty">
            Todavía no hay ventas registradas.
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML = data.map(sale => `
      <tr>
        <td>${escapeHTML(sale.fecha || "")}</td>
        <td>${escapeHTML(sale.hora || "")}</td>

        <td>
          <strong>${escapeHTML(sale.producto || "")}</strong>

          ${
            sale.talle
              ? `<small>Talle: ${escapeHTML(sale.talle)}</small>`
              : ""
          }
        </td>

        <td>${escapeHTML(sale.categoria || "")}</td>

        <td>${sale.cantidad || 1}</td>

        <td>${escapeHTML(sale.moneda || "")}</td>

        <td>${fmtMonto(sale.moneda, sale.monto)}</td>

        <td>${escapeHTML(sale.metodo || "")}</td>

        <td>${escapeHTML(sale.vendedor || "")}</td>
      </tr>
    `).join("");

  } catch (err) {
    console.error(err);

    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="table-empty">
          Ocurrió un error al cargar el historial.
        </td>
      </tr>
    `;
  }
}

// ==============================
// HELPERS
// ==============================

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJS(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r");
}

// ==============================
// STOCK
// ==============================

async function loadStock() {
  const container = document.getElementById("stock-list");

  if (!container) return;

  container.innerHTML = `
    <div class="loading-state">
      Cargando stock...
    </div>
  `;

  try {
    const { data, error } = await sb
      .from("stock")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Error cargando stock:", error);

      container.innerHTML = `
        <div class="empty-state">
          No se pudo cargar el stock.
        </div>
      `;

      return;
    }

    stockData = data || [];

    // Cargar talles de todos los productos
    if (stockData.length > 0) {
      const { data: talles, error: tallesError } = await sb
        .from("producto_talles")
        .select("id, producto_id, talle, cantidad")
        .in(
          "producto_id",
          stockData.map(producto => producto.id)
        )
        .order("id", { ascending: true });

      if (tallesError) {
        console.warn("No se pudieron cargar los talles:", tallesError);
      }

      stockData = stockData.map(producto => ({
        ...producto,
        talles: (talles || []).filter(
          talle => Number(talle.producto_id) === Number(producto.id)
        )
      }));
    }

    renderStock(stockData);

  } catch (err) {
    console.error("Error inesperado cargando stock:", err);

    container.innerHTML = `
      <div class="empty-state">
        Ocurrió un error al cargar el stock.
      </div>
    `;
  }
}

function renderStock(data = stockData) {
  const container = document.getElementById("stock-list");

  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        No hay productos cargados en el stock.
      </div>
    `;

    return;
  }

  container.innerHTML = data
    .map(producto => stockCardHTML(producto))
    .join("");
}

function stockCardHTML(producto) {
  const talles = Array.isArray(producto.talles)
    ? producto.talles
    : [];

  const cantidadTotal = Number(producto.cantidad || 0);

  const imagen = producto.imagen_url
    ? producto.imagen_url
    : "";

  const tallesHTML = talles.length
    ? `
      <div class="stock-card-talles">
        ${talles.map(talle => `
          <span class="stock-card-talle">
            <strong>${escapeHTML(talle.talle)}</strong>
            <span>${Number(talle.cantidad || 0)}</span>
          </span>
        `).join("")}
      </div>
    `
    : "";

  return `
    <article
      class="stock-card"
      data-producto-id="${producto.id}"
      data-nombre="${escapeHTML((producto.nombre || "").toLowerCase())}"
      data-categoria="${escapeHTML(producto.categoria || "")}"
    >

      <div class="stock-card-image">
        ${
          imagen
            ? `
              <img
                src="${escapeHTML(imagen)}"
                alt="${escapeHTML(producto.nombre || "Producto")}"
              />
            `
            : `
              <div class="stock-card-no-image">
                Sin imagen
              </div>
            `
        }
      </div>

      <div class="stock-card-body">

        <div class="stock-card-top">
          <div>
            <span class="stock-card-category">
              ${escapeHTML(producto.categoria || "")}
            </span>

            <h3>
              ${escapeHTML(producto.nombre || "Sin nombre")}
            </h3>
          </div>

          <div class="stock-card-total">
            <strong>${cantidadTotal}</strong>
            <span>stock</span>
          </div>
        </div>

        ${tallesHTML}

        <div class="stock-card-actions">

          <button
            type="button"
            class="btn-outline"
            onclick="editarStockManual(${producto.id})"
          >
            Editar stock
          </button>

          <button
            type="button"
            class="btn-danger-sm"
            onclick="eliminarProductoStock(${producto.id}, '${escapeJS(producto.nombre || "")}')"
          >
            Eliminar
          </button>

        </div>

      </div>
    </article>
  `;
}

function filtrarStock() {
  const input = document.getElementById("stock-search");

  if (!input) return;

  const texto = input.value.trim().toLowerCase();

  if (!texto) {
    renderStock(stockData);
    return;
  }

  const filtrados = stockData.filter(producto => {
    const nombre = String(producto.nombre || "").toLowerCase();
    const categoria = String(producto.categoria || "").toLowerCase();

    return (
      nombre.includes(texto) ||
      categoria.includes(texto)
    );
  });

  renderStock(filtrados);
}

// ==============================
// FILAS DE TALLES
// ==============================

function agregarFilaTalle(talle = "", cantidad = 0) {
  const lista = document.getElementById("stock-talles-list");

  if (!lista) return;

  const fila = document.createElement("div");

  fila.className = "stock-talle-row";

  fila.innerHTML = `
    <input
      type="text"
      class="stock-talle-input"
      placeholder="Talle (ej: 38, M, XL)"
      value="${escapeHTML(talle)}"
    />

    <input
      type="number"
      class="stock-talle-cantidad"
      min="0"
      step="1"
      value="${Number(cantidad || 0)}"
      placeholder="Cantidad"
    />

    <button
      type="button"
      class="stock-talle-remove"
      onclick="eliminarFilaTalle(this)"
      title="Eliminar talle"
    >
      ×
    </button>
  `;

  lista.appendChild(fila);
}

function eliminarFilaTalle(button) {
  const fila = button?.closest(".stock-talle-row");

  if (!fila) return;

  const lista = document.getElementById("stock-talles-list");

  if (!lista) return;

  const filas = lista.querySelectorAll(".stock-talle-row");

  // Dejamos siempre al menos una fila
  if (filas.length <= 1) {
    const inputTalle = fila.querySelector(".stock-talle-input");
    const inputCantidad = fila.querySelector(".stock-talle-cantidad");

    if (inputTalle) inputTalle.value = "";
    if (inputCantidad) inputCantidad.value = "0";

    return;
  }

  fila.remove();
}

function obtenerTallesFormulario() {
  const filas = document.querySelectorAll(
    "#stock-talles-list .stock-talle-row"
  );

  const talles = [];

  filas.forEach(fila => {
    const talleInput = fila.querySelector(".stock-talle-input");
    const cantidadInput = fila.querySelector(".stock-talle-cantidad");

    const talle = (talleInput?.value || "").trim();
    const cantidad = Number(cantidadInput?.value || 0);

    // Ignoramos filas completamente vacías
    if (!talle && cantidad === 0) {
      return;
    }

    if (!talle) {
      throw new Error("Hay un talle sin nombre.");
    }

    if (!Number.isInteger(cantidad) || cantidad < 0) {
      throw new Error(
        `La cantidad del talle ${talle} no es válida.`
      );
    }

    talles.push({
      talle,
      cantidad
    });
  });

  return talles;
}

// ==============================
// AGREGAR PRODUCTO AL STOCK
// ==============================

async function agregarProductoStock() {
  const nombreInput = document.getElementById("stock-nombre");
  const categoriaInput = document.getElementById("stock-categoria");
  const imagenInput = document.getElementById("stock-imagen");
  const error = document.getElementById("stock-err");

  const nombre = (nombreInput?.value || "").trim();
  const categoria = categoriaInput?.value || "Ropa";

  if (error) {
    error.textContent = "";
  }

  if (!nombre) {
    if (error) {
      error.textContent = "Ingresá el nombre del producto.";
    }

    return;
  }

  let talles;

  try {
    talles = obtenerTallesFormulario();
  } catch (err) {
    if (error) {
      error.textContent = err.message;
    }

    return;
  }

  if (talles.length === 0) {
    if (error) {
      error.textContent =
        "Agregá al menos un talle con su cantidad.";
    }

    return;
  }

  const totalCantidad = talles.reduce(
    (total, item) => total + Number(item.cantidad || 0),
    0
  );

  if (totalCantidad < 0) {
    if (error) {
      error.textContent = "La cantidad no puede ser negativa.";
    }

    return;
  }

  const button = document.querySelector(
    ".stock-add-panel .btn-accent"
  );

  if (button) {
    button.disabled = true;
    button.textContent = "Guardando...";
  }

  try {
    // ==========================
    // SUBIR IMAGEN SI EXISTE
    // ==========================

    let imagenURL = null;

    const archivo = imagenInput?.files?.[0];

    if (archivo) {
      const extension =
        archivo.name.split(".").pop()?.toLowerCase() || "jpg";

      const nombreArchivo =
        `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

      const { error: uploadError } = await sb.storage
        .from("productos")
        .upload(nombreArchivo, archivo, {
          upsert: false
        });

      if (uploadError) {
        console.error("Error subiendo imagen:", uploadError);

        if (error) {
          error.textContent =
            "No se pudo subir la imagen.";
        }

        return;
      }

      const { data: publicData } = sb.storage
        .from("productos")
        .getPublicUrl(nombreArchivo);

      imagenURL = publicData?.publicUrl || null;
    }

    // ==========================
    // CREAR PRODUCTO
    // ==========================

    const { data: producto, error: productoError } = await sb
      .from("stock")
      .insert({
        nombre,
        categoria,
        cantidad: totalCantidad,
        imagen_url: imagenURL
      })
      .select()
      .single();

    if (productoError) {
      console.error("Error creando producto:", productoError);

      if (error) {
        error.textContent =
          "No se pudo guardar el producto.";
      }

      return;
    }

    // ==========================
    // CREAR TALLES
    // ==========================

    const filasTalles = talles.map(item => ({
      producto_id: producto.id,
      talle: item.talle,
      cantidad: item.cantidad
    }));

    const { error: tallesError } = await sb
      .from("producto_talles")
      .insert(filasTalles);

    if (tallesError) {
      console.error("Error creando talles:", tallesError);

      // Si fallaron los talles, intentamos borrar
      // el producto recién creado.
      await sb
        .from("stock")
        .delete()
        .eq("id", producto.id);

      if (error) {
        error.textContent =
          "El producto se creó pero no se pudieron guardar los talles.";
      }

      return;
    }

    // ==========================
    // LIMPIAR FORMULARIO
    // ==========================

    if (nombreInput) {
      nombreInput.value = "";
    }

    if (imagenInput) {
      imagenInput.value = "";
    }

    const listaTalles =
      document.getElementById("stock-talles-list");

    if (listaTalles) {
      listaTalles.innerHTML = "";

      agregarFilaTalle();
    }

    showToast("Producto agregado al stock.");

    await loadStock();
    await loadProductOptions();

  } catch (err) {
    console.error("Error agregando producto:", err);

    if (error) {
      error.textContent =
        err.message || "Ocurrió un error al guardar.";
    }

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Agregar producto";
    }
  }
}

// ==============================
// EDITAR STOCK MANUAL
// ==============================

async function editarStockManual(productoId) {
  const producto = stockData.find(
    item => Number(item.id) === Number(productoId)
  );

  if (!producto) {
    showToast("No se encontró el producto.", "error");
    return;
  }

  const tallesActuales = Array.isArray(producto.talles)
    ? producto.talles
    : [];

  if (tallesActuales.length > 0) {
    const nuevoValor = prompt(
      `Stock total actual de "${producto.nombre}": ${producto.cantidad}\n\n` +
      `Este producto tiene talles configurados.\n` +
      `Para modificar el stock por talle, usá la edición de talles.`
    );

    if (nuevoValor === null) {
      return;
    }

    showToast(
      "Este producto tiene talles. El stock se controla por cada talle.",
      "error"
    );

    return;
  }

  const actual = Number(producto.cantidad || 0);

  const nuevoValor = prompt(
    `Ingresá el nuevo stock para "${producto.nombre}":`,
    actual
  );

  if (nuevoValor === null) {
    return;
  }

  const cantidad = Number(nuevoValor);

  if (!Number.isInteger(cantidad) || cantidad < 0) {
    showToast(
      "Ingresá una cantidad entera igual o mayor a 0.",
      "error"
    );

    return;
  }

  try {
    const { error } = await sb
      .from("stock")
      .update({
        cantidad
      })
      .eq("id", productoId);

    if (error) {
      console.error(error);

      showToast(
        "No se pudo actualizar el stock.",
        "error"
      );

      return;
    }

    showToast("Stock actualizado.");

    await loadStock();
    await loadProductOptions();

  } catch (err) {
    console.error(err);

    showToast(
      "Ocurrió un error al actualizar el stock.",
      "error"
    );
  }
}

// ==============================
// ELIMINAR PRODUCTO
// ==============================

async function eliminarProductoStock(productoId, nombre) {
  const confirmar = confirm(
    `¿Seguro que querés eliminar "${nombre}" del stock?`
  );

  if (!confirmar) {
    return;
  }

  try {
    // Primero eliminamos los talles asociados.
    const { error: tallesError } = await sb
      .from("producto_talles")
      .delete()
      .eq("producto_id", productoId);

    if (tallesError) {
      console.error(
        "Error eliminando talles:",
        tallesError
      );

      showToast(
        "No se pudieron eliminar los talles.",
        "error"
      );

      return;
    }

    const { error } = await sb
      .from("stock")
      .delete()
      .eq("id", productoId);

    if (error) {
      console.error(error);

      showToast(
        "No se pudo eliminar el producto.",
        "error"
      );

      return;
    }

    showToast("Producto eliminado.");

    await loadStock();
    await loadProductOptions();

  } catch (err) {
    console.error(err);

    showToast(
      "Ocurrió un error al eliminar el producto.",
      "error"
    );
  }
}

// ==============================
// SELECTOR DE PRODUCTOS PARA VENTA
// ==============================

async function loadProductOptions() {
  try {
    const { data, error } = await sb
      .from("stock")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error cargando productos:", error);
      return;
    }

    productPickerData = data || [];

    // Cargar talles de todos los productos
    if (productPickerData.length > 0) {
      const { data: talles, error: tallesError } = await sb
        .from("producto_talles")
        .select("id, producto_id, talle, cantidad")
        .in(
          "producto_id",
          productPickerData.map(producto => producto.id)
        )
        .order("id", { ascending: true });

      if (tallesError) {
        console.warn(
          "No se pudieron cargar los talles:",
          tallesError
        );
      }

      productPickerData = productPickerData.map(producto => ({
        ...producto,
        talles: (talles || []).filter(
          talle =>
            Number(talle.producto_id) === Number(producto.id)
        )
      }));
    } else {
      productPickerData = [];
    }

  } catch (err) {
    console.error(
      "Error inesperado cargando productos:",
      err
    );
  }
}

async function openProductModal() {
  const modal = document.getElementById("producto-modal");

  if (!modal) return;

  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("open");

  const search = document.getElementById("producto-search");

  if (search) {
    search.value = "";
  }

  productPickerFilter = "Todos";

  document
    .querySelectorAll(".producto-filter")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.filter === "Todos"
      );
    });

  const grid = document.getElementById(
    "producto-picker-grid"
  );

  if (grid) {
    grid.innerHTML = `
      <div class="producto-picker-loading">
        Cargando productos...
      </div>
    `;
  }

  await loadProductOptions();

  renderProductModal();

  setTimeout(() => {
    search?.focus();
  }, 100);
}

function closeProductModal() {
  const modal = document.getElementById("producto-modal");

  if (!modal) return;

  modal.setAttribute("aria-hidden", "true");
  modal.classList.remove("open");
}

function setProductFilter(filter, button) {
  productPickerFilter = filter;

  document
    .querySelectorAll(".producto-filter")
    .forEach(item => {
      item.classList.remove("active");
    });

  if (button) {
    button.classList.add("active");
  }

  renderProductModal();
}

function renderProductModal() {
  const grid = document.getElementById(
    "producto-picker-grid"
  );

  const count = document.getElementById(
    "producto-modal-count"
  );

  const searchInput = document.getElementById(
    "producto-search"
  );

  if (!grid) return;

  const texto = (searchInput?.value || "")
    .trim()
    .toLowerCase();

  let productos = [...productPickerData];

  // Filtro por categoría
  if (productPickerFilter !== "Todos") {
    productos = productos.filter(
      producto =>
        String(producto.categoria || "") ===
        productPickerFilter
    );
  }

  // Filtro por búsqueda
  if (texto) {
    productos = productos.filter(producto => {
      const nombre = String(
        producto.nombre || ""
      ).toLowerCase();

      const categoria = String(
        producto.categoria || ""
      ).toLowerCase();

      return (
        nombre.includes(texto) ||
        categoria.includes(texto)
      );
    });
  }

  if (count) {
    count.textContent =
      `${productos.length} producto${productos.length === 1 ? "" : "s"}`;
  }

  if (productos.length === 0) {
    grid.innerHTML = `
      <div class="producto-picker-empty">
        <strong>No encontramos productos</strong>
        <span>
          Probá con otro nombre o cambiá el filtro.
        </span>
      </div>
    `;

    return;
  }

  grid.innerHTML = productos
    .map(producto => {
      const talles = Array.isArray(producto.talles)
        ? producto.talles
        : [];

      const stockTotal = Number(
        producto.cantidad || 0
      );

      const tieneTalles = talles.length > 0;

      const hayStock = tieneTalles
        ? talles.some(
            talle => Number(talle.cantidad || 0) > 0
          )
        : stockTotal > 0;

      const imagen = producto.imagen_url || "";

      const tallesTexto = tieneTalles
        ? talles
            .map(
              talle =>
                `${escapeHTML(talle.talle)}: ${Number(
                  talle.cantidad || 0
                )}`
            )
            .join(" · ")
        : `Stock: ${stockTotal}`;

      return `
        <button
          type="button"
          class="producto-picker-card ${!hayStock ? "sin-stock" : ""}"
          onclick="seleccionarProductoVenta(${producto.id})"
          ${!hayStock ? "disabled" : ""}
        >

          <div class="producto-picker-image">
            ${
              imagen
                ? `
                  <img
                    src="${escapeHTML(imagen)}"
                    alt="${escapeHTML(
                      producto.nombre || "Producto"
                    )}"
                  />
                `
                : `
                  <div class="producto-picker-no-image">
                    Sin imagen
                  </div>
                `
            }
          </div>

          <div class="producto-picker-info">

            <div class="producto-picker-name">
              ${escapeHTML(
                producto.nombre || "Sin nombre"
              )}
            </div>

            <div class="producto-picker-details">
              ${escapeHTML(
                producto.categoria || ""
              )}
            </div>

            <div class="producto-picker-stock">
              ${
                hayStock
                  ? tallesTexto
                  : "Sin stock"
              }
            </div>

          </div>

        </button>
      `;
    })
    .join("");
}

async function seleccionarProductoVenta(productoId) {
  const producto = productPickerData.find(
    item => Number(item.id) === Number(productoId)
  );

  if (!producto) {
    showToast(
      "No se encontró el producto.",
      "error"
    );

    return;
  }

  const talles = Array.isArray(producto.talles)
    ? producto.talles
    : [];

  const stockTotal = Number(
    producto.cantidad || 0
  );

  const tieneStock = talles.length > 0
    ? talles.some(
        talle => Number(talle.cantidad || 0) > 0
      )
    : stockTotal > 0;

  if (!tieneStock) {
    showToast(
      "Ese producto no tiene stock disponible.",
      "error"
    );

    return;
  }

  selectedVentaProducto = producto;

  const hiddenInput =
    document.getElementById("v-prod");

  if (hiddenInput) {
    hiddenInput.value = producto.id;
  }

  const selector =
    document.getElementById(
      "venta-producto-selector"
    );

  const selected =
    document.getElementById(
      "venta-producto-selected"
    );

  const selectedImage =
    document.getElementById(
      "venta-producto-selected-img"
    );

  const selectedName =
    document.getElementById(
      "venta-producto-selected-name"
    );

  const selectedDetails =
    document.getElementById(
      "venta-producto-selected-details"
    );

  if (selector) {
    selector.style.display = "none";
  }

  if (selected) {
    selected.style.display = "flex";
  }

  if (selectedImage) {
    if (producto.imagen_url) {
      selectedImage.src = producto.imagen_url;
      selectedImage.alt = producto.nombre || "Producto";
      selectedImage.style.display = "block";
    } else {
      selectedImage.removeAttribute("src");
      selectedImage.style.display = "none";
    }
  }

  if (selectedName) {
    selectedName.textContent =
      producto.nombre || "Producto";
  }

  if (selectedDetails) {
    selectedDetails.textContent =
      tieneTalles
        ? "Seleccioná un talle"
        : `Stock disponible: ${stockTotal}`;
  }

  closeProductModal();

  // Resetear cantidad
  const cantidadInput =
    document.getElementById("v-cantidad");

  if (cantidadInput) {
    cantidadInput.value = "1";
  }

  // Manejar talles
  await cargarTallesVenta(producto);

  actualizarStockTalleVenta();
}

function cambiarProductoVenta() {
  selectedVentaProducto = null;

  const hiddenInput =
    document.getElementById("v-prod");

  if (hiddenInput) {
    hiddenInput.value = "";
  }

  const selector =
    document.getElementById(
      "venta-producto-selector"
    );

  const selected =
    document.getElementById(
      "venta-producto-selected"
    );

  if (selector) {
    selector.style.display = "flex";
  }

  if (selected) {
    selected.style.display = "none";
  }

  const talleField =
    document.getElementById(
      "venta-talle-field"
    );

  if (talleField) {
    talleField.style.display = "none";
  }

  const talleSelect =
    document.getElementById("v-talle");

  if (talleSelect) {
    talleSelect.innerHTML = `
      <option value="">
        Seleccioná un talle
      </option>
    `;
  }

  const stockInfo =
    document.getElementById("v-stock-info");

  if (stockInfo) {
    stockInfo.textContent =
      "Seleccioná un producto";
  }

  selectedVentaProducto = null;
}

async function cargarTallesVenta(producto) {
  const talleField =
    document.getElementById(
      "venta-talle-field"
    );

  const talleSelect =
    document.getElementById("v-talle");

  if (!talleField || !talleSelect) {
    return;
  }

  let talles = Array.isArray(producto?.talles)
    ? producto.talles
    : [];

  // Si no vienen cargados, consultamos Supabase
  if (
    producto &&
    talles.length === 0
  ) {
    const { data, error } = await sb
      .from("producto_talles")
      .select("id, talle, cantidad")
      .eq("producto_id", producto.id)
      .order("id", { ascending: true });

    if (!error) {
      talles = data || [];
    }
  }

  if (talles.length === 0) {
    talleField.style.display = "none";
    talleSelect.innerHTML = `
      <option value="">
        Este producto no usa talles
      </option>
    `;

    return;
  }

  talleField.style.display = "block";

  const disponibles = talles.filter(
    talle =>
      Number(talle.cantidad || 0) > 0
  );

  if (disponibles.length === 0) {
    talleSelect.innerHTML = `
      <option value="">
        Sin talles disponibles
      </option>
    `;

    return;
  }

  talleSelect.innerHTML = `
    <option value="">
      Seleccioná un talle
    </option>

    ${disponibles
      .map(
        talle => `
          <option
            value="${escapeHTML(talle.talle)}"
            data-stock="${Number(
              talle.cantidad || 0
            )}"
          >
            ${escapeHTML(talle.talle)}
            — ${Number(talle.cantidad || 0)} disponibles
          </option>
        `
      )
      .join("")}
  `;

  talleSelect.onchange = () => {
    actualizarStockTalleVenta();
  };

  actualizarStockTalleVenta();
}

function actualizarStockTalleVenta() {
  const stockInfo =
    document.getElementById("v-stock-info");

  const talleInfo =
    document.getElementById("v-talle-info");

  const talleSelect =
    document.getElementById("v-talle");

  const cantidadInput =
    document.getElementById("v-cantidad");

  if (!selectedVentaProducto) {
    if (stockInfo) {
      stockInfo.textContent =
        "Seleccioná un producto";
    }

    return;
  }

  const talles = Array.isArray(
    selectedVentaProducto.talles
  )
    ? selectedVentaProducto.talles
    : [];

  if (talles.length === 0) {
    const stock = Number(
      selectedVentaProducto.cantidad || 0
    );

    if (stockInfo) {
      stockInfo.textContent =
        `Stock disponible: ${stock}`;
    }

    if (talleInfo) {
      talleInfo.textContent = "";
    }

    if (cantidadInput) {
      cantidadInput.max =
        stock > 0 ? String(stock) : "1";
    }

    return;
  }

  const talleSeleccionado =
    talleSelect?.value || "";

  if (!talleSeleccionado) {
    if (stockInfo) {
      stockInfo.textContent =
        "Seleccioná un talle";
    }

    if (talleInfo) {
      talleInfo.textContent =
        "El stock se controla por talle.";
    }

    if (cantidadInput) {
      cantidadInput.removeAttribute("max");
    }

    return;
  }

  const talle = talles.find(
    item =>
      String(item.talle) ===
      String(talleSeleccionado)
  );

  if (!talle) {
    if (stockInfo) {
      stockInfo.textContent =
        "Talle no disponible";
    }

    return;
  }

  const stock = Number(
    talle.cantidad || 0
  );

  if (stockInfo) {
    stockInfo.textContent =
      `Stock del talle ${talle.talle}: ${stock}`;
  }

  if (talleInfo) {
    talleInfo.textContent =
      `${stock} unidad${stock === 1 ? "" : "es"} disponibles`;
  }

  if (cantidadInput) {
    cantidadInput.max =
      stock > 0 ? String(stock) : "1";

    const actual = Number(
      cantidadInput.value || 1
    );

    if (actual > stock && stock > 0) {
      cantidadInput.value = String(stock);
    }
  }
}

// Buscar productos en tiempo real
document.addEventListener("input", event => {
  if (
    event.target &&
    event.target.id === "producto-search"
  ) {
    renderProductModal();
  }
});

// ==============================
// REGISTRAR VENTA
// ==============================

async function submitVenta() {
  const productoInput =
    document.getElementById("v-prod");

  const cantidadInput =
    document.getElementById("v-cantidad");

  const monedaInput =
    document.getElementById("v-cur");

  const montoInput =
    document.getElementById("v-amt");

  const metodoInput =
    document.getElementById("v-met");

  const notaInput =
    document.getElementById("v-nota");

  const talleInput =
    document.getElementById("v-talle");

  const error =
    document.getElementById("v-err");

  const button =
    document.getElementById("v-btn");

  if (error) {
    error.textContent = "";
  }

  const productoId = Number(
    productoInput?.value || 0
  );

  const cantidad = Number(
    cantidadInput?.value || 0
  );

  const moneda =
    monedaInput?.value || "ARS";

  const monto = Number(
    montoInput?.value || 0
  );

  const metodo =
    metodoInput?.value || "";

  const nota =
    (notaInput?.value || "").trim();

  const talle =
    (talleInput?.value || "").trim();

  // ==========================
  // VALIDACIONES
  // ==========================

  if (!productoId) {
    if (error) {
      error.textContent =
        "Seleccioná un producto.";
    }

    return;
  }

  if (
    !Number.isInteger(cantidad) ||
    cantidad <= 0
  ) {
    if (error) {
      error.textContent =
        "La cantidad debe ser un número entero mayor a 0.";
    }

    return;
  }

  if (!Number.isFinite(monto) || monto <= 0) {
    if (error) {
      error.textContent =
        "Ingresá un monto válido.";
    }

    return;
  }

  if (!metodo) {
    if (error) {
      error.textContent =
        "Seleccioná un método de pago.";
    }

    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Registrando...";
  }

  try {
    // ==========================
    // BUSCAR PRODUCTO
    // ==========================

    const { data: producto, error: productoError } =
      await sb
        .from("stock")
        .select("*")
        .eq("id", productoId)
        .single();

    if (productoError || !producto) {
      console.error(productoError);

      if (error) {
        error.textContent =
          "No se encontró el producto.";
      }

      return;
    }

    // ==========================
    // BUSCAR TALLES
    // ==========================

    const { data: tallesActuales, error: tallesError } =
      await sb
        .from("producto_talles")
        .select("id, talle, cantidad")
        .eq("producto_id", productoId)
        .order("id", { ascending: true });

    if (tallesError) {
      console.error(tallesError);

      if (error) {
        error.textContent =
          "No se pudo consultar el stock por talle.";
      }

      return;
    }

    const tieneTalles =
      (tallesActuales || []).length > 0;

    let stockAnterior = Number(
      producto.cantidad || 0
    );

    let talleAnterior = null;
    let talleSeleccionado = null;

    // ==========================
    // PRODUCTO CON TALLES
    // ==========================

    if (tieneTalles) {
      if (!talle) {
        if (error) {
          error.textContent =
            "Seleccioná un talle.";
        }

        return;
      }

      const talleEncontrado =
        tallesActuales.find(
          item =>
            String(item.talle) ===
            String(talle)
        );

      if (!talleEncontrado) {
        if (error) {
          error.textContent =
            "El talle seleccionado no existe.";
        }

        return;
      }

      const stockTalle = Number(
        talleEncontrado.cantidad || 0
      );

      if (stockTalle < cantidad) {
        if (error) {
          error.textContent =
            `No hay suficiente stock del talle ${talle}. Disponible: ${stockTalle}.`;
        }

        return;
      }

      talleSeleccionado =
        talleEncontrado.talle;

      talleAnterior = stockTalle;

      // ==========================
      // DESCONTAR TALLE
      // ==========================

      const { data: descuentoOK, error: rpcError } =
        await sb.rpc(
          "descontar_stock_talle",
          {
            p_producto_id: productoId,
            p_talle: talleSeleccionado,
            p_cantidad: cantidad
          }
        );

      if (rpcError) {
        console.error(
          "Error RPC descuento:",
          rpcError
        );

        if (error) {
          error.textContent =
            "No se pudo descontar el stock.";
        }

        return;
      }

      if (descuentoOK !== true) {
        if (error) {
          error.textContent =
            "El stock cambió antes de registrar la venta. Revisá la cantidad disponible.";
        }

        return;
      }

      // ==========================
      // RECALCULAR STOCK TOTAL
      // ==========================

      const { data: tallesDespues, error: recargaError } =
        await sb
          .from("producto_talles")
          .select("cantidad")
          .eq("producto_id", productoId);

      if (recargaError) {
        console.error(recargaError);

        // Intentamos restaurar el talle
        await sb
          .from("producto_talles")
          .update({
            cantidad: talleAnterior
          })
          .eq("producto_id", productoId)
          .eq("talle", talleSeleccionado);

        if (error) {
          error.textContent =
            "No se pudo actualizar el stock total.";
        }

        return;
      }

      const nuevoStockTotal =
        (tallesDespues || []).reduce(
          (total, item) =>
            total + Number(item.cantidad || 0),
          0
        );

      // ==========================
      // ACTUALIZAR STOCK TOTAL
      // ==========================

      const { error: stockError } =
        await sb
          .from("stock")
          .update({
            cantidad: nuevoStockTotal
          })
          .eq("id", productoId);

      if (stockError) {
        console.error(stockError);

        // Restaurar talle
        await sb
          .from("producto_talles")
          .update({
            cantidad: talleAnterior
          })
          .eq("producto_id", productoId)
          .eq("talle", talleSeleccionado);

        if (error) {
          error.textContent =
            "No se pudo actualizar el stock.";
        }

        return;
      }

      // ==========================
      // REGISTRAR VENTA
      // ==========================

      const venta = {
        fecha: todayStr(),
        hora: nowTime(),
        producto: producto.nombre,
        categoria: producto.categoria,
        moneda,
        monto,
        metodo,
        nota: nota || null,
        vendedor:
          currentUser?.display ||
          currentUser?.usuario ||
          "Sistema",
        producto_id: productoId,
        cantidad,
        talle: talleSeleccionado
      };

      const { error: ventaError } =
        await sb
          .from("ventas")
          .insert(venta);

      if (ventaError) {
        console.error(
          "Error registrando venta:",
          ventaError
        );

        // Restaurar talle
        await sb
          .from("producto_talles")
          .update({
            cantidad: talleAnterior
          })
          .eq("producto_id", productoId)
          .eq("talle", talleSeleccionado);

        // Restaurar stock total
        await sb
          .from("stock")
          .update({
            cantidad: stockAnterior
          })
          .eq("id", productoId);

        if (error) {
          error.textContent =
            "No se pudo registrar la venta.";
        }

        return;
      }

      await ventaRegistradaCorrectamente();

      return;
    }

    // ==========================
    // PRODUCTO SIN TALLES
    // ==========================

    if (stockAnterior < cantidad) {
      if (error) {
        error.textContent =
          `No hay suficiente stock. Disponible: ${stockAnterior}.`;
      }

      return;
    }

    const nuevoStock =
      stockAnterior - cantidad;

    // Actualizar stock primero
    const { error: stockError } =
      await sb
        .from("stock")
        .update({
          cantidad: nuevoStock
        })
        .eq("id", productoId)
        .gte("cantidad", cantidad);

    if (stockError) {
      console.error(stockError);

      if (error) {
        error.textContent =
          "No se pudo actualizar el stock.";
      }

      return;
    }

    // Registrar venta
    const venta = {
      fecha: todayStr(),
      hora: nowTime(),
      producto: producto.nombre,
      categoria: producto.categoria,
      moneda,
      monto,
      metodo,
      nota: nota || null,
      vendedor:
        currentUser?.display ||
        currentUser?.usuario ||
        "Sistema",
      producto_id: productoId,
      cantidad,
      talle: null
    };

    const { error: ventaError } =
      await sb
        .from("ventas")
        .insert(venta);

    if (ventaError) {
      console.error(
        "Error registrando venta:",
        ventaError
      );

      // Restaurar stock si la venta falló
      await sb
        .from("stock")
        .update({
          cantidad: stockAnterior
        })
        .eq("id", productoId);

      if (error) {
        error.textContent =
          "No se pudo registrar la venta.";
      }

      return;
    }

    await ventaRegistradaCorrectamente();

  } catch (err) {
    console.error(
      "Error inesperado registrando venta:",
      err
    );

    if (error) {
      error.textContent =
        err.message ||
        "Ocurrió un error al registrar la venta.";
    }

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Registrar venta";
    }
  }
}

// ==============================
// VENTA REGISTRADA CORRECTAMENTE
// ==============================

async function ventaRegistradaCorrectamente() {
  showToast(
    "Venta registrada correctamente."
  );

  // Limpiar selección
  selectedVentaProducto = null;

  const hiddenInput =
    document.getElementById("v-prod");

  if (hiddenInput) {
    hiddenInput.value = "";
  }

  const selector =
    document.getElementById(
      "venta-producto-selector"
    );

  const selected =
    document.getElementById(
      "venta-producto-selected"
    );

  if (selector) {
    selector.style.display = "flex";
  }

  if (selected) {
    selected.style.display = "none";
  }

  const talleField =
    document.getElementById(
      "venta-talle-field"
    );

  if (talleField) {
    talleField.style.display = "none";
  }

  const talleSelect =
    document.getElementById("v-talle");

  if (talleSelect) {
    talleSelect.innerHTML = `
      <option value="">
        Seleccioná un talle
      </option>
    `;
  }

  const cantidadInput =
    document.getElementById("v-cantidad");

  if (cantidadInput) {
    cantidadInput.value = "1";
  }

  const montoInput =
    document.getElementById("v-amt");

  if (montoInput) {
    montoInput.value = "";
  }

  const notaInput =
    document.getElementById("v-nota");

  if (notaInput) {
    notaInput.value = "";
  }

  const stockInfo =
    document.getElementById("v-stock-info");

  if (stockInfo) {
    stockInfo.textContent =
      "Seleccioná un producto";
  }

  const talleInfo =
    document.getElementById("v-talle-info");

  if (talleInfo) {
    talleInfo.textContent =
      "Seleccioná un talle";
  }

  const error =
    document.getElementById("v-err");

  if (error) {
    error.textContent = "";
  }

  // Recargar todo para mostrar el stock actualizado
  await loadProductOptions();
  await loadStock();
  await loadDashboard();
}

// ==============================
// INICIALIZACIÓN
// ==============================

document.addEventListener("DOMContentLoaded", () => {

  // ============================
  // BUSCADOR DE STOCK
  // ============================

  const stockSearch =
    document.getElementById("stock-search");

  if (stockSearch) {
    stockSearch.addEventListener("input", () => {
      filtrarStock();
    });
  }

  // ============================
  // SELECTOR DE PRODUCTO
  // ============================

  const productoSearch =
    document.getElementById("producto-search");

  if (productoSearch) {
    productoSearch.addEventListener(
      "input",
      () => {
        renderProductModal();
      }
    );
  }

  // ============================
  // CAMBIO DE TALLE
  // ============================

  const talleSelect =
    document.getElementById("v-talle");

  if (talleSelect) {
    talleSelect.addEventListener(
      "change",
      () => {
        actualizarStockTalleVenta();
      }
    );
  }

  // ============================
  // CAMBIO DE CANTIDAD
  // ============================

  const cantidadInput =
    document.getElementById("v-cantidad");

  if (cantidadInput) {
    cantidadInput.addEventListener(
      "input",
      () => {
        actualizarStockTalleVenta();
      }
    );
  }

  // ============================
  // CERRAR MODAL CON ESC
  // ============================

  document.addEventListener(
    "keydown",
    event => {
      if (event.key !== "Escape") {
        return;
      }

      const modal =
        document.getElementById("producto-modal");

      if (
        modal &&
        modal.classList.contains("open")
      ) {
        closeProductModal();
      }
    }
  );

  // ============================
  // CREAR PRIMERA FILA DE TALLE
  // ============================

  const tallesList =
    document.getElementById(
      "stock-talles-list"
    );

  if (
    tallesList &&
    !tallesList.querySelector(
      ".stock-talle-row"
    )
  ) {
    agregarFilaTalle();
  }

});

// ==============================
// CARGA INICIAL DE DATOS
// ==============================

async function inicializarApp() {
  try {
    await loadProductOptions();
  } catch (error) {
    console.error(
      "Error inicializando productos:",
      error
    );
  }
}

// ==============================
// CERRAR MODAL AL HACER CLICK
// FUERA DE LA CAJA
// ==============================

document.addEventListener(
  "click",
  event => {

    const modal =
      document.getElementById(
        "producto-modal"
      );

    if (!modal) return;

    if (
      event.target.classList.contains(
        "producto-modal-backdrop"
      )
    ) {
      closeProductModal();
    }

  }
);

// ==============================
// EXPONER FUNCIONES
// ==============================
// Estas funciones se usan desde
// onclick="" en el HTML.

window.doLogin = doLogin;
window.doLogout = doLogout;

window.goTab = goTab;

window.loadDashboard = loadDashboard;
window.loadStock = loadStock;
window.loadHistorial = loadHistorial;
window.loadUsuarios = loadUsuarios;

window.crearUsuario = crearUsuario;
window.eliminarUsuario = eliminarUsuario;

window.agregarProductoStock =
  agregarProductoStock;

window.agregarFilaTalle =
  agregarFilaTalle;

window.eliminarFilaTalle =
  eliminarFilaTalle;

window.editarStockManual =
  editarStockManual;

window.eliminarProductoStock =
  eliminarProductoStock;

window.openProductModal =
  openProductModal;

window.closeProductModal =
  closeProductModal;

window.setProductFilter =
  setProductFilter;

window.renderProductModal =
  renderProductModal;

window.seleccionarProductoVenta =
  seleccionarProductoVenta;

window.cambiarProductoVenta =
  cambiarProductoVenta;

window.cargarTallesVenta =
  cargarTallesVenta;

window.actualizarStockTalleVenta =
  actualizarStockTalleVenta;

window.submitVenta =
  submitVenta;

// ==============================
// ARRANCAR APP
// ==============================

inicializarApp();