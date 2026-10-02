// ══════════════════════════════════════════════
// VENTAS.JS
// ══════════════════════════════════════════════

// PRODUCTOS PARA REGISTRAR VENTA

let ventaProductos = [];
let ventaProductoFiltro = "Todos";

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

function closeProductModal() {
  const modal = document.getElementById("producto-modal");
  if (!modal) return;

  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("producto-modal-open");
}

function setProductFilter(filter, button) {
  ventaProductoFiltro = filter;

  document
    .querySelectorAll(".producto-filter")
    .forEach((btn) => btn.classList.remove("active"));

  if (button) {
    button.classList.add("active");
  }

  renderProductPicker();
}

function escapeProductHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ══════════════════════════════════════════════
// STOCK TOTAL DEL PRODUCTO
// ══════════════════════════════════════════════

function obtenerStockTotalProducto(product) {
  if (!product) return 0;

  if (
    Array.isArray(product.talles) &&
    product.talles.length > 0
  ) {
    return product.talles.reduce(
      (total, talle) =>
        total + (Number(talle.cantidad) || 0),
      0
    );
  }

  return Number(product.cantidad) || 0;
}


// ══════════════════════════════════════════════
// PRODUCTOS DISPONIBLES
// ══════════════════════════════════════════════

function obtenerTallesDisponibles(producto) {
  if (!producto || !Array.isArray(producto.talles)) {
    return [];
  }

  return producto.talles.filter(
    (t) => Number(t.cantidad) > 0
  );
}


// ══════════════════════════════════════════════
// SELECTOR DE TALLE
// ══════════════════════════════════════════════

function asegurarSelectorTalle() {
  let talleField =
    document.getElementById("venta-talle-field");

  let talleSelect =
    document.getElementById("v-talle");

  if (talleField && talleSelect) {
    return {
      field: talleField,
      select: talleSelect
    };
  }

  const cantidadInput =
    document.getElementById("v-cantidad");

  const cantidadField = cantidadInput
    ? (
        cantidadInput.closest(".form-group") ||
        cantidadInput.parentElement
      )
    : null;

  if (!talleField) {
    talleField = document.createElement("div");

    talleField.id = "venta-talle-field";
    talleField.className = "form-group";

    talleField.innerHTML = `
      <label
        for="v-talle"
        style="
          display:block;
          margin-bottom:7px;
          font-weight:600;
        "
      >
        Talle
      </label>

      <select
        id="v-talle"
        name="talle"
        style="width:100%;"
      >
        <option value="">
          Seleccionar talle
        </option>
      </select>

      <div
        id="v-talle-info"
        style="
          margin-top:6px;
          font-size:12px;
          color:var(--text2);
        "
      ></div>
    `;
  }

  talleSelect =
    talleField.querySelector("#v-talle");

  if (!talleSelect) {
    talleSelect = document.createElement("select");

    talleSelect.id = "v-talle";
    talleSelect.name = "talle";
    talleSelect.style.width = "100%";

    talleSelect.innerHTML = `
      <option value="">
        Seleccionar talle
      </option>
    `;

    talleField.appendChild(talleSelect);
  }

  if (!document.getElementById("v-talle-info")) {
    const info = document.createElement("div");

    info.id = "v-talle-info";

    info.style.marginTop = "6px";
    info.style.fontSize = "12px";
    info.style.color = "var(--text2)";

    talleField.appendChild(info);
  }

  if (
    !talleField.parentNode &&
    cantidadField &&
    cantidadField.parentNode
  ) {
    cantidadField.parentNode.insertBefore(
      talleField,
      cantidadField
    );
  }

  talleSelect.onchange = actualizarStockPorTalle;

  return {
    field: talleField,
    select: talleSelect
  };
}


// ══════════════════════════════════════════════
// PRODUCT PICKER
// ══════════════════════════════════════════════

