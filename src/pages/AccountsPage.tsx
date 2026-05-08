import {createMemo, createSignal, For, Show} from "solid-js";
import {
  IAccount,
  accountCodeExists,
  addAccount,
  computeBalance,
  Customer,
  deleteAccount,
  isLoaded,
  Item,
  PREDEFINED_ACCOUNT_IDS,
  PREDEFINED_ACCOUNT_ID_SET,
  state,
  SUPPLIER_INVENTORY_NEGATIVE_SUBACCOUNTS,
  updateAccount,
} from "../store";
import {AccountCardSkeleton} from "../components/Skeleton";
import {CustomerAvatar} from "../components/CustomerAvatar";
import {ItemCombobox} from "../components/ItemCombobox";
import {CheckIcon, PencilIcon, PlusIcon, TrashIcon, XIcon} from "../components/Icons";
import {inputCls} from "../components/styles";

type Tab = "summary" | "manage";

function normalizeZero(raw: number) {
  return -raw || 0;
}

// ── Summary tab components ────────────────────────────────────────────────────

function ItemRows(props: {
  accountId: string;
  customerId: string | null;
  items: Item[];
  showZero: boolean;
}) {
  const isNeg = SUPPLIER_INVENTORY_NEGATIVE_SUBACCOUNTS.has(props.accountId);
  const rows = createMemo(() =>
    props.items.values()
      .map(item => {
        const raw = computeBalance(props.accountId, props.customerId, item.id, state.transactions);
        return {item, bal: isNeg ? normalizeZero(raw) : raw};
      })
      .filter(r => props.showZero || r.bal !== 0)
      .toArray()
  );

  return (
    <Show when={rows().length > 0} fallback={
      <p class="text-xs text-gray-400 dark:text-gray-500 py-1 italic">No entries</p>
    }>
      <For each={rows()}>
        {({item, bal}) => (
          <div class="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <span class="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 min-w-0">
              <span class="font-mono text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-1 rounded shrink-0">
                {item.id}
              </span>
              <span class="truncate">{item.name}</span>
            </span>
            <span class={`text-sm font-mono font-semibold ml-2 shrink-0 ${bal < 0 ? "text-red-500 dark:text-red-400" : "text-gray-800 dark:text-gray-100"}`}>
              {bal.toLocaleString()}
            </span>
          </div>
        )}
      </For>
    </Show>
  );
}

