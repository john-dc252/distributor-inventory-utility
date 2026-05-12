import {Item, state} from "../store";
import {Combobox} from "./Combobox";
import {createMemo, Show} from "solid-js";

interface ItemDisplayProps {
  item: Item;
}

function ItemDisplay(props: ItemDisplayProps) {
  return (
    <span class="flex items-center gap-1.5 min-w-0">
      <Show when={props.item.id} fallback={<span></span>}>
        <span class="font-mono text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-1 rounded shrink-0">{props.item.id}</span>
      </Show>
      <span class="text-sm truncate">{props.item.name}</span>
    </span>
  );
}

const selectItemOption: Item = {id: "", name: "Select an item", createdAt: ""};
const selectAllItem: Item = {id: "", name: "All Items", createdAt: ""};

export function ItemCombobox(
  props: { value: string; onSelect: (id: string) => void; allowAll?: boolean },
) {
  const options = createMemo(() =>
    props.allowAll ? [selectAllItem, ...state.items] : [selectItemOption, ...state.items]
  );
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
      renderTrigger={(item) => <ItemDisplay item={item}/>}
      renderOption={(item) => <ItemDisplay item={item}/>}
    />
  );
}
