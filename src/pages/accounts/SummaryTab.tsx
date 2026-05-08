import {createMemo, createSignal, For, Show} from "solid-js";
import {
  computeBalance,
  Customer,
  Account,
  isLoaded,
  Item,
  PREDEFINED_ACCOUNT_IDS,
  state,
  SUPPLIER_INVENTORY_NEGATIVE_SUBACCOUNTS,
} from "../../store";
import {AccountCardSkeleton} from "../../components/Skeleton";
import {CustomerAvatar} from "../../components/CustomerAvatar";
import {ItemCombobox} from "../../components/ItemCombobox";

function normalizeZero(raw: number) {
  return -raw || 0;
}

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
  account: Account;
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
  account: Account;
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
  account: Account;
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
  account: Account;
  items: Item[];
  customers: Customer[];
  showZero: boolean;
}) {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h2 class="font-semibold text-indigo-700 dark:text-indigo-400 text-sm uppercase tracking-wide pb-2 mb-1 border-b border-gray-100 dark:border-gray-700">
        {props.account.name}
      </h2>
      <Show when={props.account.subAccounts.length > 0} fallback={
        <ItemRows
          accountId={props.account.id}
          customerId={null}
          items={props.items}
          showZero={props.showZero}
        />
      }>
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
      </Show>
    </div>
  );
}

function CustomerCard(props: {
  customer: Customer;
  customerRootSubAccounts: Account[];
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

export function SummaryTab() {
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

  return (
    <>
      <div class="flex items-center gap-2 w-full sm:w-2/3 lg:w-2/5 mb-6">
        <label class="text-sm text-gray-600 dark:text-gray-400">Item:</label>
        <div class="flex-1">
          <ItemCombobox value={selectedItemId()} onSelect={id => setSelectedItemId(id)} allowAll/>
        </div>
      </div>

      <Show when={isLoaded() && state.items.length === 0}>
        <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
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
    </>
  );
}
