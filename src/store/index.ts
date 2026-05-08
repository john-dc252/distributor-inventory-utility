import {createStore, produce, unwrap} from "solid-js/store";
import {dbGet, dbSet} from "./db";
import {createAsync} from "@solidjs/router";
import {createEffect, createSignal} from "solid-js";

// ── Account schema ─────────────────────────────────────────────────────────────
export interface Account {
  code: string;
  name: string;
  subAccounts: Account[];
  description?: string;
  customerSpecific: boolean;
}

// ── Account type constants (codes – kept for backward compat with stored data) ─
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

export type AccountType = string;

// ── Default account hierarchy ──────────────────────────────────────────────────
export const DEFAULT_ACCOUNTS: Account[] = [
  {
    code: "DISTRIBUTOR_INVENTORY",
    name: "Distributor Inventory",
    customerSpecific: false,
    subAccounts: [
      {
        code: ACCOUNT_TYPES.HELD_UNITS,
        name: "Held Units",
        customerSpecific: true,
        subAccounts: [],
      },
      {
        code: ACCOUNT_TYPES.RETURNED_UNITS_D,
        name: "Returned Units (Distributor)",
        customerSpecific: false,
        subAccounts: [
          {
            code: ACCOUNT_TYPES.USABLE_RETURNED_D,
            name: "Usable Returned Units (Distributor)",
            customerSpecific: false,
            subAccounts: [],
          },
          {
            code: ACCOUNT_TYPES.DEFECTIVE_RETURNED_D,
            name: "Defective Returned Units (Distributor)",
            customerSpecific: false,
            subAccounts: [],
          },
        ],
      },
    ],
  },
  {
    code: "SUPPLIER_INVENTORY",
    name: "Supplier Inventory",
    customerSpecific: false,
    subAccounts: [
      {
        code: ACCOUNT_TYPES.SUPPLIER_DELIVERED,
        name: "Delivered by Supplier",
        customerSpecific: false,
        subAccounts: [],
      },
      {
        code: ACCOUNT_TYPES.RELAYED_TO_DISTRIBUTOR,
        name: "Relayed to Distributor",
        customerSpecific: false,
        subAccounts: [],
      },
      {
        code: ACCOUNT_TYPES.RETURNED_UNITS_S,
        name: "Returned Units (Supplier)",
        customerSpecific: false,
        subAccounts: [
          {
            code: ACCOUNT_TYPES.USABLE_RETURNED_S,
            name: "Usable Returned Units (Supplier)",
            customerSpecific: false,
            subAccounts: [],
          },
          {
            code: ACCOUNT_TYPES.DEFECTIVE_RETURNED_S,
            name: "Defective Returned Units (Supplier)",
            customerSpecific: false,
            subAccounts: [],
          },
        ],
      },
    ],
  },
  {
    code: "CUSTOMER_INVENTORY",
    name: "Customer Inventory",
    customerSpecific: false,
    subAccounts: [
      {
        code: ACCOUNT_TYPES.DELIVERED_UNITS,
        name: "Delivered Units",
        customerSpecific: true,
        subAccounts: [],
      },
    ],
  },
];

// ── Predefined account codes (can be edited but not deleted) ───────────────────
function collectCodes(accounts: Account[]): string[] {
  const result: string[] = [];
  function walk(accs: Account[]) {
    for (const acc of accs) {
      result.push(acc.code);
      walk(acc.subAccounts);
    }
  }
  walk(accounts);
  return result;
}

export const PREDEFINED_ACCOUNT_CODES = new Set<string>(collectCodes(DEFAULT_ACCOUNTS));

// ── Supplier negative-sign accounts (static, derived from DEFAULT_ACCOUNTS) ────
function getDescendantCodes(account: Account): string[] {
  const result: string[] = [];
  function walk(acc: Account) {
    for (const child of acc.subAccounts) {
      result.push(child.code);
      walk(child);
    }
  }
  walk(account);
  return result;
}

const _SUPPLIER_RETURNED = new Set<string>([ACCOUNT_TYPES.USABLE_RETURNED_S, ACCOUNT_TYPES.DEFECTIVE_RETURNED_S]);
const _supplierDefault = DEFAULT_ACCOUNTS.find(a => a.code === "SUPPLIER_INVENTORY")!;
export const SUPPLIER_INVENTORY_NEGATIVE_SUBACCOUNTS = Object.freeze(new Set(
  getDescendantCodes(_supplierDefault).filter(c => !_SUPPLIER_RETURNED.has(c))
));

