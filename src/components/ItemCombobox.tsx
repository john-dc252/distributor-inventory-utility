import {Item, state} from "../store";
import {Combobox} from "./Combobox";
import {createMemo, Show} from "solid-js";

const selectAllItem: Item = {id: "", name: "All Items", createdAt: ""};

export function ItemCombobox(
  props: { value: string; onSelect: (id: string) => void; allowAll?: boolean },
) {
  const optionsWithSelectAll = createMemo(() => [selectAllItem].concat(state.items));
  const options = createMemo(() => props.allowAll ? optionsWithSelectAll() : state.items);
  return (
    <Combobox
      value={props.value}
      onSelect={props.onSelect}
      options={options()}
      filterFn={(item, q) =>
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)}
      placeholder="— select item —"
      searchPlaceholder="Search items..."
      emptyText="No items found"
      renderTrigger={(item) => (
        <span class="flex items-center gap-1.5 min-w-0">
          <Show when={item.id} fallback={<span></span>}>
            <span
              class="font-mono text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-1 rounded shrink-0">
              {item.id}
            </span>
          </Show>
          <span class="text-sm truncate">{item.name}</span>
        </span>
      )}
      renderOption={(item) => (
        <>
          <Show when={item.id} fallback={<span></span>}>
            <span
              class="font-mono text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-1 rounded shrink-0">
              {item.id}
            </span>
          </Show>
          <span class="truncate">{item.name}</span>
        </>
      )}
    />
  );
}
