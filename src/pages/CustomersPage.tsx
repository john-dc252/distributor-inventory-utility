import { createSignal, For, Show, batch } from "solid-js";
import { state, addCustomer, updateCustomer, deleteCustomer, Customer, isLoaded } from "../store";
import Modal from "../components/Modal";
import {CustomerCardSkeleton} from "../components/Skeleton";
import {useNavigate} from "@solidjs/router";

const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

interface CustomerFields {
  name: string;
  description: string;
  photo: string;
}

function CustomerForm(props: {
  initial?: Customer | 'add';
  onSave: (fields: CustomerFields) => void;
  onCancel: () => void;
}) {
  const initialValues = () => props.initial !== 'add' ? props.initial : undefined;
  const [name, setName] = createSignal(initialValues()?.name ?? '');
  const [description, setDescription] = createSignal(initialValues()?.description ?? '');
  const [photo, setPhoto] = createSignal(initialValues()?.photo ?? '');

  function handleFile(e: Event & { currentTarget: HTMLInputElement; target: HTMLInputElement }) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") setPhoto(result);
    };
    reader.readAsDataURL(file);
  }

  function submit(e: Event) {
    e.preventDefault();
    if (!name().trim()) return;
    props.onSave({ name: name().trim(), description: description().trim(), photo: photo() });
  }

  return (
    <form onSubmit={submit} class="space-y-4">
      <div>
        <label class={labelCls}>Photo (optional)</label>
        <div class="flex items-center gap-3">
          <Show when={photo()}>
            <img src={photo()} alt="preview" class="w-12 h-12 rounded-full object-cover border dark:border-gray-600" />
          </Show>
          <input type="file" accept="image/*" onChange={handleFile} class="text-sm text-gray-600 dark:text-gray-400" />
          <Show when={photo()}>
            <button type="button" onClick={() => setPhoto("")} class="text-xs text-red-500 hover:underline">Remove</button>
          </Show>
        </div>
      </div>

      <div>
        <label class={labelCls}>Name *</label>
        <input value={name()} onInput={(e) => setName(e.target.value)} required class={inputCls} placeholder="Customer name" />
      </div>

      <div>
        <label class={labelCls}>Description</label>
        <textarea value={description()} onInput={(e) => setDescription(e.target.value)} rows={2} class={inputCls} placeholder="Optional notes" />
      </div>

      <div class="flex gap-2 justify-end pt-1">
        <button type="button" onClick={props.onCancel} class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
        <button type="submit" class="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700">Save</button>
      </div>
    </form>
  );
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [modal, setModal] = createSignal<undefined | "add" | Customer>();

  function handleSave(fields: CustomerFields) {
    const m = modal();
    batch(async () => {
      if (m === "add") addCustomer(fields).then();
      else if (m) updateCustomer(m.id, fields).then();
      setModal();
    }).then();
  }

  function handleDelete(id: string) {
    if (confirm("Delete this customer? Their account history will remain in transactions.")) deleteCustomer(id);
  }

  const isEditing = () => modal() && modal() !== "add";
  const modalTitle = () => modal() === "add" ? "New Customer" : "Edit Customer";

  return (
    <div>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100">Customers</h1>
        <button onClick={() => setModal("add")} class="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700">
          + Add Customer
        </button>
      </div>

      <Modal show={!!modal()} onClose={() => setModal()} title={modalTitle()}>
        <CustomerForm
          initial={isEditing() ? modal() : undefined}
          onSave={handleSave}
          onCancel={() => setModal()}
        />
      </Modal>

      <Show when={isLoaded()} fallback={
        <div class="space-y-3">
          <For each={[0, 1, 2]}>{() => <CustomerCardSkeleton/>}</For>
        </div>
      }>
      <div class="space-y-3">
        <For each={state.customers} fallback={<p class="text-sm text-gray-400 dark:text-gray-500">No customers yet. Add one above.</p>}>
          {(customer) => (
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-4">
              <Show
                when={customer.photo}
                fallback={
                  <div class="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-lg shrink-0">
                    {customer.name[0].toUpperCase()}
                  </div>
                }
              >
                <img src={customer.photo} alt={customer.name} class="w-12 h-12 rounded-full object-cover border dark:border-gray-600 shrink-0" />
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
                  class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                  New Transaction
                </button>
                <button onClick={() => setModal(customer)} class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                <button onClick={() => handleDelete(customer.id)} class="text-sm text-red-500 dark:text-red-400 hover:underline">Delete</button>
              </div>
            </div>
          )}
        </For>
      </div>
      </Show>
    </div>
  );
}
