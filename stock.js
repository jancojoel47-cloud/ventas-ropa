// ══════════════════════════════════════════════
// STOCK.JS
// ══════════════════════════════════════════════


// ══════════════════════════════════════════════
// AGREGAR PRODUCTO AL STOCK
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

  const tallesList =
    document.getElementById(
      "stock-talles-list"
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
    !tallesList
  ) {

    console.error(
      "No se encontraron los campos del formulario de stock."
    );

    if (errorBox) {
      errorBox.textContent =
        "No se pudo cargar el formulario de stock.";
    }

    return;
  }


  const nombre =
    nombreInput.value.trim();

  const categoria =
    categoriaInput.value;


  // ════════════════════════════════════════════
  // VALIDAR NOMBRE
  // ════════════════════════════════════════════

  if (!nombre) {

    if (errorBox) {
      errorBox.textContent =
        "Ingresá el nombre del producto.";
    }

    return;
  }


  // ════════════════════════════════════════════
  // LEER TODOS LOS TALLES
  // ════════════════════════════════════════════

  const filas =
    Array.from(
      tallesList.querySelectorAll(
        ".stock-talle-row"
      )
    );


  const talles = [];


  for (const fila of filas) {

    const talleInput =
      fila.querySelector(
        ".stock-talle-input"
      );

    const cantidadInput =
      fila.querySelector(
        ".stock-talle-cantidad"
      );


    if (
      !talleInput ||
      !cantidadInput
    ) {
      continue;
    }


    const talle =
      talleInput.value.trim();

    const cantidad =
      parseInt(
        cantidadInput.value,
        10
      );


    // Fila completamente vacía.
    if (
      !talle &&
      (
        cantidadInput.value === "" ||
        cantidad === 0
      )
    ) {
      continue;
    }


    // Falta el talle.
    if (!talle) {

      if (errorBox) {
        errorBox.textContent =
          "Completá el nombre de todos los talles.";
      }

      return;
    }


    // Cantidad inválida.
    if (
      !Number.isInteger(cantidad) ||
      cantidad < 0
    ) {

      if (errorBox) {
        errorBox.textContent =
          "Ingresá una cantidad válida para el talle " +
          talle +
          ".";
      }

      return;
    }


    talles.push({
      talle,
      cantidad
    });
  }


  // ════════════════════════════════════════════
  // DEBE EXISTIR AL MENOS UN TALLE
  // ════════════════════════════════════════════

  if (!talles.length) {

    if (errorBox) {
      errorBox.textContent =
        "Agregá al menos un talle con su cantidad.";
    }

    return;
  }


  // ════════════════════════════════════════════
  // EVITAR TALLES REPETIDOS
  // ════════════════════════════════════════════

  const tallesNormalizados =
    talles.map(
      item =>
        item.talle
          .toLowerCase()
          .trim()
    );


  const tallesDuplicados =
    tallesNormalizados.filter(
      (talle, index) =>
        tallesNormalizados.indexOf(talle) !== index
    );


  if (tallesDuplicados.length) {

    if (errorBox) {
      errorBox.textContent =
        "No podés repetir el mismo talle.";
    }

    return;
  }


  // ════════════════════════════════════════════
  // CALCULAR STOCK TOTAL
  // ════════════════════════════════════════════

  const cantidadTotal =
    talles.reduce(
      (total, item) =>
        total + item.cantidad,
      0
    );


  // ════════════════════════════════════════════
  // SUBIR IMAGEN
  // ════════════════════════════════════════════

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
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .substring(2) +
      "." +
      extension;


    const filePath =
      "productos/" +
      fileName;


    const {
      error: uploadError
    } =
      await sb.storage
        .from("productos")
        .upload(
          filePath,
          file,
          {
            cacheControl: "3600",
            upsert: false
          }
        );


    if (uploadError) {

      console.error(
        "Error subiendo imagen:",
        uploadError
      );

      if (errorBox) {
        errorBox.textContent =
          "No se pudo subir la imagen.";
      }

      return;
    }


    const {
      data: publicUrlData
    } =
      sb.storage
        .from("productos")
        .getPublicUrl(
          filePath
        );


    imagenUrl =
      publicUrlData?.publicUrl ||
      null;
  }


  // ════════════════════════════════════════════
  // CREAR PRODUCTO EN STOCK
  // ════════════════════════════════════════════

  const {
    data: producto,
    error: productoError
  } =
    await sb
      .from("stock")
      .insert([
        {
          nombre,
          categoria,
          cantidad: cantidadTotal,
          imagen_url: imagenUrl
        }
      ])
      .select()
      .single();


  if (productoError) {

    console.error(
      "Error creando producto:",
      productoError
    );

    if (errorBox) {
      errorBox.textContent =
        "No se pudo agregar el producto.";
    }

    return;
  }


  // ════════════════════════════════════════════
  // CREAR TALLES DEL PRODUCTO
  // ════════════════════════════════════════════

  const tallesParaInsertar =
    talles.map(
      item => ({
        producto_id: producto.id,
        talle: item.talle,
        cantidad: item.cantidad
      })
    );


  const {
    error: tallesError
  } =
    await sb
      .from("producto_talles")
      .insert(
        tallesParaInsertar
      );


  // ════════════════════════════════════════════
  // SI FALLAN LOS TALLES,
  // ELIMINAR EL PRODUCTO CREADO
  // ════════════════════════════════════════════

  if (tallesError) {

    console.error(
      "Error creando talles:",
      tallesError
    );


    await sb
      .from("stock")
      .delete()
      .eq(
        "id",
        producto.id
      );


    if (errorBox) {
      errorBox.textContent =
        "No se pudieron guardar los talles del producto.";
    }

    return;
  }


  // ════════════════════════════════════════════
  // LIMPIAR FORMULARIO
  // ════════════════════════════════════════════

  nombreInput.value = "";


  // Dejamos una fila inicial.
  tallesList.innerHTML = `
    <div class="stock-talle-row">

      <input
        type="text"
        class="stock-talle-input"
        placeholder="Talle (ej: 38, M, XL)"
      />

      <input
        type="number"
        class="stock-talle-cantidad"
        min="0"
        step="1"
        value="0"
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

    </div>
  `;


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


  if (errorBox) {
    errorBox.textContent = "";
  }


  showToast(
    "✓ Producto agregado al stock",
    "ok"
  );


  // Actualizar stock.
  await loadStock();


  // Actualizar productos de venta.
  await loadProductOptions();
}


