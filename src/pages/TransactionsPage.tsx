import {createMemo, createSignal, For, onMount, Show} from "solid-js";
import {TransactionCardSkeleton} from "../components/Skeleton";
import {createStore, produce, reconcile} from "solid-js/store";
import {CheckIcon, PlusIcon, TrashIcon, XIcon} from "../components/Icons";
import {
  AccountType,
  addTransaction,
  Customer,
  deleteTransaction,
  Entry,
  getAccountLabel,
  isLoaded,
  isPerCustomer,
  PREDEFINED_ACCOUNT_IDS,
  state,
  Template,
} from "../store";
import {createModal} from "../components/Modal";
import {createConfirmModal} from "../components/ConfirmModal";
import {CustomerAvatar} from "../components/CustomerAvatar";
import {useSearchParams} from "@solidjs/router";
import {inputCls, secondaryBtn, selFull} from "../components/styles";
import {ItemCombobox} from "../components/ItemCombobox";
import {CustomerCombobox} from "../components/CustomerCombobox";
import {AccountCombobox} from "../components/AccountCombobox";
import {EntryBlock} from "../components/EntryBlock";

// ── Modal state ───────────────────────────────────────────────────────────────
type TxModalState =
  | null
  | { kind: "customer-pick-template"; initialCustomerId: string }
  | { kind: "customer-form"; templateId: string | undefined; initialCustomerId: string }
  | { kind: "non-customer-pick-template" }
  | { kind: "non-customer-form"; templateId: string | undefined };

const templateChoiceBtn = `w-full text-left ${inputCls} hover:bg-gray-50 dark:hover:bg-gray-600 transition`;

// ── Form types ────────────────────────────────────────────────────────────────
interface FormLeg {
  accountType: AccountType;
  customerId: string;
  qty: string | number;
}

interface FormEntry {
  itemId: string;
  sources: FormLeg[];
  destinations: FormLeg[];
}

// ── Form helpers ──────────────────────────────────────────────────────────────
function newLeg(): FormLeg {
  return {accountType: PREDEFINED_ACCOUNT_IDS.RELAYED_TO_DISTRIBUTOR, customerId: "", qty: ""};
}

function newEntry(): FormEntry {
  return {itemId: "", sources: [newLeg()], destinations: [newLeg()]};
}

function normalizeTemplateLegs(legs: any): FormLeg[] {
  const arr = Array.isArray(legs) ? legs : (legs ? [legs] : []);
  const normalized = arr.values()
    .map((leg: any) => {
      const accountType = (typeof leg === "string" ? leg : leg?.accountType) as AccountType;
      return {
        accountType: accountType ?? PREDEFINED_ACCOUNT_IDS.RELAYED_TO_DISTRIBUTOR,
        customerId: leg?.customerId ?? "",
        qty: leg?.qty ?? "",
      };
    })
    .filter((leg: FormLeg) => leg.accountType)
    .toArray();
  return normalized.length > 0 ? normalized : [newLeg()];
}

function applyInitialCustomer(legs: FormLeg[], customerId: string): FormLeg[] {
  if (!customerId) return legs;
  return legs.map(leg =>
    isPerCustomer(leg.accountType) ? {...leg, customerId} : leg
  );
}

function normalizeTemplateEntries(templateEntries: any, initialCustomerId = ""): FormEntry[] {
  if (!Array.isArray(templateEntries) || templateEntries.length === 0) return [newEntry()];
  return templateEntries.map((te: any) => ({
    itemId: "",
    sources: applyInitialCustomer(
      normalizeTemplateLegs(te?.sources ?? te?.source),
      initialCustomerId
    ),
    destinations: applyInitialCustomer(
      normalizeTemplateLegs(te?.destinations ?? te?.destination),
      initialCustomerId
    ),
  }));
}

function validateLegs(legs: FormLeg[], entryNum: number, side: "From" | "To", skipCustomerValidation = false): string | null {
  for (const [i, leg] of legs.entries()) {
    const qty = Number(leg.qty);
    if (!leg.qty || isNaN(qty) || qty <= 0)
      return `Entry ${entryNum}, ${side} ${i + 1}: quantity must be a positive number.`;
    if (!skipCustomerValidation && isPerCustomer(leg.accountType) && !leg.customerId)
      return `Entry ${entryNum}, ${side} ${i + 1}: select a customer.`;
  }
  return null;
}

