import {createEffect, createMemo, createSignal, For, Show} from "solid-js";
import {TransactionCardSkeleton} from "../components/Skeleton";
import {createStore, produce, reconcile} from "solid-js/store";
import {CheckIcon, PlusIcon, TrashIcon, XIcon} from "../components/Icons";
import {
    ACCOUNT_LABELS,
    ACCOUNT_TYPES,
    AccountType,
    addTransaction,
    Customer,
    deleteTransaction,
    Entry,
    isLoaded,
    Item,
    Leg,
    PER_CUSTOMER_ACCOUNTS,
    state,
    Template,
} from "../store";
import Modal from "../components/Modal";
import {CustomerAvatar} from "../components/CustomerAvatar";
import {useSearchParams} from "@solidjs/router";

// ── Modal state ───────────────────────────────────────────────────────────────
type TxModalState =
    | null
    | { kind: "customer-pick-template"; initialCustomerId: string }
    | { kind: "customer-form"; templateId: string | undefined; initialCustomerId: string }
    | { kind: "non-customer-pick-template" }
    | { kind: "non-customer-form"; templateId: string | undefined };

// ── Shared styles ─────────────────────────────────────────────────────────────
const sel = "border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400";
const selFull = `w-full ${sel}`;
const lbl = "block text-xs text-gray-500 dark:text-gray-400 mb-1";
const inputCls = "border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400";
const secondaryBtn = "px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700";
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

// Keys that are true leaf account types (excludes root types like DISTRIBUTOR_INVENTORY)
const leafAccountTypeKeys = new Set<string>(Object.values(ACCOUNT_TYPES));

// ── Form helpers ──────────────────────────────────────────────────────────────
function newLeg(): FormLeg {
    return {accountType: ACCOUNT_TYPES.RELAYED_TO_DISTRIBUTOR, customerId: "", qty: ""};
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
                accountType: accountType ?? ACCOUNT_TYPES.RELAYED_TO_DISTRIBUTOR,
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
        PER_CUSTOMER_ACCOUNTS.has(leg.accountType) ? {...leg, customerId} : leg
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
        if (!skipCustomerValidation && PER_CUSTOMER_ACCOUNTS.has(leg.accountType) && !leg.customerId)
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
    }
    return null;
}

// ── Template classification ───────────────────────────────────────────────────
function isCustomerTemplate(t: Template): boolean {
    return t.entries.some(e =>
        [...e.sources, ...e.destinations].some(leg => PER_CUSTOMER_ACCOUNTS.has(leg.accountType))
    );
}

