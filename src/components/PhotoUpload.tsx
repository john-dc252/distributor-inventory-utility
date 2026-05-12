import {Show} from 'solid-js';
import {labelCls} from './styles';

interface PhotoUploadProps {
  photo: string;
  setPhoto: (photo: string) => void;
  label?: string;
  roundedFull?: boolean;
}

export function PhotoUpload(props: PhotoUploadProps) {
  function handleFile(e: Event & { currentTarget: HTMLInputElement; target: HTMLInputElement }) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') props.setPhoto(result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <label class={labelCls}>{props.label ?? 'Photo (optional)'}</label>
      <div class="flex items-center gap-3">
        <Show when={props.photo}>
          <img 
            src={props.photo} 
            alt="preview" 
            class={`w-12 h-12 object-cover border dark:border-gray-600 ${props.roundedFull ? 'rounded-full' : 'rounded'}`}
          />
        </Show>
        <input type="file" accept="image/*" onChange={handleFile} class="text-sm text-gray-600 dark:text-gray-400"/>
        <Show when={props.photo}>
          <button type="button" onClick={() => props.setPhoto('')} class="text-xs text-red-500 hover:underline">
            Remove
          </button>
        </Show>
      </div>
    </div>
  );
}