function LeafBlock(props: {
  account: IAccount;
  items: Item[];
  customers: Customer[];
  fixedCustomerId: string | null;
  showZero: boolean;
  depth: number;
}) {
  const isNeg = SUPPLIER_INVENTORY_NEGATIVE_SUBACCOUNTS.has(props.account.id);
  const iterCustomers = () => props.account.customerSpecific && props.fixedCustomerId === null;

  function getBal(customerId: string | null, itemId: string): number {
    const raw = computeBalance(props.account.id, customerId, itemId, state.transactions);
    return isNeg ? normalizeZero(raw) : raw;
  }

  function balCls(bal: number) {
    return `text-sm font-mono font-semibold shrink-0 ${bal < 0 ? "text-red-500 dark:text-red-400" : "text-gray-800 dark:text-gray-100"}`;
  }

  function customerHasQtyForAnyItem(c: Customer) {
    return props.items.some(item => computeBalance(props.account.id, c.id, item.id, state.transactions) !== 0);
  }

  function anyCustomerHasQtyForAnyItem() {
    return props.customers.some(customerHasQtyForAnyItem);
  }

  const compact = () => props.showZero && props.items.length === 1;

  const labelCls = () => props.depth === 1
    ? "border-l-2 border-indigo-400 dark:border-indigo-500 pl-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2"
    : "pl-1 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5";

  return (
    <div class={`jn-leaf-block mt-3 ${props.depth > 1 ? "ml-4" : ""}`}>
      <Show when={compact() && !iterCustomers()} fallback={
        <>
          <div class={labelCls()}>{props.account.name}</div>
          <div class={props.depth === 1 ? "ml-2" : "ml-3"}>
            <Show when={iterCustomers()} fallback={
              <ItemRows
                accountId={props.account.id}
                customerId={props.fixedCustomerId}
                items={props.items}
                showZero={props.showZero}
              />
            }>
              <Show when={props.customers.length > 0} fallback={
                <p class="text-xs text-gray-400 dark:text-gray-500 italic">No customers yet.</p>
              }>
                <Show when={!anyCustomerHasQtyForAnyItem()}>
                  <p class="text-xs text-gray-400 dark:text-gray-500 italic">No entries</p>
                </Show>
                <For each={props.customers}>
                  {(c) => (
                    <Show when={customerHasQtyForAnyItem(c)}>
                      <Show when={compact()} fallback={
                        <div class="mb-3">
                          <div class="flex items-center gap-1.5 mb-1">
                            <CustomerAvatar customer={c} size="sm"/>
                            <p class="text-xs font-semibold text-gray-600 dark:text-gray-300">{c.name}</p>
                          </div>
                          <div class="ml-2">
                            <ItemRows
                              accountId={props.account.id}
                              customerId={c.id}
                              items={props.items}
                              showZero={props.showZero}
                            />
                          </div>
                        </div>
                      }>
                        <div class="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <span class="flex items-center gap-1.5">
                            <CustomerAvatar customer={c} size="sm"/>
                            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">{c.name}</span>
                          </span>
                          <span class={balCls(getBal(c.id, props.items[0].id))}>
                            {getBal(c.id, props.items[0].id).toLocaleString()}
                          </span>
                        </div>
                      </Show>
                    </Show>
                  )}
                </For>
              </Show>
            </Show>
          </div>
        </>
      }>
        <div class={`flex justify-between items-center ${labelCls()}`}>
          <span>{props.account.name}</span>
          <span class={balCls(getBal(props.fixedCustomerId, props.items[0].id))}>
            {getBal(props.fixedCustomerId, props.items[0].id).toLocaleString()}
          </span>
        </div>
      </Show>
    </div>
  );
}

function GroupBlock(props: {
  account: IAccount;
  items: Item[];
  customers: Customer[];
  fixedCustomerId: string | null;
  showZero: boolean;
  depth: number;
}) {
  return (
    <div class={`jn-group-block mt-3 ${props.depth > 1 ? "ml-4" : ""}`}>
      <div class="border-l-2 border-gray-300 dark:border-gray-600 pl-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5">
        {props.account.name}
      </div>
      <For each={props.account.subAccounts}>
        {(child) => (
          <AccountBlock
            account={child}
            items={props.items}
            customers={props.customers}
            fixedCustomerId={props.fixedCustomerId}
            showZero={props.showZero}
            depth={props.depth + 1}
          />
        )}
      </For>
    </div>
  );
}

function AccountBlock(props: {
  account: IAccount;
  items: Item[];
  customers: Customer[];
  fixedCustomerId: string | null;
  showZero: boolean;
  depth: number;
}) {
  if (props.account.subAccounts.length === 0) {
    return (
      <LeafBlock
        account={props.account}
        items={props.items}
        customers={props.customers}
        fixedCustomerId={props.fixedCustomerId}
        showZero={props.showZero}
        depth={props.depth}
      />
    );
  }
  return (
    <GroupBlock
      account={props.account}
      items={props.items}
      customers={props.customers}
      fixedCustomerId={props.fixedCustomerId}
      showZero={props.showZero}
      depth={props.depth}
    />
  );
}

function RootCard(props: {
  account: IAccount;
  items: Item[];
  customers: Customer[];
  showZero: boolean;
}) {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h2 class="font-semibold text-indigo-700 dark:text-indigo-400 text-sm uppercase tracking-wide pb-2 mb-1 border-b border-gray-100 dark:border-gray-700">
        {props.account.name}
      </h2>
      <For each={props.account.subAccounts}>
        {(child) => (
          <AccountBlock
            account={child}
            items={props.items}
            customers={props.customers}
            fixedCustomerId={null}
            showZero={props.showZero}
            depth={1}
          />
        )}
      </For>
    </div>
  );
}