function renderProductPicker() {
  const grid =
    document.getElementById(
      "producto-picker-grid"
    );

  const count =
    document.getElementById(
      "producto-modal-count"
    );

  const searchInput =
    document.getElementById(
      "producto-search"
    );

  if (!grid) return;

  const search = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

  let products = ventaProductos.filter(
    (product) => {

      const stockTotal =
        obtenerStockTotalProducto(product);

      if (stockTotal <= 0) {
        return false;
      }

      if (
        ventaProductoFiltro !== "Todos" &&
        product.categoria !== ventaProductoFiltro
      ) {
        return false;
      }

      if (search) {
        const tallesTexto =
          Array.isArray(product.talles)
            ? product.talles
                .map((t) => t.talle)
                .join(" ")
            : "";

        const searchableText = [
          product.nombre,
          product.categoria,
          product.talla,
          tallesTexto
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (
          !searchableText.includes(search)
        ) {
          return false;
        }
      }

      return true;
    }
  );

  products.sort((a, b) => {
    const stockA =
      obtenerStockTotalProducto(a);

    const stockB =
      obtenerStockTotalProducto(b);

    return stockB - stockA;
  });

  if (count) {
    count.textContent =
      products.length === 1
        ? "1 producto disponible"
        : `${products.length} productos disponibles`;
  }

  if (!products.length) {
    grid.innerHTML = `
      <div class="producto-picker-empty">
        <div class="producto-empty-icon">
          ⌕
        </div>

        <strong>
          No encontramos productos
        </strong>

        <span>
          Probá con otro nombre o cambiá el filtro.
        </span>
      </div>
    `;

    return;
  }

  grid.innerHTML = products
    .map((product) => {

      const id = Number(product.id);

      const stock =
        obtenerStockTotalProducto(product);

      const nombre =
        escapeProductHTML(
          product.nombre ||
          "Producto sin nombre"
        );

      const categoria =
        escapeProductHTML(
          product.categoria ||
          "Sin categoría"
        );

      const tallesDisponibles =
        obtenerTallesDisponibles(product);

      const tallesTexto =
        tallesDisponibles.length
          ? tallesDisponibles
              .map(
                (t) =>
                  `${escapeProductHTML(
                    t.talle
                  )} (${Number(t.cantidad)})`
              )
              .join(", ")
          : "Sin talle";

      const image =
        product.imagen_url
          ? `
            <img
              src="${escapeProductHTML(
                product.imagen_url
              )}"
              alt="${nombre}"
              loading="lazy"
            />
          `
          : `
            <div class="producto-card-no-image">
              <span>⌑</span>
            </div>
          `;

      let categoriaIcon = "📦";

      if (
        String(product.categoria)
          .toLowerCase() === "ropa"
      ) {
        categoriaIcon = "👕";
      }

      if (
        String(product.categoria)
          .toLowerCase() === "accesorios"
      ) {
        categoriaIcon = "👜";
      }

      return `
        <button
          type="button"
          class="producto-picker-card"
          onclick="selectVentaProductById(${id})"
        >

          <div class="producto-picker-image">
            ${image}

            <span class="producto-stock-badge">
              ${stock}
              disponible${stock === 1 ? "" : "s"}
            </span>
          </div>

          <div class="producto-picker-info">

            <span class="producto-picker-category">
              ${categoriaIcon}
              ${categoria}
            </span>

            <strong class="producto-picker-name">
              ${nombre}
            </strong>

            <div class="producto-picker-meta">

              <span>
                Talles:
                <b>${tallesTexto}</b>
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


// ══════════════════════════════════════════════
// SELECCIONAR PRODUCTO
// ══════════════════════════════════════════════

function selectVentaProductById(productId) {
  const product =
    ventaProductos.find(
      (item) =>
        String(item.id) ===
        String(productId)
    );

  if (!product) return;

  selectVentaProduct(product, true);
}


// ══════════════════════════════════════════════
// SELECCIONAR PRODUCTO PARA LA VENTA
// ══════════════════════════════════════════════

function selectVentaProduct(
  product,
  closeModal = true
) {
  if (!product) return;

  const prodInput =
    document.getElementById("v-prod");

  const selector =
    document.getElementById(
      "venta-producto-selector"
    );

  const selected =
    document.getElementById(
      "venta-producto-selected"
    );

  const selectedImg =
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

  const cantidadInput =
    document.getElementById(
      "v-cantidad"
    );

  const stockInfo =
    document.getElementById(
      "v-stock-info"
    );

  const {
    field: talleField,
    select: talleSelect
  } = asegurarSelectorTalle();

  if (prodInput) {
    prodInput.value =
      String(product.id);

    prodInput.dataset.stock =
      String(
        obtenerStockTotalProducto(
          product
        )
      );

    prodInput.dataset.producto =
      product.nombre || "";

    prodInput.dataset.categoria =
      product.categoria || "";
  }

  if (selectedName) {
    selectedName.textContent =
      product.nombre ||
      "Producto";
  }

  if (selectedDetails) {
    selectedDetails.textContent =
      product.categoria || "";
  }

  if (selectedImg) {
    if (product.imagen_url) {
      selectedImg.src =
        product.imagen_url;

      selectedImg.style.display =
        "block";
    } else {
      selectedImg.removeAttribute(
        "src"
      );

      selectedImg.style.display =
        "none";
    }
  }

  if (selected) {
    selected.style.display =
      "flex";
  }

  if (selector) {
    selector.style.display =
      "none";
  }

  const talles =
    Array.isArray(product.talles)
      ? product.talles
      : [];

  talleSelect.innerHTML = `
    <option value="">
      Seleccionar talle
    </option>
  `;

  const tallesDisponibles =
    talles.filter(
      (t) =>
        Number(t.cantidad) > 0
    );

  if (talles.length > 0) {

    talleField.style.display =
      tallesDisponibles.length
        ? "block"
        : "none";

    tallesDisponibles.forEach(
      (t) => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          String(t.talle);

        option.textContent =
          `${t.talle} — ${Number(
            t.cantidad
          )} disponible(s)`;

        option.dataset.stock =
          String(
            Number(t.cantidad) || 0
          );

        talleSelect.appendChild(
          option
        );
      }
    );

    talleSelect.value = "";

    if (cantidadInput) {
      cantidadInput.value = "1";
      cantidadInput.removeAttribute(
        "max"
      );
    }

    if (stockInfo) {
      stockInfo.textContent =
        tallesDisponibles.length
          ? "Seleccioná un talle"
          : "Sin stock disponible";
    }

  } else {

    talleField.style.display =
      "none";

    talleSelect.value = "";

    const stock =
      Number(product.cantidad) || 0;

    if (stockInfo) {
      stockInfo.textContent =
        `Stock disponible: ${stock}`;
    }

    if (cantidadInput) {
      cantidadInput.value = "1";
      cantidadInput.max =
        String(stock);
    }
  }

  if (closeModal) {
    closeProductModal();
  }
}


// ══════════════════════════════════════════════
// LIMPIAR PRODUCTO
// ══════════════════════════════════════════════

function clearSelectedVentaProduct() {
  const prodInput =
    document.getElementById("v-prod");

  const selected =
    document.getElementById(
      "venta-producto-selected"
    );

  const selector =
    document.getElementById(
      "venta-producto-selector"
    );

  const cantidadInput =
    document.getElementById(
      "v-cantidad"
    );

  const talleField =
    document.getElementById(
      "venta-talle-field"
    );

  const talleSelect =
    document.getElementById(
      "v-talle"
    );

  const stockInfo =
    document.getElementById(
      "v-stock-info"
    );

  const talleInfo =
    document.getElementById(
      "v-talle-info"
    );

  if (prodInput) {
    prodInput.value = "";

    delete prodInput.dataset.stock;
    delete prodInput.dataset.producto;
    delete prodInput.dataset.categoria;
  }

  if (selected) {
    selected.style.display =
      "none";
  }

  if (selector) {
    selector.style.display = "";
  }

  if (talleSelect) {
    talleSelect.innerHTML = `
      <option value="">
        Seleccionar talle
      </option>
    `;

    talleSelect.value = "";
  }

  if (talleField) {
    talleField.style.display =
      "none";
  }

  if (cantidadInput) {
    cantidadInput.value = 1;
    cantidadInput.max = "";
  }

  if (stockInfo) {
    stockInfo.textContent = "";
  }

  if (talleInfo) {
    talleInfo.textContent = "";
  }
}


// ══════════════════════════════════════════════
// DOM
// ══════════════════════════════════════════════

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const search =
      document.getElementById(
        "producto-search"
      );

    if (search) {
      search.addEventListener(
        "input",
        () =>
          renderProductPicker()
      );
    }

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape"
        ) {
          closeProductModal();
        }
      }
    );
  }
);


// ══════════════════════════════════════════════
// CARGAR PRODUCTOS
// ══════════════════════════════════════════════

async function loadProductOptions() {
  try {

    const {
      data: productos,
      error: productosError
    } = await sb
      .from("stock")
      .select("*")
      .order("categoria")
      .order("nombre");

    if (productosError) {
      throw productosError;
    }

    const ids =
      (productos || []).map(
        (p) => p.id
      );

    let talles = [];

    if (ids.length > 0) {

      const {
        data,
        error: tallesError
      } = await sb
        .from("producto_talles")
        .select("*")
        .in(
          "producto_id",
          ids
        )
        .order("talle");

      if (tallesError) {
        throw tallesError;
      }

      talles = data || [];
    }

    const tallesPorProducto = {};

    talles.forEach((t) => {

      if (
        !tallesPorProducto[
          t.producto_id
        ]
      ) {
        tallesPorProducto[
          t.producto_id
        ] = [];
      }

      tallesPorProducto[
        t.producto_id
      ].push({
        id: t.id,
        talle: t.talle,
        cantidad:
          Number(t.cantidad) || 0
      });
    });

    ventaProductos =
      (productos || []).map(
        (producto) => {

          const tallesProducto =
            tallesPorProducto[
              producto.id
            ] || [];

          const stockTotal =
            tallesProducto.length
              ? tallesProducto.reduce(
                  (
                    total,
                    talle
                  ) =>
                    total +
                    Number(
                      talle.cantidad
                    ),
                  0
                )
              : Number(
                  producto.cantidad
                ) || 0;

          return {
            ...producto,

            // IMPORTANTE:
            // mantenemos cantidad sincronizada
            // para que toda la app vea el stock real
            cantidad:
              stockTotal,

            talles:
              tallesProducto
          };
        }
      );

    renderProductPicker();

  } catch (error) {

    console.error(
      "Error cargando productos para venta:",
      error
    );

    showToast(
      "No se pudieron cargar los productos",
      "error"
    );
  }
}


// ══════════════════════════════════════════════
// ACTUALIZAR STOCK POR TALLE
// ══════════════════════════════════════════════

function actualizarStockPorTalle() {

  const talleSelect =
    document.getElementById(
      "v-talle"
    );

  const cantidadInput =
    document.getElementById(
      "v-cantidad"
    );

  const stockInfo =
    document.getElementById(
      "v-stock-info"
    );

  const talleInfo =
    document.getElementById(
      "v-talle-info"
    );

  if (!talleSelect) return;

  const productoId =
    Number(
      document.getElementById(
        "v-prod"
      )?.value
    );

  const producto =
    ventaProductos.find(
      (p) =>
        Number(p.id) ===
        productoId
    );

  if (!producto) return;

  const talleSeleccionado =
    String(
      talleSelect.value || ""
    ).trim();

  if (!talleSeleccionado) {

    if (cantidadInput) {
      cantidadInput.removeAttribute(
        "max"
      );
    }

    if (talleInfo) {
      talleInfo.textContent = "";
    }

    if (stockInfo) {
      stockInfo.textContent =
        "Seleccioná un talle";
    }

    return;
  }

  const talle =
    producto.talles?.find(
      (t) =>
        String(t.talle) ===
        talleSeleccionado
    );

  if (!talle) return;

  const stock =
    Number(talle.cantidad) || 0;

  if (cantidadInput) {
    cantidadInput.max =
      String(stock);
  }

  if (stockInfo) {
    stockInfo.textContent =
      `Stock disponible: ${stock}`;
  }

  if (talleInfo) {
    talleInfo.textContent =
      `Talle ${talle.talle}: ${stock} disponible(s)`;
  }

  const cantidadActual =
    Number(
      cantidadInput?.value || 0
    );

  if (
    cantidadActual > stock &&
    cantidadInput
  ) {
    cantidadInput.value =
      stock > 0
        ? 1
        : 0;
  }
}


// ══════════════════════════════════════════════
// REGISTRAR VENTA
// ══════════════════════════════════════════════

async function submitVenta() {

  const productInput =
    document.getElementById(
      "v-prod"
    );

  const quantityInput =
    document.getElementById(
      "v-cantidad"
    );

  const currencyInput =
    document.getElementById(
      "v-cur"
    );

  const amountInput =
    document.getElementById(
      "v-amt"
    );

  const methodInput =
    document.getElementById(
      "v-met"
    );

  const noteInput =
    document.getElementById(
      "v-nota"
    );

  asegurarSelectorTalle();

  const talleInput =
    document.getElementById(
      "v-talle"
    );

  const errorText =
    document.getElementById(
      "v-err"
    );

  const button =
    document.getElementById(
      "v-btn"
    );

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

  const productId =
    Number(productInput.value);

  const cantidad =
    parseInt(
      quantityInput.value,
      10
    );

  const moneda =
    currencyInput.value;

  const monto =
    parseFloat(
      amountInput.value
    );

  const metodo =
    methodInput.value;

  const nota =
    noteInput.value.trim();

  // AQUÍ SE TOMA EL TALLE
  const talle =
    talleInput
      ? String(
          talleInput.value || ""
        ).trim()
      : "";

  if (errorText) {
    errorText.textContent = "";
  }

  if (!productId) {
    if (errorText) {
      errorText.textContent =
        "Seleccioná un producto.";
    }
    return;
  }

  if (
    !Number.isInteger(
      cantidad
    ) ||
    cantidad <= 0
  ) {
    if (errorText) {
      errorText.textContent =
        "Ingresá una cantidad válida.";
    }
    return;
  }

  if (
    !Number.isFinite(monto) ||
    monto <= 0
  ) {
    if (errorText) {
      errorText.textContent =
        "Ingresá un monto válido.";
    }
    return;
  }

  const {
    data: producto,
    error: productoError
  } = await sb
    .from("stock")
    .select("*")
    .eq("id", productId)
    .single();

  if (
    productoError ||
    !producto
  ) {
    console.error(
      "Error buscando producto:",
      productoError
    );

    if (errorText) {
      errorText.textContent =
        "No se pudo encontrar el producto.";
    }

    return;
  }

  const {
    data: tallesProducto,
    error: tallesError
  } = await sb
    .from("producto_talles")
    .select("*")
    .eq(
      "producto_id",
      productId
    )
    .order("talle");

  if (tallesError) {

    console.error(
      "Error buscando talles:",
      tallesError
    );

    if (errorText) {
      errorText.textContent =
        "No se pudieron consultar los talles.";
    }

    return;
  }

  const talles =
    tallesProducto || [];

  if (
    talles.length > 0 &&
    !talle
  ) {

    if (errorText) {
      errorText.textContent =
        "Seleccioná un talle.";
    }

    return;
  }

  let stockDisponible = 0;

  if (talle) {

    const talleData =
      talles.find(
        (t) =>
          String(t.talle) ===
          String(talle)
      );

    if (!talleData) {

      if (errorText) {
        errorText.textContent =
          "El talle seleccionado no existe.";
      }

      return;
    }

    stockDisponible =
      Number(
        talleData.cantidad
      ) || 0;

  } else {

    stockDisponible =
      Number(
        producto.cantidad
      ) || 0;
  }

  if (
    stockDisponible <
    cantidad
  ) {

    if (errorText) {
      errorText.textContent =
        `Stock insuficiente. Disponible: ${stockDisponible}.`;
    }

    return;
  }

  if (button) {
    button.textContent =
      "Guardando...";

    button.disabled =
      true;
  }

  try {

    if (talle) {

      const {
        data: descuento,
        error: descuentoError
      } = await sb.rpc(
        "descontar_stock_talle",
        {
          p_producto_id:
            Number(productId),

          p_talle:
            talle,

          p_cantidad:
            Number(cantidad)
        }
      );

      if (descuentoError) {

        console.error(
          "Error descontando stock por talle:",
          descuentoError
        );

        throw new Error(
          "No se pudo descontar el stock del talle."
        );
      }

    } else {

      const nuevoStock =
        stockDisponible -
        cantidad;

      const {
        error: stockUpdateError
      } = await sb
        .from("stock")
        .update({
          cantidad:
            nuevoStock
        })
        .eq(
          "id",
          productId
        );

      if (stockUpdateError) {

        console.error(
          "Error actualizando stock:",
          stockUpdateError
        );

        throw new Error(
          "No se pudo actualizar el stock."
        );
      }
    }


    // ACTUALIZAR STOCK TOTAL
    if (talle) {

      const {
        data:
          tallesActualizados,
        error:
          tallesActualizadosError
      } = await sb
        .from("producto_talles")
        .select("cantidad")
        .eq(
          "producto_id",
          productId
        );

      if (
        tallesActualizadosError
      ) {

        console.error(
          tallesActualizadosError
        );

        throw new Error(
          "No se pudo actualizar el stock total."
        );
      }

      const nuevoTotal =
        (
          tallesActualizados ||
          []
        ).reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.cantidad || 0
            ),
          0
        );

      const {
        error: totalError
      } = await sb
        .from("stock")
        .update({
          cantidad:
            nuevoTotal
        })
        .eq(
          "id",
          productId
        );

      if (totalError) {

        console.error(
          totalError
        );

        throw new Error(
          "No se pudo actualizar el stock total."
        );
      }
    }


    // ══════════════════════════════════════════
    // GUARDAR VENTA
    // ══════════════════════════════════════════

    const {
      error: ventaError
    } = await sb
      .from("ventas")
      .insert({

        fecha:
          todayStr(),

        hora:
          nowTime(),

        producto:
          producto.nombre,

        producto_id:
          Number(producto.id),

        categoria:
          producto.categoria,

        moneda:
          moneda,

        monto:
          monto,

        metodo:
          metodo,

        nota:
          nota || null,

        vendedor:
          currentUser
            ? currentUser.display
            : "Sin vendedor",

        cantidad:
          Number(cantidad),

        // ═════════════════════════════════════
        // ESTE ES EL DATO IMPORTANTE
        // EL TALLE SE GUARDA EN "talle"
        // ═════════════════════════════════════
        talle:
          talle || null
      });


    if (ventaError) {

      console.error(
        "ERROR GUARDANDO VENTA:",
        ventaError
      );

      throw new Error(
        "El stock fue actualizado pero no se pudo guardar la venta."
      );
    }


    // LIMPIAR FORMULARIO

    productInput.value = "";

    quantityInput.value =
      "1";

    quantityInput.removeAttribute(
      "max"
    );

    amountInput.value =
      "";

    noteInput.value =
      "";

    if (talleInput) {

      talleInput.value =
        "";

      talleInput.innerHTML = `
        <option value="">
          Seleccionar talle
        </option>
      `;
    }

    const stockInfo =
      document.getElementById(
        "v-stock-info"
      );

    if (stockInfo) {
      stockInfo.textContent =
        "Seleccioná un producto";
    }

    clearSelectedVentaProduct();

    await loadProductOptions();

    showToast(
      "✓ Venta registrada y stock actualizado",
      "ok"
    );

    await loadDashboard();

    if (
      document.getElementById(
        "hist-tbody"
      )
    ) {
      await loadHistorial();
    }

  } catch (error) {

    console.error(
      "ERROR REGISTRANDO VENTA:",
      error
    );

    if (errorText) {
      errorText.textContent =
        error.message ||
        "No se pudo registrar la venta.";
    }

  } finally {

    if (button) {

      button.textContent =
        "Registrar venta";

      button.disabled =
        false;
    }
  }
}


// ══════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════

async function loadDashboard() {

  const tbody =
    document.getElementById(
      "today-tbody"
    );

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

  const {
    data,
    error
  } = await sb
    .from("ventas")
    .select("*")
    .order(
      "created_at",
      {
        ascending: false
      }
    );

  if (error) {

    console.error(
      "ERROR DASHBOARD:",
      error
    );

    showToast(
      "Error al cargar datos",
      "fail"
    );

    return;
  }

  const todasLasVentas =
    data || [];

  const fechaHoy =
    todayStr();

  const ventas =
    todasLasVentas.filter(
      (sale) => {

        if (
          sale.fecha &&
          String(sale.fecha) ===
            String(fechaHoy)
        ) {
          return true;
        }

        if (sale.created_at) {

          const fechaCreacion =
            new Date(
              sale.created_at
            ).toLocaleDateString(
              "es-AR"
            );

          return (
            fechaCreacion ===
            fechaHoy
          );
        }

        return false;
      }
    );


  const totalARS =
    ventas
      .filter(
        (sale) =>
          sale.moneda ===
          "ARS"
      )
      .reduce(
        (
          total,
          sale
        ) =>
          total +
          Number(
            sale.monto || 0
          ),
        0
      );


  const totalUSD =
    ventas
      .filter(
        (sale) =>
          sale.moneda ===
          "USD"
      )
      .reduce(
        (
          total,
          sale
        ) =>
          total +
          Number(
            sale.monto || 0
          ),
        0
      );


  const unidadesHoy =
    ventas.reduce(
      (
        total,
        sale
      ) =>
        total +
        Number(
          sale.cantidad || 1
        ),
      0
    );


  const ropa =
    ventas.filter(
      (sale) =>
        sale.categoria ===
        "Ropa"
    ).length;


  const accesorios =
    ventas.filter(
      (sale) =>
        sale.categoria ===
        "Accesorios"
    ).length;


  const metrics =
    document.getElementById(
      "metrics"
    );


  if (metrics) {

    const acumARS =
      todasLasVentas
        .filter(
          (v) =>
            v.moneda ===
            "ARS"
        )
        .reduce(
          (
            a,
            b
          ) =>
            a +
            Number(
              b.monto || 0
            ),
          0
        );


    const acumUSD =
      todasLasVentas
        .filter(
          (v) =>
            v.moneda ===
            "USD"
        )
        .reduce(
          (
            a,
            b
          ) =>
            a +
            Number(
              b.monto || 0
            ),
          0
        );


    const acumBRL =
      todasLasVentas
        .filter(
          (v) =>
            v.moneda ===
            "BRL"
        )
        .reduce(
          (
            a,
            b
          ) =>
            a +
            Number(
              b.monto || 0
            ),
          0
        );


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
          $${totalARS.toLocaleString(
            "es-AR"
          )}
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
          U$D ${totalUSD.toFixed(
            2
          )}
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
          $${acumARS.toLocaleString(
            "es-AR"
          )}
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
          U$D ${acumUSD.toFixed(
            2
          )}
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
          R$ ${acumBRL.toFixed(
            2
          )}
        </div>

        <div class="metric-sub">
          todos los tiempos
        </div>
      </div>

    `;
  }


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


  tbody.innerHTML =
    ventas
      .map(
        (sale) => {

          // ═══════════════════════════════
          // LEEMOS "talle"
          // ═══════════════════════════════

          const talle =
            sale.talle ??
            sale.talla ??
            "";

          return `

            <tr>

              <td>
                ${escapeHTML(
                  sale.hora || ""
                )}
              </td>


              <td>

                ${escapeHTML(
                  sale.producto || ""
                )}

                ${
                  talle
                    ? `
                      <br>

                      <span
                        style="
                          display:inline-block;
                          margin-top:5px;
                          padding:3px 8px;
                          border-radius:6px;
                          background:rgba(212,175,55,.12);
                          color:#d4af37;
                          font-size:12px;
                          font-weight:600;
                        "
                      >
                        Talle:
                        ${escapeHTML(
                          talle
                        )}
                      </span>
                    `
                    : ""
                }


                ${
                  sale.nota
                    ? `
                      <br>

                      <span
                        style="
                          font-size:11px;
                          color:var(--text3)
                        "
                      >
                        ${escapeHTML(
                          sale.nota
                        )}
                      </span>
                    `
                    : ""
                }

              </td>


              <td>

                <span
                  class="tag ${
                    sale.categoria ===
                    "Ropa"
                      ? "tag-ropa"
                      : "tag-accs"
                  }"
                >
                  ${escapeHTML(
                    sale.categoria ||
                    ""
                  )}
                </span>

              </td>


              <td>
                ${Number(
                  sale.cantidad || 1
                )}
              </td>


              <td>

                <span
                  class="tag tag-${String(
                    sale.moneda || ""
                  ).toLowerCase()}"
                >
                  ${escapeHTML(
                    sale.moneda || ""
                  )}
                </span>

              </td>


              <td
                style="font-weight:500"
              >
                ${fmtMonto(
                  sale.moneda,
                  sale.monto
                )}
              </td>


              <td
                style="color:var(--text2)"
              >
                ${escapeHTML(
                  sale.metodo || ""
                )}
              </td>


              <td
                style="color:var(--text2)"
              >
                ${escapeHTML(
                  sale.vendedor || ""
                )}
              </td>

            </tr>

          `;
        }
      )
      .join("");
}


// ══════════════════════════════════════════════
// HISTORIAL
// ══════════════════════════════════════════════

async function loadHistorial() {

  const tbody =
    document.getElementById(
      "hist-tbody"
    );

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


  const vendorFilter =
    document.getElementById(
      "f-vend"
    )?.value || "";


  const categoryFilter =
    document.getElementById(
      "f-cat"
    )?.value || "";


  const currencyFilter =
    document.getElementById(
      "f-cur"
    )?.value || "";


  let query =
    sb
      .from("ventas")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(200);


  if (vendorFilter) {
    query =
      query.eq(
        "vendedor",
        vendorFilter
      );
  }


  if (categoryFilter) {
    query =
      query.eq(
        "categoria",
        categoryFilter
      );
  }


  if (currencyFilter) {
    query =
      query.eq(
        "moneda",
        currencyFilter
      );
  }


  const {
    data,
    error
  } = await query;


  if (error) {

    showToast(
      "Error al cargar historial",
      "fail"
    );

    console.error(error);

    return;
  }


  if (
    !data ||
    !data.length
  ) {

    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          Sin ventas para mostrar.
        </td>
      </tr>
    `;

    return;
  }


  tbody.innerHTML =
    data
      .map(
        (sale) => {

          // ═══════════════════════════════
          // LEEMOS "talle"
          // ═══════════════════════════════

          const talle =
            sale.talle ??
            sale.talla ??
            "";

          return `

            <tr>


              <td
                style="
                  font-size:12px;
                  color:var(--text2);
                "
              >

                ${escapeHTML(
                  sale.fecha || ""
                )}

                ${escapeHTML(
                  sale.hora || ""
                )}

              </td>


              <td>

                ${escapeHTML(
                  sale.producto || ""
                )}


                ${
                  talle
                    ? `
                      <br>

                      <span
                        style="
                          display:inline-block;
                          margin-top:5px;
                          padding:3px 8px;
                          border-radius:6px;
                          background:rgba(212,175,55,.12);
                          color:#d4af37;
                          font-size:12px;
                          font-weight:600;
                        "
                      >
                        Talle:
                        ${escapeHTML(
                          talle
                        )}
                      </span>
                    `
                    : ""
                }


                ${
                  sale.nota
                    ? `
                      <br>

                      <span
                        style="
                          font-size:11px;
                          color:var(--text3)
                        "
                      >
                        ${escapeHTML(
                          sale.nota
                        )}
                      </span>
                    `
                    : ""
                }

              </td>


              <td>

                <span
                  class="tag ${
                    sale.categoria ===
                    "Ropa"
                      ? "tag-ropa"
                      : "tag-accs"
                  }"
                >
                  ${escapeHTML(
                    sale.categoria ||
                    ""
                  )}
                </span>

              </td>


              <td>
                ${Number(
                  sale.cantidad || 1
                )}
              </td>


              <td>

                <span
                  class="tag tag-${String(
                    sale.moneda || ""
                  ).toLowerCase()}"
                >
                  ${escapeHTML(
                    sale.moneda || ""
                  )}
                </span>

              </td>


              <td
                style="font-weight:500"
              >
                ${fmtMonto(
                  sale.moneda,
                  sale.monto
                )}
              </td>


              <td
                style="color:var(--text2)"
              >
                ${escapeHTML(
                  sale.metodo || ""
                )}
              </td>


              <td
                style="color:var(--text2)"
              >
                ${escapeHTML(
                  sale.vendedor || ""
                )}
              </td>


            </tr>

          `;
        }
      )
      .join("");
}