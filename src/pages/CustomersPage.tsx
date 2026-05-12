import {createMemo, createSignal, For, Show} from 'solid-js';
import {addCustomer, Customer, deleteCustomer, isLoaded, state, updateCustomer} from '../store';
import {createModal} from '../components/Modal';
import {createConfirmModal} from '../components/ConfirmModal';
import {CustomerCardSkeleton} from '../components/Skeleton';
import {CustomersEmptyState} from '../components/EmptyState';
import {useNavigate} from '@solidjs/router';
import {CheckIcon, FilePlusIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon, XIcon} from '../components/Icons';
import {inputClsFull as inputCls, labelCls} from '../components/styles';

interface CustomerFields {
  name: string;
  description: string;
  photo: string;
}

function CustomerForm(props: {
  initial?: Customer;
  onSave: (fields: CustomerFields) => void;
  onCancel: () => void;
}) {
  const [name, setName] = createSignal(props.initial?.name ?? '');
  const [description, setDescription] = createSignal(props.initial?.description ?? '');
  const [photo, setPhoto] = createSignal(props.initial?.photo ?? '');

  function handleFile(e: Event & { currentTarget: HTMLInputElement; target: HTMLInputElement }) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') setPhoto(result);
    };
    reader.readAsDataURL(file);
  }

  function submit(e: Event) {
    e.preventDefault();
    if (!name().trim()) return;
    props.onSave({name: name().trim(), description: description().trim(), photo: photo()});
  }

  return (
    <form onSubmit={submit} class="space-y-4">
      <div>
        <label class={labelCls}>Photo (optional)</label>
        <div class="flex items-center gap-3">
          <Show when={photo()}>
            <img src={photo()} alt="preview" class="w-12 h-12 rounded-full object-cover border dark:border-gray-600"/>
          </Show>
          <input type="file" accept="image/*" onChange={handleFile} class="text-sm text-gray-600 dark:text-gray-400"/>
          <Show when={photo()}>
            <button type="button" onClick={() => setPhoto('')} class="text-xs text-red-500 hover:underline">Remove
            </button>
          </Show>
        </div>
      </div>

      <div>
        <label class={labelCls}>Name *</label>
        <input value={name()} onInput={(e) => setName(e.target.value)} required class={inputCls}
               placeholder="Customer name"/>
      </div>

      <div>
        <label class={labelCls}>Description</label>
        <textarea value={description()} onInput={(e) => setDescription(e.target.value)} rows={2} class={inputCls}
                  placeholder="Optional notes"/>
      </div>

      <div class="flex gap-2 justify-end pt-1">
        <button type="button" onClick={props.onCancel}
                class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-1.5">
          <XIcon/>Cancel
        </button>
        <button type="submit"
                class="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-1.5">
          <CheckIcon/>Save
        </button>
      </div>
    </form>
  );
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [modal, setModal] = createSignal<'add' | Customer | undefined>();

  const isEditing = () => modal() && modal() !== 'add';

  const customerModal = createModal({
    title: () => modal() === 'add' ? 'New Customer' : 'Edit Customer',
    children: (resolve, cancel) => (
      <CustomerForm
        initial={isEditing() ? (modal() as Customer) : undefined}
        onSave={async (fields) => {
          const m = modal();
          if (m === 'add') await addCustomer(fields);
          else if (m) await updateCustomer(m.id, fields);
          resolve();
        }}
        onCancel={() => cancel()}
      />
    ),
  });

  const confirmModal = createConfirmModal();

  const [query, setQuery] = createSignal('');
  const filteredCustomers = createMemo(() => {
    const q = query().toLowerCase().trim();
    if (!q) return state.customers ?? [];
    return (state.customers ?? []).filter(c => c.name.toLowerCase().includes(q));
  });

  async function openModal(m: 'add' | Customer) {
    setModal(m);
    await customerModal.prompt();
    setModal(undefined);
  }

  async function handleDelete(id: string) {
    const result = await confirmModal.prompt('Delete this customer? Their account history will remain in transactions.');
    if (result === 'OK') deleteCustomer(id);
  }

  return (
    <div>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100">Customers</h1>
        <button onClick={() => openModal('add')}
                class="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-1.5">
          <PlusIcon/>Add Customer
        </button>
      </div>

      <customerModal.Modal/>
      <confirmModal.Modal/>

      <Show when={isLoaded()} fallback={
        <div class="space-y-3">
          <For each={[0, 1, 2]}>{() => <CustomerCardSkeleton/>}</For>
        </div>
      }>
        <div class="space-y-4">
          <div class="relative">
            <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
            <input
              type="search"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              placeholder="Search by name…"
              class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div class="space-y-3">
          <For each={filteredCustomers()}
               fallback={query() ? <p class="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No results for "{query()}".</p> : <CustomersEmptyState/>}>
            {(customer) => (
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-4">
                <Show
                  when={customer.photo}
                  fallback={
                    <div
                      class="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-lg shrink-0">
                      {customer.name[0].toUpperCase()}
                    </div>
                  }
                >
                  <img src={customer.photo} alt={customer.name}
                       class="w-12 h-12 rounded-full object-cover border dark:border-gray-600 shrink-0"/>
                </Show>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-gray-800 dark:text-gray-100">{customer.name}</p>
                  <Show when={customer.description}>
                    <p class="text-sm text-gray-500 dark:text-gray-400 truncate">{customer.description}</p>
                  </Show>
                </div>
                <div class="flex gap-2 shrink-0">
                  <button
                    onClick={() => navigate(`/transactions?customerTx=${customer.id}`)}
                    class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                    <FilePlusIcon class="w-5 h-5 sm:w-3.5 sm:h-3.5"/><span class="hidden sm:inline">New Transaction</span>
                  </button>
                  <button onClick={() => openModal(customer)}
                          class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                    <PencilIcon class="w-5 h-5 sm:w-3.5 sm:h-3.5"/><span class="hidden sm:inline">Edit</span>
                  </button>
                  <button onClick={() => handleDelete(customer.id)}
                          class="text-sm text-red-500 dark:text-red-400 hover:underline inline-flex items-center gap-1">
                    <TrashIcon class="w-5 h-5 sm:w-3.5 sm:h-3.5"/><span class="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>
            )}
          </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
