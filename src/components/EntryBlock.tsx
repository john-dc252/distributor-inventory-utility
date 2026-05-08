import {For, Show} from "solid-js";
import {AccountId, Customer, Entry, Item, Leg} from "../store";
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
      const legObj = typeof leg === "string" ? {accountId: leg as AccountId, qty: 0} : leg;
      return {
        ...legObj,
        customerName: legObj.customerId && props.customers
          ? (props.customers.find((c) => c.id === legObj.customerId)?.name ?? legObj.customerId)
          : null,
      };
    });
  };

  const rows = () => {
    const srcs = resolveLegs(props.entry.sources ?? []);
    const dsts = resolveLegs(props.entry.destinations ?? []);
    return Array.from({length: Math.max(srcs.length, dsts.length)}, (_, i) => ({
      src: srcs[i],
      dst: dsts[i],
    }));
  };

  return (
    <div class="border border-gray-100 dark:border-gray-700 rounded p-2 space-y-1">
      <Show when={item()} fallback={
        <Show when={props.entry.itemId}>
          <span class="text-xs font-mono text-gray-400 dark:text-gray-500">{props.entry.itemId}</span>
        </Show>
      }>
        <span class="mb-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
          <span class="font-mono bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-1 rounded">{item()?.id ?? "-"}</span>
          {item()?.name ?? "-"}
        </span>
      </Show>
      <div class="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <span class="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">From</span>
        <span class="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">To</span>
        <For each={rows()}>
          {({src, dst}) => (
            <>
              {src ? <LegPill leg={src} side="source" hideLabel/> : <span/>}
              {dst ? <LegPill leg={dst} side="destination" hideLabel/> : <span/>}
            </>
          )}
        </For>
      </div>
    </div>
  );
}