function validateEntries(entries: FormEntry[], skipCustomerValidation = false): string | null {
  for (const [i, entry] of entries.entries()) {
    const n = i + 1;
    if (!entry.itemId) return `Entry ${n}: select an item.`;
    const fromErr = validateLegs(entry.sources, n, "From", skipCustomerValidation);
    if (fromErr) return fromErr;
    const toErr = validateLegs(entry.destinations, n, "To", skipCustomerValidation);
    if (toErr) return toErr;
    const srcTotal = entry.sources.reduce((s, l) => s + Number(l.qty), 0);
    const dstTotal = entry.destinations.reduce((s, l) => s + Number(l.qty), 0);
    if (srcTotal !== dstTotal)
      return `Entry ${n}: source total (${srcTotal}) must equal destination total (${dstTotal}).`;
  }
  return null;
}

// ── Template classification ───────────────────────────────────────────────────
function isCustomerTemplate(t: Template): boolean {
  return t.entries.some(e =>
    [...e.sources, ...e.destinations].some(leg => isPerCustomer(leg.accountType))
  );
}

// ── Leg row ───────────────────────────────────────────────────────────────────
function LegRow(props: {
  leg: FormLeg;
  side: "source" | "destination";
  mode: "customer" | "non-customer";
  onUpdate: (leg: FormLeg) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const needsCustomer = () => isPerCustomer(props.leg.accountType);

  function setField(field: keyof FormLeg, value: string) {
    const updated = {...props.leg, [field]: value};
    if (field === "accountType" && !isPerCustomer(value as AccountType))
      updated.customerId = "";
    props.onUpdate(updated);
  }

  const sideColor = props.side === "source"
    ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
    : "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20";

  return (
    <div class={`flex gap-2 items-center flex-wrap rounded px-2 py-1.5 border ${sideColor}`}>
      <div class="flex-1 min-w-40">
        <AccountCombobox value={props.leg.accountType}
                         onSelect={(type) => setField("accountType", type)}
                         excludePerCustomer={props.mode === "non-customer"}/>
      </div>
      <Show when={needsCustomer() && props.mode !== "customer"}>
        <div class="flex-1 min-w-44">
          <CustomerCombobox value={props.leg.customerId}
                            onSelect={(id) => setField("customerId", id)}/>
        </div>
      </Show>
      <div class="w-24 shrink-0">
        <input type="number" min="0" step="1" value={props.leg.qty}
               onInput={(e) => setField("qty", e.target.value)}
               class={selFull} placeholder="0"/>
      </div>
      <button type="button" onClick={props.onRemove} disabled={!props.canRemove}
              class={`p-1 ${props.canRemove ? 'text-gray-400 hover:text-red-500' : 'text-gray-300 dark:text-gray-500 cursor-not-allowed'}`}>
        <XIcon class="w-4 h-4"/>
      </button>
    </div>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────
function EntryCard(props: {
  entry: FormEntry;
  mode: "customer" | "non-customer";
  onUpdate: (entry: FormEntry) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  function updateLeg(side: "source" | "destination", i: number, updated: FormLeg) {
    const key = side === "source" ? "sources" : "destinations";
    const list = [...props.entry[key]];
    list[i] = updated;
    props.onUpdate(side === "source"
      ? {...props.entry, sources: list}
      : {...props.entry, destinations: list});
  }

  function addLeg(side: "source" | "destination") {
    const key = side === "source" ? "sources" : "destinations";
    props.onUpdate({...props.entry, [key]: [...props.entry[key], newLeg()]});
  }

  function removeLeg(side: "source" | "destination", i: number) {
    const key = side === "source" ? "sources" : "destinations";
    props.onUpdate({...props.entry, [key]: props.entry[key].filter((_, idx) => idx !== i)});
  }

  const sourceTotal = () => props.entry.sources.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);
  const destTotal = () => props.entry.destinations.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);
  const hasMismatch = () => sourceTotal() > 0 && destTotal() > 0 && sourceTotal() !== destTotal();
  const totalCls = () => {
    if (sourceTotal() > 0 && destTotal() > 0)
      return hasMismatch() ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400";
    return "text-gray-400 dark:text-gray-500";
  };

  return (
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/40 space-y-2">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2 flex-1 min-w-48">
          <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0">Item *</label>
          <div class="flex-1">
            <ItemCombobox value={props.entry.itemId}
                          onSelect={(id) => props.onUpdate({...props.entry, itemId: id})}/>
          </div>
        </div>
        <Show when={props.canRemove}>
          <button type="button" onClick={props.onRemove}
                  class="text-xs text-red-400 hover:text-red-600 shrink-0 inline-flex items-center gap-1"><XIcon
            class="w-3 h-3"/>Remove entry
          </button>
        </Show>
      </div>

      <div class="space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">From</span>
          <button type="button" onClick={() => addLeg("source")}
                  class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
            <PlusIcon class="w-3 h-3"/>add
          </button>
        </div>
        <div class="flex gap-2 px-2">
          <span class="flex-1 min-w-40 text-xs text-gray-400 dark:text-gray-500">Account</span>
          <span class="w-24 shrink-0 text-xs text-gray-400 dark:text-gray-500">Qty</span>
          <span class="w-6 shrink-0"/>
        </div>
        <For each={props.entry.sources}>
          {(leg, i) => (
            <LegRow leg={leg} side="source" mode={props.mode}
                    onUpdate={(u) => updateLeg("source", i(), u)}
                    onRemove={() => removeLeg("source", i())}
                    canRemove={props.entry.sources.length > 1}/>
          )}
        </For>
        <Show when={sourceTotal() > 0}>
          <div class="flex gap-2 px-2">
            <span class="flex-1 min-w-40"/>
            <span class={`w-24 shrink-0 text-xs font-mono ${totalCls()}`}>total: {sourceTotal()}</span>
            <span class="w-6 shrink-0"/>
          </div>
        </Show>
      </div>

      <div class="space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">To</span>
          <button type="button" onClick={() => addLeg("destination")}
                  class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
            <PlusIcon class="w-3 h-3"/>add
          </button>
        </div>
        <div class="flex gap-2 px-2">
          <span class="flex-1 min-w-40 text-xs text-gray-400 dark:text-gray-500">Account</span>
          <span class="w-24 shrink-0 text-xs text-gray-400 dark:text-gray-500">Qty</span>
          <span class="w-6 shrink-0"/>
        </div>
        <For each={props.entry.destinations}>
          {(leg, i) => (
            <LegRow leg={leg} side="destination" mode={props.mode}
                    onUpdate={(u) => updateLeg("destination", i(), u)}
                    onRemove={() => removeLeg("destination", i())}
                    canRemove={props.entry.destinations.length > 1}/>
          )}
        </For>
        <Show when={destTotal() > 0}>
          <div class="flex gap-2 px-2">
            <span class="flex-1 min-w-40"/>
            <span class={`w-24 shrink-0 text-xs font-mono ${totalCls()}`}>total: {destTotal()}</span>
            <span class="w-6 shrink-0"/>
          </div>
        </Show>
      </div>
    </div>
  );
}

// ── Transaction form ──────────────────────────────────────────────────────────
function TransactionForm(props: {
  mode: "customer" | "non-customer";
  initialTemplateId?: string;
  initialCustomerId?: string;
  templates: Template[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [templateId, setTemplateId] = createSignal(props.initialTemplateId ?? "");
  const [txCustomerId, setTxCustomerId] = createSignal(props.initialCustomerId ?? "");
  const [entries, setEntries] = createStore<FormEntry[]>(
    props.initialTemplateId
      ? normalizeTemplateEntries(
        state.templates.find(t => t.id === props.initialTemplateId)?.entries,
        props.mode === "customer" ? (props.initialCustomerId ?? "") : ""
      )
      : [newEntry()]
  );
  const [note, setNote] = createSignal("");
  const confirmModal = createConfirmModal();
  const [date, setDate] = createSignal(new Date().toISOString().slice(0, 10));
  const [error, setError] = createSignal("");

  const selectedTemplate = createMemo(() => props.templates.find(t => t.id === templateId()));

  const txData = createMemo(() => {
    const txCustomer = txCustomerId();
    return {
      templateId: templateId() || null,
      templateName: selectedTemplate()?.name ?? "Manual",
      date: date(),
      note: note().trim(),
      entries: entries.map(en => ({
        itemId: en.itemId,
        sources: en.sources.map(l => ({
          accountType: l.accountType,
          customerId: isPerCustomer(l.accountType) ? txCustomer : null,
          qty: Number(l.qty),
        })),
        destinations: en.destinations.map(l => ({
          accountType: l.accountType,
          customerId: isPerCustomer(l.accountType) ? txCustomer : null,
          qty: Number(l.qty),
        })),
      })),
    };
  });

  function loadTemplate(id: string) {
    setTemplateId(id);
    setError("");
    const tpl = props.templates.find(t => t.id === id);
    setEntries(reconcile(
      tpl
        ? normalizeTemplateEntries(tpl.entries, props.mode === "customer" ? txCustomerId() : "")
        : [newEntry()]
    ));
  }

  function hasUserEnteredData() {
    return entries.some(e =>
      e.itemId ||
      e.sources.some(l => l.customerId || l.qty) ||
      e.destinations.some(l => l.customerId || l.qty)
    );
  }

  async function handleTemplateChange(id: string) {
    if (id === templateId()) return;
    if (hasUserEnteredData()) {
      const result = await confirmModal.prompt("Changing template will replace current entries. Continue?");
      if (result !== 'OK') return;
    }
    loadTemplate(id);
  }

  async function submit(e: Event) {
    e.preventDefault();
    setError("");
    if (props.mode === "customer" && !txCustomerId()) {
      setError("Select a customer for this transaction.");
      return;
    }
    const err = validateEntries(entries, props.mode === "customer");
    if (err) {
      setError(err);
      return;
    }
    await addTransaction(txData());
    props.onSave();
  }

  return (
    <form onSubmit={submit} class="space-y-5">
      <confirmModal.Modal/>
      <Show when={state.items.length === 0}>
        <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p class="text-sm text-yellow-700 dark:text-yellow-400">No items defined yet. Add items in the
            Items page first.</p>
        </div>
      </Show>

      <Show when={props.mode === "customer"}>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer *</label>
          <CustomerCombobox value={txCustomerId()} onSelect={setTxCustomerId}/>
        </div>
      </Show>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Use Template
          (optional)</label>
        <select value={templateId()} onChange={(e) => handleTemplateChange(e.target.value)}
                class={selFull}>
          <option value="">— Manual / no template —</option>
          <For each={props.templates}>
            {(t) => <option value={t.id}>{t.name}</option>}
          </For>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
        <input type="date" value={date()} onInput={(e) => setDate(e.target.value)} class={inputCls}/>
      </div>

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Entries</label>
          <button type="button"
                  onClick={() => setEntries(produce(d => {
                    d.push(newEntry());
                  }))}
                  class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
            <PlusIcon class="w-3 h-3"/>Add entry
          </button>
        </div>
        <For each={entries}>
          {(entry, i) => (
            <EntryCard entry={entry} mode={props.mode}
                       onUpdate={(u) => setEntries(i(), reconcile(u))}
                       onRemove={() => setEntries(produce(d => {
                         d.splice(i(), 1);
                       }))}
                       canRemove={entries.length > 1}/>
          )}
        </For>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note
          (optional)</label>
        <textarea value={note()} onInput={(e) => setNote(e.target.value)} rows={2} class={selFull}
                  placeholder="Any additional notes..."/>
      </div>

      <Show when={error()}>
        <p class="text-sm text-red-600 dark:text-red-400">{error()}</p>
      </Show>

      <div class="flex gap-2 justify-end pt-1">
        <button type="button" onClick={props.onCancel} class={`${secondaryBtn} inline-flex items-center gap-1.5`}>
          <XIcon/>Cancel
        </button>
        <button type="submit"
                class="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 inline-flex items-center gap-1.5">
          <CheckIcon/>Record Transaction
        </button>
      </div>
    </form>
  );
}

// ── Template picker (step 1) ──────────────────────────────────────────────────
function TemplatePicker(props: {
  templates: Template[];
  onSelect: (templateId: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = createSignal("");
  const filtered = createMemo(() => {
    const q = query().toLowerCase();
    return q ? props.templates.filter(t => t.name.toLowerCase().includes(q)) : props.templates;
  });

  return (
    <div class="space-y-4">
      <p class="text-sm text-gray-600 dark:text-gray-300">Choose a template or start manually.</p>
      <input type="text" value={query()} onInput={(e) => setQuery(e.target.value)}
             placeholder="Search templates..." class={`w-full ${inputCls}`}/>
      <div class="space-y-2 max-h-64 overflow-auto pr-1">
        <Show when={!query()}>
          <button type="button" onClick={() => props.onSelect("")} class={templateChoiceBtn}>
            — Manual / no template —
          </button>
        </Show>
        <For each={filtered()}>
          {(t) => (
            <button type="button" onClick={() => props.onSelect(t.id)} class={templateChoiceBtn}>
              <p class="font-medium mb-1">{t.name}</p>
              <div class="space-y-1.5">
                <For each={t.entries}>
                  {(entry, i) => {
                    const srcs = normalizeTemplateLegs(entry.sources);
                    const dsts = normalizeTemplateLegs(entry.destinations);
                    const rows = Array.from({length: Math.max(srcs.length, dsts.length)}, (_, j) => ({
                      src: srcs[j],
                      dst: dsts[j],
                    }));
                    return (
                      <div>
                        <Show when={t.entries.length > 1}>
                          <p class="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Entry {i() + 1}</p>
                        </Show>
                        <div class="grid grid-cols-2 gap-x-3 gap-y-0.5">
                          <span
                            class="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">From</span>
                          <span
                            class="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">To</span>
                          {rows.map(({src, dst}) => (
                            <>
                              {src
                                ? <span
                                  class="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">{getAccountLabel(src.accountType)}</span>
                                : <span/>}
                              {dst
                                ? <span
                                  class="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">{getAccountLabel(dst.accountType)}</span>
                                : <span/>}
                            </>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </button>
          )}
        </For>
        <Show when={query() && filtered().length === 0}>
          <p class="text-sm text-gray-400 dark:text-gray-500 py-3 text-center">No templates match your search.</p>
        </Show>
      </div>
      <div class="flex justify-end">
        <button type="button" onClick={props.onCancel} class={`${secondaryBtn} inline-flex items-center gap-1.5`}>
          <XIcon/>Cancel
        </button>
      </div>
    </div>
  );
}

// ── Transaction customer header summary ───────────────────────────────────────
function TxCustomers(props: { tx: { entries: Entry[] }; customers: Customer[] }) {
  const customers = () => {
    const ids = new Set<string>();
    props.tx.entries.forEach(e => {
      [...(e.sources ?? []), ...(e.destinations ?? [])].forEach(l => {
        if (l.customerId) ids.add(l.customerId);
      });
    });
    return [...ids].map(id => props.customers.find(c => c.id === id)).filter((c): c is Customer => !!c);
  };

  return (
    <Show when={customers().length > 0}>
      <div class="flex items-center gap-2 flex-wrap mt-0.5">
        <For each={customers()}>
          {(c) => (
            <span class="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <CustomerAvatar customer={c} size="xs"/>
              {c.name}
                        </span>
          )}
        </For>
      </div>
    </Show>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const customerTemplates = createMemo(() => state.templates.filter(isCustomerTemplate));
  const nonCustomerTemplates = createMemo(() => state.templates.filter(t => !isCustomerTemplate(t)));

  const initialCustomerTx = searchParams.customerTx as string | undefined;
  const [modalState, setModalState] = createSignal<TxModalState>(null);

  const customerPickState = () => {
    const ms = modalState();
    return ms?.kind === "customer-pick-template" ? ms : undefined;
  };
  const customerFormState = () => {
    const ms = modalState();
    return ms?.kind === "customer-form" ? ms : undefined;
  };
  const nonCustomerPickState = () => {
    const ms = modalState();
    return ms?.kind === "non-customer-pick-template" ? ms : undefined;
  };
  const nonCustomerFormState = () => {
    const ms = modalState();
    return ms?.kind === "non-customer-form" ? ms : undefined;
  };

  const customerModal = createModal({
    title: "New Customer Transaction",
    size: "lg",
    children: (resolve) => (
      <>
        <Show when={customerPickState()}>
          {(ms) => (
            <TemplatePicker
              templates={customerTemplates()}
              onSelect={(id) => setModalState({
                kind: "customer-form",
                templateId: id || undefined,
                initialCustomerId: ms().initialCustomerId,
              })}
              onCancel={() => resolve('CANCELLED')}
            />
          )}
        </Show>
        <Show when={customerFormState()}>
          {(ms) => (
            <TransactionForm
              mode="customer"
              initialTemplateId={ms().templateId}
              initialCustomerId={ms().initialCustomerId}
              templates={customerTemplates()}
              onSave={() => resolve('OK')}
              onCancel={() => resolve('CANCELLED')}
            />
          )}
        </Show>
      </>
    ),
  });

  const nonCustomerModal = createModal({
    title: "New Non-Customer Transaction",
    size: "lg",
    children: (resolve) => (
      <>
        <Show when={nonCustomerPickState()}>
          <TemplatePicker
            templates={nonCustomerTemplates()}
            onSelect={(id) => setModalState({kind: "non-customer-form", templateId: id || undefined})}
            onCancel={() => resolve('CANCELLED')}
          />
        </Show>
        <Show when={nonCustomerFormState()}>
          {(ms) => (
            <TransactionForm
              mode="non-customer"
              initialTemplateId={ms().templateId}
              templates={nonCustomerTemplates()}
              onSave={() => resolve('OK')}
              onCancel={() => resolve('CANCELLED')}
            />
          )}
        </Show>
      </>
    ),
  });

  const confirmModal = createConfirmModal();

  async function openCustomerTx(initialCustomerId = "") {
    setSearchParams({customerTx: undefined});
    setModalState({kind: "customer-pick-template", initialCustomerId});
    await customerModal.prompt();
    setModalState(null);
  }

  async function openNonCustomerTx() {
    setModalState({kind: "non-customer-pick-template"});
    await nonCustomerModal.prompt();
    setModalState(null);
  }

  onMount(() => {
    if (initialCustomerTx) openCustomerTx(initialCustomerTx);
  });

  const [search, setSearch] = createSignal("");
  const [filterCustomer, setFilterCustomer] = createSignal("");
  const [filterItem, setFilterItem] = createSignal("");
  const [filterAccount, setFilterAccount] = createSignal("");

  const filtered = createMemo(() => {
    const q = search().toLowerCase();
    const cid = filterCustomer();
    const iid = filterItem();
    const aid = filterAccount();
    return state.transactions.filter(tx => {
      const matchSearch = !q ||
        tx.templateName?.toLowerCase().includes(q) ||
        tx.note?.toLowerCase().includes(q) ||
        tx.date?.includes(q);
      const matchCustomer = !cid || tx.entries.some(e =>
        [...(e.sources ?? []), ...(e.destinations ?? [])].some(l => l.customerId === cid));
      const matchItem = !iid || tx.entries.some(e => e.itemId === iid);
      const matchAccount = !aid || tx.entries.some(e =>
        [...(e.sources ?? []), ...(e.destinations ?? [])].some(l => l.accountType === aid));
      return matchSearch && matchCustomer && matchItem && matchAccount;
    });
  });

  async function handleDelete(id: string) {
    const result = await confirmModal.prompt("Delete this transaction? This will affect account balances.");
    if (result === 'OK') deleteTransaction(id);
  }

  return (
    <div>
      <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100">Transactions</h1>
        <div class="flex gap-2 flex-wrap">
          <button
            onClick={() => openCustomerTx()}
            class="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-1.5">
            <PlusIcon/>Customer Transaction
          </button>
          <button
            onClick={() => openNonCustomerTx()}
            class="px-3 py-1.5 text-sm rounded border border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 inline-flex items-center gap-1.5">
            <PlusIcon/>Non-Customer Transaction
          </button>
        </div>
      </div>

      <customerModal.Modal/>
      <nonCustomerModal.Modal/>
      <confirmModal.Modal/>

      {/* ── Filters ── */}
      <div class="flex gap-3 mb-4 flex-wrap">
        <input type="text" value={search()} onInput={(e) => setSearch(e.target.value)}
               placeholder="Search by template, note, date..."
               class={`flex-1 min-w-48 ${inputCls}`}/>
        <div class="min-w-44">
          <ItemCombobox value={filterItem()} onSelect={setFilterItem} allowAll/>
        </div>
        <div class="min-w-44">
          <CustomerCombobox value={filterCustomer()} onSelect={setFilterCustomer} allowAll/>
        </div>
        <div class="min-w-44">
          <AccountCombobox value={filterAccount()} onSelect={setFilterAccount} allowAll/>
        </div>
      </div>

      {/* ── History ── */}
      <Show when={isLoaded()} fallback={
        <div class="space-y-3">
          <For each={[0, 1, 2]}>{() => <TransactionCardSkeleton/>}</For>
        </div>
      }>
        <Show when={filtered().length > 0}
              fallback={<p class="text-sm text-gray-400 dark:text-gray-500">No transactions yet.</p>}>
          <div class="space-y-3">
            <For each={filtered()}>
              {(tx) => (
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div class="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p
                        class="font-semibold text-gray-800 dark:text-gray-100 text-sm">{tx.templateName ?? "Manual"}</p>
                      <TxCustomers tx={tx} customers={state.customers}/>
                      <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {tx.date} &middot; recorded {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(tx.id)}
                            class="text-xs text-red-400 hover:text-red-600 shrink-0 inline-flex items-center gap-1">
                      <TrashIcon class="w-3 h-3"/>Delete
                    </button>
                  </div>
                  <div class="space-y-2">
                    <For each={tx.entries}>
                      {(entry) => <EntryBlock entry={entry} items={state.items}/>}
                    </For>
                  </div>
                  <Show when={tx.note}>
                    <p class="text-xs text-gray-500 dark:text-gray-400 italic mt-2">{tx.note}</p>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
}
