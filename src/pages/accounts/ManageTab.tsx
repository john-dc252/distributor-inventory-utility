import {createSignal, For, Show} from 'solid-js';
import {
  accountCodeExists,
  addAccount,
  deleteAccount,
  Account,
  PREDEFINED_ACCOUNT_ID_SET,
  state,
  updateAccount,
} from '../../store';
import {CheckIcon, PencilIcon, PlusIcon, TrashIcon, XIcon} from '../../components/Icons';
import {inputCls} from '../../components/styles';

function AccountEditForm(props: { account: Account; onDone: () => void }) {
  const [code, setCode] = createSignal(props.account.code);
  const [name, setName] = createSignal(props.account.name);
  const [description, setDescription] = createSignal(props.account.description ?? '');
  const [customerSpecific, setCustomerSpecific] = createSignal(props.account.customerSpecific);
  const [error, setError] = createSignal('');

  async function save(e: Event) {
    e.preventDefault();
    const c = code().trim();
    const n = name().trim();
    if (!c || !n) return;
    if (accountCodeExists(c, props.account.id)) {
      setError(`Code "${c}" is already used by another account.`);
      return;
    }
    await updateAccount(props.account.id, {
      code: c,
      name: n,
      description: description().trim() || undefined,
      customerSpecific: customerSpecific(),
    });
    props.onDone();
  }

  return (
    <form onSubmit={save}
          class="flex flex-wrap items-center gap-2 py-2 px-3 my-0.5 bg-gray-50 dark:bg-gray-700/60 rounded border border-gray-200 dark:border-gray-600">
      <input value={code()} onInput={(e) => setCode(e.target.value)} required
             placeholder="Code" class={`w-28 font-mono ${inputCls}`}/>
      <input value={name()} onInput={(e) => setName(e.target.value)} required
             placeholder="Name" class={`flex-1 min-w-32 ${inputCls}`}/>
      <input value={description()} onInput={(e) => setDescription(e.target.value)}
             placeholder="Description (optional)" class={`flex-1 min-w-40 ${inputCls}`}/>
      <label class="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 shrink-0 cursor-pointer select-none">
        <input type="checkbox" checked={customerSpecific()}
               onChange={(e) => setCustomerSpecific(e.target.checked)} class="rounded"/>
        customer-specific
      </label>
      <Show when={error()}>
        <span class="w-full text-xs text-red-600 dark:text-red-400">{error()}</span>
      </Show>
      <div class="flex gap-1.5">
        <button type="submit"
                class="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-1">
          <CheckIcon class="w-3 h-3"/>Save
        </button>
        <button type="button" onClick={props.onDone}
                class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-1">
          <XIcon class="w-3 h-3"/>Cancel
        </button>
      </div>
    </form>
  );
}

function AccountAddForm(props: { parentId: string | null; customerSpecific?: boolean; onDone: () => void }) {
  const [code, setCode] = createSignal('');
  const [name, setName] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [customerSpecific, setCustomerSpecific] = createSignal(props.customerSpecific ?? false);
  const [error, setError] = createSignal('');

  async function save(e: Event) {
    e.preventDefault();
    const c = code().trim();
    const n = name().trim();
    if (!c || !n) return;
    if (accountCodeExists(c)) {
      setError(`Code "${c}" already exists.`);
      return;
    }
    await addAccount(props.parentId, {
      code: c,
      name: n,
      description: description().trim() || undefined,
      customerSpecific: customerSpecific(),
    });
    props.onDone();
  }

  return (
    <form onSubmit={save}
          class="flex flex-wrap items-center gap-2 py-2 px-3 my-0.5 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-700">
      <input value={code()} onInput={(e) => setCode(e.target.value)} required
             placeholder="Code" class={`w-28 font-mono ${inputCls}`}/>
      <input value={name()} onInput={(e) => setName(e.target.value)} required
             placeholder="Name" class={`flex-1 min-w-32 ${inputCls}`}/>
      <input value={description()} onInput={(e) => setDescription(e.target.value)}
             placeholder="Description (optional)" class={`flex-1 min-w-40 ${inputCls}`}/>
      <label class="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 shrink-0 cursor-pointer select-none">
        <input type="checkbox" checked={customerSpecific()}
               onChange={(e) => setCustomerSpecific(e.target.checked)} class="rounded"/>
        customer-specific
      </label>
      <Show when={error()}>
        <span class="w-full text-xs text-red-600 dark:text-red-400">{error()}</span>
      </Show>
      <div class="flex gap-1.5">
        <button type="submit"
                class="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-1">
          <CheckIcon class="w-3 h-3"/>Add
        </button>
        <button type="button" onClick={props.onDone}
                class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-1">
          <XIcon class="w-3 h-3"/>Cancel
        </button>
      </div>
    </form>
  );
}

