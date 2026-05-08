import {createMemo, createSignal, For, Show} from "solid-js";
import {deleteTransaction, state} from "../store";
import {inputCls} from "../components/styles";
import {EntryBlock} from "../components/EntryBlock";
import {createConfirmModal} from "../components/ConfirmModal";
import {ItemCombobox} from "../components/ItemCombobox";
import {CustomerCombobox} from "../components/CustomerCombobox";

export default function HistoryPage() {
  const [search, setSearch] = createSignal("");
  const [filterCustomer, setFilterCustomer] = createSignal("");
  const [filterItem, setFilterItem] = createSignal("");

  const confirmModal = createConfirmModal();

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

  async function handleDelete(id: string) {
    const result = await confirmModal.prompt("Delete this transaction? This will affect account balances.");
    if (result === 'OK') deleteTransaction(id);
  }

  return (
    <div>
      <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Transaction History</h1>

      <confirmModal.Modal/>

      <div class="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          value={search()}
          onInput={(e) => setSearch(e.target.value)}
          placeholder="Search by template, note, date..."
          class={`flex-1 min-w-48 ${inputCls}`}
        />
        <div class="min-w-44">
          <ItemCombobox value={filterItem()} onSelect={setFilterItem} allowAll/>
        </div>
        <div class="min-w-44">
          <CustomerCombobox value={filterCustomer()} onSelect={setFilterCustomer} allowAll/>
        </div>
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
                  <button onClick={() => handleDelete(tx.id)}
                          class="text-xs text-red-400 hover:text-red-600 shrink-0">Delete
                  </button>
                </div>

                <div class="space-y-2">
                  <For each={tx.entries}>
                    {(entry) => <EntryBlock entry={entry} customers={state.customers} items={state.items}/>}
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
