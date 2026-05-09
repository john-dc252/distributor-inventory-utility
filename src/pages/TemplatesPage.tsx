import {createMemo, createSignal, For, Show} from "solid-js";
import {
  AccountId,
  addTemplate,
  DEFAULT_TEMPLATES,
  deleteTemplate,
  getAccountLabel,
  isLoaded,
  PREDEFINED_ACCOUNT_IDS,
  resetTemplatesToDefault,
  state,
  Template,
  TemplateEntry,
  updateTemplate
} from "../store";
import {createModal} from "../components/Modal";
import {createConfirmModal} from "../components/ConfirmModal";
import {TemplateCardSkeleton} from "../components/Skeleton";
import {CheckIcon, PencilIcon, PlusIcon, RefreshIcon, SearchIcon, TrashIcon, XIcon} from "../components/Icons";
import {inputClsFull as inputCls, labelCls} from "../components/styles";
import {AccountCombobox} from "../components/AccountCombobox";

interface TemplateFormLeg {
  accountId?: AccountId;
}

interface TemplateFormEntry {
  sources: TemplateFormLeg[];
  destinations: TemplateFormLeg[];
}

function newLeg(): TemplateFormLeg {
  return {accountId: undefined};
}

function newEntry(): TemplateFormEntry {
  return {sources: [newLeg()], destinations: [newLeg()]};
}

function normalizeTemplateLegs(legs: any): TemplateFormLeg[] {
  const legsArray = Array.isArray(legs) ? legs : (legs ? [legs] : []);
  const normalized = legsArray.values()
    .map((leg) => {
      const accountId = (typeof leg === "string" ? leg : leg?.accountId) as AccountId;
      return {accountId: accountId};
    })
    .filter((leg) => leg.accountId)
    .toArray();

  return normalized.length > 0 ? normalized : [newLeg()];
}

function normalizeTemplateEntries(templateEntries: any): TemplateFormEntry[] {
  if (!Array.isArray(templateEntries) || templateEntries.length === 0) return [newEntry()];

  return templateEntries.map((entry) => ({
    sources: normalizeTemplateLegs(entry?.sources ?? entry?.source),
    destinations: normalizeTemplateLegs(entry?.destinations ?? entry?.destination),
  }));
}