function AccountNode(props: { account: Account; depth: number }) {
  const [editing, setEditing] = createSignal(false);
  const [addingChild, setAddingChild] = createSignal(false);
  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const isPredefined = PREDEFINED_ACCOUNT_ID_SET.has(props.account.id);
  const indent = () => `${props.depth * 1.25}rem`;

  return (
    <div>
      <Show when={editing()} fallback={
        <div
          class="flex items-center gap-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
          style={{'padding-left': `calc(${indent()} + 0.375rem)`, 'padding-right': '0.375rem'}}>
          <span class="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">
            {props.account.code}
          </span>
          <span class="text-sm font-medium text-gray-800 dark:text-gray-100">{props.account.name}</span>
          <Show when={props.account.customerSpecific}>
            <span class="text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shrink-0">
              customer-specific
            </span>
          </Show>
          <Show when={props.account.description}>
            <span class="text-xs text-gray-400 dark:text-gray-500 italic truncate hidden sm:block">
              {props.account.description}
            </span>
          </Show>
          <div class="flex items-center gap-2 ml-auto shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button type="button"
                    onClick={() => { setEditing(true); setAddingChild(false); setConfirmDelete(false); }}
                    class="text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200 inline-flex items-center gap-1">
              <PencilIcon class="w-3 h-3"/>Edit
            </button>
            <button type="button"
                    onClick={() => { setAddingChild(true); setEditing(false); setConfirmDelete(false); }}
                    class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-1">
              <PlusIcon class="w-3 h-3"/>Sub-account
            </button>
            <Show when={!isPredefined}>
              <Show when={confirmDelete()} fallback={
                <button type="button" onClick={() => setConfirmDelete(true)}
                        class="text-xs text-red-400 hover:text-red-600 inline-flex items-center gap-1">
                  <TrashIcon class="w-3 h-3"/>Delete
                </button>
              }>
                <span class="inline-flex items-center gap-1.5 text-xs">
                  <span class="text-red-600 dark:text-red-400">Delete?</span>
                  <button type="button" onClick={() => deleteAccount(props.account.id)}
                          class="font-semibold text-red-600 dark:text-red-400 hover:underline">Yes
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)}
                          class="text-gray-500 dark:text-gray-400 hover:underline">No
                  </button>
                </span>
              </Show>
            </Show>
          </div>
        </div>
      }>
        <div style={{'padding-left': indent()}}>
          <AccountEditForm account={props.account} onDone={() => setEditing(false)}/>
        </div>
      </Show>

      <Show when={addingChild()}>
        <div style={{'padding-left': `${(props.depth + 1) * 1.25}rem`}}>
          <AccountAddForm parentId={props.account.id} customerSpecific={props.account.customerSpecific}
                          onDone={() => setAddingChild(false)}/>
        </div>
      </Show>

      <For each={props.account.subAccounts}>
        {(child) => <AccountNode account={child} depth={props.depth + 1}/>}
      </For>
    </div>
  );
}

export function ManageTab() {
  return (
    <div class="space-y-2">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
        Pre-defined accounts can be edited but not deleted.
      </p>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow px-2 py-1">
        <For each={state.accounts}>
          {(account) => <AccountNode account={account} depth={0}/>}
        </For>
      </div>
    </div>
  );
}