// ══════════════════════════════════════════════
// AGREGAR FILA DE TALLE
// ══════════════════════════════════════════════

function agregarFilaTalle() {

  const list =
    document.getElementById(
      "stock-talles-list"
    );


  if (!list) {
    return;
  }


  const row =
    document.createElement(
      "div"
    );


  row.className =
    "stock-talle-row";


  row.innerHTML = `
    <input
      type="text"
      class="stock-talle-input"
      placeholder="Talle (ej: 38, M, XL)"
    />

    <input
      type="number"
      class="stock-talle-cantidad"
      min="0"
      step="1"
      value="0"
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


  list.appendChild(row);
}


// ══════════════════════════════════════════════
// ELIMINAR FILA DE TALLE
// ══════════════════════════════════════════════

function eliminarFilaTalle(button) {

  const list =
    document.getElementById(
      "stock-talles-list"
    );


  if (
    !list ||
    !button
  ) {
    return;
  }


  const row =
    button.closest(
      ".stock-talle-row"
    );


  if (!row) {
    return;
  }


  const rows =
    list.querySelectorAll(
      ".stock-talle-row"
    );


  // Siempre dejamos al menos una fila.
  if (rows.length <= 1) {

    const talleInput =
      row.querySelector(
        ".stock-talle-input"
      );


    const cantidadInput =
      row.querySelector(
        ".stock-talle-cantidad"
      );


    if (talleInput) {
      talleInput.value = "";
    }


    if (cantidadInput) {
      cantidadInput.value = "0";
    }


    return;
  }


  row.remove();
}


// ══════════════════════════════════════════════
// CARGAR STOCK
// ══════════════════════════════════════════════

async function loadStock() {

  const wrapper =
    document.getElementById(
      "stock-cols"
    );


  if (!wrapper) {

    console.warn(
      "No existe #stock-cols"
    );

    return;
  }


  wrapper.innerHTML = `
    <div class="loader">
      <div class="spinner"></div>
      Cargando...
    </div>
  `;


  const {
    data,
    error
  } =
    await sb
      .from("stock")
      .select("*")
      .order("categoria")
      .order("nombre");


  if (error) {

    console.error(
      "Error cargando stock:",
      error
    );


    wrapper.innerHTML = `
      <p
        style="
          color:var(--red);
          padding:16px
        "
      >
        Error al cargar stock.
      </p>
    `;


    return;
  }


  const products =
    data || [];


  // ════════════════════════════════════════════
  // CARGAR TALLES DE TODOS LOS PRODUCTOS
  // ════════════════════════════════════════════

  const productIds =
    products.map(
      product =>
        product.id
    );


  let tallesPorProducto = {};


  if (productIds.length) {

    const {
      data: tallesData,
      error: tallesError
    } =
      await sb
        .from("producto_talles")
        .select(
          "id, producto_id, talle, cantidad"
        )
        .in(
          "producto_id",
          productIds
        )
        .order("id");


    if (tallesError) {

      console.error(
        "Error cargando talles:",
        tallesError
      );

    } else {

      (tallesData || [])
        .forEach(
          talle => {

            if (
              !tallesPorProducto[
                talle.producto_id
              ]
            ) {

              tallesPorProducto[
                talle.producto_id
              ] = [];
            }


            tallesPorProducto[
              talle.producto_id
            ].push(
              talle
            );
          }
        );
    }
  }


  const productsWithTalles =
    products.map(
      product => ({
        ...product,

        talles:
          tallesPorProducto[
            product.id
          ] || []
      })
    );


  // ════════════════════════════════════════════
  // CATEGORÍAS
  // ════════════════════════════════════════════

  const categories = [
    "Ropa",
    "Accesorios"
  ];


  wrapper.innerHTML =
    categories
      .map(
        category => {

          const items =
            productsWithTalles.filter(
              product =>
                product.categoria ===
                category
            );


          return `
            <div
              class="stock-section"
              data-category="${escapeHTML(category)}"
            >

              <p class="stock-category-title">
                ${escapeHTML(category)}
              </p>

              <div
                class="stock-grid-cards"
                id="grid-${escapeHTML(category)}"
              >

                ${
                  items.length
                    ? items
                        .map(
                          product =>
                            stockCardHTML(
                              product
                            )
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
        }
      )
      .join("");


  window._stockData =
    productsWithTalles;
}


