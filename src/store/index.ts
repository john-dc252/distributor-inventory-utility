import { createStore } from "solid-js/store";

// ── Account type constants ────────────────────────────────────────────────────
export const ACCOUNT_TYPES = {
  RELAYED_TO_DISTRIBUTOR: "RELAYED_TO_DISTRIBUTOR",
  SUPPLIER_DIRECT: "SUPPLIER_DIRECT",
  USABLE_RETURNED_S: "USABLE_RETURNED_S",
  DEFECTIVE_RETURNED_S: "DEFECTIVE_RETURNED_S",
  HELD_UNITS: "HELD_UNITS",
  USABLE_RETURNED_D: "USABLE_RETURNED_D",
  DEFECTIVE_RETURNED_D: "DEFECTIVE_RETURNED_D",
  DELIVERED_UNITS: "DELIVERED_UNITS",
  OTHER: "OTHER",
};

export const ACCOUNT_LABELS = {
  RELAYED_TO_DISTRIBUTOR: "Relayed to Distributor",
  SUPPLIER_DIRECT: "Supplier Direct",
  USABLE_RETURNED_S: "Usable Returned Units @S",
  DEFECTIVE_RETURNED_S: "Defective Returned Units @S",
  HELD_UNITS: "Held Units",
  USABLE_RETURNED_D: "Usable Returned Units @D",
  DEFECTIVE_RETURNED_D: "Defective Returned Units @D",
  DELIVERED_UNITS: "Delivered Units",
  OTHER: "Other",
};

// Accounts that require a customer selection
export const PER_CUSTOMER_ACCOUNTS = new Set([
  ACCOUNT_TYPES.HELD_UNITS,
  ACCOUNT_TYPES.DELIVERED_UNITS,
]);

// ── Default transaction templates ─────────────────────────────────────────────
// Template entries define account types only; customers/items/qtys are filled at transaction time.
export const DEFAULT_TEMPLATES = [
  {
    id: "tpl-1",
    name: "Supplier delivered units to customer",
    entries: [{ froms: [{ accountType: ACCOUNT_TYPES.SUPPLIER_DIRECT }], tos: [{ accountType: ACCOUNT_TYPES.DELIVERED_UNITS }] }],
  },
  {
    id: "tpl-2",
    name: "Unpaid units received by distributor from supplier",
    entries: [{ froms: [{ accountType: ACCOUNT_TYPES.RELAYED_TO_DISTRIBUTOR }], tos: [{ accountType: ACCOUNT_TYPES.HELD_UNITS }] }],
  },
  {
    id: "tpl-3",
    name: "Units delivered by distributor to customer after payment",
    entries: [{ froms: [{ accountType: ACCOUNT_TYPES.HELD_UNITS }], tos: [{ accountType: ACCOUNT_TYPES.DELIVERED_UNITS }] }],
  },
  {
    id: "tpl-4",
    name: "Customer returned usable units to distributor",
    entries: [{ froms: [{ accountType: ACCOUNT_TYPES.DELIVERED_UNITS }], tos: [{ accountType: ACCOUNT_TYPES.USABLE_RETURNED_D }] }],
  },
  {
    id: "tpl-5",
    name: "Customer returned defective units to distributor",
    entries: [{ froms: [{ accountType: ACCOUNT_TYPES.DELIVERED_UNITS }], tos: [{ accountType: ACCOUNT_TYPES.DEFECTIVE_RETURNED_D }] }],
  },
  {
    id: "tpl-6",
    name: "Customer returned usable units to supplier",
    entries: [{ froms: [{ accountType: ACCOUNT_TYPES.DELIVERED_UNITS }], tos: [{ accountType: ACCOUNT_TYPES.USABLE_RETURNED_S }] }],
  },
  {
    id: "tpl-7",
    name: "Customer returned defective units to supplier",
    entries: [{ froms: [{ accountType: ACCOUNT_TYPES.DELIVERED_UNITS }], tos: [{ accountType: ACCOUNT_TYPES.DEFECTIVE_RETURNED_S }] }],
  },
  {
    id: "tpl-8",
    name: "Distributor returned usable units to supplier",
    entries: [{ froms: [{ accountType: ACCOUNT_TYPES.USABLE_RETURNED_D }], tos: [{ accountType: ACCOUNT_TYPES.USABLE_RETURNED_S }] }],
  },
  {
    id: "tpl-9",
    name: "Distributor returned defective units to supplier",
    entries: [{ froms: [{ accountType: ACCOUNT_TYPES.DEFECTIVE_RETURNED_D }], tos: [{ accountType: ACCOUNT_TYPES.DEFECTIVE_RETURNED_S }] }],
  },
];

