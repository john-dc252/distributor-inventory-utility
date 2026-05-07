import { Show, JSX, createEffect, onCleanup } from "solid-js";

// Props must NOT be destructured — SolidJS props are reactive getters and
// destructuring snapshots them, breaking Show/reactivity inside.
export default function Modal(props: {
  show: boolean;
  onClose: () => void;
  title: string;
  children: JSX.Element;
}) {
  createEffect(() => {
    if (props.show) {
      document.body.classList.add("overflow-hidden");
      onCleanup(() => document.body.classList.remove("overflow-hidden"));
    }
  });

  return (
    <Show when={props.show}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={props.onClose} />
        <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <h2 class="font-semibold text-gray-800 dark:text-gray-100">{props.title}</h2>
            <button
              onClick={props.onClose}
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
            >
              &times;
            </button>
          </div>
          <div class="overflow-y-auto p-5">
            {props.children}
          </div>
        </div>
      </div>
    </Show>
  );
}
