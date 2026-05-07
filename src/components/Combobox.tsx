import {createMemo, createSignal, For, JSX, Show} from "solid-js";
import {sel} from "./styles";

export function Combobox<T extends { id: string }>(props: {
  value: string;
  onSelect: (id: string) => void;
  options: T[];
  filterFn: (item: T, query: string) => boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  renderTrigger: (item: T) => JSX.Element;
  renderOption: (item: T) => JSX.Element;
}) {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  let inputRef!: HTMLInputElement;

  const selected = createMemo(() => props.options.find(i => i.id === props.value));
  const filtered = createMemo(() => {
    const q = query().toLowerCase();
    return q ? props.options.filter(i => props.filterFn(i, q)) : props.options;
  });

  function openDropdown() {
    setOpen(true);
    setTimeout(() => inputRef?.focus(), 0);
  }

  function select(id: string) {
    props.onSelect(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div class="relative">
      <button type="button" onClick={openDropdown}
              class={`${sel} w-full flex items-center justify-between gap-2 text-left`}>
        <Show when={selected()} fallback={<span class="text-gray-400 text-sm">{props.placeholder}</span>}>
          {props.renderTrigger(selected()!)}
        </Show>
        <span class="text-gray-400 text-xs shrink-0">▾</span>
      </button>
      <Show when={open()}>
        <div class="fixed inset-0 z-10" onClick={() => setOpen(false)}/>
        <div
          class="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden text-gray-800 dark:text-gray-100">
          <div class="p-2 border-b border-gray-100 dark:border-gray-700">
            <input ref={inputRef} type="text" value={query()}
                   onInput={(e) => setQuery(e.target.value)}
                   placeholder={props.searchPlaceholder}
                   class="w-full text-sm px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"/>
          </div>
          <div class="max-h-48 overflow-auto">
            <Show when={filtered().length > 0}
                  fallback={<p class="text-xs text-gray-400 py-3 text-center">{props.emptyText}</p>}>
              <For each={filtered()}>
                {(item) => (
                  <button type="button" onClick={() => select(item.id)}
                          class={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${props.value === item.id ? "bg-indigo-50 dark:bg-indigo-900/30 font-medium" : ""}`}>
                    {props.renderOption(item)}
                  </button>
                )}
              </For>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}