function CustomerCard(props: {
  customer: Customer;
  customerRootSubAccounts: IAccount[];
  items: Item[];
  showZero: boolean;
}) {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div class="flex items-center gap-3 mb-3">
        <CustomerAvatar customer={props.customer} size="md"/>
        <div>
          <h2 class="font-semibold text-indigo-700 dark:text-indigo-400 text-sm uppercase tracking-wide leading-tight">
            {props.customer.name}
          </h2>
          <p class="text-xs text-gray-400 dark:text-gray-500">Customer Inventory</p>
        </div>
      </div>
      <div class="border-t border-gray-100 dark:border-gray-700">
        <For each={props.customerRootSubAccounts}>
          {(child) => (
            <AccountBlock
              account={child}
              items={props.items}
              customers={[props.customer]}
              fixedCustomerId={props.customer.id}
              showZero={props.showZero}
              depth={1}
            />
          )}
        </For>
      </div>
    </div>
  );
}

// ── Manage Accounts tab components ────────────────────────────────────────────

function AccountEditForm(props: { account: IAccount; onDone: () => void }) {
  const [code, setCode] = createSignal(props.account.code);
  const [name, setName] = createSignal(props.account.name);
  const [description, setDescription] = createSignal(props.account.description ?? "");
  const [customerSpecific, setCustomerSpecific] = createSignal(props.account.customerSpecific);
  const [error, setError] = createSignal("");

  async function save(e: Event) {
    e.preventDefault();
    const c = code().trim();
    const n = name().trim();
    if (!c || !n) return;
    if (accountCodeExists(c, props.account.id)) {
      setError(`Code "${c}" is already used by another account.`);
      return;
    }
    await updateAccount(props.account.id, {
      code: c,
      name: n,
      description: description().trim() || undefined,
      customerSpecific: customerSpecific(),
    });
    props.onDone();
  }

  return (
    <form onSubmit={save}
          class="flex flex-wrap items-center gap-2 py-2 px-3 my-0.5 bg-gray-50 dark:bg-gray-700/60 rounded border border-gray-200 dark:border-gray-600">
      <input value={code()} onInput={(e) => setCode(e.target.value)} required
             placeholder="Code" class={`w-28 font-mono ${inputCls}`}/>
      <input value={name()} onInput={(e) => setName(e.target.value)} required
             placeholder="Name" class={`flex-1 min-w-32 ${inputCls}`}/>
      <input value={description()} onInput={(e) => setDescription(e.target.value)}
             placeholder="Description (optional)" class={`flex-1 min-w-40 ${inputCls}`}/>
      <label class="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 shrink-0 cursor-pointer select-none">
        <input type="checkbox" checked={customerSpecific()}
               onChange={(e) => setCustomerSpecific(e.target.checked)} class="rounded"/>
        customer-specific
      </label>
      <Show when={error()}>
        <span class="w-full text-xs text-red-600 dark:text-red-400">{error()}</span>
      </Show>
      <div class="flex gap-1.5">
        <button type="submit"
                class="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-1">
          <CheckIcon class="w-3 h-3"/>Save
        </button>
        <button type="button" onClick={props.onDone}
                class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-1">
          <XIcon class="w-3 h-3"/>Cancel
        </button>
      </div>
    </form>
  );
}

