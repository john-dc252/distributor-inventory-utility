import {createStore, produce, unwrap} from "solid-js/store";
import {dbGet, dbSet} from "./db";
import {createAsync} from "@solidjs/router";
import {createEffect, createSignal} from "solid-js";

// ── Account schema ─────────────────────────────────────────────────────────────
export interface IAccount {
  readonly id: string; // stable UUID – used as reference in transaction legs
  code: string;        // display code – editable, no referential meaning
  name: string;
  subAccounts: IAccount[];
  description?: string;
  customerSpecific: boolean;
}

export class Account implements IAccount {
  readonly id: string;
  code: string = "";
  name: string = "";
  subAccounts: IAccount[] = [];
  description?: string;
  customerSpecific: boolean = false;

  constructor(arg?: string | IAccount) {
    if (typeof arg === "string") {
      this.id = arg;
    } else if (arg != null) {
      this.id = arg.id;
      this.code = arg.code;
      this.name = arg.name;
      this.subAccounts = arg.subAccounts;
      this.description = arg.description;
      this.customerSpecific = arg.customerSpecific;
    } else {
      this.id = newId();
    }
  }
}

export type AccountType = string; // stores account UUID

// ── Stable UUIDs for predefined accounts ──────────────────────────────────────
export const PREDEFINED_ACCOUNT_IDS = {
  // Root accounts
  DISTRIBUTOR_INVENTORY: "a016acf2-551f-4640-aec9-e41d0eb17635",
  SUPPLIER_INVENTORY: "dfe579ed-cbab-4138-9cb1-e1a5c4c992d5",
  CUSTOMER_INVENTORY: "85d62c23-3f6d-4744-aa95-2fa862f184a9",
  OTHERS: "668bec34-e3ed-4ba0-a1a8-beaeb36e61ec",
  // Distributor sub-accounts (1xxxxx)
  HELD_UNITS: "1dd4cd20-482a-4428-b256-89aa9312e9fd",
  RETURNED_UNITS_D: "e54d4b1d-5720-449b-b5e8-7b28c68c3418",
  USABLE_RETURNED_D: "8d43848f-d2fa-4bbb-b58f-9b0c2de83dbe",
  DEFECTIVE_RETURNED_D: "39f2c70f-1387-4e4c-a7de-d962e94edd88",
  // Supplier sub-accounts (2xxxxx)
  SUPPLIER_DELIVERED: "fd962c64-5ab9-4f2b-8533-bd21a1490567",
  RELAYED_TO_DISTRIBUTOR: "88e644cc-f4ed-4a1f-be7b-162665656e43",
  RETURNED_UNITS_S: "8e3701b1-8bd5-4e2b-b832-70e3781d1125",
  USABLE_RETURNED_S: "caa9b722-a29d-41a6-b5c6-635c17f7a602",
  DEFECTIVE_RETURNED_S: "f2ebe8eb-fbba-4009-83f8-f50be1ba1308",
  // Customer sub-accounts (3xxxxx)
  DELIVERED_UNITS: "8436a4ba-87c9-45c8-bf2b-9cfceb994968",
} as const;

export const PREDEFINED_ACCOUNT_ID_SET = new Set<string>(Object.values(PREDEFINED_ACCOUNT_IDS));

// ── Default account hierarchy ──────────────────────────────────────────────────
const ACCT = PREDEFINED_ACCOUNT_IDS; // shorthand

