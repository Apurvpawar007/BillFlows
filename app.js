/* =========================================================
   The Fried Cafe POS — app.js
   Vanilla JS, localStorage-persisted. No build step needed.
   Structure:
     1. Storage & seed data
     2. Helpers
     3. App state (in-memory, transient)
     4. Router / render dispatch
     5. View renderers (Dashboard, New Order, Orders, Unpaid,
        Menu, Sales, Expenses, Settings)
     6. Modals (receipt, mark-as-paid, menu item form, confirm)
     7. Event delegation & init
   ========================================================= */

/* ---------------------- 1. STORAGE ---------------------- */
const DB = {
  MENU: 'fcpos_menu',
  ORDERS: 'fcpos_orders',
  EXPENSES: 'fcpos_expenses',
  SETTINGS: 'fcpos_settings',
  CART_DRAFT: 'fcpos_cart_draft'
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function seedMenu() {
  return [
    { id: 'itm_001', name: 'Onion Rings', category: 'Snacks', price: 90, cost: 35, image: '', available: true },
    { id: 'itm_002', name: 'Masala French Fries', category: 'Snacks', price: 80, cost: 30, image: '', available: true },
    { id: 'itm_003', name: 'Chicken Popcorn', category: 'Snacks', price: 150, cost: 65, image: '', available: true },
    { id: 'itm_004', name: 'Paneer Nuggets', category: 'Snacks', price: 130, cost: 55, image: '', available: true },
    { id: 'itm_005', name: 'Veg Grilled Sandwich', category: 'Sandwiches', price: 90, cost: 38, image: '', available: true },
    { id: 'itm_006', name: 'Chicken Cheese Sandwich', category: 'Sandwiches', price: 140, cost: 60, image: '', available: true },
    { id: 'itm_007', name: 'Club Sandwich', category: 'Sandwiches', price: 160, cost: 70, image: '', available: true },
    { id: 'itm_008', name: 'Classic Fries', category: 'Fries', price: 70, cost: 25, image: '', available: true },
    { id: 'itm_009', name: 'Peri Peri Fries', category: 'Fries', price: 90, cost: 32, image: '', available: true },
    { id: 'itm_010', name: 'Cheese Loaded Fries', category: 'Fries', price: 120, cost: 50, image: '', available: true },
    { id: 'itm_011', name: 'Cold Coffee', category: 'Beverages', price: 90, cost: 32, image: '', available: true },
    { id: 'itm_012', name: 'Masala Chai', category: 'Beverages', price: 30, cost: 9, image: '', available: true },
    { id: 'itm_013', name: 'Lemonade', category: 'Beverages', price: 50, cost: 14, image: '', available: true },
    { id: 'itm_014', name: 'Chocolate Shake', category: 'Beverages', price: 110, cost: 45, image: '', available: true },
    { id: 'itm_015', name: 'Fried Chicken Bucket', category: 'Specials', price: 280, cost: 130, image: '', available: true },
    { id: 'itm_016', name: 'Loaded Nachos', category: 'Specials', price: 150, cost: 62, image: '', available: true },
    { id: 'itm_017', name: 'Cheese Burst Burger', category: 'Specials', price: 130, cost: 55, image: '', available: true },
    { id: 'itm_018', name: 'Burger + Fries + Coke Combo', category: 'Combos', price: 199, cost: 90, image: '', available: true },
    { id: 'itm_019', name: 'Sandwich + Shake Combo', category: 'Combos', price: 179, cost: 80, image: '', available: true }
  ];
}
function seedSettings() { return { cafeName: 'The Fried Cafe', orderSeq: 0 }; }

let menu = loadJSON(DB.MENU, null) || seedMenu();
let orders = loadJSON(DB.ORDERS, []);
let expenses = loadJSON(DB.EXPENSES, []);
let settings = loadJSON(DB.SETTINGS, null) || seedSettings();
if (!loadJSON(DB.MENU, null)) saveJSON(DB.MENU, menu);
if (!loadJSON(DB.SETTINGS, null)) saveJSON(DB.SETTINGS, settings);

function persistMenu() { saveJSON(DB.MENU, menu); }
function persistOrders() { saveJSON(DB.ORDERS, orders); }
function persistExpenses() { saveJSON(DB.EXPENSES, expenses); }
function persistSettings() { saveJSON(DB.SETTINGS, settings); }

const CATEGORIES = ['Snacks', 'Sandwiches', 'Fries', 'Beverages', 'Specials', 'Combos'];
const EXPENSE_CATEGORIES = ['Ingredients', 'Packaging', 'Gas', 'Electricity', 'Transport', 'Marketing', 'Other'];

/* ---------------------- 2. HELPERS ---------------------- */
function rupee(n) {
  const v = Math.round((n + Number.EPSILON) * 100) / 100;
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: v % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
}
function pad(n) { return String(n).padStart(2, '0'); }
function nowISO() { return new Date().toISOString(); }
function fmtDateTime(iso) {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours() % 12 || 12)}:${pad(d.getMinutes())} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}
function fmtDateOnly(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isToday(iso) { return fmtDateOnly(iso) === fmtDateOnly(nowISO()); }
function escapeHTML(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function nextOrderId() {
  settings.orderSeq = (settings.orderSeq || 0) + 1;
  persistSettings();
  return 'FC-' + String(settings.orderSeq).padStart(5, '0');
}
function uid(prefix) { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* ---------------------- 3. APP STATE (transient) ---------------------- */
const ui = {
  view: 'dashboard',
  category: 'All',
  ordersFilter: { status: 'all', search: '', from: '', to: '' },
  salesFilter: { from: '', to: '' },
  editingItemId: null
};

const draft = loadJSON(DB.CART_DRAFT, null) || {
  cart: [],
  customer: { name: '', phone: '', table: '', notes: '' },
  discount: 0,
  paymentStatus: null,   // 'PAID' | 'UNPAID'
  paymentMethod: null
};
function persistDraft() { saveJSON(DB.CART_DRAFT, draft); }

/* ---------------------- 4. ROUTER ---------------------- */
function setView(view) {
  ui.view = view;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.nav === view));
  // Close mobile "More" sheet if open
  const moreOverlay = document.getElementById('mobile-more-overlay');
  if (moreOverlay) moreOverlay.classList.remove('open');
  render();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function render() {
  // Remember if mobile cart drawer was open before re-render
  const drawerWasOpen = (() => {
    const ov = document.getElementById('cart-drawer-overlay');
    return ov && ov.classList.contains('open');
  })();

  updateUnpaidBadge();
  const root = document.getElementById('view-root');
  switch (ui.view) {
    case 'dashboard': root.innerHTML = renderDashboard(); break;
    case 'neworder': root.innerHTML = renderNewOrder(); break;
    case 'orders': root.innerHTML = renderOrders(); break;
    case 'unpaid': root.innerHTML = renderUnpaid(); break;
    case 'menu': root.innerHTML = renderMenu(); break;
    case 'sales': root.innerHTML = renderSales(); break;
    case 'expenses': root.innerHTML = renderExpenses(); break;
    case 'settings': root.innerHTML = renderSettings(); break;
    default: root.innerHTML = renderDashboard();
  }

  // Restore cart drawer open state after re-render (mobile)
  if (drawerWasOpen && ui.view === 'neworder') {
    const ov = document.getElementById('cart-drawer-overlay');
    if (ov) ov.classList.add('open');
  }
}

function updateUnpaidBadge() {
  const badge = document.getElementById('unpaid-badge');
  const count = orders.filter(o => o.status === 'UNPAID').length;
  badge.hidden = count === 0;
  badge.textContent = count;
}

/* ---------------------- 5. DASHBOARD ---------------------- */
function renderDashboard() {
  const todays = orders.filter(o => isToday(o.createdAt));
  const todaysSales = todays.reduce((s, o) => s + o.total, 0);
  const todaysPaid = todays.filter(o => o.status === 'PAID').reduce((s, o) => s + o.total, 0);
  const todaysUnpaid = todays.filter(o => o.status === 'UNPAID').reduce((s, o) => s + o.pendingAmount, 0);

  const allUnpaid = orders.filter(o => o.status === 'UNPAID');
  const allUnpaidAmt = allUnpaid.reduce((s, o) => s + o.pendingAmount, 0);

  const recent = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

  return `
    ${allUnpaid.length ? `<div class="warning-banner">⚠️ ${rupee(allUnpaidAmt)} pending from ${allUnpaid.length} bill${allUnpaid.length > 1 ? 's' : ''}.
      <button class="btn btn-sm btn-outline" style="margin-left:auto" data-nav="unpaid">View unpaid bills</button></div>` : ''}

    <div class="flex-between mb-16">
      <div>
        <h2 class="section-title">Dashboard</h2>
        <p class="section-sub">${fmtDateTime(nowISO())}</p>
      </div>
      <button class="btn btn-primary btn-lg" data-nav="neworder">+ New Order</button>
    </div>

    <div class="dash-grid">
      <div class="stat-card accent"><div class="label">Today's Orders</div><div class="value">${todays.length}</div></div>
      <div class="stat-card accent"><div class="label">Today's Sales</div><div class="value">${rupee(todaysSales)}</div></div>
      <div class="stat-card good"><div class="label">Paid Today</div><div class="value">${rupee(todaysPaid)}</div></div>
      <div class="stat-card warn"><div class="label">Unpaid Today</div><div class="value">${rupee(todaysUnpaid)}</div></div>
      <div class="stat-card warn"><div class="label">Total Outstanding (all time)</div><div class="value">${rupee(allUnpaidAmt)}</div></div>
      <div class="stat-card"><div class="label">Unpaid Bills</div><div class="value">${allUnpaid.length}</div></div>
      <div class="stat-card"><div class="label">Menu Items Available</div><div class="value">${menu.filter(m => m.available).length}</div></div>
      <div class="stat-card"><div class="label">Total Orders (all time)</div><div class="value">${orders.length}</div></div>
    </div>

    <div class="panel">
      <div class="flex-between mb-16">
        <h3 class="section-title" style="font-size:17px">Recent Orders</h3>
        <button class="btn btn-ghost" data-nav="orders">View all →</button>
      </div>
      ${recent.length ? `<div class="recent-list">
        ${recent.map(o => `
          <div class="recent-row">
            <div>
              <strong>${o.id}</strong> · ${escapeHTML(o.customer.name || 'Walk-in')}
              <div class="meta">${fmtDateTime(o.createdAt)} · ${o.items.reduce((s, i) => s + i.qty, 0)} items</div>
            </div>
            <div style="text-align:right">
              <div class="amt">${rupee(o.total)}</div>
              <span class="pill ${o.status === 'PAID' ? 'pill-paid' : 'pill-unpaid'}">${o.status === 'PAID' ? '🟢 PAID' : '🔴 UNPAID'}</span>
            </div>
          </div>`).join('')}
      </div>` : `<div class="empty-state"><div class="big">🍟</div>No orders yet. Start your first order!</div>`}
    </div>
  `;
}

/* ---------------------- 5b. NEW ORDER ---------------------- */
function cartPanelHTML(idSuffix) {
  // idSuffix = '' for desktop, '-m' for mobile drawer
  // On mobile, inputs share same IDs — only one is visible at a time so no conflict
  const s = idSuffix || '';
  if (!draft.cart.length) {
    return `<div class="cart-empty">Cart is empty.<br/>Tap an item to add it.</div>`;
  }
  return `
    ${renderCartLines()}
    <div class="flex-between" style="margin:12px 0">
      <button class="btn btn-outline btn-sm" id="btn-clear-cart${s}">Clear cart</button>
      <span class="muted" style="font-size:12.5px">${draft.cart.reduce((s, i) => s + i.qty, 0)} items</span>
    </div>
    <div class="field">
      <label for="discount-input${s}">Discount (₹)</label>
      <input type="number" min="0" id="discount-input${s}" value="${draft.discount || ''}" placeholder="0" />
    </div>
    ${renderTotals()}
    <h3 class="section-title" style="font-size:15px;margin:18px 0 10px">Customer Details <span class="muted" style="font-weight:400;font-size:12px">(optional)</span></h3>
    <div class="field-row">
      <div class="field"><label>Name</label><input type="text" id="cust-name${s}" value="${escapeHTML(draft.customer.name)}" placeholder="Customer name" /></div>
      <div class="field"><label>Phone</label><input type="tel" id="cust-phone${s}" value="${escapeHTML(draft.customer.phone)}" placeholder="Phone number" /></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Table / Order No.</label><input type="text" id="cust-table${s}" value="${escapeHTML(draft.customer.table)}" placeholder="e.g. T4" /></div>
      <div class="field"><label>Notes</label><input type="text" id="cust-notes${s}" value="${escapeHTML(draft.customer.notes)}" placeholder="e.g. less spicy" /></div>
    </div>
    <h3 class="section-title" style="font-size:15px;margin:18px 0 6px">Payment</h3>
    <div class="pay-toggle">
      <button class="pay-opt paid ${draft.paymentStatus === 'PAID' ? 'selected' : ''}" id="btn-pay-paid${s}">🟢 BILL PAID</button>
      <button class="pay-opt unpaid ${draft.paymentStatus === 'UNPAID' ? 'selected' : ''}" id="btn-pay-unpaid${s}">🔴 BILL NOT PAID</button>
    </div>
    ${draft.paymentStatus === 'PAID' ? `
      <div class="method-row">
        ${['Cash', 'UPI', 'Card', 'Other'].map(m => `<button class="method-chip ${draft.paymentMethod === m ? 'selected' : ''}" data-method="${m}">${m}</button>`).join('')}
      </div>` : ''}
    ${draft.paymentStatus === 'UNPAID' ? `<p class="muted" style="font-size:12.5px;margin-bottom:12px">This order will be saved to <strong>Unpaid Bills</strong> until marked as paid.</p>` : ''}
    <button class="btn btn-primary btn-block btn-lg" id="btn-complete-order${s}" ${!canComplete() ? 'disabled' : ''}>Complete Order</button>
  `;
}

function renderNewOrder() {
  const cats = ['All', ...CATEGORIES];
  const items = menu.filter(m => ui.category === 'All' || m.category === ui.category);
  const cartCount = draft.cart.reduce((s, i) => s + i.qty, 0);

  return `
    <h2 class="section-title mb-16">New Order</h2>
    <div class="order-layout">
      <div>
        <div class="cat-row">
          ${cats.map(c => `<button class="cat-chip ${ui.category === c ? 'active' : ''}" data-catfilter="${c}">${c}</button>`).join('')}
        </div>
        <div class="item-grid">
          ${items.map(m => renderItemCard(m)).join('') || `<div class="empty-state">No items in this category.</div>`}
        </div>
      </div>

      <!-- Desktop cart: always visible on wide screens -->
      <div class="panel cart-panel cart-panel-desktop">
        <h3 class="section-title" style="font-size:17px;margin-bottom:12px">Cart</h3>
        ${cartPanelHTML('')}
      </div>
    </div>

    <!-- Mobile cart FAB (shown only on mobile when cart has items) -->
    ${cartCount > 0 ? `
      <button class="cart-fab" id="cart-fab">
        <span>🛒 View Cart <span class="cart-fab-qty">${cartCount}</span></span>
        <span class="cart-fab-total">${rupee(cartTotal())}</span>
      </button>
    ` : ''}

    <!-- Mobile cart drawer overlay -->
    <div class="cart-drawer-overlay" id="cart-drawer-overlay">
      <div class="cart-drawer" id="cart-drawer">
        <div class="cart-drawer-handle-row">
          <div style="flex:1"></div>
          <div class="cart-drawer-handle"></div>
          <div style="flex:1;display:flex;justify-content:flex-end">
            <button class="cart-drawer-close" id="cart-drawer-close">✕</button>
          </div>
        </div>
        <h3 class="section-title" style="font-size:17px;margin-bottom:12px">Cart</h3>
        ${cartPanelHTML('-m')}
      </div>
    </div>
  `;
}

function renderItemCard(m) {
  const inCart = draft.cart.find(c => c.itemId === m.id);
  return `
    <button class="item-card ${!m.available ? 'unavailable' : ''}" data-add-item="${m.id}" ${!m.available ? 'disabled' : ''}>
      ${inCart ? `<span class="qty-badge">${inCart.qty}</span>` : ''}
      ${m.image ? `<img class="img" src="${escapeHTML(m.image)}" alt="" onerror="this.style.display='none'"/>` : ''}
      <div>
        <div class="name">${escapeHTML(m.name)}</div>
        <div class="cat">${m.category}${!m.available ? ' · Unavailable' : ''}</div>
      </div>
      <div class="price">${rupee(m.price)}</div>
    </button>
  `;
}

function renderCartLines() {
  if (!draft.cart.length) return '';
  return draft.cart.map(line => `
    <div class="cart-line">
      <div class="info">
        <div class="cname">${escapeHTML(line.name)}</div>
        <div class="cprice">${rupee(line.price)} each</div>
      </div>
      <div class="qty-stepper">
        <button data-qty-change="${line.itemId}" data-delta="-1">−</button>
        <span class="qn">${line.qty}</span>
        <button data-qty-change="${line.itemId}" data-delta="1">+</button>
      </div>
      <div class="lineTotal">${rupee(line.price * line.qty)}</div>
      <button class="btn btn-ghost" data-remove-item="${line.itemId}" title="Remove" style="padding:4px 6px">✕</button>
    </div>
  `).join('');
}

function cartSubtotal() { return draft.cart.reduce((s, i) => s + i.price * i.qty, 0); }
function cartTotal() { return Math.max(0, cartSubtotal() - (Number(draft.discount) || 0)); }

function totalsRowsHTML() {
  return `
    <div class="totals-row"><span>Subtotal</span><span>${rupee(cartSubtotal())}</span></div>
    ${draft.discount ? `<div class="totals-row"><span>Discount</span><span>− ${rupee(Number(draft.discount))}</span></div>` : ''}
    <div class="totals-row grand"><span>Total</span><span>${rupee(cartTotal())}</span></div>
  `;
}
function renderTotals() {
  return `<div id="totals-wrap" style="margin-top:6px">${totalsRowsHTML()}</div>`;
}

function canComplete() {
  if (!draft.cart.length) return false;
  if (!draft.paymentStatus) return false;
  if (draft.paymentStatus === 'PAID' && !draft.paymentMethod) return false;
  return true;
}

function addToCart(itemId) {
  const item = menu.find(m => m.id === itemId);
  if (!item || !item.available) return;
  const existing = draft.cart.find(c => c.itemId === itemId);
  if (existing) existing.qty += 1;
  else draft.cart.push({ itemId: item.id, name: item.name, price: item.price, cost: item.cost || 0, qty: 1 });
  persistDraft();
  render();
}
function changeQty(itemId, delta) {
  const line = draft.cart.find(c => c.itemId === itemId);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) draft.cart = draft.cart.filter(c => c.itemId !== itemId);
  persistDraft();
  render();
}
function removeFromCart(itemId) {
  draft.cart = draft.cart.filter(c => c.itemId !== itemId);
  persistDraft();
  render();
}
function clearCart() {
  draft.cart = [];
  draft.discount = 0;
  draft.customer = { name: '', phone: '', table: '', notes: '' };
  draft.paymentStatus = null;
  draft.paymentMethod = null;
  persistDraft();
  render();
}

function completeOrder() {
  if (!canComplete()) return;
  const id = nextOrderId();
  const subtotal = cartSubtotal();
  const discount = Number(draft.discount) || 0;
  const total = cartTotal();
  const status = draft.paymentStatus;
  const order = {
    id,
    createdAt: nowISO(),
    items: draft.cart.map(c => ({ itemId: c.itemId, name: c.name, price: c.price, cost: c.cost || 0, qty: c.qty })),
    customer: { ...draft.customer },
    discount,
    subtotal,
    total,
    status,
    paymentMethod: status === 'PAID' ? draft.paymentMethod : null,
    paidAt: status === 'PAID' ? nowISO() : null,
    pendingAmount: status === 'UNPAID' ? total : 0
  };
  orders.unshift(order);
  persistOrders();
  clearCart();
  openReceiptModal(order.id, true);
}

/* ---------------------- 5c. ORDERS / HISTORY ---------------------- */
function renderOrders() {
  const f = ui.ordersFilter;
  let list = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (f.status !== 'all') list = list.filter(o => o.status === f.status);
  if (f.search.trim()) {
    const s = f.search.trim().toLowerCase();
    list = list.filter(o => o.id.toLowerCase().includes(s) || (o.customer.name || '').toLowerCase().includes(s) || (o.customer.phone || '').includes(s));
  }
  if (f.from) list = list.filter(o => fmtDateOnly(o.createdAt) >= f.from);
  if (f.to) list = list.filter(o => fmtDateOnly(o.createdAt) <= f.to);

  return `
    <h2 class="section-title mb-16">Order History</h2>
    <div class="panel">
      <div class="filters-row">
        <div class="field"><label>Search</label><input type="text" id="f-search" placeholder="Order ID / customer / phone" value="${escapeHTML(f.search)}" /></div>
        <div class="field"><label>Status</label>
          <select id="f-status">
            <option value="all" ${f.status === 'all' ? 'selected' : ''}>All</option>
            <option value="PAID" ${f.status === 'PAID' ? 'selected' : ''}>Paid</option>
            <option value="UNPAID" ${f.status === 'UNPAID' ? 'selected' : ''}>Unpaid</option>
          </select>
        </div>
        <div class="field"><label>From</label><input type="date" id="f-from" value="${f.from}" /></div>
        <div class="field"><label>To</label><input type="date" id="f-to" value="${f.to}" /></div>
        <button class="btn btn-outline" id="f-reset">Reset</button>
      </div>

      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Order ID</th><th>Date/Time</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Method</th><th></th></tr></thead>
          <tbody>
            ${list.map(o => `
              <tr>
                <td><strong>${o.id}</strong></td>
                <td>${fmtDateTime(o.createdAt)}</td>
                <td>${escapeHTML(o.customer.name || 'Walk-in')}${o.customer.table ? ' · ' + escapeHTML(o.customer.table) : ''}</td>
                <td>${o.items.reduce((s, i) => s + i.qty, 0)} items</td>
                <td>${rupee(o.total)}</td>
                <td><span class="pill ${o.status === 'PAID' ? 'pill-paid' : 'pill-unpaid'}">${o.status === 'PAID' ? '🟢 PAID' : '🔴 UNPAID'}</span></td>
                <td>${o.paymentMethod || '—'}</td>
                <td><button class="btn btn-ghost btn-sm" data-view-receipt="${o.id}">View</button></td>
              </tr>
            `).join('') || `<tr><td colspan="8"><div class="empty-state">No orders match your filters.</div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ---------------------- 5d. UNPAID BILLS ---------------------- */
function renderUnpaid() {
  const list = orders.filter(o => o.status === 'UNPAID').sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const total = list.reduce((s, o) => s + o.pendingAmount, 0);
  return `
    <div class="flex-between mb-16">
      <h2 class="section-title">Unpaid Bills</h2>
      ${list.length ? `<span class="tag">${list.length} bills · ${rupee(total)} pending</span>` : ''}
    </div>
    <div class="panel">
      ${list.length ? `
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Order ID</th><th>Customer</th><th>Date/Time</th><th>Total</th><th>Pending</th><th></th></tr></thead>
          <tbody>
            ${list.map(o => `
              <tr>
                <td><strong>${o.id}</strong></td>
                <td>${escapeHTML(o.customer.name || 'Walk-in')}${o.customer.phone ? ' · ' + escapeHTML(o.customer.phone) : ''}</td>
                <td>${fmtDateTime(o.createdAt)}</td>
                <td>${rupee(o.total)}</td>
                <td><strong style="color:var(--danger)">${rupee(o.pendingAmount)}</strong></td>
                <td style="white-space:nowrap">
                  <button class="btn btn-ghost btn-sm" data-view-receipt="${o.id}">View</button>
                  <button class="btn btn-success btn-sm" data-mark-paid="${o.id}">Mark as Paid</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>` : `<div class="empty-state"><div class="big">✅</div>No unpaid bills. All caught up!</div>`}
    </div>
  `;
}

/* ---------------------- 5e. MENU MANAGEMENT ---------------------- */
function renderMenu() {
  return `
    <div class="flex-between mb-16">
      <h2 class="section-title">Menu Management</h2>
      <button class="btn btn-primary" id="btn-add-item">+ Add Item</button>
    </div>
    ${CATEGORIES.map(cat => {
      const items = menu.filter(m => m.category === cat);
      if (!items.length) return '';
      return `
        <div class="panel mb-16">
          <h3 class="section-title" style="font-size:16px;margin-bottom:12px">${cat}</h3>
          ${items.map(m => `
            <div class="menu-item-row">
              ${m.image ? `<img class="thumb" src="${escapeHTML(m.image)}" onerror="this.style.display='none'"/>` : `<div class="thumb" style="display:flex;align-items:center;justify-content:center;font-size:18px">🍽️</div>`}
              <div>
                <div class="mname">${escapeHTML(m.name)}</div>
                <div class="mmeta">${rupee(m.price)} · cost ${rupee(m.cost || 0)}</div>
              </div>
              <div class="spacer"></div>
              <span class="avail-badge ${m.available ? 'on' : 'off'}">${m.available ? 'Available' : 'Unavailable'}</span>
              <button class="btn btn-ghost btn-sm" data-edit-item="${m.id}">Edit</button>
              <button class="btn btn-ghost btn-sm" data-delete-item="${m.id}" style="color:var(--danger)">Delete</button>
            </div>
          `).join('')}
        </div>
      `;
    }).join('')}
  `;
}

/* ---------------------- 5f. SALES & PROFIT ---------------------- */
function renderSales() {
  const f = ui.salesFilter;
  let list = orders;
  if (f.from) list = list.filter(o => fmtDateOnly(o.createdAt) >= f.from);
  if (f.to) list = list.filter(o => fmtDateOnly(o.createdAt) <= f.to);

  const totalSales = list.reduce((s, o) => s + o.total, 0);
  const paidAmount = list.filter(o => o.status === 'PAID').reduce((s, o) => s + o.total, 0);
  const unpaidAmount = list.filter(o => o.status === 'UNPAID').reduce((s, o) => s + o.pendingAmount, 0);
  const orderCount = list.length;
  const avgOrderValue = orderCount ? totalSales / orderCount : 0;

  const grossProfit = list.reduce((sum, o) => sum + o.items.reduce((s, i) => s + (i.price - (i.cost || 0)) * i.qty, 0), 0) - list.reduce((s, o) => s + (o.discount || 0), 0);

  let expList = expenses;
  if (f.from) expList = expList.filter(e => e.date >= f.from);
  if (f.to) expList = expList.filter(e => e.date <= f.to);
  const expensesTotal = expList.reduce((s, e) => s + Number(e.amount), 0);
  const netProfit = grossProfit - expensesTotal;

  return `
    <h2 class="section-title mb-16">Sales &amp; Profit</h2>
    <div class="panel mb-16">
      <div class="filters-row" style="margin-bottom:0">
        <div class="field"><label>From</label><input type="date" id="s-from" value="${f.from}" /></div>
        <div class="field"><label>To</label><input type="date" id="s-to" value="${f.to}" /></div>
        <button class="btn btn-outline" id="s-reset">All time</button>
      </div>
    </div>

    <div class="dash-grid">
      <div class="stat-card"><div class="label">Total Sales</div><div class="value">${rupee(totalSales)}</div></div>
      <div class="stat-card good"><div class="label">Paid Amount</div><div class="value">${rupee(paidAmount)}</div></div>
      <div class="stat-card warn"><div class="label">Unpaid Amount</div><div class="value">${rupee(unpaidAmount)}</div></div>
      <div class="stat-card"><div class="label">Orders</div><div class="value">${orderCount}</div></div>
      <div class="stat-card"><div class="label">Average Order Value</div><div class="value">${rupee(avgOrderValue)}</div></div>
      <div class="stat-card"><div class="label">Gross Profit</div><div class="value">${rupee(grossProfit)}</div></div>
      <div class="stat-card warn"><div class="label">Expenses</div><div class="value">${rupee(expensesTotal)}</div></div>
      <div class="stat-card ${netProfit >= 0 ? 'good' : 'warn'}"><div class="label">Net Profit</div><div class="value">${rupee(netProfit)}</div></div>
    </div>
    <p class="muted" style="font-size:12.5px">Sales = value of all orders placed. Paid = money actually collected. Unpaid = money still owed. Gross profit = (item price − item cost) × qty, minus discounts. Net profit = gross profit − expenses.</p>
  `;
}

/* ---------------------- 5g. EXPENSES ---------------------- */
function renderExpenses() {
  const list = [...expenses].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const total = list.reduce((s, e) => s + Number(e.amount), 0);
  return `
    <h2 class="section-title mb-16">Expenses</h2>
    <div class="grid-2">
      <div class="panel">
        <h3 class="section-title" style="font-size:16px;margin-bottom:12px">Add Expense</h3>
        <div class="field"><label>Category</label>
          <select id="exp-category">${EXPENSE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
        </div>
        <div class="field-row">
          <div class="field"><label>Amount (₹)</label><input type="number" min="0" id="exp-amount" placeholder="0" /></div>
          <div class="field"><label>Date</label><input type="date" id="exp-date" value="${fmtDateOnly(nowISO())}" /></div>
        </div>
        <div class="field"><label>Note</label><input type="text" id="exp-note" placeholder="Optional note" /></div>
        <button class="btn btn-primary btn-block" id="btn-add-expense">Add Expense</button>
      </div>

      <div class="panel">
        <div class="flex-between mb-16">
          <h3 class="section-title" style="font-size:16px">All Expenses</h3>
          <span class="tag">Total ${rupee(total)}</span>
        </div>
        ${list.length ? list.map(e => `
          <div class="recent-row">
            <div>
              <strong>${e.category}</strong>
              <div class="meta">${e.date}${e.note ? ' · ' + escapeHTML(e.note) : ''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="amt">${rupee(e.amount)}</div>
              <button class="btn btn-ghost btn-sm" data-delete-expense="${e.id}" style="color:var(--danger)">✕</button>
            </div>
          </div>
        `).join('') : `<div class="empty-state">No expenses recorded yet.</div>`}
      </div>
    </div>
  `;
}

/* ---------------------- 5h. SETTINGS ---------------------- */
function renderSettings() {
  return `
    <h2 class="section-title mb-16">Settings</h2>
    <div class="panel mb-16" style="max-width:480px">
      <div class="field"><label>Cafe Name</label><input type="text" id="set-cafename" value="${escapeHTML(settings.cafeName)}" /></div>
      <div class="field"><label>Currency</label><input type="text" value="₹ INR" disabled /></div>
      <button class="btn btn-primary" id="btn-save-settings">Save</button>
    </div>
    <div class="panel" style="max-width:480px">
      <h3 class="section-title" style="font-size:16px;margin-bottom:8px">Data</h3>
      <p class="muted" style="font-size:13px;margin-bottom:12px">All data (orders, menu, expenses) is stored locally in this browser. It stays saved after refreshing, and won't sync to other devices. Built to plug into a cloud database, WhatsApp bills, UPI integration and staff accounts later.</p>
      <button class="btn btn-danger-outline" id="btn-reset-data">Reset all data</button>
    </div>
  `;
}

/* ---------------------- 6. MODALS ---------------------- */
function openModal(html) {
  document.getElementById('modal-root').innerHTML = `<div class="modal-backdrop" id="modal-backdrop">${html}</div>`;
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });
}
function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

function receiptHTML(order) {
  return `
    <div class="receipt">
      <h2>${escapeHTML(settings.cafeName || 'The Fried Cafe')}</h2>
      <div class="sub">Order Receipt</div>
      <div class="rline"><span>Order ID</span><span>${order.id}</span></div>
      <div class="rline"><span>Date/Time</span><span>${fmtDateTime(order.createdAt)}</span></div>
      ${order.customer.name ? `<div class="rline"><span>Customer</span><span>${escapeHTML(order.customer.name)}</span></div>` : ''}
      ${order.customer.table ? `<div class="rline"><span>Table/Order No.</span><span>${escapeHTML(order.customer.table)}</span></div>` : ''}
      <hr/>
      ${order.items.map(i => `<div class="rline"><span>${escapeHTML(i.name)} × ${i.qty}</span><span>${rupee(i.price * i.qty)}</span></div>`).join('')}
      <hr/>
      <div class="rline"><span>Subtotal</span><span>${rupee(order.subtotal)}</span></div>
      ${order.discount ? `<div class="rline"><span>Discount</span><span>− ${rupee(order.discount)}</span></div>` : ''}
      <div class="rline rtotal"><span>Total</span><span>${rupee(order.total)}</span></div>
      <hr/>
      <div class="rline"><span>Status</span><span>${order.status === 'PAID' ? '🟢 PAID (' + (order.paymentMethod || '') + ')' : '🔴 UNPAID'}</span></div>
      ${order.customer.notes ? `<div class="rline"><span>Notes</span><span>${escapeHTML(order.customer.notes)}</span></div>` : ''}
      <div class="sub" style="margin-top:14px">Thank you for visiting!</div>
    </div>
  `;
}

function openReceiptModal(orderId, justCompleted) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  openModal(`
    <div class="modal-card">
      ${justCompleted ? `<div class="modal-title">Order completed ✅</div><p class="muted" style="margin-bottom:14px">Order ${order.id} has been saved.</p>` : ''}
      <div id="receipt-print">${receiptHTML(order)}</div>
      <div class="modal-actions">
        <button class="btn btn-outline btn-block" id="btn-close-modal">Close</button>
        <button class="btn btn-primary btn-block" id="btn-print-receipt">Print</button>
      </div>
    </div>
  `);
}

function openMarkPaidModal(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  openModal(`
    <div class="modal-card">
      <div class="modal-title">Mark ${order.id} as Paid</div>
      <p class="muted" style="margin-bottom:14px">Pending amount: <strong>${rupee(order.pendingAmount)}</strong></p>
      <div class="field"><label>Payment Method</label>
        <div class="method-row" id="mp-method-row">
          ${['Cash', 'UPI', 'Card', 'Other'].map((m, idx) => `<button class="method-chip ${idx === 0 ? 'selected' : ''}" data-mp-method="${m}">${m}</button>`).join('')}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline btn-block" id="btn-close-modal">Cancel</button>
        <button class="btn btn-success btn-block" id="btn-confirm-paid" data-order="${order.id}" data-selected-method="Cash">Confirm Paid</button>
      </div>
    </div>
  `);
}

function confirmMarkPaid(orderId, method) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  order.status = 'PAID';
  order.paymentMethod = method;
  order.paidAt = nowISO();
  order.pendingAmount = 0;
  persistOrders();
  closeModal();
  render();
}

function openMenuItemModal(itemId) {
  const editing = !!itemId;
  const item = editing ? menu.find(m => m.id === itemId) : { name: '', category: CATEGORIES[0], price: '', cost: '', image: '', available: true };
  openModal(`
    <div class="modal-card wide">
      <div class="modal-title">${editing ? 'Edit Item' : 'Add Menu Item'}</div>
      <div class="field"><label>Item Name</label><input type="text" id="mi-name" value="${escapeHTML(item.name)}" placeholder="e.g. Cheese Fries" /></div>
      <div class="field-row">
        <div class="field"><label>Category</label>
          <select id="mi-category">${CATEGORIES.map(c => `<option value="${c}" ${item.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Price (₹)</label><input type="number" min="0" id="mi-price" value="${item.price}" placeholder="0" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Item Cost (₹)</label><input type="number" min="0" id="mi-cost" value="${item.cost}" placeholder="0" /></div>
        <div class="field"><label>Image URL</label><input type="text" id="mi-image" value="${escapeHTML(item.image)}" placeholder="Optional" /></div>
      </div>
      <div class="field" style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="mi-available" ${item.available ? 'checked' : ''} style="width:auto" />
        <label for="mi-available" style="margin:0">Available in New Order</label>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline btn-block" id="btn-close-modal">Cancel</button>
        <button class="btn btn-primary btn-block" id="btn-save-item" data-editing="${editing ? item.id : ''}">Save Item</button>
      </div>
    </div>
  `);
}

function saveMenuItem(existingId) {
  const name = document.getElementById('mi-name').value.trim();
  const category = document.getElementById('mi-category').value;
  const price = Number(document.getElementById('mi-price').value) || 0;
  const cost = Number(document.getElementById('mi-cost').value) || 0;
  const image = document.getElementById('mi-image').value.trim();
  const available = document.getElementById('mi-available').checked;
  if (!name || price <= 0) { alert('Please enter a valid item name and price.'); return; }

  if (existingId) {
    const item = menu.find(m => m.id === existingId);
    Object.assign(item, { name, category, price, cost, image, available });
  } else {
    menu.push({ id: uid('itm'), name, category, price, cost, image, available });
  }
  persistMenu();
  closeModal();
  render();
}

function confirmDeleteMenuItem(itemId) {
  const item = menu.find(m => m.id === itemId);
  if (!item) return;
  openModal(`
    <div class="modal-card">
      <div class="modal-title">Delete "${escapeHTML(item.name)}"?</div>
      <p class="muted" style="margin-bottom:14px">This won't affect past orders, but the item will be removed from the menu.</p>
      <div class="modal-actions">
        <button class="btn btn-outline btn-block" id="btn-close-modal">Cancel</button>
        <button class="btn btn-danger btn-block" id="btn-confirm-delete-item" data-id="${itemId}">Delete</button>
      </div>
    </div>
  `);
}

/* ---------------------- 7. EVENTS & INIT ---------------------- */
document.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-nav]');
  if (nav) { setView(nav.dataset.nav); return; }

  const catBtn = e.target.closest('[data-catfilter]');
  if (catBtn) { ui.category = catBtn.dataset.catfilter; render(); return; }

  const addBtn = e.target.closest('[data-add-item]');
  if (addBtn) { addToCart(addBtn.dataset.addItem); return; }

  const qtyBtn = e.target.closest('[data-qty-change]');
  if (qtyBtn) { changeQty(qtyBtn.dataset.qtyChange, Number(qtyBtn.dataset.delta)); return; }

  const rmBtn = e.target.closest('[data-remove-item]');
  if (rmBtn) { removeFromCart(rmBtn.dataset.removeItem); return; }

  if (e.target.id === 'btn-clear-cart' || e.target.id === 'btn-clear-cart-m') { if (confirm('Clear the entire cart?')) clearCart(); return; }

  if (e.target.id === 'btn-pay-paid' || e.target.id === 'btn-pay-paid-m') { draft.paymentStatus = 'PAID'; persistDraft(); render(); return; }
  if (e.target.id === 'btn-pay-unpaid' || e.target.id === 'btn-pay-unpaid-m') { draft.paymentStatus = 'UNPAID'; draft.paymentMethod = null; persistDraft(); render(); return; }

  const methodChip = e.target.closest('[data-method]');
  if (methodChip) { draft.paymentMethod = methodChip.dataset.method; persistDraft(); render(); return; }

  if (e.target.id === 'btn-complete-order' || e.target.id === 'btn-complete-order-m') { completeOrder(); return; }

  const viewReceipt = e.target.closest('[data-view-receipt]');
  if (viewReceipt) { openReceiptModal(viewReceipt.dataset.viewReceipt, false); return; }

  const markPaid = e.target.closest('[data-mark-paid]');
  if (markPaid) { openMarkPaidModal(markPaid.dataset.markPaid); return; }

  const mpMethod = e.target.closest('[data-mp-method]');
  if (mpMethod) {
    document.querySelectorAll('#mp-method-row .method-chip').forEach(c => c.classList.remove('selected'));
    mpMethod.classList.add('selected');
    document.getElementById('btn-confirm-paid').dataset.selectedMethod = mpMethod.dataset.mpMethod;
    return;
  }
  if (e.target.id === 'btn-confirm-paid') { confirmMarkPaid(e.target.dataset.order, e.target.dataset.selectedMethod); return; }

  if (e.target.id === 'btn-close-modal') { closeModal(); return; }
  if (e.target.id === 'btn-print-receipt') { window.print(); return; }

  if (e.target.id === 'btn-add-item') { openMenuItemModal(null); return; }
  const editItem = e.target.closest('[data-edit-item]');
  if (editItem) { openMenuItemModal(editItem.dataset.editItem); return; }
  const delItem = e.target.closest('[data-delete-item]');
  if (delItem) { confirmDeleteMenuItem(delItem.dataset.deleteItem); return; }
  if (e.target.id === 'btn-save-item') { saveMenuItem(e.target.dataset.editing || null); return; }
  if (e.target.id === 'btn-confirm-delete-item') {
    menu = menu.filter(m => m.id !== e.target.dataset.id);
    persistMenu(); closeModal(); render(); return;
  }

  if (e.target.id === 'btn-add-expense') {
    const category = document.getElementById('exp-category').value;
    const amount = Number(document.getElementById('exp-amount').value);
    const date = document.getElementById('exp-date').value || fmtDateOnly(nowISO());
    const note = document.getElementById('exp-note').value.trim();
    if (!amount || amount <= 0) { alert('Enter a valid amount.'); return; }
    expenses.push({ id: uid('exp'), category, amount, date, note });
    persistExpenses(); render(); return;
  }
  const delExp = e.target.closest('[data-delete-expense]');
  if (delExp) {
    if (confirm('Delete this expense?')) {
      expenses = expenses.filter(x => x.id !== delExp.dataset.deleteExpense);
      persistExpenses(); render();
    }
    return;
  }

  if (e.target.id === 'btn-save-settings') {
    settings.cafeName = document.getElementById('set-cafename').value.trim() || 'The Fried Cafe';
    persistSettings(); render();
    return;
  }
  if (e.target.id === 'btn-reset-data') {
    if (confirm('This will permanently delete all orders, menu items and expenses on this device. Continue?')) {
      localStorage.removeItem(DB.MENU); localStorage.removeItem(DB.ORDERS);
      localStorage.removeItem(DB.EXPENSES); localStorage.removeItem(DB.SETTINGS);
      localStorage.removeItem(DB.CART_DRAFT);
      location.reload();
    }
    return;
  }

  if (e.target.id === 'f-reset') { ui.ordersFilter = { status: 'all', search: '', from: '', to: '' }; render(); return; }
  if (e.target.id === 's-reset') { ui.salesFilter = { from: '', to: '' }; render(); return; }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'discount-input' || e.target.id === 'discount-input-m') { draft.discount = Number(e.target.value) || 0; persistDraft(); refreshTotalsOnly(); }
  if (e.target.id === 'cust-name' || e.target.id === 'cust-name-m') { draft.customer.name = e.target.value; persistDraft(); }
  if (e.target.id === 'cust-phone' || e.target.id === 'cust-phone-m') { draft.customer.phone = e.target.value; persistDraft(); }
  if (e.target.id === 'cust-table' || e.target.id === 'cust-table-m') { draft.customer.table = e.target.value; persistDraft(); }
  if (e.target.id === 'cust-notes' || e.target.id === 'cust-notes-m') { draft.customer.notes = e.target.value; persistDraft(); }

  if (e.target.id === 'f-search') { ui.ordersFilter.search = e.target.value; render(); }
  if (e.target.id === 'f-status') { ui.ordersFilter.status = e.target.value; render(); }
  if (e.target.id === 'f-from') { ui.ordersFilter.from = e.target.value; render(); }
  if (e.target.id === 'f-to') { ui.ordersFilter.to = e.target.value; render(); }

  if (e.target.id === 's-from') { ui.salesFilter.from = e.target.value; render(); }
  if (e.target.id === 's-to') { ui.salesFilter.to = e.target.value; render(); }
});

// Avoid re-rendering (and losing focus) on every keystroke of the discount field.
function refreshTotalsOnly() {
  const btn = document.getElementById('btn-complete-order');
  if (btn) btn.disabled = !canComplete();
  const wrap = document.getElementById('totals-wrap');
  if (wrap) wrap.innerHTML = totalsRowsHTML();
}

/* --- Mobile "More" sheet logic --- */
const tabMore = document.getElementById('tab-more');
const moreOverlay = document.getElementById('mobile-more-overlay');

if (tabMore && moreOverlay) {
  tabMore.addEventListener('click', (e) => {
    e.stopPropagation();
    moreOverlay.classList.toggle('open');
  });
  moreOverlay.addEventListener('click', (e) => {
    // Close when tapping the backdrop (outside the sheet)
    if (e.target === moreOverlay) {
      moreOverlay.classList.remove('open');
    }
  });
}

// Hide "More" tab on desktop via JS (CSS also hides it)
function updateMoreTabVisibility() {
  const more = document.getElementById('tab-more');
  if (more) more.style.display = window.innerWidth > 768 ? 'none' : '';
}
window.addEventListener('resize', updateMoreTabVisibility);
updateMoreTabVisibility();

/* --- Mobile cart FAB & drawer --- */
document.addEventListener('click', (e) => {
  // Open cart drawer
  const fab = e.target.closest('#cart-fab');
  if (fab) {
    const overlay = document.getElementById('cart-drawer-overlay');
    if (overlay) overlay.classList.add('open');
    return;
  }
  // Close drawer via close button
  if (e.target.id === 'cart-drawer-close') {
    const overlay = document.getElementById('cart-drawer-overlay');
    if (overlay) overlay.classList.remove('open');
    return;
  }
  // Close drawer by tapping backdrop
  const overlay = document.getElementById('cart-drawer-overlay');
  if (overlay && e.target === overlay) {
    overlay.classList.remove('open');
    return;
  }
});

/* Init */
render();