function LegSelect(props: {
  leg: TemplateFormLeg;
  side: "source" | "destination";
  onUpdate: (leg: TemplateFormLeg) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const color = () => props.side === "source"
    ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
    : "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20";
  return (
    <div class={`flex gap-2 items-center rounded px-2 py-1.5 border ${color()}`}>
      <div class="flex-1 min-w-0">
        <AccountCombobox
          value={props.leg.accountId}
          onSelect={(type) => props.onUpdate({accountId: type})}
        />
      </div>
      <button type="button" onClick={props.onRemove} disabled={!props.canRemove}
              class={`p-1 ${props.canRemove ? 'text-gray-400 hover:text-red-500' : 'text-gray-300 dark:text-gray-500 cursor-not-allowed'}`}>
        <XIcon class="w-4 h-4"/>
      </button>
    </div>
  );
}

function TemplateForm(props: {
  initial?: Template;
  onSave: (fields: { name: string; entries: TemplateFormEntry[] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [entries, setEntries] = createSignal(normalizeTemplateEntries(props.initial?.entries));

  function updateEntry(i: number, updated: TemplateFormEntry) {
    setEntries((prev) => prev.map((e, idx) => idx === i ? updated : e));
  }

  function updateLeg(ei: number, side: "source" | "destination", li: number, updated: TemplateFormLeg) {
    const key = side === "source" ? "sources" : "destinations";
    const entry = entries()[ei];
    const list = [...entry[key]];
    list[li] = updated;
    updateEntry(ei, {...entry, [key]: list});
  }

  function addLeg(ei: number, side: "source" | "destination") {
    const key = side === "source" ? "sources" : "destinations";
    const entry = entries()[ei];
    updateEntry(ei, {...entry, [key]: [...entry[key], newLeg()]});
  }

  function removeLeg(ei: number, side: "source" | "destination", li: number) {
    const key = side === "source" ? "sources" : "destinations";
    const entry = entries()[ei];
    updateEntry(ei, {...entry, [key]: entry[key].filter((_, idx) => idx !== li)});
  }

  function submit(e: Event) {
    e.preventDefault();
    if (!name().trim() || entries().length === 0) return;
    props.onSave({name: name().trim(), entries: entries()});
  }

  return (
    <form onSubmit={submit} class="space-y-4">
      <div>
        <label class={labelCls}>Template Name *</label>
        <input value={name()} onInput={(e) => setName(e.target.value)} required class={inputCls}
               placeholder="e.g. Customer return to supplier"/>
      </div>

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label class={labelCls}>Entries</label>
          <button type="button" onClick={() => setEntries((prev) => [...prev, newEntry()])}
                  class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
            <PlusIcon class="w-3 h-3"/>Add entry
          </button>
        </div>

        <For each={entries()}>
          {(entry, ei) => (
            <div
              class="border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700/40 space-y-1.5">
              <div class="flex justify-between items-center">
                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Entry {ei() + 1}</span>
                <Show when={entries().length > 1}>
                  <button type="button" onClick={() => setEntries((prev) => prev.filter((_, idx) => idx !== ei()))}
                          class="text-xs text-red-400 hover:text-red-600 inline-flex items-center gap-1"><XIcon
                    class="w-3 h-3"/>Remove
                  </button>
                </Show>
              </div>

              {/* FROM */}
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">From</span>
                  <button type="button" onClick={() => addLeg(ei(), "source")}
                          class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                    <PlusIcon class="w-3 h-3"/>add
                  </button>
                </div>
                <div class="flex gap-2 px-2">
                  <span class="flex-1 text-xs text-gray-400 dark:text-gray-500">Account</span>
                  <span class="w-6 shrink-0"/>
                </div>
                <For each={entry.sources}>
                  {(leg, li) => (
                    <LegSelect
                      leg={leg} side="source"
                      onUpdate={(u) => updateLeg(ei(), "source", li(), u)}
                      onRemove={() => removeLeg(ei(), "source", li())}
                      canRemove={entry.sources.length > 1}
                    />
                  )}
                </For>
              </div>

              {/* TO */}
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <span
                    class="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">To</span>
                  <button type="button" onClick={() => addLeg(ei(), "destination")}
                          class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                    <PlusIcon class="w-3 h-3"/>add
                  </button>
                </div>
                <div class="flex gap-2 px-2">
                  <span class="flex-1 text-xs text-gray-400 dark:text-gray-500">Account</span>
                  <span class="w-6 shrink-0"/>
                </div>
                <For each={entry.destinations}>
                  {(leg, li) => (
                    <LegSelect
                      leg={leg} side="destination"
                      onUpdate={(u) => updateLeg(ei(), "destination", li(), u)}
                      onRemove={() => removeLeg(ei(), "destination", li())}
                      canRemove={entry.destinations.length > 1}
                    />
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
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

function EntryPreview(props: { entry: TemplateEntry }) {
  const rows = () => {
    const srcs = normalizeTemplateLegs(props.entry.sources);
    const dsts = normalizeTemplateLegs(props.entry.destinations);
    return Array.from({length: Math.max(srcs.length, dsts.length)}, (_, i) => ({
      src: srcs[i],
      dst: dsts[i],
    }));
  };

  return (
    <div class="grid grid-cols-2 gap-x-3 gap-y-0.5">
      <span class="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">From</span>
      <span class="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">To</span>
      <For each={rows()}>
        {({src, dst}) => (
          <>
            {src
              ? <span
                class="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">{getAccountLabel(src.accountId)}</span>
              : <span/>}
            {dst
              ? <span
                class="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">{getAccountLabel(dst.accountId)}</span>
              : <span/>}
          </>
        )}
      </For>
    </div>
  );
}

export default function TemplatesPage() {
  const [modal, setModal] = createSignal<"add" | Template | undefined>();

  const isEditing = () => modal() && modal() !== "add";

  const templateModal = createModal({
    title: () => modal() === "add" ? "New Template" : "Edit Template",
    children: (resolve) => (
      <TemplateForm
        initial={isEditing() ? (modal() as Template) : undefined}
        onSave={async (fields) => {
          const m = modal();
          if (m === "add") await addTemplate(fields);
          else if (m) await updateTemplate(m.id, fields);
          resolve('OK');
        }}
        onCancel={() => resolve('CANCELLED')}
      />
    ),
  });

  const confirmModal = createConfirmModal();

  const [query, setQuery] = createSignal('');
  const filteredTemplates = createMemo(() => {
    const q = query().toLowerCase().trim();
    if (!q) return state.templates ?? [];
    return (state.templates ?? []).filter(t => t.name.toLowerCase().includes(q));
  });

  async function openModal(m: "add" | Template) {
    setModal(m);
    await templateModal.prompt();
    setModal(undefined);
  }

  async function handleDelete(id: string) {
    const result = await confirmModal.prompt("Delete this template?");
    if (result === 'OK') deleteTemplate(id).then();
  }

  async function handleReset() {
    const result = await confirmModal.prompt("Reset all templates to defaults? Custom templates will be lost.");
    if (result === 'OK') resetTemplatesToDefault().then();
  }

  return (
    <div>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100">Transaction Templates</h1>
        <div class="flex gap-2">
          <button onClick={handleReset}
                  class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-1.5">
            <RefreshIcon/>Reset to defaults
          </button>
          <button onClick={() => openModal("add")}
                  class="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-1.5">
            <PlusIcon/>New Template
          </button>
        </div>
      </div>

      <templateModal.Modal/>
      <confirmModal.Modal/>

      <Show when={isLoaded()} fallback={
        <div class="space-y-3">
          <For each={[0, 1, 2]}>{() => <TemplateCardSkeleton/>}</For>
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
          <For each={filteredTemplates()} fallback={query() ? <p class="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No results for "{query()}".</p> : <p class="text-sm text-gray-400 dark:text-gray-500">No templates.</p>}>
            {(tpl) => (
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div class="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p class="font-semibold text-gray-800 dark:text-gray-100 text-sm">{tpl.name}</p>
                    <Show when={DEFAULT_TEMPLATES.some((t) => t.id === tpl.id)}>
                      <span class="text-xs text-indigo-500 dark:text-indigo-400 font-medium">Default</span>
                    </Show>
                  </div>
                  <div class="flex gap-2 shrink-0">
                    <button onClick={() => openModal(tpl)}
                            class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                      <PencilIcon/>Edit
                    </button>
                    <button onClick={() => handleDelete(tpl.id)}
                            class="text-sm text-red-500 dark:text-red-400 hover:underline inline-flex items-center gap-1">
                      <TrashIcon/>Delete
                    </button>
                  </div>
                </div>
                <div class="space-y-1.5">
                  <For each={tpl.entries}>
                    {(entry, i) => (
                      <div>
                        <Show when={tpl.entries.length > 1}>
                          <p class="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Entry {i() + 1}</p>
                        </Show>
                        <EntryPreview entry={entry}/>
                      </div>
                    )}
                  </For>
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
