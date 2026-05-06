import { createSignal, For, Show, batch } from "solid-js";
import { state, addItem, updateItem, deleteItem, itemIdExists } from "../store";
import Modal from "../components/Modal";

const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

function ItemForm(props) {
  const [id, setId] = createSignal(props.initial?.id ?? "");
  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [description, setDescription] = createSignal(props.initial?.description ?? "");
  const [photo, setPhoto] = createSignal(props.initial?.photo ?? "");
  const [idError, setIdError] = createSignal("");

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  }

  function submit(e) {
    e.preventDefault();
    const trimId = id().trim();
    const trimName = name().trim();
    if (!trimId || !trimName) return;
    if (itemIdExists(trimId, props.initial?.id)) { setIdError("This ID is already in use."); return; }
    setIdError("");
    props.onSave({ id: trimId, name: trimName, description: description().trim(), photo: photo() });
  }

  return (
    <form onSubmit={submit} class="space-y-4">
      <div>
        <label class={labelCls}>Photo (optional)</label>
        <div class="flex items-center gap-3">
          <Show when={photo()}>
            <img src={photo()} alt="preview" class="w-12 h-12 rounded object-cover border dark:border-gray-600" />
          </Show>
          <input type="file" accept="image/*" onChange={handleFile} class="text-sm text-gray-600 dark:text-gray-400" />
          <Show when={photo()}>
            <button type="button" onClick={() => setPhoto("")} class="text-xs text-red-500 hover:underline">Remove</button>
          </Show>
        </div>
      </div>

      <div>
        <label class={labelCls}>Item ID *</label>
        <input
          value={id()}
          onInput={(e) => { setId(e.target.value); setIdError(""); }}
          required
          class={inputCls}
          placeholder="e.g. SKU-001"
          disabled={!!props.initial}
        />
        <Show when={props.initial}>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">ID cannot be changed after creation.</p>
        </Show>
        <Show when={idError()}>
          <p class="text-xs text-red-500 mt-0.5">{idError()}</p>
        </Show>
      </div>

      <div>
        <label class={labelCls}>Name *</label>
        <input value={name()} onInput={(e) => setName(e.target.value)} required class={inputCls} placeholder="Item name" />
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

export default function ItemsPage() {
  const [modal, setModal] = createSignal(null); // null | "add" | item-object

  function handleSave(fields) {
    const m = modal();
    batch(() => {
      if (m === "add") addItem(fields);
      else updateItem(m.id, fields);
      setModal(null);
    });
  }

  function handleDelete(id) {
    if (confirm("Delete this item? Existing transactions referencing it will still show its ID.")) deleteItem(id);
  }

  const isEditing = () => modal() && modal() !== "add";
  const modalTitle = () => modal() === "add" ? "New Item" : "Edit Item";

  return (
    <div>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100">Items</h1>
        <button onClick={() => setModal("add")} class="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700">
          + Add Item
        </button>
      </div>

      <Modal show={!!modal()} onClose={() => setModal(null)} title={modalTitle()}>
        <ItemForm
          initial={isEditing() ? modal() : undefined}
          onSave={handleSave}
          onCancel={() => setModal(null)}
        />
      </Modal>

      <div class="space-y-3">
        <For each={state.items} fallback={<p class="text-sm text-gray-400 dark:text-gray-500">No items yet. Add one above.</p>}>
          {(item) => (
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-4">
              <Show
                when={item.photo}
                fallback={
                  <div class="w-12 h-12 rounded bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-lg shrink-0">
                    {item.name[0].toUpperCase()}
                  </div>
                }
              >
                <img src={item.photo} alt={item.name} class="w-12 h-12 rounded object-cover border dark:border-gray-600 shrink-0" />
              </Show>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="font-semibold text-gray-800 dark:text-gray-100">{item.name}</p>
                  <span class="text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{item.id}</span>
                </div>
                <Show when={item.description}>
                  <p class="text-sm text-gray-500 dark:text-gray-400 truncate">{item.description}</p>
                </Show>
              </div>
              <div class="flex gap-2 shrink-0">
                <button onClick={() => setModal(item)} class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                <button onClick={() => handleDelete(item.id)} class="text-sm text-red-500 dark:text-red-400 hover:underline">Delete</button>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
