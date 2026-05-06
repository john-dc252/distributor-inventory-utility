import {createMemo, createSignal, For, Show} from "solid-js";
import {createStore, produce, reconcile} from "solid-js/store";
import {
    ACCOUNT_LABELS,
    ACCOUNT_TYPES,
    AccountType,
    addTransaction,
    Customer,
    deleteTransaction,
    Entry,
    Item,
    Leg,
    PER_CUSTOMER_ACCOUNTS,
    state
} from "../store";
import Modal from "../components/Modal";

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

// ── Shared styles ─────────────────────────────────────────────────────────────
const sel = "border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400";
const selFull = `w-full ${sel}`;
const lbl = "block text-xs text-gray-500 dark:text-gray-400 mb-1";
const inputCls = "border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400";
const secondaryBtn = "px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700";
const templateChoiceBtn = `w-full text-left ${inputCls} hover:bg-gray-50 dark:hover:bg-gray-600 transition`;

// ── Transaction form helpers ──────────────────────────────────────────────────
function newLeg(): FormLeg {
    return {accountType: ACCOUNT_TYPES.RELAYED_TO_DISTRIBUTOR, customerId: "", qty: ""};
}

function newEntry(): FormEntry {
    return {itemId: "", sources: [newLeg()], destinations: [newLeg()]};
}

function normalizeTemplateLegs(legs: any): FormLeg[] {
    const legsArray = Array.isArray(legs) ? legs : (legs ? [legs] : []);
    const normalized = legsArray
        .map((leg) => {
            const accountType = (typeof leg === "string" ? leg : leg?.accountType) as AccountType;
            return {
                accountType: accountType ?? ACCOUNT_TYPES.RELAYED_TO_DISTRIBUTOR,
                customerId: leg?.customerId ?? "",
                qty: leg?.qty ?? "",
            };
        })
        .filter((leg) => leg.accountType);

    return normalized.length > 0 ? normalized : [newLeg()];
}

function normalizeTemplateEntries(templateEntries: any): FormEntry[] {
    if (!Array.isArray(templateEntries) || templateEntries.length === 0) return [newEntry()];

    return templateEntries.map((templateEntry) => ({
        itemId: "",
        sources: normalizeTemplateLegs(templateEntry?.sources ?? templateEntry?.source),
        destinations: normalizeTemplateLegs(templateEntry?.destinations ?? templateEntry?.destination),
    }));
}

function validateLegs(legs: FormLeg[], entryNum: number, side: "From" | "To"): string | null {
    for (const [i, leg] of legs.entries()) {
        const qty = Number(leg.qty);
        if (!leg.qty || isNaN(qty) || qty <= 0) {
            return `Entry ${entryNum}, ${side} ${i + 1}: quantity must be a positive number.`;
        }
        if (PER_CUSTOMER_ACCOUNTS.has(leg.accountType) && !leg.customerId) {
            return `Entry ${entryNum}, ${side} ${i + 1}: select a customer.`;
        }
    }
    return null;
}

function validateEntries(entries: FormEntry[]): string | null {
    for (const [i, entry] of entries.entries()) {
        const n = i + 1;
        if (!entry.itemId) return `Entry ${n}: select an item.`;

        const fromError = validateLegs(entry.sources, n, "From");
        if (fromError) return fromError;

        const toError = validateLegs(entry.destinations, n, "To");
        if (toError) return toError;
    }
    return null;
}

// ── Leg row (inside a transaction entry) ─────────────────────────────────────
function LegRow(props: {
    leg: FormLeg;
    side: "source" | "destination";
    onUpdate: (leg: FormLeg) => void;
    onRemove: () => void;
    canRemove: boolean;
}) {
    const needsCustomer = () => PER_CUSTOMER_ACCOUNTS.has(props.leg.accountType);

    function setField(field: keyof FormLeg, value: string) {
        const updated = {...props.leg, [field]: value};
        if (field === "accountType" && !PER_CUSTOMER_ACCOUNTS.has(value as AccountType)) updated.customerId = "";
        props.onUpdate(updated);
    }

    const sideColor = props.side === "source"
        ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
        : "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20";

    return (
        <div class={`flex gap-2 items-end flex-wrap rounded p-2 border ${sideColor}`}>
            <div class="flex-1 min-w-36">
                <label class={lbl}>Account</label>
                <select value={props.leg.accountType} onChange={(e) => setField("accountType", e.target.value)}
                        class={selFull}>
                    <For each={Object.entries(ACCOUNT_LABELS)}>
                        {([key, label]) => <option value={key}>{label}</option>}
                    </For>
                </select>
            </div>
            <Show when={needsCustomer()}>
                <div class="flex-1 min-w-32">
                    <label class={lbl}>Customer *</label>
                    <select value={props.leg.customerId} onChange={(e) => setField("customerId", e.target.value)}
                            class={selFull}>
                        <option value="">— select —</option>
                        <For each={state.customers}>
                            {(c) => <option value={c.id}>{c.name}</option>}
                        </For>
                    </select>
                </div>
            </Show>
            <div class="w-24 shrink-0">
                <label class={lbl}>Qty *</label>
                <input
                    type="number" min="0" step="1"
                    value={props.leg.qty}
                    onInput={(e) => setField("qty", e.target.value)}
                    class={selFull} placeholder="0"
                />
            </div>
            <Show when={props.canRemove}>
                <button type="button" onClick={props.onRemove}
                        class="text-gray-400 hover:text-red-500 text-xs pb-1.5">✕
                </button>
            </Show>
        </div>
    );
}

