import {createStore, unwrap} from "solid-js/store";
import {dbGet, dbSet} from "./db";
import {createAsync} from "@solidjs/router";
import {createEffect} from "solid-js";

// ── Account type constants ────────────────────────────────────────────────────
const ROOT_ACCOUNT_TYPES = {
  DISTRIBUTOR_INVENTORY: 'DISTRIBUTOR_INVENTORY',
  SUPPLIER_INVENTORY: 'SUPPLIER_INVENTORY',
  CUSTOMER_INVENTORY: 'CUSTOMER_INVENTORY',
} as const;

export const ACCOUNT_TYPES = {
  RELAYED_TO_DISTRIBUTOR: 'RELAYED_TO_DISTRIBUTOR',
  SUPPLIER_DELIVERED: 'SUPPLIER_DELIVERED',
  RETURNED_UNITS_S: 'RETURNED_UNITS_S',
  USABLE_RETURNED_S: 'USABLE_RETURNED_S',
  DEFECTIVE_RETURNED_S: 'DEFECTIVE_RETURNED_S',
  HELD_UNITS: 'HELD_UNITS',
  RETURNED_UNITS_D: 'RETURNED_UNITS_D',
  USABLE_RETURNED_D: 'USABLE_RETURNED_D',
  DEFECTIVE_RETURNED_D: 'DEFECTIVE_RETURNED_D',
  DELIVERED_UNITS: 'DELIVERED_UNITS',
  OTHER: 'OTHER',
} as const;

export type RootAccountType = typeof ROOT_ACCOUNT_TYPES[keyof typeof ROOT_ACCOUNT_TYPES];
export type AccountType = typeof ACCOUNT_TYPES[keyof typeof ACCOUNT_TYPES];

export class InvAccount {
  type: AccountType | RootAccountType;
  children: InvAccount[];


  constructor(type: AccountType | RootAccountType, children: InvAccount[] = []) {
    this.type = type;
    this.children = children;
  }
}

export const ACCOUNTS_HIERARCHY = Object.freeze([
  new InvAccount(ROOT_ACCOUNT_TYPES.DISTRIBUTOR_INVENTORY, [
    new InvAccount(ACCOUNT_TYPES.HELD_UNITS),
    new InvAccount(ACCOUNT_TYPES.RETURNED_UNITS_D, [
      new InvAccount(ACCOUNT_TYPES.USABLE_RETURNED_D),
      new InvAccount(ACCOUNT_TYPES.DEFECTIVE_RETURNED_D),
    ]),
  ]),
  new InvAccount(ROOT_ACCOUNT_TYPES.SUPPLIER_INVENTORY, [
    new InvAccount(ACCOUNT_TYPES.SUPPLIER_DELIVERED),
    new InvAccount(ACCOUNT_TYPES.RELAYED_TO_DISTRIBUTOR),
    new InvAccount(ACCOUNT_TYPES.RETURNED_UNITS_S, [
      new InvAccount(ACCOUNT_TYPES.USABLE_RETURNED_S),
      new InvAccount(ACCOUNT_TYPES.DEFECTIVE_RETURNED_S),
    ]),
  ]),
  new InvAccount(ROOT_ACCOUNT_TYPES.CUSTOMER_INVENTORY, [
    new InvAccount(ACCOUNT_TYPES.DELIVERED_UNITS),
  ]),
]);

export interface Item {
  id: string;
  name: string;
  createdAt: string;
  description?: string;
  photo?: string;
}

export interface Customer {
  id: string;
  name: string;
  createdAt: string;
  description?: string;
  photo?: string;
}

export interface Leg {
  accountType: AccountType;
  customerId?: string | null;
  qty: number;
}

export interface Entry {
  itemId: string;
  sources: Leg[];
  destinations: Leg[];
}

export interface Transaction {
  id: string;
  templateId?: string | null;
  templateName: string;
  date: string;
  note: string;
  entries: Entry[];
  createdAt: string;
}

export interface TemplateEntry {
  sources: { accountType: AccountType }[];
  destinations: { accountType: AccountType }[];
}

export interface Template {
  id: string;
  name: string;
  entries: TemplateEntry[];
}

export interface StoreState {
  items: Item[];
  customers: Customer[];
  templates: Template[];
  transactions: Transaction[];
}