// ── Pure account tree helpers (do not need state) ─────────────────────────────
export function getLeafAccounts(accounts: Account[]): Account[] {
  const result: Account[] = [];
  function walk(accs: Account[]) {
    for (const acc of accs) {
      if (acc.subAccounts.length === 0) result.push(acc);
      else walk(acc.subAccounts);
    }
  }
  walk(accounts);
  return result;
}

// ── Entity interfaces ──────────────────────────────────────────────────────────
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
  accounts: Account[];
}

// ── Default transaction templates ─────────────────────────────────────────────
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
  accounts: DEFAULT_ACCOUNTS,
});

export const [isLoaded, setIsLoaded] = createSignal(false);

function suspend(t: number) {
  return new Promise<void>(resolve => setTimeout(() => resolve(), t));
}

// ── Reactive account helpers (read state.accounts) ────────────────────────────
function findAccount(accounts: Account[], code: string): Account | undefined {
  for (const acc of accounts) {
    if (acc.code === code) return acc;
    const found = findAccount(acc.subAccounts, code);
    if (found) return found;
  }
}

export function getAccountLabel(code: string): string {
  return findAccount(state.accounts, code)?.name ?? code;
}

export function isPerCustomer(code: string): boolean {
  return findAccount(state.accounts, code)?.customerSpecific ?? false;
}

export function accountCodeExists(code: string): boolean {
  return !!findAccount(state.accounts, code);
}

// ── Data loading ──────────────────────────────────────────────────────────────
export function loadStoredData() {
  const getStoredData = createAsync<StoreState>(async () => {
    const data = {
      items: await load<Item[]>("items", []),
      customers: await load<Customer[]>("customers", []),
      templates: await load<Template[]>("templates", DEFAULT_TEMPLATES as Template[]),
      transactions: await load<Transaction[]>("transactions", []),
      accounts: await load<Account[]>("accounts", DEFAULT_ACCOUNTS),
    };

    await suspend(1500);

    return data;
  });

  createEffect(() => {
    const data = getStoredData();
    if (data) {
      const unwrapped = unwrap(data);
      console.log('Loaded stored data', unwrapped);
      setState(unwrapped);
      setIsLoaded(true);
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

// ── Account actions ───────────────────────────────────────────────────────────
export async function addAccount(parentCode: string | null, account: Omit<Account, "subAccounts">) {
  const newAccount: Account = {...account, subAccounts: []};
  setState("accounts", produce((accs) => {
    if (parentCode === null) {
      accs.push(newAccount);
      return;
    }
    function addToParent(list: Account[]): boolean {
      for (const acc of list) {
        if (acc.code === parentCode) {
          acc.subAccounts.push(newAccount);
          return true;
        }
        if (addToParent(acc.subAccounts)) return true;
      }
      return false;
    }
    addToParent(accs);
  }));
  await persist(["accounts"]);
}

export async function updateAccount(code: string, fields: Partial<Omit<Account, "code" | "subAccounts">>) {
  setState("accounts", produce((accs) => {
    function update(list: Account[]): boolean {
      for (const acc of list) {
        if (acc.code === code) {
          Object.assign(acc, fields);
          return true;
        }
        if (update(acc.subAccounts)) return true;
      }
      return false;
    }
    update(accs);
  }));
  await persist(["accounts"]);
}

export async function deleteAccount(code: string) {
  setState("accounts", produce((accs) => {
    function remove(list: Account[]): boolean {
      const idx = list.findIndex(a => a.code === code);
      if (idx !== -1) {
        list.splice(idx, 1);
        return true;
      }
      for (const acc of list) {
        if (remove(acc.subAccounts)) return true;
      }
      return false;
    }
    remove(accs);
  }));
  await persist(["accounts"]);
}

// ── Balance helper ────────────────────────────────────────────────────────────
const isMatchingLeg = (leg: Leg, accountType: AccountType, customerId: string | null) =>
  leg.accountType === accountType && (customerId == null || leg.customerId === customerId);

const sumMatchingLegs = (legs: Leg[] | undefined, accountType: AccountType, customerId: string | null) =>
  (legs ?? []).values()
    .filter(leg => isMatchingLeg(leg, accountType, customerId))
    .reduce((sum, leg) => sum + leg.qty, 0);

export function computeBalance(
  accountType: AccountType,
  customerId: string | null,
  itemId: string | null,
  transactions: Transaction[]
): number {
  return transactions.values()
    .flatMap(tx => tx.entries)
    .filter(entry => itemId == null || entry.itemId === itemId)
    .reduce((balance, entry) => {
      const totalOut = sumMatchingLegs(entry.sources, accountType, customerId);
      const totalIn = sumMatchingLegs(entry.destinations, accountType, customerId);
      return balance + totalIn - totalOut;
    }, 0);
}

export {state};