export const DEFAULT_ACCOUNTS: IAccount[] = [
  {
    id: ACCT.DISTRIBUTOR_INVENTORY, code: "10000", name: "Distributor Inventory",
    customerSpecific: false,
    subAccounts: [
      {
        id: ACCT.HELD_UNITS, code: "11000", name: "Held Units",
        customerSpecific: true, subAccounts: [],
      },
      {
        id: ACCT.RETURNED_UNITS_D, code: "12000", name: "Returned Units (Distributor)",
        customerSpecific: false,
        subAccounts: [
          {
            id: ACCT.USABLE_RETURNED_D, code: "12100", name: "Usable Returned Units (Distributor)",
            customerSpecific: false, subAccounts: [],
          },
          {
            id: ACCT.DEFECTIVE_RETURNED_D, code: "12200", name: "Defective Returned Units (Distributor)",
            customerSpecific: false, subAccounts: [],
          },
        ],
      },
    ],
  },
  {
    id: ACCT.SUPPLIER_INVENTORY, code: "20000", name: "Supplier Inventory",
    customerSpecific: false,
    subAccounts: [
      {
        id: ACCT.SUPPLIER_DELIVERED, code: "21000", name: "Delivered by Supplier",
        customerSpecific: false, subAccounts: [],
      },
      {
        id: ACCT.RELAYED_TO_DISTRIBUTOR, code: "22000", name: "Relayed to Distributor",
        customerSpecific: false, subAccounts: [],
      },
      {
        id: ACCT.RETURNED_UNITS_S, code: "23000", name: "Returned Units (Supplier)",
        customerSpecific: false,
        subAccounts: [
          {
            id: ACCT.USABLE_RETURNED_S, code: "23100", name: "Usable Returned Units (Supplier)",
            customerSpecific: false, subAccounts: [],
          },
          {
            id: ACCT.DEFECTIVE_RETURNED_S, code: "23200", name: "Defective Returned Units (Supplier)",
            customerSpecific: false, subAccounts: [],
          },
        ],
      },
    ],
  },
  {
    id: ACCT.CUSTOMER_INVENTORY, code: "30000", name: "Customer Inventory",
    customerSpecific: false,
    subAccounts: [
      {
        id: ACCT.DELIVERED_UNITS, code: "31000", name: "Delivered Units",
        customerSpecific: true, subAccounts: [],
      },
    ],
  },
  {
    id: ACCT.OTHERS, code: "40000", name: "Others",
    customerSpecific: false, subAccounts: [],
  },
];

// ── Supplier negative-sign sub-accounts (static) ───────────────────────────────
function getDescendantIds(account: IAccount): string[] {
  const result: string[] = [];

  function walk(acc: IAccount) {
    for (const child of acc.subAccounts) {
      result.push(child.id);
      walk(child);
    }
  }

  walk(account);
  return result;
}

const _SUPPLIER_RETURNED_IDS = new Set<string>([ACCT.USABLE_RETURNED_S, ACCT.DEFECTIVE_RETURNED_S]);
const _supplierDefault = DEFAULT_ACCOUNTS.find(a => a.id === ACCT.SUPPLIER_INVENTORY)!;
export const SUPPLIER_INVENTORY_NEGATIVE_SUBACCOUNTS = Object.freeze(new Set(
  getDescendantIds(_supplierDefault).filter(id => !_SUPPLIER_RETURNED_IDS.has(id))
));

