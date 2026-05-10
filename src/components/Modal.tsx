import {createSignal, JSX, onCleanup, Show} from "solid-js";
import {Portal} from "solid-js/web";

export type ModalResult = 'OK' | 'CANCELLED';

export interface ModalController {
  prompt(): Promise<ModalResult>;
  Modal: () => JSX.Element;
}

// Module-level stack of open modal IDs — only the topmost modal is shown.
const [stack, setStack] = createSignal<symbol[]>([]);
const pushModal  = (id: symbol) => setStack(s => [...s, id]);
const popModal   = (id: symbol) => setStack(s => s.filter(x => x !== id));
const isTopModal = (id: symbol) => { const s = stack(); return s.length > 0 && s[s.length - 1] === id; };

// Reference-counted body scroll lock so nested modals don't unlock prematurely.
let lockCount = 0;
function lockBody()   { if (++lockCount === 1) document.body.classList.add("overflow-hidden"); }
function unlockBody() { if (--lockCount === 0) document.body.classList.remove("overflow-hidden"); }

export function createModal(options: {
  title: string | (() => string);
  size?: "md" | "lg";
  children: (resolve: (result: ModalResult) => void) => JSX.Element;
}): ModalController {
  const id = Symbol();
  const [mounted, setMounted] = createSignal(false);
  const [visible, setVisible] = createSignal(false);
  let resolvePromise: ((result: ModalResult) => void) | null = null;
  let dismissTimeout: ReturnType<typeof setTimeout> | null = null;

  onCleanup(() => {
    if (dismissTimeout) clearTimeout(dismissTimeout);
  });

  function dismiss(result: ModalResult) {
    if (!resolvePromise) return;
    setVisible(false);
    const resolve = resolvePromise;
    resolvePromise = null;
    if (result === 'OK') {
      // Resolve immediately so the caller can dismiss any modal beneath us in the
      // same animation frame. Keep this modal in the stack until its slide-out
      // completes so the modal below never becomes the top and slides back in.
      resolve(result);
      dismissTimeout = setTimeout(() => {
        setMounted(false);
        popModal(id);
        unlockBody();
      }, 300);
    } else {
      // Pop immediately so the modal below starts its slide-in at the same time
      // as this one slides out (simultaneous animation).
      popModal(id);
      dismissTimeout = setTimeout(() => {
        setMounted(false);
        unlockBody();
        resolve(result);
      }, 300);
    }
  }

  const resolvedTitle = typeof options.title === "function" ? options.title : () => options.title as string;

  function Modal(): JSX.Element {
    return (
      <Show when={mounted()}>
        <Portal>
        <div
          class={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${visible() && isTopModal(id) ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <div class="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={() => dismiss('CANCELLED')}/>
          <div
            class={`relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-h-[90vh] flex flex-col transition-transform duration-300 ease-in-out ${options.size === "lg" ? "max-w-2xl" : "max-w-lg"} ${visible() && isTopModal(id) ? "translate-y-0" : "-translate-y-10"}`}>
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
        </Portal>
      </Show>
    );
  }

  return {
    prompt() {
      return new Promise((resolve) => {
        resolvePromise = resolve;
        lockBody();
        setMounted(true);
        pushModal(id);
        requestAnimationFrame(() => setVisible(true));
      });
    },
    Modal,
  };
}