// ══════════════════════════════════════════════
// TARJETA DE PRODUCTO
// ══════════════════════════════════════════════

function stockCardHTML(product) {

  const cantidad =
    Number(
      product.cantidad || 0
    );


  const imagen =
    product.imagen_url;


  const talles =
    Array.isArray(
      product.talles
    )
      ? product.talles
      : [];


  const tallesHTML =
    talles.length
      ? `
        <div class="stock-card-talles">

          ${talles
            .map(
              item => `
                <span class="stock-card-talle">

                  <strong>
                    ${escapeHTML(
                      item.talle
                    )}
                  </strong>

                  <span>
                    ${Number(
                      item.cantidad || 0
                    )}
                    u.
                  </span>

                </span>
              `
            )
            .join("")}

        </div>
      `
      : `
        <div
          style="
            margin-top:8px;
            color:var(--text2);
            font-size:12px;
          "
        >
          Sin talles configurados
        </div>
      `;


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
                object-fit:contain;
                background:var(--surface2);
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
        Stock total
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


      ${tallesHTML}


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
// CAMBIAR STOCK MANUALMENTE
// ══════════════════════════════════════════════

async function editarCantidadStock(id) {

  const {
    data: producto,
    error
  } =
    await sb
      .from("stock")
      .select(
        "id, nombre"
      )
      .eq(
        "id",
        id
      )
      .single();


  if (
    error ||
    !producto
  ) {

    showToast(
      "No se pudo consultar el producto",
      "fail"
    );

    return;
  }


  // ════════════════════════════════════════════
  // CARGAR TALLES
  // ════════════════════════════════════════════

  const {
    data: talles,
    error: tallesError
  } =
    await sb
      .from("producto_talles")
      .select(
        "id, talle, cantidad"
      )
      .eq(
        "producto_id",
        id
      )
      .order("id");


  if (tallesError) {

    console.error(
      tallesError
    );

    showToast(
      "No se pudieron consultar los talles",
      "fail"
    );

    return;
  }


  // ════════════════════════════════════════════
  // PRODUCTO CON TALLES
  // ════════════════════════════════════════════

  if (
    talles &&
    talles.length
  ) {

    for (
      const item of talles
    ) {

      const nueva =
        prompt(
          "Nueva cantidad para talle " +
          item.talle +
          ":",
          item.cantidad
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
          "Cantidad inválida para " +
          item.talle,
          "fail"
        );

        return;
      }


      const {
        error: updateError
      } =
        await sb
          .from("producto_talles")
          .update({
            cantidad
          })
          .eq(
            "id",
            item.id
          );


      if (updateError) {

        console.error(
          updateError
        );

        showToast(
          "No se pudo actualizar el talle",
          "fail"
        );

        return;
      }
    }


    // ══════════════════════════════════════════
    // RECALCULAR STOCK TOTAL
    // ══════════════════════════════════════════

    const {
      data: tallesActualizados
    } =
      await sb
        .from("producto_talles")
        .select(
          "cantidad"
        )
        .eq(
          "producto_id",
          id
        );


    const total =
      (
        tallesActualizados || []
      )
        .reduce(
          (
            sum,
            item
          ) =>
            sum +
            Number(
              item.cantidad || 0
            ),
          0
        );


    await sb
      .from("stock")
      .update({
        cantidad: total
      })
      .eq(
        "id",
        id
      );

  } else {

    // ══════════════════════════════════════════
    // PRODUCTO ANTIGUO / SIN TALLES
    // ══════════════════════════════════════════

    const {
      data
    } =
      await sb
        .from("stock")
        .select(
          "cantidad"
        )
        .eq(
          "id",
          id
        )
        .single();


    const actual =
      Number(
        data?.cantidad || 0
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
      error: updateError
    } =
      await sb
        .from("stock")
        .update({
          cantidad
        })
        .eq(
          "id",
          id
        );


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
  }


  await loadStock();

  await loadProductOptions();


  showToast(
    "✓ Stock actualizado",
    "ok"
  );
}


