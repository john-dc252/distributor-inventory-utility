import {createMemo, createSignal, For, JSX, onCleanup, onMount, Show} from "solid-js";
import {Portal} from "solid-js/web";
import {sel} from "./styles";
import {suspend} from "../utils";

export function Combobox<T extends { id: string }>(props: {
  value?: string;
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
  const [pos, setPos] = createSignal<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  let inputRef!: HTMLInputElement;
  let triggerRef!: HTMLButtonElement;

  onMount(() => {
    let lastWidth = window.innerWidth;

    function onResize() {
      const w = window.innerWidth;
      if (w === lastWidth) return; // height-only change = virtual keyboard, ignore
      lastWidth = w;
      setOpen(false);
      setQuery("");
    }

    window.addEventListener("resize", onResize);
    onCleanup(() => window.removeEventListener("resize", onResize));
  });

  const selected = createMemo(() => props.options.find(i => i.id === props.value));
  const filtered = createMemo(() => {
    const q = query().toLowerCase();
    return q ? props.options.filter(i => props.filterFn(i, q)) : props.options;
  });

  function openDropdown() {
    const r = triggerRef.getBoundingClientRect();
    const above = window.innerHeight - r.bottom < 260;
    setPos({
      left: r.left,
      width: r.width,
      ...(above ? {bottom: window.innerHeight - r.top + 4} : {top: r.bottom + 4}),
    });
    setOpen(true);
    suspend(0).then(() => inputRef.focus());
  }

  function select(id: string) {
    props.onSelect(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div>
      <button ref={triggerRef} type="button" onClick={openDropdown}
              class={`${sel} w-full flex items-center justify-between gap-2 text-left`}>
        <Show when={selected()} fallback={<span class="text-gray-400 text-sm">{props.placeholder}</span>}>
          {props.renderTrigger(selected()!)}
        </Show>
        <span class="text-gray-400 text-xs shrink-0">▾</span>
      </button>
      <Show when={open()}>
        <div class="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
        <Portal>
          <div
            class="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden text-gray-800 dark:text-gray-100"
            style={{
              top: pos()!.top !== undefined ? `${pos()!.top}px` : undefined,
              bottom: pos()!.bottom !== undefined ? `${pos()!.bottom}px` : undefined,
              left: `${pos()!.left}px`,
              width: `${pos()!.width}px`,
            }}>
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
        </Portal>
      </Show>
    </div>
  );
}
