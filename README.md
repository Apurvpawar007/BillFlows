# The Fried Cafe POS

A fast, mobile-friendly POS and order management web app. Pure HTML/CSS/JS — no build step, no npm install.

## Run it

1. Put `index.html`, `style.css`, and `app.js` in the same folder.
2. Open `index.html` in a browser (double-click it, or use VS Code's "Live Server" extension for auto-reload).
3. That's it — the app runs entirely in the browser.

## Data & persistence

All data (menu, orders, expenses, settings) is stored in the browser's `localStorage`, so it survives page refreshes. Data is per-browser/per-device — it won't sync across devices on its own.

Storage keys used: `fcpos_menu`, `fcpos_orders`, `fcpos_expenses`, `fcpos_settings`, `fcpos_cart_draft` (the in-progress cart, so a refresh mid-order doesn't lose it).

## Flow

Dashboard → New Order → click items → Cart → customer details (optional) → BILL PAID / BILL NOT PAID → Complete Order → receipt.

Unpaid orders stay in **Unpaid Bills** until marked paid; they never disappear on their own.

## File structure

```
fried-cafe-pos/
├── index.html   # shell + nav
├── style.css    # design system / styles
├── app.js       # all state, storage, rendering, and events
└── README.md
```

## Extending later

The code is intentionally framework-free and centralized so it's easy to swap pieces out:

- **Cloud database**: replace the `loadJSON`/`saveJSON` calls (top of `app.js`) with API calls to your backend — the rest of the app just reads/writes `menu`, `orders`, `expenses`, `settings` in memory.
- **WhatsApp bills**: the `receiptHTML(order)` function already builds a clean receipt string you can reuse/send.
- **UPI integration**: hook into the "Complete Order" / "Mark as Paid" payment-method flow (`completeOrder()` and `confirmMarkPaid()`).
- **Staff accounts**: add an auth layer before `render()` runs; user info can be stored alongside `settings`.

## Customizing the menu

Go to the **Menu** tab → Add/Edit/Delete items, set price, cost, category, image URL, and availability. Unavailable items are automatically hidden from New Order.