// ── Searchable item combobox ──────────────────────────────────────────────────
function ItemCombobox(props: { value: string; onSelect: (id: string) => void }) {
    const [open, setOpen] = createSignal(false);
    const [query, setQuery] = createSignal("");
    let inputRef!: HTMLInputElement;

    const selected = () => state.items.find(i => i.id === props.value);
    const options = createMemo(() => {
        const q = query().toLowerCase();
        return q
            ? state.items.filter(i => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
            : state.items;
    });

    function openDropdown() {
        setOpen(true);
        setTimeout(() => inputRef?.focus(), 0);
    }

    function select(id: string) {
        props.onSelect(id);
        setOpen(false);
        setQuery("");
    }

    return (
        <div class="relative">
            <button type="button" onClick={openDropdown}
                    class={`${sel} w-full flex items-center justify-between gap-2 text-left`}>
                <Show when={selected()} fallback={<span class="text-gray-400 text-sm">— select item —</span>}>
                    <span class="flex items-center gap-1.5 min-w-0">
                        <span class="font-mono text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded shrink-0">
                            {selected()!.id}
                        </span>
                        <span class="text-sm truncate">{selected()!.name}</span>
                    </span>
                </Show>
                <span class="text-gray-400 text-xs shrink-0">▾</span>
            </button>
            <Show when={open()}>
                <div class="fixed inset-0 z-10" onClick={() => setOpen(false)}/>
                <div class="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden text-gray-800 dark:text-gray-100">
                    <div class="p-2 border-b border-gray-100 dark:border-gray-700">
                        <input ref={inputRef} type="text" value={query()}
                               onInput={(e) => setQuery(e.target.value)}
                               placeholder="Search items..."
                               class="w-full text-sm px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"/>
                    </div>
                    <div class="max-h-48 overflow-auto">
                        <Show when={options().length > 0}
                              fallback={<p class="text-xs text-gray-400 py-3 text-center">No items found</p>}>
                            <For each={options()}>
                                {(item) => (
                                    <button type="button" onClick={() => select(item.id)}
                                            class={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${props.value === item.id ? "bg-indigo-50 dark:bg-indigo-900/30 font-medium" : ""}`}>
                                        <span class="font-mono text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded shrink-0">
                                            {item.id}
                                        </span>
                                        <span class="truncate">{item.name}</span>
                                    </button>
                                )}
                            </For>
                        </Show>
                    </div>
                </div>
            </Show>
        </div>
    );
}

// ── Searchable customer combobox ──────────────────────────────────────────────
function CustomerCombobox(props: { value: string; onSelect: (id: string) => void }) {
    const [open, setOpen] = createSignal(false);
    const [query, setQuery] = createSignal("");
    let inputRef!: HTMLInputElement;

    const selected = () => state.customers.find(c => c.id === props.value);
    const options = createMemo(() => {
        const q = query().toLowerCase();
        return q ? state.customers.filter(c => c.name.toLowerCase().includes(q)) : state.customers;
    });

    function openDropdown() {
        setOpen(true);
        setTimeout(() => inputRef?.focus(), 0);
    }

    function select(id: string) {
        props.onSelect(id);
        setOpen(false);
        setQuery("");
    }

    return (
        <div class="relative">
            <button type="button" onClick={openDropdown}
                    class={`${sel} w-full flex items-center justify-between gap-2 text-left`}>
                <Show when={selected()} fallback={<span class="text-gray-400 text-sm">— select customer —</span>}>
                    <span class="flex items-center gap-2 min-w-0">
                        <CustomerAvatar customer={selected()!} size="sm"/>
                        <span class="text-sm truncate">{selected()!.name}</span>
                    </span>
                </Show>
                <span class="text-gray-400 text-xs shrink-0">▾</span>
            </button>
            <Show when={open()}>
                <div class="fixed inset-0 z-10" onClick={() => setOpen(false)}/>
                <div class="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden text-gray-800 dark:text-gray-100">
                    <div class="p-2 border-b border-gray-100 dark:border-gray-700">
                        <input ref={inputRef} type="text" value={query()}
                               onInput={(e) => setQuery(e.target.value)}
                               placeholder="Search customers..."
                               class="w-full text-sm px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"/>
                    </div>
                    <div class="max-h-48 overflow-auto">
                        <Show when={options().length > 0}
                              fallback={<p class="text-xs text-gray-400 py-3 text-center">No customers found</p>}>
                            <For each={options()}>
                                {(customer) => (
                                    <button type="button" onClick={() => select(customer.id)}
                                            class={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${props.value === customer.id ? "bg-indigo-50 dark:bg-indigo-900/30" : ""}`}>
                                        <CustomerAvatar customer={customer} size="sm"/>
                                        <span class="text-sm truncate">{customer.name}</span>
                                    </button>
                                )}
                            </For>
                        </Show>
                    </div>
                </div>
            </Show>
        </div>
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
    const needsCustomer = () => PER_CUSTOMER_ACCOUNTS.has(props.leg.accountType);

    function setField(field: keyof FormLeg, value: string) {
        const updated = {...props.leg, [field]: value};
        if (field === "accountType" && !PER_CUSTOMER_ACCOUNTS.has(value as AccountType))
            updated.customerId = "";
        props.onUpdate(updated);
    }

    const sideColor = props.side === "source"
        ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
        : "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20";

    const accountOptions = Object.entries(ACCOUNT_LABELS).filter(([key]) => {
        if (!leafAccountTypeKeys.has(key)) return false;
        if (props.mode === "non-customer" && PER_CUSTOMER_ACCOUNTS.has(key as AccountType)) return false;
        return true;
    });

    return (
        <div class={`flex gap-2 items-end flex-wrap rounded p-2 border ${sideColor}`}>
            <div class="flex-1 min-w-36">
                <label class={lbl}>Account</label>
                <select value={props.leg.accountType}
                        onChange={(e) => setField("accountType", e.target.value)} class={selFull}>
                    <For each={accountOptions}>
                        {([key, label]) => <option value={key}>{label}</option>}
                    </For>
                </select>
            </div>
            <Show when={needsCustomer() && props.mode !== "customer"}>
                <div class="flex-1 min-w-44">
                    <label class={lbl}>Customer *</label>
                    <CustomerCombobox value={props.leg.customerId}
                                      onSelect={(id) => setField("customerId", id)}/>
                </div>
            </Show>
            <div class="w-24 shrink-0">
                <label class={lbl}>Qty *</label>
                <input type="number" min="0" step="1" value={props.leg.qty}
                       onInput={(e) => setField("qty", e.target.value)}
                       class={selFull} placeholder="0"/>
            </div>
            <Show when={props.canRemove}>
                <button type="button" onClick={props.onRemove}
                        class="text-gray-400 hover:text-red-500 pb-1.5"><XIcon class="w-3 h-3"/>
                </button>
            </Show>
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

    return (
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/40 space-y-3">
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
                            class="text-xs text-red-400 hover:text-red-600 shrink-0 inline-flex items-center gap-1"><XIcon class="w-3 h-3"/>Remove entry
                    </button>
                </Show>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">From</span>
                    <button type="button" onClick={() => addLeg("source")}
                            class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"><PlusIcon class="w-3 h-3"/>add
                    </button>
                </div>
                <For each={props.entry.sources}>
                    {(leg, i) => (
                        <LegRow leg={leg} side="source" mode={props.mode}
                                onUpdate={(u) => updateLeg("source", i(), u)}
                                onRemove={() => removeLeg("source", i())}
                                canRemove={props.entry.sources.length > 1}/>
                    )}
                </For>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">To</span>
                    <button type="button" onClick={() => addLeg("destination")}
                            class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"><PlusIcon class="w-3 h-3"/>add
                    </button>
                </div>
                <For each={props.entry.destinations}>
                    {(leg, i) => (
                        <LegRow leg={leg} side="destination" mode={props.mode}
                                onUpdate={(u) => updateLeg("destination", i(), u)}
                                onRemove={() => removeLeg("destination", i())}
                                canRemove={props.entry.destinations.length > 1}/>
                    )}
                </For>
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
    const [date, setDate] = createSignal(new Date().toISOString().slice(0, 10));
    const [error, setError] = createSignal("");

    const selectedTemplate = createMemo(() => props.templates.find(t => t.id === templateId()));

    // Sync transaction-level customer to all per-customer legs
    createEffect(() => {
        const cid = txCustomerId();
        if (props.mode !== "customer") return;
        setEntries(produce(d => {
            d.forEach(entry => {
                entry.sources.forEach(leg => {
                    if (PER_CUSTOMER_ACCOUNTS.has(leg.accountType)) leg.customerId = cid;
                });
                entry.destinations.forEach(leg => {
                    if (PER_CUSTOMER_ACCOUNTS.has(leg.accountType)) leg.customerId = cid;
                });
            });
        }));
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

    function handleTemplateChange(id: string) {
        if (id === templateId()) return;
        if (hasUserEnteredData() && !confirm("Changing template will replace current entries. Continue?")) return;
        loadTemplate(id);
    }

    function submit(e: Event) {
        e.preventDefault();
        setError("");
        if (props.mode === "customer" && !txCustomerId()) {
            setError("Select a customer for this transaction.");
            return;
        }
        const err = validateEntries(entries, props.mode === "customer");
        if (err) { setError(err); return; }
        addTransaction({
            templateId: templateId() || null,
            templateName: selectedTemplate()?.name ?? "Manual",
            date: date(),
            note: note().trim(),
            entries: entries.map(en => ({
                itemId: en.itemId,
                sources: en.sources.map(l => ({
                    accountType: l.accountType,
                    customerId: PER_CUSTOMER_ACCOUNTS.has(l.accountType) ? l.customerId : null,
                    qty: Number(l.qty),
                })),
                destinations: en.destinations.map(l => ({
                    accountType: l.accountType,
                    customerId: PER_CUSTOMER_ACCOUNTS.has(l.accountType) ? l.customerId : null,
                    qty: Number(l.qty),
                })),
            })),
        });
        props.onSave();
    }

    return (
        <form onSubmit={submit} class="space-y-5">
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
                            onClick={() => setEntries(produce(d => { d.push(newEntry()); }))}
                            class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"><PlusIcon class="w-3 h-3"/>Add entry
                    </button>
                </div>
                <For each={entries}>
                    {(entry, i) => (
                        <EntryCard entry={entry} mode={props.mode}
                                   onUpdate={(u) => setEntries(i(), reconcile(u))}
                                   onRemove={() => setEntries(produce(d => { d.splice(i(), 1); }))}
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
                <button type="button" onClick={props.onCancel} class={`${secondaryBtn} inline-flex items-center gap-1.5`}><XIcon/>Cancel</button>
                <button type="submit"
                        class="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 inline-flex items-center gap-1.5"><CheckIcon/>Record Transaction
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
    return (
        <div class="space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-300">Choose a template or start manually.</p>
            <div class="space-y-2 max-h-72 overflow-auto pr-1">
                <button type="button" onClick={() => props.onSelect("")} class={templateChoiceBtn}>
                    — Manual / no template —
                </button>
                <For each={props.templates}>
                    {(t) => (
                        <button type="button" onClick={() => props.onSelect(t.id)} class={templateChoiceBtn}>
                            <p class="font-medium mb-1">{t.name}</p>
                            <div class="space-y-1.5">
                                <For each={t.entries}>
                                    {(entry, i) => (
                                        <div>
                                            <Show when={t.entries.length > 1}>
                                                <p class="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Entry {i() + 1}</p>
                                            </Show>
                                            <div class="flex flex-wrap gap-1">
                                                <For each={normalizeTemplateLegs(entry.sources)}>
                                                    {(leg) => (
                                                        <span class="inline-block text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                                                            From: {(ACCOUNT_LABELS as Record<string, string>)[leg.accountType]}
                                                        </span>
                                                    )}
                                                </For>
                                                <For each={normalizeTemplateLegs(entry.destinations)}>
                                                    {(leg) => (
                                                        <span class="inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                                                            To: {(ACCOUNT_LABELS as Record<string, string>)[leg.accountType]}
                                                        </span>
                                                    )}
                                                </For>
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </div>
                        </button>
                    )}
                </For>
            </div>
            <div class="flex justify-end">
                <button type="button" onClick={props.onCancel} class={`${secondaryBtn} inline-flex items-center gap-1.5`}><XIcon/>Cancel</button>
            </div>
        </div>
    );
}

// ── History: leg pill with customer avatar ────────────────────────────────────
function LegPill(props: {
    leg: Leg & { customer?: Customer | null };
    side: "source" | "destination";
}) {
    const label = (ACCOUNT_LABELS as Record<string, string>)[props.leg.accountType] ?? props.leg.accountType;
    return (
        <span class={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
            props.side === "source"
                ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
        }`}>
            {props.side === "source" ? "From" : "To"}: {label}
            <Show when={props.leg.customer}>
                {(c) => (
                    <span class="inline-flex items-center gap-0.5">
                        (<CustomerAvatar customer={c()} size="xs"/>
                        <span>{c().name}</span>)
                    </span>
                )}
            </Show>
            × {props.leg.qty}
        </span>
    );
}

function EntryBlock(props: {entry: Entry; items: Item[]; customers: Customer[]}) {
    const item = () => props.items.find(it => it.id === props.entry.itemId);
    const resolvedLegs = (legs: Leg[]) =>
        (Array.isArray(legs) ? legs : legs ? [legs] : []).map(leg => {
            const legObj = typeof leg === "string" ? {accountType: leg as AccountType, qty: 0} : leg;
            return {
                ...legObj,
                customer: legObj?.customerId
                    ? (props.customers.find(c => c.id === legObj.customerId) ?? null)
                    : null,
            };
        });

    return (
        <div class="border border-gray-100 dark:border-gray-700 rounded p-2 space-y-1">
            <Show when={item()} fallback={
                <span class="text-xs font-mono text-gray-400 dark:text-gray-500">{props.entry.itemId}</span>
            }>
                <span class="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    <span class="font-mono bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">{item()?.id ?? "-"}</span>
                    {item()?.name ?? "-"}
                </span>
            </Show>
            <div class="flex flex-wrap gap-1">
                <For each={resolvedLegs(props.entry.sources ?? [])}>
                    {(leg) => <LegPill leg={leg} side="source"/>}
                </For>
                <For each={resolvedLegs(props.entry.destinations ?? [])}>
                    {(leg) => <LegPill leg={leg} side="destination"/>}
                </For>
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

    // If navigated from CustomersPage with ?customerTx=<id>, open the customer modal immediately
    const initialCustomerTx = searchParams.customerTx as string | undefined;
    const [modalState, setModalState] = createSignal<TxModalState>(
        initialCustomerTx
            ? {kind: "customer-pick-template", initialCustomerId: initialCustomerTx}
            : null
    );
    if (initialCustomerTx) setSearchParams({customerTx: undefined});

    const [search, setSearch] = createSignal("");
    const [filterCustomer, setFilterCustomer] = createSignal("");
    const [filterItem, setFilterItem] = createSignal("");

    const filtered = createMemo(() => {
        const q = search().toLowerCase();
        const cid = filterCustomer();
        const iid = filterItem();
        return state.transactions.filter(tx => {
            const matchSearch = !q ||
                tx.templateName?.toLowerCase().includes(q) ||
                tx.note?.toLowerCase().includes(q) ||
                tx.date?.includes(q);
            const matchCustomer = !cid || tx.entries.some(e =>
                [...(e.sources ?? []), ...(e.destinations ?? [])].some(l => l.customerId === cid));
            const matchItem = !iid || tx.entries.some(e => e.itemId === iid);
            return matchSearch && matchCustomer && matchItem;
        });
    });

    // Typed accessors for modal sub-states
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

    function close() { setModalState(null); }

    function handleDelete(id: string) {
        if (confirm("Delete this transaction? This will affect account balances.")) deleteTransaction(id);
    }

    return (
        <div>
            <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100">Transactions</h1>
                <div class="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setModalState({kind: "customer-pick-template", initialCustomerId: ""})}
                        class="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-1.5">
                        <PlusIcon/>Customer Transaction
                    </button>
                    <button
                        onClick={() => setModalState({kind: "non-customer-pick-template"})}
                        class="px-3 py-1.5 text-sm rounded border border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 inline-flex items-center gap-1.5">
                        <PlusIcon/>Non-Customer Transaction
                    </button>
                </div>
            </div>

            {/* ── Customer transaction modal ── */}
            <Modal
                show={customerPickState() !== undefined || customerFormState() !== undefined}
                onClose={close}
                title="New Customer Transaction"
            >
                <Show when={customerPickState()}>
                    {(ms) => (
                        <TemplatePicker
                            templates={customerTemplates()}
                            onSelect={(id) => setModalState({
                                kind: "customer-form",
                                templateId: id || undefined,
                                initialCustomerId: ms().initialCustomerId,
                            })}
                            onCancel={close}
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
                            onSave={close}
                            onCancel={close}
                        />
                    )}
                </Show>
            </Modal>

            {/* ── Non-customer transaction modal ── */}
            <Modal
                show={nonCustomerPickState() !== undefined || nonCustomerFormState() !== undefined}
                onClose={close}
                title="New Non-Customer Transaction"
            >
                <Show when={nonCustomerPickState()}>
                    <TemplatePicker
                        templates={nonCustomerTemplates()}
                        onSelect={(id) => setModalState({kind: "non-customer-form", templateId: id || undefined})}
                        onCancel={close}
                    />
                </Show>
                <Show when={nonCustomerFormState()}>
                    {(ms) => (
                        <TransactionForm
                            mode="non-customer"
                            initialTemplateId={ms().templateId}
                            templates={nonCustomerTemplates()}
                            onSave={close}
                            onCancel={close}
                        />
                    )}
                </Show>
            </Modal>

            {/* ── Filters ── */}
            <div class="flex gap-3 mb-4 flex-wrap">
                <input type="text" value={search()} onInput={(e) => setSearch(e.target.value)}
                       placeholder="Search by template, note, date..."
                       class={`flex-1 min-w-48 ${inputCls}`}/>
                <select value={filterItem()} onChange={(e) => setFilterItem(e.target.value)} class={inputCls}>
                    <option value="">All items</option>
                    <For each={state.items}>
                        {(it) => <option value={it.id}>{it.name} ({it.id})</option>}
                    </For>
                </select>
                <select value={filterCustomer()} onChange={(e) => setFilterCustomer(e.target.value)}
                        class={inputCls}>
                    <option value="">All customers</option>
                    <For each={state.customers}>
                        {(c) => <option value={c.id}>{c.name}</option>}
                    </For>
                </select>
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
                                            <p class="font-semibold text-gray-800 dark:text-gray-100 text-sm">{tx.templateName ?? "Manual"}</p>
                                            <TxCustomers tx={tx} customers={state.customers}/>
                                            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                {tx.date} &middot; recorded {new Date(tx.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <button onClick={() => handleDelete(tx.id)}
                                                class="text-xs text-red-400 hover:text-red-600 shrink-0 inline-flex items-center gap-1"><TrashIcon class="w-3 h-3"/>Delete
                                        </button>
                                    </div>
                                    <div class="space-y-2">
                                        <For each={tx.entries}>
                                            {(entry) => <EntryBlock entry={entry} customers={state.customers}
                                                                     items={state.items}/>}
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
