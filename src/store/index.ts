import {createStore, produce, unwrap} from "solid-js/store";
import {dbGet, dbSet} from "./db";
import {createAsync} from "@solidjs/router";
import {createEffect, createSignal} from "solid-js";
import {suspend} from "../utils";

// ── Account schema ─────────────────────────────────────────────────────────────
export interface Account {
  readonly id: string; // stable UUID – used as reference in transaction legs
  code: string;        // display code – editable, no referential meaning
  name: string;
  subAccounts: Account[];
  description?: string;
  customerSpecific: boolean;
}

export namespace Account {
  /**
   * @param code
   * @param name
   * @param customerSpecific
   * @param subAccounts
   * @param description
   */
  export function create(code: string, name: string, customerSpecific: boolean, subAccounts?: Account[], description?: string): Account;
  /**
   * Create a new {@link Account}
   * @param objOrCode
   * @param name
   * @param customerSpecific
   * @param subAccounts
   * @param description
   */
  export function create(
    objOrCode: Account | string,
    name: string,
    customerSpecific: boolean = false,
    subAccounts: Account[] = [],
    description: string = '',
  ): Account {
    if (typeof objOrCode === "string") {
      return {
        id: newId(),
        code: objOrCode,
        name: name!,
        customerSpecific: customerSpecific!,
        subAccounts: subAccounts ?? [],
        description: description,
      };
    }

    return {
      id: objOrCode.id,
      code: objOrCode.code,
      name: objOrCode.name,
      customerSpecific: objOrCode.customerSpecific,
      subAccounts: objOrCode.subAccounts ?? [],
      description: objOrCode.description,
    };
  }

  /**
   * Create an {@link Account} with a pre-defined id
   */
  export function define(id: string, code: string, name: string, subAccounts: Account[] = [], description?: string): Account {
    return {id, code, name, customerSpecific: false, subAccounts, description};
  }

  /**
   * Create an {@link Account} with a pre-defined id
   */
  export function defineCustomerSpecific(id: string, code: string, name: string, subAccounts: Account[] = [], description?: string): Account {
    return {id, code, name, customerSpecific: true, subAccounts, description};
  }
}

export type AccountId = string; // stores account UUID

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
  // Others sub-accounts (4xxxx)
  CORRECTIONS: "f7fe688a-ce84-4c5c-956b-faf9cbef8631",
} as const;

export const PREDEFINED_ACCOUNT_ID_SET = new Set<string>(Object.values(PREDEFINED_ACCOUNT_IDS));

// ── Default account hierarchy ──────────────────────────────────────────────────
const ACCT = PREDEFINED_ACCOUNT_IDS; // shorthand

export const DEFAULT_ACCOUNTS: Account[] = [
  Account.define(ACCT.DISTRIBUTOR_INVENTORY, "10000", "Distributor Inventory", [
    Account.defineCustomerSpecific(ACCT.HELD_UNITS, "11000", "Held Units"),
    Account.define(ACCT.RETURNED_UNITS_D, "12000", "Returned Units (Distributor)", [
      Account.define(ACCT.USABLE_RETURNED_D, "12100", "Usable Returned Units (Distributor)"),
      Account.define(ACCT.DEFECTIVE_RETURNED_D, "12200", "Defective Returned Units (Distributor)"),
    ]),
  ]),
  Account.define(ACCT.SUPPLIER_INVENTORY, "20000", "Supplier Inventory", [
    Account.define(ACCT.SUPPLIER_DELIVERED, "21000", "Delivered by Supplier"),
    Account.define(ACCT.RELAYED_TO_DISTRIBUTOR, "22000", "Relayed to Distributor"),
    Account.define(ACCT.RETURNED_UNITS_S, "23000", "Returned Units (Supplier)", [
      Account.define(ACCT.USABLE_RETURNED_S, "23100", "Usable Returned Units (Supplier)"),
      Account.define(ACCT.DEFECTIVE_RETURNED_S, "23200", "Defective Returned Units (Supplier)"),
    ]),
  ]),
  Account.define(ACCT.CUSTOMER_INVENTORY, "30000", "Customer Inventory", [
    Account.defineCustomerSpecific(ACCT.DELIVERED_UNITS, "31000", "Delivered Units"),
  ]),
  Account.define(ACCT.OTHERS, "40000", "Others", [
    Account.define(ACCT.CORRECTIONS, "41000", "Corrections"),
  ]),
];

