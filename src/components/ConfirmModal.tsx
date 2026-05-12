import {createSignal, JSX} from 'solid-js';
import {createModal, ModalResult} from './Modal';
import {CheckIcon, XIcon} from './Icons';

export interface ConfirmController {
  prompt(message: string): Promise<ModalResult>;

  Modal: () => JSX.Element;
}

export function createConfirmModal(): ConfirmController {
  const [message, setMessage] = createSignal('');

  const {prompt: basePrompt, Modal} = createModal({
    title: 'Confirm',
    children: (resolve, cancel) => (
      <div class="space-y-5">
        <p class="text-sm text-gray-700 dark:text-gray-300">{message()}</p>
        <div class="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => cancel()}
            class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-1.5"
          >
            <XIcon/>Cancel
          </button>
          <button
            type="button"
            onClick={() => resolve()}
            class="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-1.5"
          >
            <CheckIcon/>Confirm
          </button>
        </div>
      </div>
    ),
  });

  return {
    prompt(msg: string) {
      setMessage(msg);
      return basePrompt();
    },
    Modal,
  };
}
