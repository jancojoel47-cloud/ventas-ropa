// ══════════════════════════════════════════════
// STOCK.JS
// ══════════════════════════════════════════════

async function agregarProductoStock() {
  const nombreInput =
    document.getElementById(
      "stock-nombre"
    );

  const categoriaInput =
    document.getElementById(
      "stock-categoria"
    );

  const tallaInput =
    document.getElementById(
      "stock-talla"
    );

  const cantidadInput =
    document.getElementById(
      "stock-cantidad"
    );

  const imagenInput =
    document.getElementById(
      "stock-imagen"
    );

  const errorBox =
    document.getElementById(
      "stock-add-error"
    );

  if (errorBox) {
    errorBox.textContent = "";
  }

  if (
    !nombreInput ||
    !categoriaInput ||
    !tallaInput ||
    !cantidadInput
  ) {
    return;
  }

  const nombre =
    nombreInput.value.trim();

  const categoria =
    categoriaInput.value;

  const talla =
    tallaInput.value.trim();

  const cantidad =
    parseInt(
      cantidadInput.value,
      10
    );

  if (!nombre) {
    if (errorBox) {
      errorBox.textContent =
        "Ingresá el nombre del producto.";
    }

    return;
  }

  if (
    !Number.isInteger(cantidad) ||
    cantidad < 0
  ) {
    if (errorBox) {
      errorBox.textContent =
        "Ingresá una cantidad válida.";
    }

    return;
  }

  // --------------------------------------------
  // IMAGEN
  // --------------------------------------------

  let imagenUrl = null;

  if (
    imagenInput &&
    imagenInput.files &&
    imagenInput.files.length
  ) {
    const file =
      imagenInput.files[0];

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      if (errorBox) {
        errorBox.textContent =
          "La imagen no puede superar los 5 MB.";
      }

      return;
    }

    const extension =
      file.name
        .split(".")
        .pop()
        .toLowerCase();

    const fileName =
      `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${extension}`;

    const filePath =
      `productos/${fileName}`;

    const {
      error: uploadError,
    } = await sb.storage
      .from("productos")
      .upload(
        filePath,
        file,
        {
          cacheControl: "3600",
          upsert: false,
        }
      );

    if (uploadError) {
      console.error(
        uploadError
      );

      if (errorBox) {
        errorBox.textContent =
          "No se pudo subir la imagen.";
      }

      return;
    }

    const {
      data: publicUrlData,
    } = sb.storage
      .from("productos")
      .getPublicUrl(filePath);

    imagenUrl =
      publicUrlData.publicUrl;
  }

  // --------------------------------------------
  // INSERTAR PRODUCTO
  // --------------------------------------------

  const {
    error,
  } = await sb
    .from("stock")
    .insert([
      {
        nombre,
        categoria,
        talla: talla || null,
        cantidad,
        imagen_url: imagenUrl,
      },
    ]);

  if (error) {
    console.error(error);

    if (errorBox) {
      errorBox.textContent =
        "No se pudo agregar el producto.";
    }

    return;
  }

  // --------------------------------------------
  // LIMPIAR FORMULARIO
  // --------------------------------------------

  nombreInput.value = "";
  tallaInput.value = "";
  cantidadInput.value = "0";

  if (imagenInput) {
    imagenInput.value = "";
  }

  const fileName =
    document.getElementById(
      "stock-file-name"
    );

  if (fileName) {
    fileName.textContent =
      "Ninguna imagen seleccionada";
  }

  showToast(
    "✓ Producto agregado al stock",
    "ok"
  );

  await loadStock();

  await loadProductOptions();
}


// ══════════════════════════════════════════════
// CARGAR STOCK
// ══════════════════════════════════════════════

async function loadStock() {
  const wrapper =
    document.getElementById(
      "stock-cols"
    );

  if (!wrapper) return;

  wrapper.innerHTML = `
    <div class="loader">
      <div class="spinner"></div>
      Cargando...
    </div>
  `;

  const {
    data,
    error,
  } = await sb
    .from("stock")
    .select("*")
    .order("categoria")
    .order("nombre");

  if (error) {
    console.error(error);

    wrapper.innerHTML = `
      <p style="color:var(--red);padding:16px">
        Error al cargar stock.
      </p>
    `;

    return;
  }

  const products =
    data || [];

  const categories = [
    "Ropa",
    "Accesorios",
  ];

  wrapper.innerHTML =
    categories
      .map((category) => {
        const items =
          products.filter(
            (p) =>
              p.categoria ===
              category
          );

        return `
          <div
            class="stock-section"
            data-category="${category}"
          >

            <p class="stock-category-title">
              ${category}
            </p>

            <div
              class="stock-grid-cards"
              id="grid-${category}"
            >
              ${
                items.length
                  ? items
                      .map(
                        (p) =>
                          stockCardHTML(p)
                      )
                      .join("")
                  : `
                    <p class="empty">
                      Sin productos.
                    </p>
                  `
              }
            </div>

          </div>
        `;
      })
      .join("");

  window._stockData =
    products;
}


// ══════════════════════════════════════════════
// TARJETA DE PRODUCTO
// ══════════════════════════════════════════════

