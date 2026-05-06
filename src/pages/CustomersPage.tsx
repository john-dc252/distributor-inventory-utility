import { createSignal, For, Show, batch } from "solid-js";
import { state, addCustomer, updateCustomer, deleteCustomer } from "../store";
import Modal from "../components/Modal";

const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

function CustomerForm(props) {
  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [description, setDescription] = createSignal(props.initial?.description ?? "");
  const [photo, setPhoto] = createSignal(props.initial?.photo ?? "");

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  }

  function submit(e) {
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
  const [modal, setModal] = createSignal(null); // null | "add" | customer-object

  function handleSave(fields) {
    const m = modal();
    batch(() => {
      if (m === "add") addCustomer(fields);
      else updateCustomer(m.id, fields);
      setModal(null);
    });
  }

  function handleDelete(id) {
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

      <Modal show={!!modal()} onClose={() => setModal(null)} title={modalTitle()}>
        <CustomerForm
          initial={isEditing() ? modal() : undefined}
          onSave={handleSave}
          onCancel={() => setModal(null)}
        />
      </Modal>

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
                <button onClick={() => setModal(customer)} class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                <button onClick={() => handleDelete(customer.id)} class="text-sm text-red-500 dark:text-red-400 hover:underline">Delete</button>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
