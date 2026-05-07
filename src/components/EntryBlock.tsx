import {For, Show} from "solid-js";
import {AccountType, Customer, Entry, Item, Leg} from "../store";
import {LegPill} from "./LegPill";

export function EntryBlock(props: {
  entry: Entry;
  items: Item[];
  customers?: Customer[];
}) {
  const item = () => props.items.find((it) => it.id === props.entry.itemId);

  const resolveLegs = (legs: Leg[]) => {
    const arr = Array.isArray(legs) ? legs : (legs ? [legs] : []);
    return arr.map((leg) => {
      const legObj = typeof leg === "string" ? {accountType: leg as AccountType, qty: 0} : leg;
      return {
        ...legObj,
        customerName: legObj.customerId && props.customers
          ? (props.customers.find((c) => c.id === legObj.customerId)?.name ?? legObj.customerId)
          : null,
      };
    });
  };

  return (
    <div class="border border-gray-100 dark:border-gray-700 rounded p-2 space-y-1">
      <Show when={item()} fallback={
        <Show when={props.entry.itemId}>
          <span class="text-xs font-mono text-gray-400 dark:text-gray-500">{props.entry.itemId}</span>
        </Show>
      }>
                <span class="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    <span
                      class="font-mono bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-1 rounded">{item()?.id ?? "-"}</span>
                  {item()?.name ?? "-"}
                </span>
      </Show>
      <div class="flex flex-wrap gap-1">
        <For each={resolveLegs(props.entry.sources ?? [])}>
          {(leg) => <LegPill leg={leg} side="source"/>}
        </For>
        <For each={resolveLegs(props.entry.destinations ?? [])}>
          {(leg) => <LegPill leg={leg} side="destination"/>}
        </For>
      </div>
    </div>
  );
}