function AccountAddForm(props: { parentId: string | null; onDone: () => void }) {
  const [code, setCode] = createSignal("");
  const [name, setName] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [customerSpecific, setCustomerSpecific] = createSignal(false);
  const [error, setError] = createSignal("");

  async function save(e: Event) {
    e.preventDefault();
    const c = code().trim();
    const n = name().trim();
    if (!c || !n) return;
    if (accountCodeExists(c)) {
      setError(`Code "${c}" already exists.`);
      return;
    }
    await addAccount(props.parentId, {
      code: c,
      name: n,
      description: description().trim() || undefined,
      customerSpecific: customerSpecific(),
    });
    props.onDone();
  }

  return (
    <form onSubmit={save}
          class="flex flex-wrap items-center gap-2 py-2 px-3 my-0.5 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-700">
      <input value={code()} onInput={(e) => setCode(e.target.value)} required
             placeholder="Code" class={`w-28 font-mono ${inputCls}`}/>
      <input value={name()} onInput={(e) => setName(e.target.value)} required
             placeholder="Name" class={`flex-1 min-w-32 ${inputCls}`}/>
      <input value={description()} onInput={(e) => setDescription(e.target.value)}
             placeholder="Description (optional)" class={`flex-1 min-w-40 ${inputCls}`}/>
      <label class="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 shrink-0 cursor-pointer select-none">
        <input type="checkbox" checked={customerSpecific()}
               onChange={(e) => setCustomerSpecific(e.target.checked)} class="rounded"/>
        customer-specific
      </label>
      <Show when={error()}>
        <span class="w-full text-xs text-red-600 dark:text-red-400">{error()}</span>
      </Show>
      <div class="flex gap-1.5">
        <button type="submit"
                class="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-1">
          <CheckIcon class="w-3 h-3"/>Add
        </button>
        <button type="button" onClick={props.onDone}
                class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-1">
          <XIcon class="w-3 h-3"/>Cancel
        </button>
      </div>
    </form>
  );
}

function AccountNode(props: { account: IAccount; depth: number }) {
  const [editing, setEditing] = createSignal(false);
  const [addingChild, setAddingChild] = createSignal(false);
  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const isPredefined = PREDEFINED_ACCOUNT_ID_SET.has(props.account.id);
  const indent = () => `${props.depth * 1.25}rem`;

  return (
    <div>
      <Show when={editing()} fallback={
        <div
          class="flex items-center gap-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
          style={{"padding-left": `calc(${indent()} + 0.375rem)`, "padding-right": "0.375rem"}}>
          <span
            class="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">
            {props.account.code}
          </span>
          <span class="text-sm font-medium text-gray-800 dark:text-gray-100">{props.account.name}</span>
          <Show when={props.account.customerSpecific}>
            <span
              class="text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shrink-0">
              customer-specific
            </span>
          </Show>
          <Show when={props.account.description}>
            <span class="text-xs text-gray-400 dark:text-gray-500 italic truncate hidden sm:block">
              {props.account.description}
            </span>
          </Show>
          <div
            class="flex items-center gap-2 ml-auto shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button type="button"
                    onClick={() => { setEditing(true); setAddingChild(false); setConfirmDelete(false); }}
                    class="text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200 inline-flex items-center gap-1">
              <PencilIcon class="w-3 h-3"/>Edit
            </button>
            <button type="button"
                    onClick={() => { setAddingChild(true); setEditing(false); setConfirmDelete(false); }}
                    class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-1">
              <PlusIcon class="w-3 h-3"/>Sub-account
            </button>
            <Show when={!isPredefined}>
              <Show when={confirmDelete()} fallback={
                <button type="button" onClick={() => setConfirmDelete(true)}
                        class="text-xs text-red-400 hover:text-red-600 inline-flex items-center gap-1">
                  <TrashIcon class="w-3 h-3"/>Delete
                </button>
              }>
                <span class="inline-flex items-center gap-1.5 text-xs">
                  <span class="text-red-600 dark:text-red-400">Delete?</span>
                  <button type="button" onClick={() => deleteAccount(props.account.id)}
                          class="font-semibold text-red-600 dark:text-red-400 hover:underline">Yes
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)}
                          class="text-gray-500 dark:text-gray-400 hover:underline">No
                  </button>
                </span>
              </Show>
            </Show>
          </div>
        </div>
      }>
        <div style={{"padding-left": indent()}}>
          <AccountEditForm account={props.account} onDone={() => setEditing(false)}/>
        </div>
      </Show>

      <Show when={addingChild()}>
        <div style={{"padding-left": `${(props.depth + 1) * 1.25}rem`}}>
          <AccountAddForm parentId={props.account.id} onDone={() => setAddingChild(false)}/>
        </div>
      </Show>

      <For each={props.account.subAccounts}>
        {(child) => <AccountNode account={child} depth={props.depth + 1}/>}
      </For>
    </div>
  );
}

