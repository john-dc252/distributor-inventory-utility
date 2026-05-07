import {createMemo, createSignal, For, Show} from "solid-js";
import {
  ACCOUNT_LABELS,
  AccountType,
  computeBalance,
  Customer,
  CUSTOMER_INVENTORY_ACCOUNT,
  DISTRIBUTOR_INVENTORY_ACCOUNT,
  InvAccount,
  isLoaded,
  Item,
  PER_CUSTOMER_ACCOUNTS,
  state,
  SUPPLIER_INVENTORY_ACCOUNT,
  SUPPLIER_INVENTORY_SUBACCOUNTS
} from "../store";
import {AccountCardSkeleton} from "../components/Skeleton";
import {CustomerAvatar} from "../components/CustomerAvatar";

const selectCls = "border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400";

function getLabel(type: string): string {
  return (ACCOUNT_LABELS as Record<string, string>)[type] ?? type;
}


// ── Per-item balance rows ─────────────────────────────────────────────────────
function ItemRows(props: {
  accountType: AccountType;
  customerId: string | null;
  items: Item[];
  showZero: boolean;
}) {
  const rows = createMemo(() => {
    const isSupplierAccount = () => SUPPLIER_INVENTORY_SUBACCOUNTS.has(props.accountType);
    return props.items.values()
      .map(item => ({
          item,
          bal: computeBalance(props.accountType, props.customerId, item.id, state.transactions),
        })
      )
      .map(summary => isSupplierAccount() ? { ...summary, bal: -summary.bal } : summary)
      .filter(r => props.showZero || r.bal !== 0)
      .toArray();
  });

  return (
    <Show when={rows().length > 0} fallback={
      <p class="text-xs text-gray-400 dark:text-gray-500 py-0.5 italic">No entries</p>
    }>
      <For each={rows()}>
        {({item, bal}) => (
          <div
            class="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <span class="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 min-w-0">
              <span
                class="font-mono text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded shrink-0">
                {item.id}
              </span>
              <span class="truncate">{item.name}</span>
            </span>
            <span
              class={`text-sm font-mono font-semibold ml-2 shrink-0 ${bal < 0 ? "text-red-500 dark:text-red-400" : "text-gray-800 dark:text-gray-100"}`}>
              {bal.toLocaleString()}
            </span>
          </div>
        )}
      </For>
    </Show>
  );
}

// ── Leaf account (no children in hierarchy) ───────────────────────────────────
function LeafBlock(props: {
  account: InvAccount;
  items: Item[];
  customers: Customer[];
  fixedCustomerId: string | null;
  showZero: boolean;
  depth: number;
}) {
  const acctType = props.account.type as AccountType;
  const iterCustomers = PER_CUSTOMER_ACCOUNTS.has(acctType) && props.fixedCustomerId === null;

  return (
    <div class={`mt-3 ${props.depth > 1 ? "ml-4" : ""}`}>
      <div class={props.depth === 1
        ? "border-l-2 border-indigo-400 dark:border-indigo-500 pl-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2"
        : "pl-1 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5"
      }>
        {getLabel(props.account.type)}
      </div>
      <div class={props.depth === 1 ? "ml-2" : "ml-3"}>
        <Show when={iterCustomers} fallback={
          <ItemRows
            accountType={acctType}
            customerId={props.fixedCustomerId}
            items={props.items}
            showZero={props.showZero}
          />
        }>
          <Show when={props.customers.length > 0} fallback={
            <p class="text-xs text-gray-400 dark:text-gray-500 italic">No customers yet.</p>
          }>
            <For each={props.customers}>
              {(c) => (
                <Show when={props.items.some(item =>
                  computeBalance(acctType, c.id, item.id, state.transactions) !== 0
                )}>
                  <div class="mb-3">
                    <div class="flex items-center gap-1.5 mb-1">
                      <CustomerAvatar customer={c} size="sm" />
                      <p class="text-xs font-semibold text-gray-600 dark:text-gray-300">{c.name}</p>
                    </div>
                    <div class="ml-2">
                      <ItemRows
                        accountType={acctType}
                        customerId={c.id}
                        items={props.items}
                        showZero={props.showZero}
                      />
                    </div>
                  </div>
                </Show>
              )}
            </For>
          </Show>
        </Show>
      </div>
    </div>
  );
}