export const ACCOUNT_LABELS = {
  [ROOT_ACCOUNT_TYPES.DISTRIBUTOR_INVENTORY]: 'Distributor Inventory',
  [ROOT_ACCOUNT_TYPES.SUPPLIER_INVENTORY]: 'Supplier Inventory',
  [ROOT_ACCOUNT_TYPES.CUSTOMER_INVENTORY]: 'Customer Inventory',
  [ACCOUNT_TYPES.RELAYED_TO_DISTRIBUTOR]: 'Relayed to Distributor',
  [ACCOUNT_TYPES.SUPPLIER_DELIVERED]: 'Delivered by Supplier',
  [ACCOUNT_TYPES.USABLE_RETURNED_S]: 'Usable Returned Units (SUPPLIER)',
  [ACCOUNT_TYPES.DEFECTIVE_RETURNED_S]: 'Defective Returned Units (SUPPLIER)',
  [ACCOUNT_TYPES.HELD_UNITS]: 'Held Units',
  [ACCOUNT_TYPES.RETURNED_UNITS_D]: 'Returned Units',
  [ACCOUNT_TYPES.RETURNED_UNITS_S]: 'Returned Units',
  [ACCOUNT_TYPES.USABLE_RETURNED_D]: 'Usable Returned Units (DISTRIBUTOR)',
  [ACCOUNT_TYPES.DEFECTIVE_RETURNED_D]: 'Defective Returned Units (DISTRIBUTOR)',
  [ACCOUNT_TYPES.DELIVERED_UNITS]: 'Delivered Units',
  [ACCOUNT_TYPES.OTHER]: 'Other',
};

// Accounts that require a customer selection
export const PER_CUSTOMER_ACCOUNTS = new Set<AccountType>([
  ACCOUNT_TYPES.HELD_UNITS,
  ACCOUNT_TYPES.DELIVERED_UNITS,
]);

// ── Default transaction templates ─────────────────────────────────────────────
// Template entries define account types only; customers/items/qtys are filled at transaction time.
export const DEFAULT_TEMPLATES = [
  {
    id: "tpl-1",
    name: "Supplier delivered units to customer",
    entries: [{
      sources: [{accountType: ACCOUNT_TYPES.SUPPLIER_DELIVERED}],
      destinations: [{accountType: ACCOUNT_TYPES.DELIVERED_UNITS}]
    }],
  },
  {
    id: "tpl-2",
    name: "Unpaid units received by distributor from supplier",
    entries: [{
      sources: [{accountType: ACCOUNT_TYPES.RELAYED_TO_DISTRIBUTOR}],
      destinations: [{accountType: ACCOUNT_TYPES.HELD_UNITS}]
    }],
  },
  {
    id: "tpl-3",
    name: "Units delivered by distributor to customer after payment",
    entries: [{
      sources: [{accountType: ACCOUNT_TYPES.HELD_UNITS}],
      destinations: [{accountType: ACCOUNT_TYPES.DELIVERED_UNITS}]
    }],
  },
  {
    id: "tpl-4",
    name: "Customer returned usable units to distributor",
    entries: [{
      sources: [{accountType: ACCOUNT_TYPES.DELIVERED_UNITS}],
      destinations: [{accountType: ACCOUNT_TYPES.USABLE_RETURNED_D}]
    }],
  },
  {
    id: "tpl-5",
    name: "Customer returned defective units to distributor",
    entries: [{
      sources: [{accountType: ACCOUNT_TYPES.DELIVERED_UNITS}],
      destinations: [{accountType: ACCOUNT_TYPES.DEFECTIVE_RETURNED_D}]
    }],
  },
  {
    id: "tpl-6",
    name: "Customer returned usable units to supplier",
    entries: [{
      sources: [{accountType: ACCOUNT_TYPES.DELIVERED_UNITS}],
      destinations: [{accountType: ACCOUNT_TYPES.USABLE_RETURNED_S}]
    }],
  },
  {
    id: "tpl-7",
    name: "Customer returned defective units to supplier",
    entries: [{
      sources: [{accountType: ACCOUNT_TYPES.DELIVERED_UNITS}],
      destinations: [{accountType: ACCOUNT_TYPES.DEFECTIVE_RETURNED_S}]
    }],
  },
  {
    id: "tpl-8",
    name: "Distributor returned usable units to supplier",
    entries: [{
      sources: [{accountType: ACCOUNT_TYPES.USABLE_RETURNED_D}],
      destinations: [{accountType: ACCOUNT_TYPES.USABLE_RETURNED_S}]
    }],
  },
  {
    id: "tpl-9",
    name: "Distributor returned defective units to supplier",
    entries: [{
      sources: [{accountType: ACCOUNT_TYPES.DEFECTIVE_RETURNED_D}],
      destinations: [{accountType: ACCOUNT_TYPES.DEFECTIVE_RETURNED_S}]
    }],
  },
];

// ── Persistence helpers ───────────────────────────────────────────────────────
async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await dbGet<T>(key);
    return raw ?? fallback;
  } catch {
    return fallback;
  }
}