// ── Single entry card ─────────────────────────────────────────────────────────
function EntryCard(props: {
    entry: FormEntry;
    onUpdate: (entry: FormEntry) => void;
    onRemove: () => void;
    canRemove: boolean;
}) {
    function updateLeg(side: "source" | "destination", i: number, updated: FormLeg) {
        const key = side === "source" ? "sources" : "destinations";
        const list = [...props.entry[key]];
        list[i] = updated;
        props.onUpdate(side === "source" ? {...props.entry, sources: list} : {...props.entry, destinations: list});
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
        <div
            class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/40 space-y-3">
            <div class="flex items-center justify-between gap-3 flex-wrap">
                <div class="flex items-center gap-2 flex-1 min-w-48">
                    <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0">Item *</label>
                    <select
                        value={props.entry.itemId}
                        onChange={(e) => props.onUpdate({...props.entry, itemId: e.target.value})}
                        class={`flex-1 ${sel}`}
                    >
                        <option value="">— select item —</option>
                        <For each={state.items}>
                            {(item) => <option value={item.id}>{item.name} ({item.id})</option>}
                        </For>
                    </select>
                </div>
                <Show when={props.canRemove}>
                    <button type="button" onClick={props.onRemove}
                            class="text-xs text-red-400 hover:text-red-600 shrink-0">Remove entry
                    </button>
                </Show>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <span
                        class="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">From</span>
                    <button type="button" onClick={() => addLeg("source")}
                            class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">+ add
                    </button>
                </div>
                <For each={props.entry.sources}>
                    {(leg, i) => (
                        <LegRow
                            leg={leg} side="source"
                            onUpdate={(u) => updateLeg("source", i(), u)}
                            onRemove={() => removeLeg("source", i())}
                            canRemove={props.entry.sources.length > 1}
                        />
                    )}
                </For>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <span
                        class="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">To</span>
                    <button type="button" onClick={() => addLeg("destination")}
                            class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">+ add
                    </button>
                </div>
                <For each={props.entry.destinations}>
                    {(leg, i) => (
                        <LegRow
                            leg={leg} side="destination"
                            onUpdate={(u) => updateLeg("destination", i(), u)}
                            onRemove={() => removeLeg("destination", i())}
                            canRemove={props.entry.destinations.length > 1}
                        />
                    )}
                </For>
            </div>
        </div>
    );
}