// ══════════════════════════════════════════════
// BUSCAR STOCK
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
    "Accesorios"
  ];


  categories.forEach(
    category => {

      const grid =
        document.getElementById(
          "grid-" +
          category
        );


      if (!grid) {
        return;
      }


      const filtered =
        products.filter(
          product => {

            if (
              product.categoria !==
              category
            ) {
              return false;
            }


            const nombre =
              String(
                product.nombre || ""
              )
                .toLowerCase();


            if (
              nombre.includes(
                query
              )
            ) {
              return true;
            }


            const talles =
              Array.isArray(
                product.talles
              )
                ? product.talles
                : [];


            return talles.some(
              item =>
                String(
                  item.talle || ""
                )
                  .toLowerCase()
                  .includes(
                    query
                  )
            );
          }
        );


      grid.innerHTML =
        filtered.length
          ? filtered
              .map(
                product =>
                  stockCardHTML(
                    product
                  )
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
// ELIMINAR PRODUCTO
// ══════════════════════════════════════════════

async function deleteStock(id) {

  if (
    !confirm(
      "¿Eliminar este producto del stock?"
    )
  ) {
    return;
  }


  // Primero eliminamos los talles.
  const {
    error: tallesError
  } =
    await sb
      .from("producto_talles")
      .delete()
      .eq(
        "producto_id",
        id
      );


  if (tallesError) {

    console.error(
      "Error eliminando talles:",
      tallesError
    );

    showToast(
      "No se pudieron eliminar los talles",
      "fail"
    );

    return;
  }


  // Después eliminamos el producto.
  const {
    error
  } =
    await sb
      .from("stock")
      .delete()
      .eq(
        "id",
        id
      );


  if (error) {

    console.error(
      error
    );

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


// ══════════════════════════════════════════════
// BUSCADOR DE STOCK
// ══════════════════════════════════════════════

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const stockSearch =
      document.getElementById(
        "stock-search"
      );


    if (stockSearch) {

      stockSearch.addEventListener(
        "input",
        () => {
          filtrarStock();
        }
      );
    }
  }
);


// ══════════════════════════════════════════════
// HACER FUNCIONES DISPONIBLES PARA HTML
// ══════════════════════════════════════════════

window.agregarProductoStock =
  agregarProductoStock;


window.agregarFilaTalle =
  agregarFilaTalle;


window.eliminarFilaTalle =
  eliminarFilaTalle;


window.loadStock =
  loadStock;


window.editarCantidadStock =
  editarCantidadStock;


window.filtrarStock =
  filtrarStock;


window.deleteStock =
  deleteStock;