function stockCardHTML(product) {
  const talla =
    product.talla ||
    "Sin talle";

  const cantidad =
    Number(
      product.cantidad || 0
    );

  const imagen =
    product.imagen_url;

  return `
    <div
      class="stock-card ${
        cantidad <= 2
          ? "low-stock"
          : ""
      }"
      data-name="${escapeHTML(
        product.nombre
      )}"
    >

      ${
        imagen
          ? `
            <img
              src="${escapeHTML(
                imagen
              )}"
              alt="${escapeHTML(
                product.nombre
              )}"
              style="
                width:100%;
                height:180px;
                object-fit:cover;
                border-radius:12px;
                margin-bottom:12px;
              "
            >
          `
          : ""
      }

      <div class="stock-card-name">
        ${escapeHTML(
          product.nombre
        )}
      </div>

      <div
        style="
          margin-top:5px;
          color:var(--text2);
          font-size:13px;
        "
      >
        Talle: ${escapeHTML(
          talla
        )}
      </div>

      <div
        class="stock-card-qty ${
          cantidad <= 2
            ? "low"
            : ""
        }"
      >
        ${cantidad}
      </div>

      <div
        style="
          font-size:12px;
          color:var(--text3);
          margin-top:3px;
        "
      >
        unidades disponibles
      </div>

      <div
        class="stock-card-controls"
        style="margin-top:12px"
      >

        <button
          class="btn-qty"
          onclick="editarCantidadStock(${product.id})"
          title="Cambiar cantidad"
        >
          ✎
        </button>

        <button
          class="btn-del"
          onclick="deleteStock(${product.id})"
          title="Eliminar"
        >
          ×
        </button>

      </div>

    </div>
  `;
}


// ══════════════════════════════════════════════
// CAMBIAR CANTIDAD MANUALMENTE
// ══════════════════════════════════════════════

async function editarCantidadStock(id) {
  const {
    data,
    error,
  } = await sb
    .from("stock")
    .select("cantidad")
    .eq("id", id)
    .single();

  if (error || !data) {
    showToast(
      "No se pudo consultar el stock",
      "fail"
    );

    return;
  }

  const actual =
    Number(
      data.cantidad || 0
    );

  const nueva =
    prompt(
      "Ingresá la nueva cantidad:",
      actual
    );

  if (
    nueva === null
  ) {
    return;
  }

  const cantidad =
    parseInt(
      nueva,
      10
    );

  if (
    !Number.isInteger(
      cantidad
    ) ||
    cantidad < 0
  ) {
    showToast(
      "Ingresá una cantidad válida",
      "fail"
    );

    return;
  }

  const {
    error: updateError,
  } = await sb
    .from("stock")
    .update({
      cantidad,
    })
    .eq("id", id);

  if (updateError) {
    console.error(
      updateError
    );

    showToast(
      "No se pudo actualizar el stock",
      "fail"
    );

    return;
  }

  await loadStock();
  await loadProductOptions();

  showToast(
    "✓ Stock actualizado",
    "ok"
  );
}


// ══════════════════════════════════════════════
// BUSCAR
// ══════════════════════════════════════════════

function filtrarStock() {
  const input =
    document.getElementById(
      "stock-search"
    );

  const query =
    input?.value
      .toLowerCase()
      .trim() || "";

  const products =
    window._stockData || [];

  const categories = [
    "Ropa",
    "Accesorios",
  ];

  categories.forEach(
    (category) => {
      const grid =
        document.getElementById(
          "grid-" + category
        );

      if (!grid) return;

      const filtered =
        products.filter(
          (p) =>
            p.categoria ===
              category &&
            (
              p.nombre
                .toLowerCase()
                .includes(query) ||
              String(
                p.talla || ""
              )
                .toLowerCase()
                .includes(query)
            )
        );

      grid.innerHTML =
        filtered.length
          ? filtered
              .map(
                (p) =>
                  stockCardHTML(p)
              )
              .join("")
          : `
              <p class="empty">
                Sin resultados.
              </p>
            `;
    }
  );
}


// ══════════════════════════════════════════════
// ELIMINAR
// ══════════════════════════════════════════════

async function deleteStock(id) {
  if (
    !confirm(
      "¿Eliminar este producto del stock?"
    )
  ) {
    return;
  }

  const {
    error,
  } = await sb
    .from("stock")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);

    showToast(
      "No se pudo eliminar el producto",
      "fail"
    );

    return;
  }

  await loadStock();
  await loadProductOptions();

  showToast(
    "Producto eliminado",
    "ok"
  );
}


// ══════════════════════════════════════════════
// NOMBRE DEL ARCHIVO DE IMAGEN
// ══════════════════════════════════════════════

document.addEventListener(
  "DOMContentLoaded",
  () => {
    const input =
      document.getElementById(
        "stock-imagen"
      );

    const fileName =
      document.getElementById(
        "stock-file-name"
      );

    if (
      input &&
      fileName
    ) {
      input.addEventListener(
        "change",
        () => {
          fileName.textContent =
            input.files &&
            input.files.length
              ? input.files[0].name
              : "Ninguna imagen seleccionada";
        }
      );
    }
  }
);