// ── Group account (has children in hierarchy, acts as a sub-header) ───────────
function GroupBlock(props: {
  account: InvAccount;
  items: Item[];
  customers: Customer[];
  fixedCustomerId: string | null;
  showZero: boolean;
  depth: number;
}) {
  return (
    <div class={`mt-3 ${props.depth > 1 ? "ml-4" : ""}`}>
      <div
        class="border-l-2 border-gray-300 dark:border-gray-600 pl-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5">
        {getLabel(props.account.type)}
      </div>
      <For each={props.account.children}>
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

// ── Dispatcher: leaf vs group ─────────────────────────────────────────────────
function AccountBlock(props: {
  account: InvAccount;
  items: Item[];
  customers: Customer[];
  fixedCustomerId: string | null;
  showZero: boolean;
  depth: number;
}) {
  if (props.account.children.length === 0) {
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

// ── Root account card (Distributor, Supplier) ─────────────────────────────────
function RootCard(props: {
  account: InvAccount;
  items: Item[];
  customers: Customer[];
  showZero: boolean;
}) {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h2
        class="font-semibold text-indigo-700 dark:text-indigo-400 text-sm uppercase tracking-wide pb-2 mb-1 border-b border-gray-100 dark:border-gray-700">
        {getLabel(props.account.type)}
      </h2>
      <For each={props.account.children}>
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

// ── Customer inventory card (one per customer) ────────────────────────────────
function CustomerCard(props: {
  customer: Customer;
  items: Item[];
  showZero: boolean;
}) {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div class="flex items-center gap-3 mb-3">
        <CustomerAvatar customer={props.customer} size="md" />
        <div>
          <h2 class="font-semibold text-indigo-700 dark:text-indigo-400 text-sm uppercase tracking-wide leading-tight">
            {props.customer.name}
          </h2>
          <p class="text-xs text-gray-400 dark:text-gray-500">{getLabel(CUSTOMER_INVENTORY_ACCOUNT.type)}</p>
        </div>
      </div>
      <div class="border-t border-gray-100 dark:border-gray-700">
        <For each={CUSTOMER_INVENTORY_ACCOUNT.children}>
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AccountsPage() {
  const [selectedItemId, setSelectedItemId] = createSignal("");
  // When a specific item is selected, show its balance even if zero
  const showZero = () => selectedItemId() !== "";

  const displayItems = createMemo((): Item[] => {
    const id = selectedItemId();
    if (!id) return state.items;
    const found = state.items.find(i => i.id === id);
    return found ? [found] : [];
  });

  const nonCustomerRoots = [DISTRIBUTOR_INVENTORY_ACCOUNT, SUPPLIER_INVENTORY_ACCOUNT];

  return (
    <div>
      <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Account Balances</h1>

      {/* Item filter */}
      <div class="flex items-center gap-2 mb-6">
        <label class="text-sm text-gray-600 dark:text-gray-400">Item:</label>
        <select
          value={selectedItemId()}
          onChange={(e) => setSelectedItemId(e.target.value)}
          class={selectCls}
        >
          <option value="">All Items</option>
          <For each={state.items}>
            {(item) => <option value={item.id}>{item.name} ({item.id})</option>}
          </For>
        </select>
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
          {/* Distributor and Supplier cards (from ACCOUNTS_HIERARCHY order) */}
          <For each={nonCustomerRoots}>
            {(root) => (
              <RootCard
                account={root}
                items={displayItems()}
                customers={state.customers}
                showZero={showZero()}
              />
            )}
          </For>

          {/* Customer Inventory: one card per customer */}
          <Show when={state.customers.length > 0} fallback={
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h2 class="font-semibold text-indigo-700 dark:text-indigo-400 text-sm uppercase tracking-wide mb-3">
                {getLabel(CUSTOMER_INVENTORY_ACCOUNT.type)}
              </h2>
              <p class="text-sm text-gray-400 dark:text-gray-500">No customers yet.</p>
            </div>
          }>
            <For each={state.customers}>
              {(customer) => (
                <CustomerCard
                  customer={customer}
                  items={displayItems()}
                  showZero={showZero()}
                />
              )}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
}