// ── Pure account tree helpers ──────────────────────────────────────────────────
export function getLeafAccounts(accounts: IAccount[]): IAccount[] {
  const result: IAccount[] = [];

  function walk(accs: IAccount[]) {
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
  accountType: AccountType; // stores account UUID
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
  accounts: IAccount[];
}

// ── Default transaction templates (accountType = account UUID) ─────────────────
export const DEFAULT_TEMPLATES = [
  {
    id: "tpl-1",
    name: "Supplier delivered units to customer",
    entries: [{
      sources: [{accountType: ACCT.SUPPLIER_DELIVERED}],
      destinations: [{accountType: ACCT.DELIVERED_UNITS}],
    }],
  },
  {
    id: "tpl-2",
    name: "Unpaid units received by distributor from supplier",
    entries: [{
      sources: [{accountType: ACCT.RELAYED_TO_DISTRIBUTOR}],
      destinations: [{accountType: ACCT.HELD_UNITS}],
    }],
  },
  {
    id: "tpl-3",
    name: "Units delivered by distributor to customer after payment",
    entries: [{
      sources: [{accountType: ACCT.HELD_UNITS}],
      destinations: [{accountType: ACCT.DELIVERED_UNITS}],
    }],
  },
  {
    id: "tpl-4",
    name: "Customer returned usable units to distributor",
    entries: [{
      sources: [{accountType: ACCT.DELIVERED_UNITS}],
      destinations: [{accountType: ACCT.USABLE_RETURNED_D}],
    }],
  },
  {
    id: "tpl-5",
    name: "Customer returned defective units to distributor",
    entries: [{
      sources: [{accountType: ACCT.DELIVERED_UNITS}],
      destinations: [{accountType: ACCT.DEFECTIVE_RETURNED_D}],
    }],
  },
  {
    id: "tpl-6",
    name: "Customer returned usable units to supplier",
    entries: [{
      sources: [{accountType: ACCT.DELIVERED_UNITS}],
      destinations: [{accountType: ACCT.USABLE_RETURNED_S}],
    }],
  },
  {
    id: "tpl-7",
    name: "Customer returned defective units to supplier",
    entries: [{
      sources: [{accountType: ACCT.DELIVERED_UNITS}],
      destinations: [{accountType: ACCT.DEFECTIVE_RETURNED_S}],
    }],
  },
  {
    id: "tpl-8",
    name: "Distributor returned usable units to supplier",
    entries: [{
      sources: [{accountType: ACCT.USABLE_RETURNED_D}],
      destinations: [{accountType: ACCT.USABLE_RETURNED_S}],
    }],
  },
  {
    id: "tpl-9",
    name: "Distributor returned defective units to supplier",
    entries: [{
      sources: [{accountType: ACCT.DEFECTIVE_RETURNED_D}],
      destinations: [{accountType: ACCT.DEFECTIVE_RETURNED_S}],
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

// ── Reactive account helpers ───────────────────────────────────────────────────
function findAccountById(accounts: IAccount[], id: string): IAccount | undefined {
  for (const acc of accounts) {
    if (acc.id === id) return acc;
    const found = findAccountById(acc.subAccounts, id);
    if (found) return found;
  }
}

function findAccountByCode(accounts: IAccount[], code: string): IAccount | undefined {
  for (const acc of accounts) {
    if (acc.code === code) return acc;
    const found = findAccountByCode(acc.subAccounts, code);
    if (found) return found;
  }
}

export function getAccountLabel(id: string): string {
  return findAccountById(state.accounts, id)?.name ?? id;
}

export function isPerCustomer(id: string): boolean {
  return findAccountById(state.accounts, id)?.customerSpecific ?? false;
}

export function accountCodeExists(code: string, excludeId?: string): boolean {
  const found = findAccountByCode(state.accounts, code);
  if (!found) return false;
  return found.id !== excludeId;
}

// ── Data loading ──────────────────────────────────────────────────────────────
export function loadStoredData() {
  const getStoredData = createAsync<StoreState>(async () => {
    const data = {
      items: await load<Item[]>("items", []),
      customers: await load<Customer[]>("customers", []),
      templates: await load<Template[]>("templates", DEFAULT_TEMPLATES as Template[]),
      transactions: await load<Transaction[]>("transactions", []),
      accounts: await load<IAccount[]>("accounts", DEFAULT_ACCOUNTS),
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
export async function addAccount(parentId: string | null, account: Omit<IAccount, "id" | "subAccounts">) {
  const newAccount = Object.assign(new Account(), {...account, subAccounts: []});
  setState("accounts", produce((accs) => {
    if (parentId === null) {
      accs.push(newAccount);
      return;
    }

    function addToParent(list: IAccount[]): boolean {
      for (const acc of list) {
        if (acc.id === parentId) {
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

export async function updateAccount(id: string, fields: Partial<Omit<IAccount, "id" | "subAccounts">>) {
  setState("accounts", produce((accs) => {
    function update(list: IAccount[]): boolean {
      for (const acc of list) {
        if (acc.id === id) {
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

export async function deleteAccount(id: string) {
  setState("accounts", produce((accs) => {
    function remove(list: IAccount[]): boolean {
      const idx = list.findIndex(a => a.id === id);
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