const SUPPLIER_RETURNED_ACCT_IDS = new Set<string>([ACCT.USABLE_RETURNED_S, ACCT.DEFECTIVE_RETURNED_S]);

const SUPPLIER_INVENTORY_ACCOUNT = DEFAULT_ACCOUNTS.find(a => a.id === ACCT.SUPPLIER_INVENTORY)!;
// ── Supplier negative-sign sub-accounts (static) ───────────────────────────────
export const SUPPLIER_INVENTORY_NEGATIVE_SUBACCOUNTS = Object.freeze(new Set(
  traverseAccountTreeUnordered(SUPPLIER_INVENTORY_ACCOUNT)
    .map(acct => acct.id)
    .filter(id => !SUPPLIER_RETURNED_ACCT_IDS.has(id))
));

// ── Pure account tree helpers ──────────────────────────────────────────────────
export function getLeafAccounts(accounts: Account[]): Account[] {
  return accounts.values()
    .flatMap(traverseAccountTreeUnordered)
    .filter(acc => acc.subAccounts.length === 0)
    .toArray();
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
  accountId: AccountId; // stores account UUID
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
  description: string;
  date: string;
  note: string;
  entries: Entry[];
  createdAt: string;
}

export interface TemplateEntry {
  sources: { accountId?: AccountId }[];
  destinations: { accountId?: AccountId }[];
}

export interface Template {
  id: string;
  description: string;
  entries: TemplateEntry[];
}

export interface StoreState {
  items: Item[];
  customers: Customer[];
  templates: Template[];
  transactions: Transaction[];
  accounts: Account[];
}

export interface TransactionTemplateEntry {
  sources: { accountId?: AccountId }[];
  destinations: { accountId?: AccountId }[];
}

export interface TransactionTemplate {
  id: string;
  description: string;
  entries: TransactionTemplateEntry[];
}

