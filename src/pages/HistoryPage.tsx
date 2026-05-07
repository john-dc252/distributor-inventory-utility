import { createSignal, createMemo, For, Show } from "solid-js";
import { state, deleteTransaction, ACCOUNT_LABELS, Leg, Entry, Item, Customer, AccountType } from "../store";

const inputCls = "border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400";

function LegPill(props: { leg: Leg & { customerName?: string | null }; side: "source" | "destination" }) {
  const label = ACCOUNT_LABELS[props.leg.accountType as keyof typeof ACCOUNT_LABELS] ?? props.leg.accountType;
  return (
    <span class={`inline-block text-xs px-2 py-1 rounded-full ${
      props.side === "source"
        ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
        : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
    }`}>
      {props.side === "source" ? "From" : "To"}: {label}
      {props.leg.customerName ? ` (${props.leg.customerName})` : ""} × {props.leg.qty}
    </span>
  );
}

function EntryBlock(props: { entry: Entry; items: Item[]; customers: Customer[] }) {
  const item = () => props.items.find((it) => it.id === props.entry.itemId);
  const resolveLegs = (legs: Leg[]) => {
    const legsArray = Array.isArray(legs) ? legs : (legs ? [legs] : []);
    return legsArray.map((leg) => {
      const legObj = typeof leg === "string" ? { accountType: leg as AccountType, qty: 0 } : leg;
      return {
        ...legObj,
        customerName: legObj?.customerId ? props.customers.find((c) => c.id === legObj.customerId)?.name ?? legObj.customerId : null,
      };
    });
  };

  const resolvedSources = () => resolveLegs(props.entry.sources ?? []);
  const resolvedDestinations = () => resolveLegs(props.entry.destinations ?? []);

  return (
    <div class="border border-gray-100 dark:border-gray-700 rounded p-2 space-y-1">
      <Show when={item()}>
        <span class="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
          <span class="font-mono bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-1 rounded">{item()?.id ?? '-'}</span>
          {item()?.name ?? '-'}
        </span>
      </Show>
      <Show when={!item() && props.entry.itemId}>
        <span class="text-xs font-mono text-gray-400 dark:text-gray-500">{props.entry.itemId}</span>
      </Show>
      <div class="flex flex-wrap gap-1">
        <For each={resolvedSources()}>
          {(leg) => <LegPill leg={leg} side="source" />}
        </For>
        <For each={resolvedDestinations()}>
          {(leg) => <LegPill leg={leg} side="destination" />}
        </For>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [search, setSearch] = createSignal("");
  const [filterCustomer, setFilterCustomer] = createSignal("");
  const [filterItem, setFilterItem] = createSignal("");

  const filtered = createMemo(() => {
    const q = search().toLowerCase();
    const cid = filterCustomer();
    const iid = filterItem();
    return state.transactions.filter((tx) => {
      const matchSearch = !q ||
        tx.templateName?.toLowerCase().includes(q) ||
        tx.note?.toLowerCase().includes(q) ||
        tx.date?.includes(q);
      const matchCustomer = !cid || tx.entries.some((e) =>
        [...(e.sources ?? []), ...(e.destinations ?? [])].some((l) => l.customerId === cid)
      );
      const matchItem = !iid || tx.entries.some((e) => e.itemId === iid);
      return matchSearch && matchCustomer && matchItem;
    });
  });

  function handleDelete(id: string) {
    if (confirm("Delete this transaction? This will affect account balances.")) deleteTransaction(id);
  }

  return (
    <div>
      <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Transaction History</h1>

      <div class="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          value={search()}
          onInput={(e) => setSearch(e.target.value)}
          placeholder="Search by template, note, date..."
          class={`flex-1 min-w-48 ${inputCls}`}
        />
        <select value={filterItem()} onChange={(e) => setFilterItem(e.target.value)} class={inputCls}>
          <option value="">All items</option>
          <For each={state.items}>
            {(it) => <option value={it.id}>{it.name} ({it.id})</option>}
          </For>
        </select>
        <select value={filterCustomer()} onChange={(e) => setFilterCustomer(e.target.value)} class={inputCls}>
          <option value="">All customers</option>
          <For each={state.customers}>
            {(c) => <option value={c.id}>{c.name}</option>}
          </For>
        </select>
      </div>

      <Show
        when={filtered().length > 0}
        fallback={<p class="text-sm text-gray-400 dark:text-gray-500">No transactions found.</p>}
      >
        <div class="space-y-3">
          <For each={filtered()}>
            {(tx) => (
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div class="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p class="font-semibold text-gray-800 dark:text-gray-100 text-sm">{tx.templateName ?? "Manual"}</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500">
                      {tx.date} &middot; recorded {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(tx.id)} class="text-xs text-red-400 hover:text-red-600 shrink-0">Delete</button>
                </div>

                <div class="space-y-2">
                  <For each={tx.entries}>
                    {(entry) => <EntryBlock entry={entry} customers={state.customers} items={state.items} />}
                  </For>
                </div>

                <Show when={tx.note}>
                  <p class="text-xs text-gray-500 dark:text-gray-400 italic mt-2">{tx.note}</p>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
