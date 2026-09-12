// ══════════════════════════════════════════════
//  CONFIGURACIÓN SUPABASE
// ══════════════════════════════════════════════
const SUPABASE_URL = 'https://wnaxkfnkhwveamrswwim.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nnJa7QKdYLiwxKEyvos9qg_YNRUU185';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

// ══════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════
function todayStr() {
  return new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function nowTime() {
  return new Date().toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' });
}
function fmtMonto(cur, amt) {
  if (cur === 'ARS') return '$' + Number(amt).toLocaleString('es-AR');
  if (cur === 'USD') return 'U$D ' + Number(amt).toFixed(2);
  if (cur === 'BRL') return 'R$ ' + Number(amt).toFixed(2);
  return amt;
}
function showToast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.className = 'toast', 3000);
}
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ══════════════════════════════════════════════
//  LOGIN / LOGOUT
// ══════════════════════════════════════════════
document.getElementById('inp-pass').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

// ── MOSTRAR/OCULTAR CONTRASEÑA ──
function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  const svgs = btn.querySelectorAll('svg');
  if (inp.type === 'password') {
    inp.type = 'text';
    svgs[0].style.display = 'none';
    svgs[1].style.display = 'block';
  } else {
    inp.type = 'password';
    svgs[0].style.display = 'block';
    svgs[1].style.display = 'none';
  }
}

// ── LOGIN CON SUPABASE ──
async function doLogin() {
  const u = document.getElementById('inp-user').value.trim().toLowerCase();
  const p = document.getElementById('inp-pass').value;
  const err = document.getElementById('login-err');
  const btn = document.querySelector('#screen-login .btn-accent');
  err.textContent = '';
  if (!u || !p) { err.textContent = 'Completá los campos.'; return; }

  btn.textContent = 'Entrando...';
  btn.disabled = true;

  const { data, error } = await sb
    .from('usuarios')
    .select('*')
    .eq('usuario', u)
    .eq('password', p)
    .single();

  btn.textContent = 'Entrar';
  btn.disabled = false;

  if (error || !data) {
    err.textContent = 'Usuario o contraseña incorrectos.';
    return;
  }

  currentUser = { id: data.id, usuario: data.usuario, display: data.nombre, rol: data.rol };
  document.getElementById('vendor-chip').textContent = currentUser.display;

  // Mostrar tab Usuarios solo si es admin
  const esAdmin = currentUser.rol === 'admin';
  document.getElementById('tab-btn-usuarios').style.display = esAdmin ? 'inline-block' : 'none';
  document.getElementById('mob-tab-btn-usuarios').style.display = esAdmin ? 'inline-block' : 'none';

  showScreen('screen-app');
  loadDashboard();
}

// ── USUARIOS (admin) ──
async function loadUsuarios() {
  const grid = document.getElementById('users-grid');
  grid.innerHTML = `<div class="loader"><div class="spinner"></div> Cargando...</div>`;
  const { data, error } = await sb.from('usuarios').select('*').order('created_at');
  if (error) { grid.innerHTML = '<p style="color:var(--red);padding:16px">Error al cargar usuarios.</p>'; return; }
  grid.innerHTML = data.map(u => `
    <div class="user-card">
      <div class="user-info">
        <span class="user-name">${u.nombre}</span>
        <span class="user-meta">@${u.usuario}</span>
        <span class="tag ${u.rol === 'admin' ? 'tag-admin' : 'tag-vendedor'}" style="margin-top:4px;width:fit-content">${u.rol}</span>
      </div>
      ${u.usuario !== 'admin' ? `<button class="btn-del-user" onclick="deleteUsuario(${u.id}, '${u.nombre}')" title="Eliminar">×</button>` : ''}
    </div>
  `).join('');
}

async function crearUsuario() {
  const nombre  = document.getElementById('u-nombre').value.trim();
  const usuario = document.getElementById('u-usuario').value.trim().toLowerCase();
  const pass    = document.getElementById('u-pass').value;
  const rol     = document.getElementById('u-rol').value;
  const err     = document.getElementById('u-err');
  const btn     = document.getElementById('u-btn');
  err.textContent = '';
  if (!nombre || !usuario || !pass) { err.textContent = 'Completá todos los campos.'; return; }
  if (pass.length < 4) { err.textContent = 'La contraseña debe tener al menos 4 caracteres.'; return; }

  btn.textContent = 'Creando...';
  btn.disabled = true;

  const { error } = await sb.from('usuarios').insert([{ nombre, usuario, password: pass, rol }]);

  btn.textContent = 'Crear usuario';
  btn.disabled = false;

  if (error) {
    err.textContent = error.code === '23505' ? 'Ese nombre de usuario ya existe.' : 'Error al crear usuario.';
    return;
  }

  document.getElementById('u-nombre').value = '';
  document.getElementById('u-usuario').value = '';
  document.getElementById('u-pass').value = '';
  showToast('✓ Usuario creado', 'ok');
  loadUsuarios();
}

