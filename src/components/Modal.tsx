import {createEffect, createSignal, JSX, onCleanup, Show} from "solid-js";

export type ModalResult = 'OK' | 'CANCELLED';

export interface ModalController {
  prompt(): Promise<ModalResult>;
  Modal: () => JSX.Element;
}

export function createModal(options: {
  title: string | (() => string);
  size?: "md" | "lg";
  children: (resolve: (result: ModalResult) => void) => JSX.Element;
}): ModalController {
  const [mounted, setMounted] = createSignal(false);
  const [visible, setVisible] = createSignal(false);
  let resolvePromise: ((result: ModalResult) => void) | null = null;
  let dismissTimeout: ReturnType<typeof setTimeout> | null = null;

  onCleanup(() => {
    if (dismissTimeout) clearTimeout(dismissTimeout);
  });

  createEffect(() => {
    if (mounted()) {
      document.body.classList.add("overflow-hidden");
      onCleanup(() => document.body.classList.remove("overflow-hidden"));
    }
  });

  function dismiss(result: ModalResult) {
    if (!resolvePromise) return;
    setVisible(false);
    const resolve = resolvePromise;
    resolvePromise = null;
    dismissTimeout = setTimeout(() => {
      setMounted(false);
      resolve(result);
    }, 300);
  }

  const resolvedTitle = typeof options.title === "function" ? options.title : () => options.title as string;

  function Modal(): JSX.Element {
    return (
      <Show when={mounted()}>
        <div
          class={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${visible() ? "opacity-100" : "opacity-0"}`}>
          <div class="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={() => dismiss('CANCELLED')}/>
          <div
            class={`relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-h-[90vh] flex flex-col transition-transform duration-300 ease-in-out ${options.size === "lg" ? "max-w-2xl" : "max-w-lg"} ${visible() ? "translate-y-0" : "-translate-y-10"}`}>
            <div
              class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h2 class="font-semibold text-gray-800 dark:text-gray-100">{resolvedTitle()}</h2>
              <button
                onClick={() => dismiss('CANCELLED')}
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div class="overflow-y-auto p-5">
              {options.children(dismiss)}
            </div>
          </div>
        </div>
      </Show>
    );
  }

  return {
    prompt() {
      return new Promise((resolve) => {
        resolvePromise = resolve;
        setMounted(true);
        requestAnimationFrame(() => setVisible(true));
      });
    },
    Modal,
  };
}
