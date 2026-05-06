import { createSignal, For, Show, createMemo } from "solid-js";
import { state, ACCOUNT_TYPES, computeBalance } from "../store";

const selectCls = "border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400";

function AccountRow(props) {
  const bal = () => computeBalance(props.accountType, props.customerId, props.itemId(), state.transactions);
  return (
    <div class="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span class="text-sm text-gray-700 dark:text-gray-300">{props.label}</span>
      <span class={`text-sm font-mono font-semibold ${bal() < 0 ? "text-red-500 dark:text-red-400" : "text-gray-800 dark:text-gray-100"}`}>
        {bal().toLocaleString()}
      </span>
    </div>
  );
}

function Section(props) {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
      <h2 class="font-semibold text-indigo-700 dark:text-indigo-400 mb-3 text-sm uppercase tracking-wide">{props.title}</h2>
      {props.children}
    </div>
  );
}

export default function AccountsPage() {
  const [selectedItemId, setSelectedItemId] = createSignal("");
  const customers = () => state.customers;
  const itemId = createMemo(() => selectedItemId() || null);

  return (
    <div>
      <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100">Account Balances</h1>
        <div class="flex items-center gap-2">
          <label class="text-sm text-gray-600 dark:text-gray-400">Item:</label>
          <select value={selectedItemId()} onChange={(e) => setSelectedItemId(e.target.value)} class={selectCls}>
            <option value="">All items</option>
            <For each={state.items}>
              {(item) => <option value={item.id}>{item.name} ({item.id})</option>}
            </For>
          </select>
        </div>
      </div>

      <Show when={state.items.length === 0}>
        <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
          <p class="text-sm text-yellow-700 dark:text-yellow-400">No items defined yet. Add items in the Items page before recording transactions.</p>
        </div>
      </Show>

      <div class="grid md:grid-cols-2 gap-4">
        <Section title="Supplier Inventory">
          <AccountRow label="Relayed to Distributor" accountType={ACCOUNT_TYPES.RELAYED_TO_DISTRIBUTOR} itemId={itemId} />
          <AccountRow label="Supplier Direct" accountType={ACCOUNT_TYPES.SUPPLIER_DIRECT} itemId={itemId} />
          <div class="mt-2 ml-3">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Returned</p>
            <AccountRow label="Usable Returned" accountType={ACCOUNT_TYPES.USABLE_RETURNED_S} itemId={itemId} />
            <AccountRow label="Defective Returned" accountType={ACCOUNT_TYPES.DEFECTIVE_RETURNED_S} itemId={itemId} />
          </div>
        </Section>

        <Section title="Distributor Inventory">
          <Show when={customers().length > 0} fallback={<p class="text-sm text-gray-400 dark:text-gray-500">No customers yet.</p>}>
            <div class="mb-2">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Held Units (per customer)</p>
              <For each={customers()}>
                {(c) => <AccountRow label={c.name} accountType={ACCOUNT_TYPES.HELD_UNITS} customerId={c.id} itemId={itemId} />}
              </For>
            </div>
          </Show>
          <div class="mt-2 ml-3">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Returned</p>
            <AccountRow label="Usable Returned" accountType={ACCOUNT_TYPES.USABLE_RETURNED_D} itemId={itemId} />
            <AccountRow label="Defective Returned" accountType={ACCOUNT_TYPES.DEFECTIVE_RETURNED_D} itemId={itemId} />
          </div>
        </Section>

        <Section title="Customer Inventory">
          <Show when={customers().length > 0} fallback={<p class="text-sm text-gray-400 dark:text-gray-500">No customers yet.</p>}>
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Delivered Units (per customer)</p>
            <For each={customers()}>
              {(c) => <AccountRow label={c.name} accountType={ACCOUNT_TYPES.DELIVERED_UNITS} customerId={c.id} itemId={itemId} />}
            </For>
          </Show>
        </Section>
      </div>
    </div>
  );
}