async function deleteUsuario(id, nombre) {
  if (!confirm(`¿Eliminar al usuario "${nombre}"?`)) return;
  await sb.from('usuarios').delete().eq('id', id);
  showToast('Usuario eliminado', 'ok');
  loadUsuarios();
}

function doLogout() {
  currentUser = null;
  document.getElementById('inp-user').value = '';
  document.getElementById('inp-pass').value = '';
  showScreen('screen-login');
}

// ══════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════
function goTab(tab, btn) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  // mark all matching buttons (desktop + mobile)
  document.querySelectorAll('.nav-tab').forEach(t => {
    if (t.getAttribute('onclick') === btn.getAttribute('onclick')) t.classList.add('active');
  });
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  if (tab === 'dashboard') loadDashboard();
  if (tab === 'stock')     loadStock();
  if (tab === 'historial') loadHistorial();
  if (tab === 'usuarios')  loadUsuarios();
}

// ══════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════
async function loadDashboard() {
  const tbody = document.getElementById('today-tbody');
  tbody.innerHTML = `<tr><td colspan="7" class="empty"><div class="loader"><div class="spinner"></div> Cargando...</div></td></tr>`;

  const today = todayStr();
  const { data, error } = await sb
    .from('ventas')
    .select('*')
    .eq('fecha', today)
    .order('created_at', { ascending: false });

  if (error) { showToast('Error al cargar datos', 'fail'); return; }

  // metrics
  const totalARS = data.filter(s => s.moneda === 'ARS').reduce((a, b) => a + Number(b.monto), 0);
  const totalUSD = data.filter(s => s.moneda === 'USD').reduce((a, b) => a + Number(b.monto), 0);
  const ropa = data.filter(s => s.categoria === 'Ropa').length;
  const accs = data.filter(s => s.categoria === 'Accesorios').length;

  document.getElementById('metrics').innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Ventas hoy</div>
      <div class="metric-val">${data.length}</div>
      <div class="metric-sub">total del día</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Ingresos ARS</div>
      <div class="metric-val">$${totalARS.toLocaleString('es-AR')}</div>
      <div class="metric-sub">pesos argentinos</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Ingresos USD</div>
      <div class="metric-val">U$D ${totalUSD.toFixed(2)}</div>
      <div class="metric-sub">dólares</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Ropa / Accesorios</div>
      <div class="metric-val">${ropa} / ${accs}</div>
      <div class="metric-sub">por categoría</div>
    </div>
  `;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Sin ventas cargadas hoy.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(s => `
    <tr>
      <td>${s.hora}</td>
      <td>
        ${s.producto}
        ${s.nota ? `<br><span style="font-size:11px;color:var(--text3)">${s.nota}</span>` : ''}
      </td>
      <td><span class="tag ${s.categoria === 'Ropa' ? 'tag-ropa' : 'tag-accs'}">${s.categoria}</span></td>
      <td><span class="tag tag-${s.moneda.toLowerCase()}">${s.moneda}</span></td>
      <td style="font-weight:500">${fmtMonto(s.moneda, s.monto)}</td>
      <td style="color:var(--text2)">${s.metodo}</td>
      <td style="color:var(--text2)">${s.vendedor}</td>
    </tr>
  `).join('');
}

// ══════════════════════════════════════════════
//  CARGAR VENTA
// ══════════════════════════════════════════════
async function submitVenta() {
  const prod = document.getElementById('v-prod').value.trim();
  const cat  = document.getElementById('v-cat').value;
  const cur  = document.getElementById('v-cur').value;
  const amt  = parseFloat(document.getElementById('v-amt').value);
  const met  = document.getElementById('v-met').value;
  const nota = document.getElementById('v-nota').value.trim();
  const err  = document.getElementById('v-err');
  const btn  = document.getElementById('v-btn');
  err.textContent = '';

  if (!prod) { err.textContent = 'Ingresá el nombre del producto.'; return; }
  if (!amt || amt <= 0) { err.textContent = 'Ingresá un monto válido.'; return; }

  btn.textContent = 'Guardando...';
  btn.disabled = true;

  const { error } = await sb.from('ventas').insert([{
    fecha: todayStr(),
    hora: nowTime(),
    producto: prod,
    categoria: cat,
    moneda: cur,
    monto: amt,
    metodo: met,
    nota: nota || null,
    vendedor: currentUser.display
  }]);

  btn.textContent = 'Registrar venta';
  btn.disabled = false;

  if (error) { err.textContent = 'Error al guardar. Intentá de nuevo.'; return; }

  document.getElementById('v-prod').value = '';
  document.getElementById('v-amt').value  = '';
  document.getElementById('v-nota').value = '';
  showToast('✓ Venta registrada', 'ok');
}

// ══════════════════════════════════════════════
//  STOCK
// ══════════════════════════════════════════════
async function loadStock() {
  const wrap = document.getElementById('stock-cols');
  wrap.innerHTML = `<div class="loader"><div class="spinner"></div> Cargando...</div>`;

  const { data, error } = await sb.from('stock').select('*').order('categoria').order('nombre');
  if (error) { wrap.innerHTML = '<p style="color:var(--red);padding:16px">Error al cargar stock.</p>'; return; }

  const cats = ['Ropa', 'Accesorios'];
  wrap.innerHTML = cats.map(cat => {
    const items = data.filter(i => i.categoria === cat);
    return `
      <div class="stock-box">
        <h3>${cat}</h3>
        ${items.map(item => `
          <div class="stock-row">
            <span class="stock-name">${item.nombre}</span>
            <div class="stock-controls">
              <button class="btn-qty" onclick="changeStock(${item.id}, -1)">−</button>
              <span class="stock-qty ${item.cantidad <= 2 ? 'low' : ''}">${item.cantidad}</span>
              <button class="btn-qty" onclick="changeStock(${item.id}, 1)">+</button>
              <button class="btn-del" onclick="deleteStock(${item.id})" title="Eliminar">×</button>
            </div>
          </div>
        `).join('')}
        <div class="add-row">
          <input type="text" id="new-${cat}" placeholder="Nuevo producto...">
          <button class="btn-outline" onclick="addStock('${cat}')">Agregar</button>
        </div>
      </div>
    `;
  }).join('');
}

async function changeStock(id, delta) {
  const { data } = await sb.from('stock').select('cantidad').eq('id', id).single();
  const newQty = Math.max(0, data.cantidad + delta);
  await sb.from('stock').update({ cantidad: newQty }).eq('id', id);
  loadStock();
}

async function deleteStock(id) {
  if (!confirm('¿Eliminar este producto del stock?')) return;
  await sb.from('stock').delete().eq('id', id);
  loadStock();
}

async function addStock(cat) {
  const inp = document.getElementById('new-' + cat);
  const name = inp.value.trim();
  if (!name) return;
  await sb.from('stock').insert([{ nombre: name, categoria: cat, cantidad: 0 }]);
  inp.value = '';
  loadStock();
  showToast('Producto agregado', 'ok');
}

// ══════════════════════════════════════════════
//  HISTORIAL
// ══════════════════════════════════════════════
async function loadHistorial() {
  const tbody = document.getElementById('hist-tbody');
  tbody.innerHTML = `<tr><td colspan="7" class="empty"><div class="loader"><div class="spinner"></div> Cargando...</div></td></tr>`;

  const fv = document.getElementById('f-vend').value;
  const fc = document.getElementById('f-cat').value;
  const fm = document.getElementById('f-cur').value;

  let q = sb.from('ventas').select('*').order('created_at', { ascending: false }).limit(200);
  if (fv) q = q.eq('vendedor', fv);
  if (fc) q = q.eq('categoria', fc);
  if (fm) q = q.eq('moneda', fm);

  const { data, error } = await q;
  if (error) { showToast('Error al cargar historial', 'fail'); return; }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Sin ventas para mostrar.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(s => `
    <tr>
      <td style="font-size:12px;color:var(--text2)">${s.fecha} ${s.hora}</td>
      <td>
        ${s.producto}
        ${s.nota ? `<br><span style="font-size:11px;color:var(--text3)">${s.nota}</span>` : ''}
      </td>
      <td><span class="tag ${s.categoria === 'Ropa' ? 'tag-ropa' : 'tag-accs'}">${s.categoria}</span></td>
      <td><span class="tag tag-${s.moneda.toLowerCase()}">${s.moneda}</span></td>
      <td style="font-weight:500">${fmtMonto(s.moneda, s.monto)}</td>
      <td style="color:var(--text2)">${s.metodo}</td>
      <td style="color:var(--text2)">${s.vendedor}</td>
    </tr>
  `).join('');
}