async function save<T>(key: string, value: T) {
  try {
    await dbSet(key, value);
  } catch (e) {
    console.error("Error:", e);
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ── Store ─────────────────────────────────────────────────────────────────────
const [state, setState] = createStore<StoreState>({
  items: [],
  customers: [],
  templates: [],
  transactions: [],
});

export function loadStoredData() {
  const getStoredData = createAsync<StoreState>(async () => ({
    items: await load<Item[]>("items", []),
    customers: await load<Customer[]>("customers", []),
    templates: await load<Template[]>("templates", DEFAULT_TEMPLATES as Template[]),
    transactions: await load<Transaction[]>("transactions", []),
  }));

  createEffect(() => {
    const data = getStoredData();
    if (data) {
      const unwrapped = unwrap(data);
      console.log('Loaded stored data', unwrapped);
      setState(unwrapped);
    }
  });
}

async function persist(keys: (keyof StoreState)[]) {
  await Promise.all(
    keys.map(key => save(key, unwrap(state[key])))
  );
}

// ── Item actions ──────────────────────────────────────────────────────────────
export async function addItem(item: Omit<Item, "createdAt">) {
  setState("items", (arr) => [...arr, {...item, createdAt: new Date().toISOString()} as Item]);
  await persist(["items"]);
}

export async function updateItem(id: string, fields: Partial<Item>) {
  setState("items", (arr) => arr.map((x) => (x.id === id ? {...x, ...fields} : x)));
  await persist(["items"]);
}

export async function deleteItem(id: string) {
  setState("items", (arr) => arr.filter((x) => x.id !== id));
  await persist(["items"]);
}

export function itemIdExists(id: string, excludeId?: string) {
  return state.items.some((x) => x.id === id && x.id !== excludeId);
}

// ── Customer actions ──────────────────────────────────────────────────────────
export async function addCustomer(customer: Omit<Customer, "id" | "createdAt">) {
  setState("customers", (arr) => [...arr, {...customer, id: newId(), createdAt: new Date().toISOString()} as Customer]);
  await persist(["customers"]);
}

export async function updateCustomer(id: string, fields: Partial<Customer>) {
  setState("customers", (arr) => arr.map((x) => (x.id === id ? {...x, ...fields} : x)));
  await persist(["customers"]);
}

export async function deleteCustomer(id: string) {
  setState("customers", (arr) => arr.filter((x) => x.id !== id));
  await persist(["customers"]);
}

// ── Template actions ──────────────────────────────────────────────────────────
export async function addTemplate(template: Omit<Template, "id">) {
  setState("templates", (ts) => [...ts, {...template, id: newId()} as Template]);
  await persist(["templates"]);
}

export async function updateTemplate(id: string, fields: Partial<Template>) {
  setState("templates", (ts) => ts.map((t) => (t.id === id ? {...t, ...fields} : t)));
  await persist(["templates"]);
}

export async function deleteTemplate(id: string) {
  setState("templates", (ts) => ts.filter((t) => t.id !== id));
  await persist(["templates"]);
}

export async function resetTemplatesToDefault() {
  setState("templates", DEFAULT_TEMPLATES as Template[]);
  await persist(["templates"]);
}

// ── Transaction actions ───────────────────────────────────────────────────────
export async function addTransaction(tx: Omit<Transaction, "id" | "createdAt">) {
  setState("transactions", (txs) => [{...tx, id: newId(), createdAt: new Date().toISOString()} as Transaction, ...txs]);
  await persist(["transactions"]);
}

export async function deleteTransaction(id: string) {
  setState("transactions", (txs) => txs.filter((t) => t.id !== id));
  await persist(["transactions"]);
}

// ── Balance helper (used by AccountsPage) ─────────────────────────────────────
// Define a helper to check if a leg matches our target criteria
const isMatchingLeg = (leg: Leg, accountType: AccountType, customerId: string | null) =>
  leg.accountType === accountType && (customerId == null || leg.customerId === customerId);

// Define a helper to sum the quantities of matching legs
const sumMatchingLegs = (legs: Leg[] | undefined, accountType: AccountType, customerId: string | null) =>
  (legs ?? [])
    .filter(leg => isMatchingLeg(leg, accountType, customerId))
    .reduce((sum, leg) => sum + leg.qty, 0);

// Returns net qty for a given account/customer/item across all transactions.
export function computeBalance(
  accountType: AccountType,
  customerId: string | null,
  itemId: string | null,
  transactions: Transaction[]
): number {
  // 1. Flatten all entries across all transactions
  const allEntries = transactions.values().flatMap(tx => tx.entries);

  // 2. Filter out entries that don't match the itemId (if provided)
  const relevantEntries = allEntries.filter(entry =>
    itemId == null || entry.itemId === itemId
  );

  // 3. Calculate the net balance
  return relevantEntries.reduce((balance, entry) => {
    const totalOut = sumMatchingLegs(entry.sources, accountType, customerId);
    const totalIn = sumMatchingLegs(entry.destinations, accountType, customerId);

    return balance + totalIn - totalOut;
  }, 0);
}

export {state};