function ManageAccountsTab() {
  return (
    <div class="space-y-2">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
        Pre-defined accounts can be edited but not deleted.
      </p>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow px-2 py-1">
        <For each={state.accounts}>
          {(account) => <AccountNode account={account} depth={0}/>}
        </For>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AccountsPage() {
  const [tab, setTab] = createSignal<Tab>("summary");
  const [selectedItemId, setSelectedItemId] = createSignal("");
  const showZero = () => selectedItemId() !== "";

  const displayItems = createMemo((): Item[] => {
    const id = selectedItemId();
    if (!id) return state.items;
    const found = state.items.find(i => i.id === id);
    return found ? [found] : [];
  });

  const customerRoot = createMemo(() =>
    state.accounts.find(a => a.id === PREDEFINED_ACCOUNT_IDS.CUSTOMER_INVENTORY)
  );
  const nonCustomerRoots = createMemo(() =>
    state.accounts.filter(a => a.id !== PREDEFINED_ACCOUNT_IDS.CUSTOMER_INVENTORY)
  );

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
      tab() === t
        ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
        : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
    }`;

  return (
    <div>
      <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Accounts</h1>

      <div class="flex gap-0 border-b border-gray-200 dark:border-gray-700 mb-6">
        <button type="button" onClick={() => setTab("summary")} class={tabCls("summary")}>Summary</button>
        <button type="button" onClick={() => setTab("manage")} class={tabCls("manage")}>Manage Accounts</button>
      </div>

      <Show when={tab() === "summary"}>
        <div class="flex items-center gap-2 w-full sm:w-2/3 lg:w-2/5 mb-6">
          <label class="text-sm text-gray-600 dark:text-gray-400">Item:</label>
          <div class="flex-1">
            <ItemCombobox value={selectedItemId()} onSelect={id => setSelectedItemId(id)} allowAll/>
          </div>
        </div>

        <Show when={isLoaded() && state.items.length === 0}>
          <div
            class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
            <p class="text-sm text-yellow-700 dark:text-yellow-400">
              No items defined yet. Add items in the Items page before recording transactions.
            </p>
          </div>
        </Show>

        <Show when={isLoaded()} fallback={
          <div class="grid md:grid-cols-2 gap-4">
            <For each={[0, 1, 2]}>{() => <AccountCardSkeleton/>}</For>
          </div>
        }>
          <div class="grid md:grid-cols-2 gap-4">
            <For each={nonCustomerRoots()}>
              {(root) => (
                <RootCard
                  account={root}
                  items={displayItems()}
                  customers={state.customers}
                  showZero={showZero()}
                />
              )}
            </For>

            <Show when={state.customers.length > 0} fallback={
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h2 class="font-semibold text-indigo-700 dark:text-indigo-400 text-sm uppercase tracking-wide mb-3">
                  {customerRoot()?.name ?? "Customer Inventory"}
                </h2>
                <p class="text-sm text-gray-400 dark:text-gray-500">No customers yet.</p>
              </div>
            }>
              <For each={state.customers}>
                {(customer) => (
                  <CustomerCard
                    customer={customer}
                    customerRootSubAccounts={customerRoot()?.subAccounts ?? []}
                    items={displayItems()}
                    showZero={showZero()}
                  />
                )}
              </For>
            </Show>
          </div>
        </Show>
      </Show>

      <Show when={tab() === "manage"}>
        <ManageAccountsTab/>
      </Show>
    </div>
  );
}