// ── Persistence helpers ───────────────────────────────────────────────────────
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write errors (e.g. quota exceeded, private mode restrictions)
  }
}

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ── Store ─────────────────────────────────────────────────────────────────────
const [state, setState] = createStore({
  items: load("items", []),
  customers: load("customers", []),
  templates: load("templates", DEFAULT_TEMPLATES),
  transactions: load("transactions", []),
});

function persist(keys) {
  if (keys.includes("items")) save("items", state.items);
  if (keys.includes("customers")) save("customers", state.customers);
  if (keys.includes("templates")) save("templates", state.templates);
  if (keys.includes("transactions")) save("transactions", state.transactions);
}

// ── Item actions ──────────────────────────────────────────────────────────────
export function addItem(item) {
  setState("items", (arr) => [...arr, { ...item, createdAt: new Date().toISOString() }]);
  persist(["items"]);
}

export function updateItem(id, fields) {
  setState("items", (arr) => arr.map((x) => (x.id === id ? { ...x, ...fields } : x)));
  persist(["items"]);
}

export function deleteItem(id) {
  setState("items", (arr) => arr.filter((x) => x.id !== id));
  persist(["items"]);
}

export function itemIdExists(id, excludeId) {
  return state.items.some((x) => x.id === id && x.id !== excludeId);
}

// ── Customer actions ──────────────────────────────────────────────────────────
export function addCustomer(customer) {
  setState("customers", (arr) => [...arr, { ...customer, id: newId(), createdAt: new Date().toISOString() }]);
  persist(["customers"]);
}

export function updateCustomer(id, fields) {
  setState("customers", (arr) => arr.map((x) => (x.id === id ? { ...x, ...fields } : x)));
  persist(["customers"]);
}

export function deleteCustomer(id) {
  setState("customers", (arr) => arr.filter((x) => x.id !== id));
  persist(["customers"]);
}

// ── Template actions ──────────────────────────────────────────────────────────
export function addTemplate(template) {
  setState("templates", (ts) => [...ts, { ...template, id: newId() }]);
  persist(["templates"]);
}

export function updateTemplate(id, fields) {
  setState("templates", (ts) => ts.map((t) => (t.id === id ? { ...t, ...fields } : t)));
  persist(["templates"]);
}

export function deleteTemplate(id) {
  setState("templates", (ts) => ts.filter((t) => t.id !== id));
  persist(["templates"]);
}

export function resetTemplatesToDefault() {
  setState("templates", DEFAULT_TEMPLATES);
  persist(["templates"]);
}

// ── Transaction actions ───────────────────────────────────────────────────────
export function addTransaction(tx) {
  setState("transactions", (txs) => [{ ...tx, id: newId(), createdAt: new Date().toISOString() }, ...txs]);
  persist(["transactions"]);
}

export function deleteTransaction(id) {
  setState("transactions", (txs) => txs.filter((t) => t.id !== id));
  persist(["transactions"]);
}

// ── Balance helper (used by AccountsPage) ─────────────────────────────────────
// Returns net qty for a given account/customer/item across all transactions.
export function computeBalance(accountType, customerId, itemId, transactions) {
  return transactions.reduce((sum, tx) => {
    for (const entry of tx.entries) {
      if (itemId != null && entry.itemId !== itemId) continue;
      for (const leg of entry.froms ?? []) {
        if (leg.accountType === accountType && (customerId == null || leg.customerId === customerId))
          sum -= leg.qty;
      }
      for (const leg of entry.tos ?? []) {
        if (leg.accountType === accountType && (customerId == null || leg.customerId === customerId))
          sum += leg.qty;
      }
    }
    return sum;
  }, 0);
}

export { state };