// ── New transaction form (rendered inside modal) ───────────────────────────────
function TransactionForm(props: {
    initialTemplateId?: string;
    onSave: () => void;
    onCancel: () => void;
}) {
    const [templateId, setTemplateId] = createSignal(props.initialTemplateId ?? "");
    const [entries, setEntries] = createStore<FormEntry[]>(
        props.initialTemplateId
            ? normalizeTemplateEntries(state.templates.find((t) => t.id === props.initialTemplateId)?.entries)
            : [newEntry()]
    );
    const [note, setNote] = createSignal("");
    const [date, setDate] = createSignal(new Date().toISOString().slice(0, 10));
    const [error, setError] = createSignal("");

    const selectedTemplate = createMemo(() => state.templates.find((t) => t.id === templateId()));

    function loadTemplate(id: string) {
        setTemplateId(id);
        setError("");
        const tpl = state.templates.find((t) => t.id === id);
        if (!tpl) {
            setEntries(reconcile([newEntry()]));
            return;
        }
        setEntries(reconcile(normalizeTemplateEntries(tpl.entries)));
    }

    function hasUserEnteredData(currentEntries: FormEntry[]) {
        return currentEntries.some((entry) =>
            entry.itemId ||
            (entry.sources ?? []).some((leg) => leg.customerId || leg.qty) ||
            (entry.destinations ?? []).some((leg) => leg.customerId || leg.qty)
        );
    }

    function handleTemplateChange(id: string) {
        if (id === templateId()) return;
        if (hasUserEnteredData(entries)) {
            const ok = confirm("Changing template will replace current entries. Continue?");
            if (!ok) return;
        }
        loadTemplate(id);
    }

    function updateEntry(i: number, updated: FormEntry) {
        setEntries(i, reconcile(updated));
    }

    function submit(e: Event) {
        e.preventDefault();
        setError("");
        const filled = entries;
        const err = validateEntries(filled);
        if (err) {
            setError(err);
            return;
        }

        addTransaction({
            templateId: templateId() || null,
            templateName: selectedTemplate()?.name ?? "Manual",
            date: date(),
            note: note().trim(),
            entries: filled.map((en) => ({
                itemId: en.itemId,
                sources: en.sources.map((l) => ({
                    accountType: l.accountType,
                    customerId: PER_CUSTOMER_ACCOUNTS.has(l.accountType) ? l.customerId : null,
                    qty: Number(l.qty),
                })),
                destinations: en.destinations.map((l) => ({
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
                <div
                    class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p class="text-sm text-yellow-700 dark:text-yellow-400">No items defined yet. Add items in the Items
                        page first.</p>
                </div>
            </Show>

            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Use Template
                    (optional)</label>
                <select value={templateId()} onChange={(e) => handleTemplateChange(e.target.value)} class={selFull}>
                    <option value="">— Manual / no template —</option>
                    <For each={state.templates}>
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
                    <button type="button" onClick={() => setEntries(produce(d => { d.push(newEntry()); }))}
                            class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">+ Add entry
                    </button>
                </div>
                <For each={entries}>
                    {(entry, i) => (
                        <EntryCard
                            entry={entry}
                            onUpdate={(u) => updateEntry(i(), u)}
                            onRemove={() => setEntries(produce(d => { d.splice(i(), 1); }))}
                            canRemove={entries.length > 1}
                        />
                    )}
                </For>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note (optional)</label>
                <textarea value={note()} onInput={(e) => setNote(e.target.value)} rows={2} class={selFull}
                          placeholder="Any additional notes..."/>
            </div>

            <Show when={error()}>
                <p class="text-sm text-red-600 dark:text-red-400">{error()}</p>
            </Show>

            <div class="flex gap-2 justify-end pt-1">
                <button type="button" onClick={props.onCancel}
                        class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel
                </button>
                <button type="submit"
                        class="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">Record
                    Transaction
                </button>
            </div>
        </form>
    );
}

// ── History entry display ─────────────────────────────────────────────────────
function LegPill(props: { leg: Leg & { customerName?: string | null }; side: "source" | "destination" }) {
    const label = ACCOUNT_LABELS[props.leg.accountType as keyof typeof ACCOUNT_LABELS] ?? props.leg.accountType;
    return (
        <span class={`inline-block text-xs px-2 py-0.5 rounded-full ${
            props.side === "source"
                ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
        }`}>
      {props.side === "source" ? "From" : "To"}: {label}
            {props.leg.customerName ? ` (${props.leg.customerName})` : ""} × {props.leg.qty}
    </span>
    );
}

function EntryBlock(props: { entry: Entry; items: Item[]; customers: Customer[] }) {
    const item = () => props.items.find((it) => it.id === props.entry.itemId);
    const resolvedLegs = (legs: Leg[]) => {
        const legsArray = Array.isArray(legs) ? legs : (legs ? [legs] : []);
        return legsArray.map((leg) => {
            const legObj = typeof leg === "string" ? {accountType: leg as AccountType, qty: 0} : leg;
            return {
                ...legObj,
                customerName: legObj?.customerId
                    ? props.customers.find((c) => c.id === legObj.customerId)?.name ?? legObj.customerId
                    : null,
            };
        });
    };

    return (
        <div class="border border-gray-100 dark:border-gray-700 rounded p-2 space-y-1">
            <Show when={item()} fallback={
                <span class="text-xs font-mono text-gray-400 dark:text-gray-500">{props.entry.itemId}</span>
            }>
        <span class="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
          <span class="font-mono bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">{item()?.id ?? '-'}</span>
            {item()?.name ?? '-'}
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
    const [showForm, setShowForm] = createSignal(false);
    const [selectedTemplateForNewTx, setSelectedTemplateForNewTx] = createSignal<string | undefined>(undefined);
    const [search, setSearch] = createSignal("");
    const [filterCustomer, setFilterCustomer] = createSignal("");
    const [filterItem, setFilterItem] = createSignal("");

    function openNewTransactionSelector() {
        setSelectedTemplateForNewTx(undefined);
        setShowForm(true);
    }

    function closeNewTransactionModal() {
        setShowForm(false);
        setSelectedTemplateForNewTx(undefined);
    }

    const filtered = createMemo(() => {
        const q = search().toLowerCase();
        const cid = filterCustomer();
        const iid = filterItem();
        return state.transactions.filter((tx) => {
            const matchSearch = !q ||
                tx.templateName?.toLowerCase().includes(q) ||
                tx.note?.toLowerCase().includes(q) ||
                tx.date?.includes(q);
            const matchCustomer = !cid || tx.entries.some((e) =>
                [...(e.sources ?? []), ...(e.destinations ?? [])].some((l) => l.customerId === cid)
            );
            const matchItem = !iid || tx.entries.some((e) => e.itemId === iid);
            return matchSearch && matchCustomer && matchItem;
        });
    });

    function handleDelete(id: string) {
        if (confirm("Delete this transaction? This will affect account balances.")) deleteTransaction(id);
    }

    return (
        <div>
            <div class="flex items-center justify-between mb-4">
                <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100">Transactions</h1>
                <button onClick={openNewTransactionSelector}
                        class="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700">
                    + New Transaction
                </button>
            </div>

            <Modal show={showForm()} onClose={closeNewTransactionModal} title="New Transaction">
                <Show
                    when={selectedTemplateForNewTx() !== undefined}
                    fallback={
                        <div class="space-y-4">
                            <p class="text-sm text-gray-600 dark:text-gray-300">Choose how you want to start this
                                transaction.</p>
                            <div class="space-y-2 max-h-72 overflow-auto pr-1">
                                <button
                                    type="button"
                                    onClick={() => setSelectedTemplateForNewTx("")}
                                    class={templateChoiceBtn}
                                >
                                    — Manual / no template —
                                </button>
                                <For each={state.templates}>
                                    {(t) => (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedTemplateForNewTx(t.id)}
                                            class={templateChoiceBtn}
                                        >
                                            <p class="font-medium mb-1">{t.name}</p>
                                            <div class="space-y-1.5">
                                                <For each={t.entries}>
                                                    {(entry, i) => (
                                                        <div>
                                                            <Show when={t.entries.length > 1}>
                                                                <p class="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Entry {i() + 1}</p>
                                                            </Show>
                                                            <div class="space-y-1">
                                                                <For each={normalizeTemplateLegs(entry.sources)}>
                                                                    {(leg) => (
                                                                        <span class="inline-block text-xs px-2 py-0.5 rounded-full mr-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                                                                            From: {ACCOUNT_LABELS[leg.accountType]}
                                                                        </span>
                                                                    )}
                                                                </For>
                                                                <For each={normalizeTemplateLegs(entry.destinations)}>
                                                                    {(leg) => (
                                                                        <span class="inline-block text-xs px-2 py-0.5 rounded-full mr-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                                                                            To: {ACCOUNT_LABELS[leg.accountType]}
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
                                <button
                                    type="button"
                                    onClick={closeNewTransactionModal}
                                    class={secondaryBtn}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    }
                >
                    <TransactionForm
                        initialTemplateId={selectedTemplateForNewTx()}
                        onSave={closeNewTransactionModal}
                        onCancel={closeNewTransactionModal}
                    />
                </Show>
            </Modal>

            {/* Filters */}
            <div class="flex gap-3 mb-4 flex-wrap">
                <input
                    type="text"
                    value={search()}
                    onInput={(e) => setSearch(e.target.value)}
                    placeholder="Search by template, note, date..."
                    class={`flex-1 min-w-48 ${inputCls}`}
                />
                <select value={filterItem()} onChange={(e) => setFilterItem(e.target.value)} class={inputCls}>
                    <option value="">All items</option>
                    <For each={state.items}>
                        {(it) => <option value={it.id}>{it.name} ({it.id})</option>}
                    </For>
                </select>
                <select value={filterCustomer()} onChange={(e) => setFilterCustomer(e.target.value)} class={inputCls}>
                    <option value="">All customers</option>
                    <For each={state.customers}>
                        {(c) => <option value={c.id}>{c.name}</option>}
                    </For>
                </select>
            </div>

            {/* History list */}
            <Show
                when={filtered().length > 0}
                fallback={<p class="text-sm text-gray-400 dark:text-gray-500">No transactions yet.</p>}
            >
                <div class="space-y-3">
                    <For each={filtered()}>
                        {(tx) => (
                            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                                <div class="flex items-start justify-between gap-2 mb-3">
                                    <div>
                                        <p class="font-semibold text-gray-800 dark:text-gray-100 text-sm">{tx.templateName ?? "Manual"}</p>
                                        <p class="text-xs text-gray-400 dark:text-gray-500">
                                            {tx.date} &middot; recorded {new Date(tx.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <button onClick={() => handleDelete(tx.id)}
                                            class="text-xs text-red-400 hover:text-red-600 shrink-0">Delete
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
        </div>
    );
}