// ── Default transaction templates (accountId = account UUID) ─────────────────
export const DEFAULT_TEMPLATES: TransactionTemplate[] = [
  {
    id: "tpl-1",
    description: "Supplier delivered units to customer",
    entries: [{
      sources: [{accountId: ACCT.SUPPLIER_DELIVERED}],
      destinations: [{accountId: ACCT.DELIVERED_UNITS}],
    }],
  },
  {
    id: "tpl-2",
    description: "Unpaid units received by distributor from supplier",
    entries: [{
      sources: [{accountId: ACCT.RELAYED_TO_DISTRIBUTOR}],
      destinations: [{accountId: ACCT.HELD_UNITS}],
    }],
  },
  {
    id: "tpl-3",
    description: "Units delivered by distributor to customer after payment",
    entries: [{
      sources: [{accountId: ACCT.HELD_UNITS}],
      destinations: [{accountId: ACCT.DELIVERED_UNITS}],
    }],
  },
  {
    id: "tpl-4",
    description: "Customer returned usable units to distributor",
    entries: [{
      sources: [{accountId: ACCT.DELIVERED_UNITS}],
      destinations: [{accountId: ACCT.USABLE_RETURNED_D}],
    }],
  },
  {
    id: "tpl-5",
    description: "Customer returned defective units to distributor",
    entries: [{
      sources: [{accountId: ACCT.DELIVERED_UNITS}],
      destinations: [{accountId: ACCT.DEFECTIVE_RETURNED_D}],
    }],
  },
  {
    id: "tpl-6",
    description: "Customer returned usable units to supplier",
    entries: [{
      sources: [{accountId: ACCT.DELIVERED_UNITS}],
      destinations: [{accountId: ACCT.USABLE_RETURNED_S}],
    }],
  },
  {
    id: "tpl-7",
    description: "Customer returned defective units to supplier",
    entries: [{
      sources: [{accountId: ACCT.DELIVERED_UNITS}],
      destinations: [{accountId: ACCT.DEFECTIVE_RETURNED_S}],
    }],
  },
  {
    id: "tpl-8",
    description: "Distributor returned usable units to supplier",
    entries: [{
      sources: [{accountId: ACCT.USABLE_RETURNED_D}],
      destinations: [{accountId: ACCT.USABLE_RETURNED_S}],
    }],
  },
  {
    id: "tpl-9",
    description: "Distributor returned defective units to supplier",
    entries: [{
      sources: [{accountId: ACCT.DEFECTIVE_RETURNED_D}],
      destinations: [{accountId: ACCT.DEFECTIVE_RETURNED_S}],
    }],
  },
  {
    id: "tpl-10",
    description: "General Correction",
    entries: [
      {
        sources: [{accountId: undefined}],
        destinations: [{accountId: ACCT.CORRECTIONS}],
      },
      {
        sources: [{accountId: ACCT.CORRECTIONS}],
        destinations: [{accountId: undefined}],
      },
    ],
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

// ── Reactive account helpers ───────────────────────────────────────────────────
function findAccountById(accounts: Account[], id: string): Account | undefined {
  return accounts.values()
    .flatMap(traverseAccountTreeUnordered)
    .find(acc => acc.id === id);
}

function findAccountByCode(accounts: Account[], code: string): Account | undefined {
  return accounts.values()
    .flatMap(traverseAccountTreeUnordered)
    .find(acc => acc.code === code);
}

function* traverseAccountTreeUnordered(account: Account) {
  const stack = [account];
  while (stack.length > 0) {
    const current = stack.pop()!;
    yield current;
    const children = current.subAccounts ?? [];
    for (const child of children) {
      stack.push(child);
    }
  }
}

export function getAccountLabel(id?: string): string {
  if (!id) {
    return '--';
  }
  return findAccountById(state.accounts, id)?.name ?? id;
}

export function isPerCustomer(id?: string): boolean {
  if (!id) {
    return false;
  }
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
      templates: (await load<any[]>("templates", DEFAULT_TEMPLATES as any[])).map((t: any) => ({
        ...t, description: t.description ?? t.name ?? "", // migration from old schema
      })) as Template[],
      transactions: (await load<any[]>("transactions", [])).map((tx: any) => ({
        ...tx, description: tx.description ?? tx.templateName ?? "", // migration from old schema
      })) as Transaction[],
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
export async function addAccount(parentId: string | null, account: Omit<Account, "id" | "subAccounts">) {
  const newAccount = Account.create(account.code, account.name, account.customerSpecific, [], account.description);
  setState("accounts", produce((accs) => {
    if (parentId === null) {
      accs.push(newAccount);
      return;
    }
    const parent = accs.values().flatMap(traverseAccountTreeUnordered).find(a => a.id === parentId);
    parent?.subAccounts.push(newAccount);
  }));
  await persist(["accounts"]);
}

export async function updateAccount(id: string, fields: Partial<Omit<Account, "id" | "subAccounts">>) {
  setState("accounts", produce((accs) => {
    const acc = accs.values().flatMap(traverseAccountTreeUnordered).find(a => a.id === id);
    if (acc) Object.assign(acc, fields);
  }));
  await persist(["accounts"]);
}

export async function deleteAccount(id: string) {
  setState("accounts", produce((accs) => {
    const rootIdx = accs.findIndex(a => a.id === id);
    if (rootIdx !== -1) {
      accs.splice(rootIdx, 1);
      return;
    }
    const parent = accs.values()
      .flatMap(traverseAccountTreeUnordered)
      .find(a => a.subAccounts.some(c => c.id === id));
    if (parent) {
      parent.subAccounts.splice(parent.subAccounts.findIndex(c => c.id === id), 1);
    }
  }));
  await persist(["accounts"]);
}

// ── Balance helper ────────────────────────────────────────────────────────────
const isMatchingLeg = (leg: Leg, accountId: AccountId, customerId: string | null) =>
  leg.accountId === accountId && (customerId == null || leg.customerId === customerId);

const sumMatchingLegs = (legs: Leg[] | undefined, accountId: AccountId, customerId: string | null) =>
  (legs ?? []).values()
    .filter(leg => isMatchingLeg(leg, accountId, customerId))
    .reduce((sum, leg) => sum + leg.qty, 0);

export function computeBalance(
  accountId: AccountId,
  customerId: string | null,
  itemId: string | null,
  transactions: Transaction[]
): number {
  return transactions.values()
    .flatMap(tx => tx.entries)
    .filter(entry => itemId == null || entry.itemId === itemId)
    .reduce((balance, entry) => {
      const totalOut = sumMatchingLegs(entry.sources, accountId, customerId);
      const totalIn = sumMatchingLegs(entry.destinations, accountId, customerId);
      return balance + totalIn - totalOut;
    }, 0);
}

export {state};
