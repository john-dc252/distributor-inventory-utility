import {CheckIcon, XIcon} from './Icons';

interface FormActionsProps {
  onCancel: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  submitDisabled?: boolean;
}

export function FormActions(props: FormActionsProps) {
  return (
    <div class="flex gap-2 justify-end pt-1">
      <button 
        type="button" 
        onClick={props.onCancel}
        class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-1.5"
      >
        <XIcon/>{props.cancelLabel ?? 'Cancel'}
      </button>
      <button 
        type="submit"
        disabled={props.submitDisabled}
        class="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
      >
        <CheckIcon/>{props.saveLabel ?? 'Save'}
      </button>
    </div>
  );
}
